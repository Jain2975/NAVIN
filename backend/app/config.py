from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./navin.db"
    secret_key: str = "dev-secret"
    log_level: str = "DEBUG"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173"

    model_config = {  # Pydantic v2 syntax — NOT class Config
        "env_file": ".env",
        "case_sensitive": False,
    }


settings = Settings()
