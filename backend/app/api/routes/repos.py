from fastapi import APIRouter, HTTPException

from app.schemas.repo import AnalyzeRequest, AnalyzeResponse
from app.services.github import InvalidRepoUrl, parse_repo_url

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_repo(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Validate the repo URL. Real analysis (GitHub fetch -> RAG -> Gemma 4) plugs in here."""
    try:
        owner, repo = parse_repo_url(payload.repo_url)
    except InvalidRepoUrl as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return AnalyzeResponse(
        owner=owner,
        repo=repo,
        status="received",
        message="Repository accepted. Analysis pipeline is not wired up yet.",
    )
