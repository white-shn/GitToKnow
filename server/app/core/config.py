from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GitToKnow API"
    version: str = "0.1.0"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cors_origin_regex: str = ""  # optional, e.g. https://.*\.onrender\.com for deployed frontends

    # GitHub (token is optional, but lifts the 60 requests/hour anonymous limit)
    github_token: str = ""

    # Gemini API (Gemma 4 for chat/overview, Gemini embeddings for RAG indexing)
    gemini_api_key: str = ""
    gemma_model: str = "gemma-4-26b-a4b-it"
    embedding_model: str = "gemini-embedding-001"

    # Serve mock data from the repo endpoints until the real pipeline is wired up
    use_mock_data: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
