"""
Gujarat Sentinel — Model 2
Async database session management (same pattern as Model 1)
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import structlog
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

logger = structlog.get_logger(__name__)

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


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

def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        url = settings.model2_database_url
        if not is_db_reachable(url):
            logger.info("PostgreSQL unreachable for Model 2, using SQLite fallback for local environment")
            _engine = create_async_engine("sqlite+aiosqlite:///../sentinel_platform.db", echo=settings.is_dev)
        else:
            _engine = create_async_engine(
                url,
                echo=settings.is_dev,
                pool_size=20,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=1800,
                pool_pre_ping=True,
                connect_args={
                    "server_settings": {"application_name": "sentinel-model2", "jit": "off"}
                },
            )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(), class_=AsyncSession,
            expire_on_commit=False, autocommit=False, autoflush=False,
        )
    return _session_factory


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_tables() -> None:
    from app.db.models import Base
    engine = get_engine()
    async with engine.begin() as conn:
        if "postgresql" in str(engine.url):
            try:
                await conn.execute(__import__("sqlalchemy").text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
            except Exception as e:
                logger.warning(f"Could not enable pgcrypto extension: {e}")
        try:
            await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            logger.warning(f"Metadata create_all notice: {e}")
    logger.info("model2_tables_created")


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None


async def check_db() -> bool:
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return True
    except Exception:
        return False
