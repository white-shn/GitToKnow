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
from app.services.analysis.analyzer import analyze
from app.services.analysis.languages import language_of
from app.services.github import GitHubError, InvalidRepoUrl, fetch_repo, parse_repo_url

router = APIRouter()

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_repo(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Fetch + analyse a public repo. TODO(stream C): start RAG indexing after store.save."""
    try:
        owner, repo = parse_repo_url(payload.repo_url)
    except InvalidRepoUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if get_settings().use_mock_data:
        analysis = mock.mock_analysis(owner, repo)
        store.save(analysis.repo_id, store.RepoRecord(analysis=analysis))
        return analysis

    cached = store.get(f"{owner}/{repo}")
    if cached:  # same repo analysed again: skip GitHub (saves rate limit, instant demos)
        return cached.analysis

    try:
        meta, files = fetch_repo(owner, repo)
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    if not files:
        raise HTTPException(status_code=422, detail="No analysable text files found in this repository.")

    analysis = analyze(meta, files)
    store.save(analysis.repo_id, store.RepoRecord(analysis=analysis, files=files))
    return analysis


@router.get("/{owner}/{repo}/overview", response_model=OverviewResponse)
def get_overview(owner: str, repo: str) -> OverviewResponse:
    """AI-generated repo overview (markdown). TODO(stream C): llm/gemma.py + llm/prompts.py."""
    if get_settings().use_mock_data:
        return OverviewResponse(overview=mock.mock_overview(owner, repo))
    raise NOT_IMPLEMENTED


@router.get("/{owner}/{repo}/status", response_model=StatusResponse)
def get_status(owner: str, repo: str) -> StatusResponse:
    """RAG indexing status, read from the stored record (stream C updates it while indexing)."""
    if get_settings().use_mock_data:
        return StatusResponse(index_status="ready", progress=1.0)
    record = store.get(f"{owner}/{repo}")
    if not record:
        raise HTTPException(status_code=404, detail="Repository has not been analysed yet.")
    return StatusResponse(index_status=record.analysis.index_status, progress=record.index_progress)


@router.get("/{owner}/{repo}/files/{path:path}", response_model=FileContent)
def get_file(owner: str, repo: str, path: str) -> FileContent:
    """Raw file content, for node details and the citation viewer."""
    if get_settings().use_mock_data:
        return mock.mock_file(path)
    record = store.get(f"{owner}/{repo}")
    if not record:
        raise HTTPException(status_code=404, detail="Repository has not been analysed yet.")
    content = record.files.get(path)
    if content is None:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    return FileContent(path=path, language=language_of(path), content=content)
