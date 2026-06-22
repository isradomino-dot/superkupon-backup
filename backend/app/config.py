from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Coupon Aggregator"
    APP_ENV: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'coupon.db'}"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    SCRAPER_DEFAULT_INTERVAL_MINUTES: int = 60
    SCRAPER_RATE_LIMIT_SECONDS: float = 3.0
    SCRAPER_TIMEOUT_SECONDS: int = 30
    SCRAPER_USE_MOCK: bool = True  # V1 default: mock data, no real fetch ke target high-anti-bot

    # Per-scraper override: comma-separated target_ids yang dipaksa pakai REAL fetch
    # walau SCRAPER_USE_MOCK=true. Pattern: gradual rollout, hindari big-bang flip.
    # Contoh: SCRAPER_REAL_OVERRIDES="telegram_promo_aggregator,involve_asia_api"
    SCRAPER_REAL_OVERRIDES: str = ""

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHANNEL_ID: str = ""

    INVOLVE_ASIA_API_KEY: str = ""
    INVOLVE_ASIA_API_SECRET: str = ""

    # Admin auth — wajib di-set di production buat lock /admin/* endpoints.
    # Empty default = fail-closed (admin endpoints block semua request).
    ADMIN_API_KEY: str = ""

    # Rate limiting per IP (in-memory, single-instance only)
    RATE_LIMIT_VIEW_PER_MIN: int = 30
    RATE_LIMIT_REDEEM_PER_MIN: int = 10

    SHOPEE_AFFILIATE_APP_ID: str = ""
    SHOPEE_AFFILIATE_SECRET: str = ""

    TOKEN_DANA_TEST: str = ""
    TOKEN_OVO_TEST: str = ""
    TOKEN_TIXID_TEST: str = ""
    DANA_SIGNING_KEY: str = ""
    DANA_DEVICE_ID: str = ""

    # V2.2 — Residential Proxy Pool
    PROXY_PROVIDER: str = "none"  # none | bright_data | oxylabs | iproyal | static_list
    PROXY_COOLDOWN_SECONDS: int = 300
    PROXY_STATIC_LIST: str = ""  # comma-separated URL untuk static_list provider

    BRIGHT_DATA_USERNAME: str = ""
    BRIGHT_DATA_PASSWORD: str = ""
    BRIGHT_DATA_ZONE: str = "residential"
    BRIGHT_DATA_COUNTRY: str = "id"
    BRIGHT_DATA_GATEWAY: str = "brd.superproxy.io:22225"
    BRIGHT_DATA_POOL_SIZE: int = 5

    OXYLABS_USERNAME: str = ""
    OXYLABS_PASSWORD: str = ""
    OXYLABS_COUNTRY: str = "ID"
    OXYLABS_POOL_SIZE: int = 5

    IPROYAL_USERNAME: str = ""
    IPROYAL_PASSWORD: str = ""
    IPROYAL_COUNTRY: str = "id"
    IPROYAL_POOL_SIZE: int = 5

    # V3.1 — LLM Extraction
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-6"
    LLM_MAX_TOKENS: int = 2048
    LLM_USE_CACHING: bool = True
    LLM_FALLBACK_REGEX: bool = True

    # V3.1 — Telegram source
    TELEGRAM_API_ID: str = ""
    TELEGRAM_API_HASH: str = ""
    TELEGRAM_SESSION_STRING: str = ""

    # Email digest (Resend.com)
    # RESEND_API_KEY  — get from https://resend.com/api-keys (format: re_xxxxx)
    # DIGEST_RECIPIENTS — comma-separated email list (e.g. "boss@x.com,me@y.com")
    # DIGEST_ENABLED  — safety gate; cron job runs only kalau true
    RESEND_API_KEY: str = ""
    DIGEST_RECIPIENTS: str = ""
    DIGEST_ENABLED: bool = False
    DIGEST_FROM_EMAIL: str = "SuperKupon <onboarding@resend.dev>"
    DIGEST_PUBLIC_BASE_URL: str = "https://superkupon.vercel.app"

    # Exact allowlist — NO wildcard *.vercel.app (security: cegah attacker bikin
    # subdomain vercel.app sembarangan buat steal credentials via CORS).
    CORS_ORIGINS: list[str] = [
        "https://superkupon.vercel.app",
        "https://superkupon-backup.vercel.app",
        "http://localhost:3000",
        "http://localhost:3010",
    ]
    # Regex dimatiin — fixed allowlist aja
    CORS_ORIGIN_REGEX: str = ""

    # PWA Push Notifications (VAPID Web Push, no Firebase)
    # Generate keys sekali: `python -m app.services.push_notification`
    # Public key dishare ke frontend, private key dirahasiakan di server env.
    # PUSH_ENABLED = safety gate buat scraper-triggered push (kalo false,
    # cuma manual admin /admin/push/send-test yg jalan).
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:lim279614@gmail.com"
    PUSH_ENABLED: bool = False


settings = Settings()
