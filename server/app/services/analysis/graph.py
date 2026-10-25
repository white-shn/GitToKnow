"""Import/dependency graph. OWNED BY STREAM B (see docs/ROADMAP.md): replace the body of build_graph.

Contract: given every analysable file and its FileInfo, return a Graph (schemas/repo.py) whose edges come
from real imports. analyzer.py already calls this, so the rest of the pipeline works while this is a stub.
"""

from app.schemas.repo import FileInfo, Graph


def build_graph(files: dict[str, str], infos: list[FileInfo]) -> Graph:
    return Graph()
