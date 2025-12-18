"""
Shared Pydantic models based on frontend types.ts
"""
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    age: Optional[int] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    role: Literal["student", "teacher", "manager", "admin"]
    gender: Literal["MALE", "FEMALE"]


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    age: Optional[int] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[Literal["MALE", "FEMALE"]] = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    age: Optional[int] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    role: Literal["student", "teacher", "manager", "admin"]
    gender: Literal["MALE", "FEMALE"]
    avatar: Optional[str] = None  # Legacy field
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    name: Optional[str] = None  # Computed full name for backward compatibility
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

