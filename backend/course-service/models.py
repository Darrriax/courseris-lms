"""
Database models for Course Service
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
import uuid


class Lesson(SQLModel, table=True):
    __tablename__ = "lessons"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    module_id: str = Field(foreign_key="modules.id")
    title: str
    duration: str  # e.g., "15:30"
    type: str = Field(default="video")  # "video", "quiz", "reading", "article"
    content: Optional[str] = None
    order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Module(SQLModel, table=True):
    __tablename__ = "modules"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    course_id: str = Field(foreign_key="courses.id")
    title: str
    order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Course(SQLModel, table=True):
    __tablename__ = "courses"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str
    author: str
    thumbnail: str
    category: str
    price: float = Field(default=0.0)  # 0.0 means "Free"
    rating: float = Field(default=0.0)
    total_students: int = Field(default=0)
    duration: Optional[str] = None
    description: Optional[str] = None
    status: str = Field(default="Draft")  # "Published", "Draft", "Archived"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    teacher_id: str  # Foreign key to users table

