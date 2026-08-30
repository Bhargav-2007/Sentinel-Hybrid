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

def get_effective_db_url() -> str:
    """Returns working database URL with automatic container vs host resolution."""
    url = settings.async_database_url
    is_docker = os.path.exists("/.dockerenv") or os.environ.get("POSTGRES_HOST") == "postgres"
    if not is_docker and "@postgres:" in url:
        return url.replace("@postgres:", "@127.0.0.1:")
    return url

# Primary Async Engine
try:
    engine = create_async_engine(
        get_effective_db_url(),
        echo=settings.DEBUG,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
    )
except Exception as e:
    logger.warning(f"Could not initialize PostgreSQL async engine: {e}. Falling back to SQLite.")
    engine = create_async_engine(
        settings.SQLITE_FALLBACK_URL,
        echo=settings.DEBUG,
    )

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
