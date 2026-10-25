from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    repo_url: str


class AnalyzeResponse(BaseModel):
    owner: str
    repo: str
    status: str
    message: str
