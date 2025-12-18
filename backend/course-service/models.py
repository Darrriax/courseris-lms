"""
Database models for Course Service
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Any
from datetime import datetime
import uuid
from sqlalchemy import Column, JSON


class Category(SQLModel, table=True):
    """Course categories managed by manager."""

    __tablename__ = "categories"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Lesson(SQLModel, table=True):
    __tablename__ = "lessons"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    module_id: str = Field(foreign_key="modules.id")
    title: str
    duration: str
    type: str = Field(default="video")
    content: Optional[Any] = Field(
        default=None,
        sa_column=Column(JSON)
    )
    order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    module: Optional["Module"] = Relationship(back_populates="lessons")


class Module(SQLModel, table=True):
    __tablename__ = "modules"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    course_id: str = Field(foreign_key="courses.id")
    title: str
    order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    lessons: List[Lesson] = Relationship(
        back_populates="module",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    course: Optional["Course"] = Relationship(back_populates="modules")


class Course(SQLModel, table=True):
    __tablename__ = "courses"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str
    author: str
    thumbnail: str
    thumbnail_url: Optional[str] = None
    category: str
    price: float = Field(default=0.0)
    rating: float = Field(default=0.0)
    total_students: int = Field(default=0)
    duration: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    learning_outcomes: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(JSON)
    )
    status: str = Field(default="Draft")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    teacher_id: str
    modules: List[Module] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

