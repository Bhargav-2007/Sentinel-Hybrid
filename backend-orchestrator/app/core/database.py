"""Async Database connection and Session management with PostgreSQL & PostGIS support."""

import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

logger = logging.getLogger("sentinel.database")

# Declarative Base
class Base(DeclarativeBase):
    pass


import os
import socket
from urllib.parse import urlparse

def is_db_reachable(url: str, timeout: float = 0.5) -> bool:
    """Fast check if database TCP port is open."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False

def get_effective_db_url() -> str:
    """Returns working database URL with automatic container vs host resolution."""
    url = settings.async_database_url
    is_docker = os.path.exists("/.dockerenv") or os.environ.get("POSTGRES_HOST") == "postgres"
    if not is_docker and "@postgres:" in url:
        return url.replace("@postgres:", "@127.0.0.1:")
    return url

def create_db_engine():
    """Initializes async SQLAlchemy engine with fail-closed behavior in production."""
    url = get_effective_db_url()
    if url.startswith("sqlite"):
        if settings.ENVIRONMENT.lower() in ("production", "live"):
            raise RuntimeError(
                "DATABASE_UNAVAILABLE: Configured database URL uses SQLite. "
                "Production/LIVE environments strictly require PostgreSQL + PostGIS. "
                "Silent SQLite fallback is strictly prohibited in LIVE/PRODUCTION mode."
            )
        return create_async_engine(url, echo=settings.DEBUG)
    
    if not is_db_reachable(url):
        if settings.ENVIRONMENT.lower() in ("production", "live"):
            raise RuntimeError(
                f"DATABASE_UNAVAILABLE: PostgreSQL endpoint '{url}' is unreachable. "
                "Silent SQLite fallback is strictly prohibited in LIVE/PRODUCTION mode."
            )
        logger.info(f"PostgreSQL endpoint {url} is not reachable. Falling back to SQLite for local development/test.")
        return create_async_engine(settings.SQLITE_FALLBACK_URL, echo=settings.DEBUG)

    try:
        return create_async_engine(
            url,
            echo=settings.DEBUG,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True,
        )
    except Exception as e:
        if settings.ENVIRONMENT.lower() in ("production", "live"):
            raise RuntimeError(
                f"DATABASE_UNAVAILABLE: Failed to initialize PostgreSQL engine: {e}. "
                "Silent SQLite fallback is strictly prohibited in LIVE/PRODUCTION mode."
            )
        logger.warning(f"Could not initialize PostgreSQL engine: {e}. Falling back to SQLite.")
        return create_async_engine(settings.SQLITE_FALLBACK_URL, echo=settings.DEBUG)

# Primary Async Engine
engine = create_db_engine()

# Async Session Maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an asynchronous database session with auto-rollback on exception."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initializes the database schema and verifies PostGIS extension if PostgreSQL is active."""
    async with engine.begin() as conn:
        # If on PostgreSQL, ensure PostGIS extension is loaded
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            logger.info("PostGIS extension confirmed.")
        except Exception as e:
            logger.debug(f"PostGIS extension notice (non-fatal on SQLite): {e}")

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Ensure SQLite backward-compatibility columns
        try:
            await conn.execute(text("ALTER TABLE officers ADD COLUMN jurisdiction VARCHAR(128);"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE officers ADD COLUMN custom_permissions JSON DEFAULT '[]';"))
        except Exception:
            pass

        logger.info("All Sentinel platform database tables initialized successfully.")


async def check_db_health() -> bool:
    """Executes a lightweight query to verify database connectivity."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
