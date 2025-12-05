"""
Shared Pydantic models based on frontend types.ts
"""
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    age: Optional[int] = None
    role: Literal["student", "teacher"]


class UserCreate(UserBase):
    password: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    age: Optional[int] = None
    role: Literal["student", "teacher"]
    avatar: Optional[str] = None
    name: Optional[str] = None  # Computed full name for backward compatibility

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

