"""
Database models for Learning Service
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class Enrollment(SQLModel, table=True):
    __tablename__ = "enrollments"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str  # Foreign key to users table
    course_id: str  # Foreign key to courses table
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)


class Progress(SQLModel, table=True):
    __tablename__ = "progress"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str  # Foreign key to users table
    lesson_id: str  # Foreign key to lessons table
    is_completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

