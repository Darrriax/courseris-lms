"""
Database models for Learning Service
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class CourseQnA(SQLModel, table=True):
    """Questions/feedback addressed to teachers for a specific course or personal messages."""

    __tablename__ = "course_qna"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    course_id: str  # Use "__personal__" marker for personal messages
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


class Certificate(SQLModel, table=True):
    """Issued certificates for completed courses."""

    __tablename__ = "certificates"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str  # student id
    course_id: str  # course id
    course_title: str
    score_pct: int = Field(default=0)  # overall score percentage at issuance
    issued_at: datetime = Field(default_factory=datetime.utcnow)


class CourseReview(SQLModel, table=True):
    """Student rating + text review for a course."""

    __tablename__ = "course_reviews"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str  # student id
    course_id: str  # course id
    rating: int = Field(default=0)  # 1-5 stars
    comment: str
    student_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class ModuleDiscussion(SQLModel, table=True):
    """Discussion messages at the end of each course module."""

    __tablename__ = "module_discussions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    course_id: str
    module_id: str
    author_id: str
    author_name: str
    author_role: str  # 'student' | 'teacher'
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ManagerMessage(SQLModel, table=True):
    """Messages from teachers to the course manager."""

    __tablename__ = "manager_messages"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    teacher_id: str
    teacher_name: Optional[str] = None
    subject: str
    message: str
    reply: Optional[str] = None
    status: str = Field(default="open")  # open | answered
    created_at: datetime = Field(default_factory=datetime.utcnow)
    replied_at: Optional[datetime] = None

