"""Find the chunks most relevant to a question: BM25 keyword search blended with embedding similarity."""

import re

import numpy as np

from app.services.llm import gemma
from app.services.rag.chunker import Chunk
from app.services.rag.index import RagIndex

TOP_K = 8
MAX_PER_FILE = 3  # keeps one big file from crowding out everything else
SEMANTIC_WEIGHT = 0.65  # keyword weight is the remainder; keyword alone is used when no embeddings are available
PATH_BOOST = 0.04  # per question word found in a chunk's file path ("where is the router" -> router.py)
_WORD = re.compile(r"[A-Za-z_][A-Za-z0-9_]{3,}")
_STOP = {"what", "where", "does", "this", "that", "with", "from", "which", "when", "have", "about", "code", "file", "files", "work", "works", "used", "uses", "using", "there", "their", "into", "between", "repo", "project"}


def _scale(x: np.ndarray) -> np.ndarray:
    """Map scores to 0..1 so keyword and semantic scores can be blended."""
    span = float(x.max() - x.min()) if len(x) else 0.0
    return (x - x.min()) / span if span > 1e-9 else np.zeros_like(x)


def retrieve(index: RagIndex, query: str, k: int = TOP_K) -> list[tuple[Chunk, float]]:
    """Top-k (chunk, score). Works from keywords alone; adds semantic similarity for the chunks embedded so far."""
    scores = _scale(index.lexical.scores(query))

    embedded = len(index.vectors)
    if embedded:
        try:
            query_vec = gemma.embed([query], "RETRIEVAL_QUERY")[0]
            semantic = _scale(index.vectors @ query_vec)
            blended = scores.copy()
            blended[:embedded] = SEMANTIC_WEIGHT * semantic + (1 - SEMANTIC_WEIGHT) * scores[:embedded]
            scores = blended
        except gemma.LLMError:
            pass  # embedding quota/outage: keyword results are still good

    words = {w.lower() for w in _WORD.findall(query)} - _STOP
    if words:
        for i, chunk in enumerate(index.chunks):
            path = chunk.path.lower()
            scores[i] += PATH_BOOST * sum(1 for w in words if w in path)

    picked: list[tuple[Chunk, float]] = []
    per_file: dict[str, int] = {}
    for i in scores.argsort()[::-1]:
        chunk = index.chunks[i]
        if per_file.get(chunk.path, 0) >= MAX_PER_FILE:
            continue
        per_file[chunk.path] = per_file.get(chunk.path, 0) + 1
        picked.append((chunk, float(scores[i])))
        if len(picked) == k:
            break
    return picked
