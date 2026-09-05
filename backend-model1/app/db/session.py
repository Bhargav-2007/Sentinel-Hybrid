"""
Gujarat Sentinel — Model 1
Async SQLAlchemy database session management

Uses asyncpg driver with connection pooling configured for production.
The engine is created once at application startup and reused across requests.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

import structlog
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

logger = structlog.get_logger(__name__)

import socket
from urllib.parse import urlparse

def is_db_reachable(url: str, timeout: float = 0.5) -> bool:
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False

# Module-level engine and session factory (created once at startup)
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return the module-level async engine, creating it if necessary."""
    global _engine
    if _engine is None:
        settings = get_settings()
        url = settings.model1_database_url
        if not is_db_reachable(url):
            logger.info("PostgreSQL unreachable for Model 1, using SQLite fallback for local environment")
            _engine = create_async_engine("sqlite+aiosqlite:///../sentinel_model1.db", echo=settings.is_dev)
        else:
            _engine = create_async_engine(
                url,
                echo=settings.is_dev,           # Log SQL in development
                pool_size=20,                    # Base pool connections
                max_overflow=10,                 # Additional connections under load
                pool_timeout=30,                 # Wait up to 30s for a connection
                pool_recycle=1800,               # Recycle connections every 30 min
                pool_pre_ping=True,              # Verify connection before use
                connect_args={
                    "server_settings": {
                        "application_name": "sentinel-model1",
                        "jit": "off",            # Disable JIT for predictable latency
                    }
                },
            )
            logger.info(
                "database_engine_created",
                url=url.split("@")[1] if "@" in url else url,
                pool_size=20,
            )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the module-level session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,  # Don't re-fetch after commit (async-safe)
            autocommit=False,
            autoflush=False,
        )
    return _session_factory


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session per request.

    Commits on success, rolls back on exception, always closes.
    Usage:
        @router.get("/")
        async def handler(db: DBSession):
            ...
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """Create all tables — used only in development/testing.

    In production, use Alembic migrations:
        alembic upgrade head
    """
    from app.db.models import Base

    engine = get_engine()
    async with engine.begin() as conn:
        if "sqlite" not in str(engine.url):
            try:
                await conn.execute(
                    __import__("sqlalchemy").text("CREATE EXTENSION IF NOT EXISTS postgis")
                )
                await conn.execute(
                    __import__("sqlalchemy").text("CREATE EXTENSION IF NOT EXISTS pgcrypto")
                )
            except Exception:
                pass
        await conn.run_sync(Base.metadata.create_all)
    logger.info("database_tables_created")


async def dispose_engine() -> None:
    """Dispose the connection pool on shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("database_engine_disposed")


async def check_connection() -> bool:
    """Health check: verify database connectivity."""
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return True
    except Exception as e:
        logger.error("database_health_check_failed", error=str(e))
        return False


# FastAPI dependency type alias for clean injection syntax
# Usage: async def handler(db: DBSession): ...
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from fastapi import Depends
    DBSession = Annotated[AsyncSession, Depends(get_session)]
