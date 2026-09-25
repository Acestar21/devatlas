from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str

    github_client_id: str
    github_client_secret: str
    github_oauth_callback_url: str

    secret_key: str
    fernet_key: str  # used to encrypt stored GitHub OAuth tokens at rest

    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    internal_api_secret: str  # shared secret between Render and Vercel's API route
    # Defaults to no admin locally until explicitly configured.
    admin_github_id: int = 0
    seed_system_user_id: int | None = None


settings = Settings()