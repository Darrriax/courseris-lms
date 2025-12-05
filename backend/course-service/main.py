"""
Course Service - FastAPI application
"""
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import httpx
import os
import sys

from database import get_session, init_db
from models import Course, Module, Lesson

sys.path.append('/app/shared')
from shared.models import UserResponse

app = FastAPI(title="Course Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth_service:8000")


async def verify_token(token: str) -> Optional[UserResponse]:
    """Verify JWT token with auth service"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return UserResponse(**response.json())
            return None
        except Exception:
            return None


def get_token_from_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract token from Authorization header"""
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    return None


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "course-service"}


@app.get("/courses")
async def get_courses(
    session: AsyncSession = Depends(get_session)
):
    """Get all published courses (public catalog)"""
    result = await session.execute(
        select(Course).where(Course.status == "Published")
    )
    courses = result.scalars().all()
    
    return [
        {
            "id": course.id,
            "title": course.title,
            "author": course.author,
            "thumbnail": course.thumbnail,
            "category": course.category,
            "price": course.price if course.price > 0 else "Free",
            "rating": course.rating,
            "totalStudents": course.total_students,
            "duration": course.duration,
            "description": course.description,
        }
        for course in courses
    ]


@app.get("/courses/{course_id}/full")
async def get_course_full(
    course_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Get course with nested modules and lessons"""
    result = await session.execute(
        select(Course).where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get modules
    modules_result = await session.execute(
        select(Module).where(Module.course_id == course_id).order_by(Module.order)
    )
    modules = modules_result.scalars().all()
    
    # Get lessons for each module
    modules_with_lessons = []
    for module in modules:
        lessons_result = await session.execute(
            select(Lesson).where(Lesson.module_id == module.id).order_by(Lesson.order)
        )
        lessons = lessons_result.scalars().all()
        
        modules_with_lessons.append({
            "id": module.id,
            "title": module.title,
            "lessons": [
                {
                    "id": lesson.id,
                    "title": lesson.title,
                    "duration": lesson.duration,
                    "type": lesson.type,
                    "isCompleted": False,  # Will be set by learning service
                    "isLocked": False,  # Will be set by learning service
                }
                for lesson in lessons
            ]
        })
    
    return {
        "id": course.id,
        "title": course.title,
        "author": course.author,
        "thumbnail": course.thumbnail,
        "category": course.category,
        "price": course.price if course.price > 0 else "Free",
        "rating": course.rating,
        "totalStudents": course.total_students,
        "duration": course.duration,
        "description": course.description,
        "modules": modules_with_lessons,
    }


@app.post("/courses")
async def create_course(
    course_data: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Create a new course (teacher only)"""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user = await verify_token(token)
    if not user or user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create courses"
        )
    
    new_course = Course(
        title=course_data.get("title", ""),
        author=user.name,
        thumbnail=course_data.get("thumbnail", "https://picsum.photos/400/250"),
        category=course_data.get("category", "General"),
        price=course_data.get("price", 0.0) if isinstance(course_data.get("price"), (int, float)) else 0.0,
        description=course_data.get("description"),
        duration=course_data.get("duration"),
        status=course_data.get("status", "Draft"),
        teacher_id=user.id,
    )
    
    session.add(new_course)
    await session.commit()
    await session.refresh(new_course)
    
    return {
        "id": new_course.id,
        "title": new_course.title,
        "author": new_course.author,
        "thumbnail": new_course.thumbnail,
        "category": new_course.category,
        "price": new_course.price if new_course.price > 0 else "Free",
        "rating": new_course.rating,
        "totalStudents": new_course.total_students,
        "duration": new_course.duration,
        "description": new_course.description,
        "status": new_course.status,
        "createdAt": new_course.created_at.isoformat(),
    }

