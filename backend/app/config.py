"""Application configuration."""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings."""
    
    # App
    app_name: str = "AI Signal"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Database - Default fallback (override in .env)
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/dbname"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    
    # AI Processing
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    ai_model: str = "gpt-4-turbo-preview"
    ai_summary_model: str = "gpt-3.5-turbo"
    
    # Ingestion
    ingestion_batch_size: int = 50
    max_concurrent_fetches: int = 5
    request_timeout: int = 30
    
    # Scoring
    time_decay_factor: float = 0.1
    min_importance_score: float = 0.0
    max_importance_score: float = 100.0
    
    # API
    api_rate_limit: int = 100
    api_cache_ttl: int = 300
    
    # CORS - stored as comma-separated string, parsed to list
    cors_origins: str = "http://localhost:3000,http://localhost:8000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = "../.env"  # Look for .env in parent directory
        env_file_encoding = "utf-8"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings."""
    return Settings()
