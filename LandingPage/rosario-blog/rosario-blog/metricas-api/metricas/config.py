from pathlib import Path

from common.settings import CommonSettings

BASE = Path(__file__).resolve().parents[1]


class Settings(CommonSettings):
    database_url: str = f"sqlite:///{BASE / 'data' / 'metricas.db'}"
    ingest_limit_per_min: int = 120      # endpoint público: límite por IP
    reports_limit_per_min: int = 120
    # El sitio generado se sirve desde la consola, así que su origen ya está en CORS_ORIGINS
