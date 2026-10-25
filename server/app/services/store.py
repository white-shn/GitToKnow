"""In-memory store for analysed repositories (no database). Keyed by repo_id = "owner/repo"."""

from dataclasses import dataclass, field

from app.schemas.repo import AnalyzeResponse


@dataclass
class RepoRecord:
    analysis: AnalyzeResponse
    files: dict[str, str] = field(default_factory=dict)  # path -> text content
    overview: str | None = None
    index: object | None = None  # RAG index (chunks + embeddings), set by services/rag
    index_progress: float = 0.0


_repos: dict[str, RepoRecord] = {}


def save(repo_id: str, record: RepoRecord) -> None:
    _repos[repo_id] = record


def get(repo_id: str) -> RepoRecord | None:
    return _repos.get(repo_id)
