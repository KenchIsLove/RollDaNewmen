from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost/rollgame"
    secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

    def model_post_init(self, __context) -> None:
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        if "?" in url:
            base, _, query = url.partition("?")
            kept = [p for p in query.split("&") if p and not p.startswith("sslmode=")]
            url = base + ("?" + "&".join(kept) if kept else "")
        self.database_url = url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
