"""
Database models for Learning Service
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class CourseQnA(SQLModel, table=True):
    """Questions/feedback addressed to teachers for a specific course."""

    __tablename__ = "course_qna"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    course_id: str
    teacher_id: str
    student_id: str
    student_name: Optional[str] = None
    course_title: Optional[str] = None
    message: str
    reply: Optional[str] = None
    status: str = Field(default="open")  # open | answered
    created_at: datetime = Field(default_factory=datetime.utcnow)
    replied_at: Optional[datetime] = None


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

