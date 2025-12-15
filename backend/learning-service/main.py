"""
Learning Service - FastAPI application
"""
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional, List
from datetime import datetime, timedelta
import httpx
import os
import sys

from database import get_session, init_db
from models import Enrollment, Progress, CourseQnA

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

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
COURSE_SERVICE_URL = os.getenv("COURSE_SERVICE_URL", "http://localhost:8002")


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


async def fetch_course(course_id: str) -> Optional[dict]:
    """Fetch a single course from the course service."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{COURSE_SERVICE_URL}/courses/{course_id}/full")
            if response.status_code == 200:
                return response.json()
            return None
        except Exception:
            return None


def summarize_course(course_data: dict) -> dict:
    """Normalize course payload from course-service for frontend consumption."""
    return {
        "id": course_data.get("id"),
        "title": course_data.get("title"),
        "author": course_data.get("author"),
        "thumbnail": course_data.get("thumbnail_url") or course_data.get("thumbnail"),
        "category": course_data.get("category"),
        "price": course_data.get("price"),
        "rating": course_data.get("rating", 0),
        "totalStudents": course_data.get("totalStudents")
        or course_data.get("total_students")
        or 0,
        "duration": course_data.get("duration"),
        "status": course_data.get("status"),
        "teacher_id": course_data.get("teacher_id"),
    }


def enrollment_to_dict(enrollment: Enrollment, course_data: Optional[dict] = None) -> dict:
    """Serialize enrollment with optional course summary."""
    payload = {
        "id": enrollment.id,
        "course_id": enrollment.course_id,
        "user_id": enrollment.user_id,
        "enrolled_at": enrollment.enrolled_at.isoformat(),
    }
    if course_data:
        payload["course"] = summarize_course(course_data)
    return payload


def qna_to_dict(item: CourseQnA) -> dict:
    """Serialize CourseQnA for API responses."""
    return {
        "id": item.id,
        "course_id": item.course_id,
        "course_title": item.course_title,
        "teacher_id": item.teacher_id,
        "student_id": item.student_id,
        "student_name": item.student_name,
        "message": item.message,
        "reply": item.reply,
        "status": item.status,
        "created_at": item.created_at.isoformat(),
        "replied_at": item.replied_at.isoformat() if item.replied_at else None,
    }


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


@app.post("/qna/questions")
async def create_question(
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Students ask a question/leave feedback for a course."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = await verify_token(token)
    if not user or user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create questions",
        )

    course_id = payload.get("course_id")
    message = payload.get("message")
    if not course_id or not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="course_id and message are required",
        )

    course = await fetch_course(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    teacher_id = course.get("teacher_id")
    if not teacher_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course does not have a teacher",
        )

    qna = CourseQnA(
        course_id=course_id,
        course_title=course.get("title"),
        teacher_id=teacher_id,
        student_id=user.id,
        student_name=user.name,
        message=message,
    )
    session.add(qna)
    await session.commit()
    await session.refresh(qna)

    return qna_to_dict(qna)


@app.get("/qna/teacher")
async def get_teacher_questions(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Fetch questions/feedback for the current teacher's courses."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = await verify_token(token)
    if not user or user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can view their questions",
        )

    result = await session.execute(
        select(CourseQnA)
        .where(CourseQnA.teacher_id == user.id)
        .order_by(desc(CourseQnA.created_at))
    )
    items = result.scalars().all()
    return [qna_to_dict(item) for item in items]


@app.post("/qna/{qna_id}/reply")
async def reply_to_question(
    qna_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Allow teachers to reply to a student's question/feedback."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = await verify_token(token)
    if not user or user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can reply to questions",
        )

    reply_text = payload.get("reply")
    if not reply_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reply is required",
        )

    result = await session.execute(
        select(CourseQnA).where(CourseQnA.id == qna_id)
    )
    qna = result.scalar_one_or_none()
    if not qna:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    if qna.teacher_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this question",
        )

    qna.reply = reply_text
    qna.status = "answered"
    qna.replied_at = datetime.utcnow()

    session.add(qna)
    await session.commit()
    await session.refresh(qna)
    return qna_to_dict(qna)


async def _enroll_current_student(
    course_id: str,
    authorization: Optional[str],
    session: AsyncSession,
) -> dict:
    """Shared enrollment logic for students."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = await verify_token(token)
    if not user or user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can enroll in courses",
        )

    course = await fetch_course(course_id)
    if not course or course.get("status", "").upper() != "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or unavailable",
        )

    result = await session.execute(
        select(Enrollment).where(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return enrollment_to_dict(existing, course)

    enrollment = Enrollment(user_id=user.id, course_id=course_id)
    session.add(enrollment)
    await session.commit()
    await session.refresh(enrollment)

    return enrollment_to_dict(enrollment, course)


@app.post("/courses/{course_id}/enroll")
async def enroll_course_by_path(
    course_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Enroll the current student into a course (RESTful path)."""
    return await _enroll_current_student(course_id, authorization, session)


@app.post("/enrollments")
async def enroll_course(
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Enroll the current student into a course (legacy payload style)."""
    course_id = payload.get("course_id")
    if not course_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="course_id is required",
        )
    return await _enroll_current_student(course_id, authorization, session)


@app.get("/enrollments/me")
async def get_my_enrollments(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """List enrollments for the current student with course summaries."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = await verify_token(token)
    if not user or user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can view enrollments",
        )

    result = await session.execute(
        select(Enrollment).where(Enrollment.user_id == user.id)
    )
    enrollments: List[Enrollment] = result.scalars().all()
    if not enrollments:
        return []

    responses = []
    async with httpx.AsyncClient() as client:
        for enrollment in enrollments:
            course_data = None
            try:
                resp = await client.get(
                    f"{COURSE_SERVICE_URL}/courses/{enrollment.course_id}/full"
                )
                if resp.status_code == 200:
                    course_data = resp.json()
            except Exception:
                course_data = None
            responses.append(enrollment_to_dict(enrollment, course_data))

    return responses


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

