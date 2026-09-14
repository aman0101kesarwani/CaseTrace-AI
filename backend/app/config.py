from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CaseFlow AI API"
    environment: str = "development"
    api_v1_prefix: str = "/api"

    database_url: str = "postgresql+psycopg://caseflow:caseflow@localhost:5432/caseflow"

    # Neo4j configuration
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: str = "caseflow123"

    upload_dir: str = "uploads"
    cors_origins: str = "http://localhost:5173"

    jwt_secret_key: str = "change-this-in-development"
    jwt_algorithm: str = "HS256"

    # NVIDIA API configuration
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            x.strip()
            for x in self.cors_origins.split(",")
            if x.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()