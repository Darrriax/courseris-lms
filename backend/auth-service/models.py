"""
Database models for Auth Service
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
import uuid


class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    first_name: str
    last_name: str
    age: Optional[int] = None
    role: str = Field(default="student")  # "student" or "teacher"
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    def get_full_name(self) -> str:
        """Get full name"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def name(self) -> str:
        """Computed property for full name (for backward compatibility)"""
        return self.get_full_name()

