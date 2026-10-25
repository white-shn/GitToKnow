"""Response/request models for /api/repos. This is the contract the client builds against."""

from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["frontend", "backend", "config", "tests", "docs", "other"]
IndexState = Literal["pending", "indexing", "ready", "failed"]


class AnalyzeRequest(BaseModel):
    repo_url: str


class RepoMeta(BaseModel):
    owner: str
    repo: str
    description: str = ""
    html_url: str
    default_branch: str = "main"
    stars: int = 0
    forks: int = 0
    license: str | None = None
    file_count: int = 0


class TreeNode(BaseModel):
    name: str
    path: str
    type: Literal["dir", "file"]
    children: list["TreeNode"] = Field(default_factory=list)


class LanguageStat(BaseModel):
    language: str
    files: int
    percent: float


class Dependency(BaseModel):
    name: str
    version: str = ""
    ecosystem: str  # npm, pypi, go, maven...
    dev: bool = False


class FileInfo(BaseModel):
    path: str
    size: int
    language: str | None = None
    category: Category = "other"
    important: bool = False
    reason: str | None = None  # why it is important, e.g. "Application entry point"


class GraphNode(BaseModel):
    id: str
    label: str
    path: str  # file path, or folder path when the node is a collapsed component
    category: Category = "other"
    group: str = ""  # top-level folder, for colouring/clustering
    files: list[str] = Field(default_factory=list)  # files inside (component nodes)
    imports: list[str] = Field(default_factory=list)  # ids this node depends on
    imported_by: list[str] = Field(default_factory=list)  # ids that depend on this node


class GraphEdge(BaseModel):
    source: str
    target: str


class Graph(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    repo_id: str  # "owner/repo"; use it in the URLs below
    meta: RepoMeta
    tree: list[TreeNode]
    languages: list[LanguageStat]
    frameworks: list[str]
    dependencies: list[Dependency]
    files: list[FileInfo]
    graph: Graph
    index_status: IndexState = "pending"


class OverviewResponse(BaseModel):
    overview: str  # markdown


class StatusResponse(BaseModel):
    index_status: IndexState
    progress: float = 0.0  # 0..1


class FileContent(BaseModel):
    path: str
    language: str | None = None
    content: str
