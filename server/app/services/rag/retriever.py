"""Find the chunks most relevant to a question."""

import re

from app.services.llm import gemma
from app.services.rag.chunker import Chunk
from app.services.rag.index import RagIndex

TOP_K = 8
MAX_PER_FILE = 3  # keeps one big file from crowding out everything else
PATH_BOOST = 0.04  # per question word found in a chunk's file path ("where is the router" -> router.py)
_WORD = re.compile(r"[A-Za-z_][A-Za-z0-9_]{3,}")
_STOP = {"what", "where", "does", "this", "that", "with", "from", "which", "when", "have", "about", "code", "file", "files", "work", "works", "used", "uses", "using", "there", "their", "into", "between", "repo", "project"}


def retrieve(index: RagIndex, query: str, k: int = TOP_K) -> list[tuple[Chunk, float]]:
    """Top-k (chunk, score) by cosine similarity, plus a small boost for chunks whose path matches the query."""
    query_vec = gemma.embed([query], "RETRIEVAL_QUERY")[0]
    scores = index.vectors @ query_vec

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
