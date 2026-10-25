from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.repo import (
    AnalyzeRequest,
    AnalyzeResponse,
    FileContent,
    OverviewResponse,
    StatusResponse,
)
from app.services import mock, store
from app.services.github import InvalidRepoUrl, parse_repo_url

router = APIRouter()

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_repo(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Fetch + analyse a repo. TODO(real): github fetch -> analysis/* -> store.save -> start RAG indexing."""
    try:
        owner, repo = parse_repo_url(payload.repo_url)
    except InvalidRepoUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if get_settings().use_mock_data:
        analysis = mock.mock_analysis(owner, repo)
        store.save(analysis.repo_id, store.RepoRecord(analysis=analysis))
        return analysis
    raise NOT_IMPLEMENTED


@router.get("/{owner}/{repo}/overview", response_model=OverviewResponse)
def get_overview(owner: str, repo: str) -> OverviewResponse:
    """AI-generated repo overview (markdown). TODO(real): llm/gemma.py + llm/prompts.py."""
    if get_settings().use_mock_data:
        return OverviewResponse(overview=mock.mock_overview(owner, repo))
    raise NOT_IMPLEMENTED


@router.get("/{owner}/{repo}/status", response_model=StatusResponse)
def get_status(owner: str, repo: str) -> StatusResponse:
    """RAG indexing status. TODO(real): read RepoRecord.index_progress."""
    if get_settings().use_mock_data:
        return StatusResponse(index_status="ready", progress=1.0)
    raise NOT_IMPLEMENTED


@router.get("/{owner}/{repo}/files/{path:path}", response_model=FileContent)
def get_file(owner: str, repo: str, path: str) -> FileContent:
    """Raw file content, for node details and the citation viewer. TODO(real): RepoRecord.files[path]."""
    if get_settings().use_mock_data:
        return mock.mock_file(path)
    raise NOT_IMPLEMENTED
