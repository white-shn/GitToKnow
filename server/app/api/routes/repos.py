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
from app.services.llm.gemma import LLMError
from app.services.llm.overview import get_overview as load_overview
from app.services.llm.overview import prefetch_overview
from app.services.pr_review import review_pull_requests, review_pull_requests_ai
from app.services.rag.index import needs_indexing, start_indexing

router = APIRouter()


def _record_or_404(owner: str, repo: str) -> store.RepoRecord:
    record = store.get(f"{owner}/{repo}")
    if not record:
        raise HTTPException(status_code=404, detail="Repository has not been analysed yet.")
    return record


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_repo(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Fetch + analyse a public repo, then index it for chat in the background."""
    try:
        owner, repo = parse_repo_url(payload.repo_url)
    except InvalidRepoUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if get_settings().use_mock_data:
        analysis = mock.mock_analysis(owner, repo)
        store.save(analysis.repo_id, store.RepoRecord(analysis=analysis))
        return analysis

    record = store.get(f"{owner}/{repo}")
    if record is None:  # same repo analysed again: skip GitHub (saves rate limit, instant demos)
        try:
            meta, files = fetch_repo(owner, repo)
        except GitHubError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
        if not files:
            raise HTTPException(status_code=422, detail="No analysable text files found in this repository.")
        analysis = analyze(meta, files)
        record = store.RepoRecord(analysis=analysis, files=files)
        store.save(analysis.repo_id, record)

    if needs_indexing(record):  # first analysis, or a previous index attempt failed
        start_indexing(record)
    if record.overview is None:
        prefetch_overview(record)
    return record.analysis


@router.get("/{owner}/{repo}/overview", response_model=OverviewResponse)
def get_overview(owner: str, repo: str) -> OverviewResponse:
    """AI-generated repo overview (markdown), generated once per repo and then cached."""
    if get_settings().use_mock_data:
        return OverviewResponse(overview=mock.mock_overview(owner, repo))
    record = _record_or_404(owner, repo)
    try:
        return OverviewResponse(overview=load_overview(record))
    except LLMError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/{owner}/{repo}/status", response_model=StatusResponse)
def get_status(owner: str, repo: str) -> StatusResponse:
    """RAG indexing status: pending / indexing / ready / failed, with progress 0..1."""
    if get_settings().use_mock_data:
        return StatusResponse(index_status="ready", progress=1.0)
    record = _record_or_404(owner, repo)
    return StatusResponse(
        index_status=record.analysis.index_status, progress=record.index_progress, error=record.index_error
    )


@router.get("/{owner}/{repo}/pull-requests/review")
def review_prs(owner: str, repo: str, refresh: bool = False) -> dict:
    """Compare the repository's open PRs and recommend the safest candidate per issue."""
    try:
        return review_pull_requests(owner, repo, refresh)
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/{owner}/{repo}/pull-requests/review/ai")
def review_prs_ai(owner: str, repo: str, refresh: bool = False) -> dict:
    """AI commentary on the rule-based PR review; `ai_status` says why it is missing when it is."""
    try:
        return review_pull_requests_ai(owner, repo, refresh)
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/{owner}/{repo}/files/{path:path}", response_model=FileContent)
def get_file(owner: str, repo: str, path: str) -> FileContent:
    """Raw file content, for node details and the citation viewer."""
    if get_settings().use_mock_data:
        return mock.mock_file(path)
    record = _record_or_404(owner, repo)
    content = record.files.get(path)
    if content is None:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    return FileContent(path=path, language=language_of(path), content=content)
