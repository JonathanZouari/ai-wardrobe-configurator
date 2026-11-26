from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables (and backend/.env locally)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    # Comma-separated list of frontend origins allowed to call the API.
    cors_origins: str = "http://localhost:5500,http://127.0.0.1:5500"

    # AI assistant. Without a key the assistant endpoints answer 503 and the editor works as usual.
    openai_api_key: str | None = None
    live_model: str = "gpt-live-1.1"
    agent_model: str = "gpt-5.6-terra"
    ai_requests_per_minute: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
