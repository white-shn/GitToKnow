from functools import lru_cache

from pydantic import AliasChoices, Field
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

    # Optional fallback LLM, used only when Gemma 4 fails or its quota runs out. Any OpenAI-compatible chat API:
    # Groq hosting the open-weight gpt-oss-120b by default; any other OpenAI-compatible host works too.
    fallback_api_key: str = Field(default="", validation_alias=AliasChoices("FALLBACK_API_KEY", "GROQ_API_KEY"))
    fallback_base_url: str = "https://api.groq.com/openai/v1"
    fallback_model: str = "openai/gpt-oss-120b"

    # Serve mock data from the repo endpoints until the real pipeline is wired up
    use_mock_data: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
