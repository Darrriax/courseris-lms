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
    middle_name: Optional[str] = None
    age: Optional[int] = Field(default=None, nullable=True)
    phone_number: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    role: str = Field(default="student")  # "student" or "teacher"
    gender: str = Field(default="MALE", nullable=False)  # "MALE" or "FEMALE"
    avatar: Optional[str] = None  # Legacy field for backward compatibility
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    def get_full_name(self) -> str:
        """Get full name"""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
    
    @property
    def name(self) -> str:
        """Computed property for full name (for backward compatibility)"""
        return self.get_full_name()
    
    @property
    def display_avatar(self) -> Optional[str]:
        """Get avatar URL, preferring avatar_url over avatar"""
        return self.avatar_url or self.avatar

