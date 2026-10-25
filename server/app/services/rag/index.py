"""Build the in-memory search index for a repo (runs in a background thread after /analyze).

Keyword (BM25) search is ready instantly, so chat works right away. Embeddings are then added batch by batch,
most important files first; the free-tier embedding quota (100 texts/minute) means a large repo takes several
minutes. If embedding fails or runs out, chat keeps working on keyword search.
"""

import logging
import threading
from dataclasses import dataclass

import numpy as np

from app.schemas.repo import FileInfo
from app.services import store
from app.services.llm import gemma
from app.services.rag.chunker import Chunk, chunk_file
from app.services.rag.lexical import Bm25

log = logging.getLogger(__name__)

MAX_CHUNKS = 300  # caps embedding cost/time; the most important files are indexed first
SKIP_EXTS = (".svg", ".csv", ".tsv", ".map", ".ipynb", ".lock")
MAX_JSON_BYTES = 30_000  # big JSON files are data, not code
CATEGORY_PRIORITY = {"frontend": 1, "backend": 1, "other": 1, "docs": 2, "config": 3, "tests": 4}


@dataclass
class RagIndex:
    chunks: list[Chunk]
    vectors: np.ndarray  # (embedded so far, dim), L2-normalised; row i belongs to chunks[i]
    lexical: Bm25  # keyword index over all chunks
    complete: bool = False  # False while embedding is in progress, or if the repo exceeded MAX_CHUNKS


def _priority(info: FileInfo) -> tuple[int, int, str]:
    group = 0 if info.important else CATEGORY_PRIORITY.get(info.category, 1)
    return group, info.path.count("/"), info.path  # important first, then code, then shallow before deep


def select_chunks(record: store.RepoRecord) -> tuple[list[Chunk], bool]:
    """Chunks to index in priority order, and whether the repo had more than MAX_CHUNKS."""
    chunks: list[Chunk] = []
    for info in sorted(record.analysis.files, key=_priority):
        content = record.files.get(info.path)
        if content is None or info.path.lower().endswith(SKIP_EXTS):
            continue
        if info.path.lower().endswith(".json") and len(content) > MAX_JSON_BYTES:
            continue
        chunks.extend(chunk_file(info.path, content, first_id=len(chunks)))
        if len(chunks) >= MAX_CHUNKS:
            return chunks[:MAX_CHUNKS], True
    return chunks, False


def needs_indexing(record: store.RepoRecord) -> bool:
    return record.analysis.index_status in ("pending", "failed")


def mark_indexing(record: store.RepoRecord) -> None:
    """Flip the status synchronously so a second /analyze doesn't start a duplicate index."""
    record.analysis.index_status = "indexing"
    record.index_progress = 0.0
    record.index_error = None
    record.index = None


def build_index(repo_id: str) -> None:
    record = store.get(repo_id)
    if record is None:
        return
    try:
        chunks, over_cap = select_chunks(record)
        if not chunks:
            raise gemma.LLMError(422, "This repository has no text files that can be indexed.")

        vectors = np.zeros((0, gemma.EMBED_DIMENSIONS), dtype=np.float32)
        record.index = RagIndex(chunks=chunks, vectors=vectors, lexical=Bm25([c.embedding_text for c in chunks]))
        record.analysis.index_status = "ready"  # keyword search works already

        try:
            for _, batch in gemma.embed_batches([c.embedding_text for c in chunks], "RETRIEVAL_DOCUMENT"):
                vectors = np.vstack([vectors, batch])
                record.index.vectors = vectors  # semantic search covers the files embedded so far
                record.index_progress = 0.99 * len(vectors) / len(chunks)
        except gemma.LLMError as exc:
            record.index_error = f"Semantic search unavailable ({exc.detail}); using keyword search."

        record.index.complete = not over_cap and len(record.index.vectors) == len(chunks)
        record.index_progress = 1.0
    except gemma.LLMError as exc:
        record.index_error = exc.detail
        record.analysis.index_status = "failed"
    except Exception:  # noqa: BLE001 - never leave the status stuck on "indexing"
        log.exception("Indexing %s failed", repo_id)
        record.index_error = "Indexing failed unexpectedly."
        record.analysis.index_status = "failed"


def start_indexing(record: store.RepoRecord) -> None:
    """Index in a daemon thread so it never blocks a request (or the overview) while waiting on API quotas."""
    mark_indexing(record)
    threading.Thread(target=build_index, args=(record.analysis.repo_id,), daemon=True, name="rag-index").start()
