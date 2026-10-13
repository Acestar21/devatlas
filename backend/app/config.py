from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str

    github_client_id: str
    github_client_secret: str
    github_oauth_callback_url: str

    secret_key: str
    fernet_key: str  # used to encrypt stored GitHub OAuth tokens at rest
    mod_webhook_url: str | None = None  # Discord webhook for staff alerts; optional
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    internal_api_secret: str  # shared secret between Render and Vercel's API route
    # Defaults to no admin locally until explicitly configured.
    admin_github_id: int = 0
    seed_system_user_id: int | None = None
    # IGDB (via Twitch) for game search/art; optional - the editor falls back to a local list
    # How many reverse proxies in front of us APPEND to X-Forwarded-For (Render: test with the curl in
    # docs/DEPLOYMENT.md). 0 = ignore the header and use the socket address.
    trusted_proxy_hops: int = 0
    twitch_client_id: str | None = None
    twitch_client_secret: str | None = None


settings = Settings()
