"""In-memory store for analysed repositories (no database). Keyed by repo_id = "owner/repo" (case-insensitive)."""

import threading
from dataclasses import dataclass, field

from app.schemas.repo import AnalyzeResponse


@dataclass
class RepoRecord:
    analysis: AnalyzeResponse
    files: dict[str, str] = field(default_factory=dict)  # path -> text content
    overview: str | None = None
    index: object | None = None  # RAG index (chunks + embeddings), set by services/rag
    index_progress: float = 0.0
    index_error: str | None = None  # why indexing failed, shown to the user
    overview_lock: threading.Lock = field(default_factory=threading.Lock)  # one overview generation at a time


_repos: dict[str, RepoRecord] = {}


def _key(repo_id: str) -> str:
    return repo_id.lower()  # GitHub owner/repo names are case-insensitive


def save(repo_id: str, record: RepoRecord) -> None:
    _repos[_key(repo_id)] = record


def get(repo_id: str) -> RepoRecord | None:
    return _repos.get(_key(repo_id))
