"""
Learning Service - FastAPI application
"""
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timedelta
import httpx
import os
import sys

from database import get_session, init_db
from models import Enrollment, Progress

sys.path.append('/app/shared')
from shared.models import UserResponse

app = FastAPI(title="Learning Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth_service:8000")
COURSE_SERVICE_URL = os.getenv("COURSE_SERVICE_URL", "http://course_service:8000")


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
    return {"status": "healthy", "service": "learning-service"}


@app.get("/dashboard/stats")
async def get_dashboard_stats(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Get dashboard statistics for current user"""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Calculate weekly activity (hours)
    week_ago = datetime.utcnow() - timedelta(days=7)
    result = await session.execute(
        select(func.count(Progress.id))
        .where(Progress.user_id == user.id)
        .where(Progress.is_completed == True)
        .where(Progress.completed_at >= week_ago)
    )
    completed_lessons = result.scalar() or 0
    # Estimate: assume each lesson is ~15 minutes on average
    weekly_hours = round((completed_lessons * 15) / 60, 1)
    
    # Calculate day streak (simplified - consecutive days with completed lessons)
    # This is a simplified version - in production, you'd want more sophisticated logic
    result = await session.execute(
        select(func.count(func.distinct(func.date(Progress.completed_at))))
        .where(Progress.user_id == user.id)
        .where(Progress.is_completed == True)
        .where(Progress.completed_at >= datetime.utcnow() - timedelta(days=30))
    )
    active_days = result.scalar() or 0
    
    # Calculate certificates (courses completed - simplified)
    # In production, you'd check if all lessons in a course are completed
    result = await session.execute(
        select(func.count(func.distinct(Enrollment.course_id)))
        .where(Enrollment.user_id == user.id)
    )
    enrolled_courses = result.scalar() or 0
    # Simplified: assume 25% completion rate for certificates
    certificates = max(0, enrolled_courses // 4)
    
    return [
        {
            "id": "1",
            "label": "Weekly Activity",
            "value": f"{weekly_hours} hrs",
            "icon": "activity",
            "color": "blue"
        },
        {
            "id": "2",
            "label": "Day Streak",
            "value": f"{active_days} Days",
            "icon": "flame",
            "color": "orange"
        },
        {
            "id": "3",
            "label": "Certificates",
            "value": f"{certificates} Earned",
            "icon": "award",
            "color": "yellow"
        }
    ]


@app.post("/progress/complete")
async def complete_lesson(
    lesson_data: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Mark a lesson as completed"""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    lesson_id = lesson_data.get("lesson_id")
    if not lesson_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lesson_id is required"
        )
    
    # Check if progress already exists
    result = await session.execute(
        select(Progress).where(
            Progress.user_id == user.id,
            Progress.lesson_id == lesson_id
        )
    )
    progress = result.scalar_one_or_none()
    
    if progress:
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
    else:
        progress = Progress(
            user_id=user.id,
            lesson_id=lesson_id,
            is_completed=True,
            completed_at=datetime.utcnow()
        )
        session.add(progress)
    
    await session.commit()
    await session.refresh(progress)
    
    return {
        "id": progress.id,
        "user_id": progress.user_id,
        "lesson_id": progress.lesson_id,
        "is_completed": progress.is_completed,
        "completed_at": progress.completed_at.isoformat() if progress.completed_at else None
    }

