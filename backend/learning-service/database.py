"""
Database configuration for Learning Service
"""
from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import os
from typing import AsyncGenerator

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://courseris:courseris123@db:5432/courseris"
)

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database session"""
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

