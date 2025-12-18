"""
Learning Service - FastAPI application
"""
from fastapi import FastAPI, Depends, HTTPException, status, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete
from typing import Optional, List
from datetime import datetime, timedelta
import httpx
import os
import sys

from database import get_session, init_db
from models import Enrollment, Progress, CourseQnA, Certificate, CourseReview, ModuleDiscussion, ManagerMessage

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


def certificate_to_dict(item: Certificate) -> dict:
    """Serialize Certificate for API responses."""
    return {
        "id": item.id,
        "user_id": item.user_id,
        "course_id": item.course_id,
        "course_title": item.course_title,
        "score_pct": item.score_pct,
        "issued_at": item.issued_at.isoformat(),
    }


def review_to_dict(item: CourseReview) -> dict:
    """Serialize CourseReview for API responses."""
    return {
        "id": item.id,
        "user_id": item.user_id,
        "course_id": item.course_id,
        "rating": item.rating,
        "comment": item.comment,
        "student_name": item.student_name,
        "created_at": item.created_at.isoformat(),
    }


def module_discussion_to_dict(item: ModuleDiscussion) -> dict:
    """Serialize ModuleDiscussion for API responses."""
    return {
        "id": item.id,
        "course_id": item.course_id,
        "module_id": item.module_id,
        "author_id": item.author_id,
        "author_name": item.author_name,
        "author_role": item.author_role,
        "message": item.message,
        "created_at": item.created_at.isoformat(),
    }



def _simple_pdf_bytes(lines: List[str]) -> bytes:
    """
    Minimal PDF generator (no external deps).
    Produces a single-page PDF with provided lines.
    """
    # Escape parens
    safe_lines = [l.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for l in lines]
    text_ops = []
    y = 760
    for line in safe_lines:
        text_ops.append(f"1 0 0 1 72 {y} Tm ({line}) Tj")
        y -= 18
    stream = "BT\n/F1 14 Tf\n" + "\n".join(text_ops) + "\nET\n"
    stream_bytes = stream.encode("utf-8")

    # Build PDF objects
    objs: List[bytes] = []
    objs.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objs.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objs.append(b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n")
    objs.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objs.append(
        b"5 0 obj << /Length "
        + str(len(stream_bytes)).encode("ascii")
        + b" >> stream\n"
        + stream_bytes
        + b"endstream\nendobj\n"
    )

    # Write xref
    header = b"%PDF-1.4\n"
    body = b""
    offsets = [0]
    current = len(header)
    for obj in objs:
        offsets.append(current)
        body += obj
        current += len(obj)

    xref_start = len(header) + len(body)
    xref = [b"xref\n", f"0 {len(offsets)}\n".encode("ascii")]
    xref.append(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        xref.append(f"{off:010d} 00000 n \n".encode("ascii"))

    trailer = (
        b"trailer << /Size "
        + str(len(offsets)).encode("ascii")
        + b" /Root 1 0 R >>\nstartxref\n"
        + str(xref_start).encode("ascii")
        + b"\n%%EOF\n"
    )

    return header + body + b"".join(xref) + trailer


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
    
    # Calculate certificates based on issued certificates
    result = await session.execute(
        select(func.count(Certificate.id)).where(Certificate.user_id == user.id)
    )
    certificates = result.scalar() or 0
    
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


@app.post("/qna/personal")
async def create_personal_message(
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Students send a personal message to a teacher (not course-specific)."""
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
            detail="Only students can send personal messages",
        )

    teacher_id = payload.get("teacher_id")
    message = payload.get("message")
    if not teacher_id or not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="teacher_id and message are required",
        )

    # Verify teacher exists (optional check - if it fails, we'll still create the message)
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/users/{teacher_id}/public",
                timeout=5.0
            )
            if response.status_code != 200:
                # Teacher not found, but we'll still allow the message to be created
                # The teacher might exist but the service might be temporarily unavailable
                pass
        except Exception:
            # If verification fails, we'll still create the message
            # This allows the system to work even if auth service is down
            pass

    # Use special marker for personal messages (since course_id may have NOT NULL constraint)
    qna = CourseQnA(
        course_id="__personal__",  # Special marker for personal messages
        course_title="Personal Message",
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


@app.get("/qna/student")
async def get_student_messages(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Fetch messages sent by the current student to teachers."""
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
            detail="Only students can view their messages",
        )

    result = await session.execute(
        select(CourseQnA)
        .where(CourseQnA.student_id == user.id)
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

    # Create payment record
    course_price = course.get("price", 0)
    if isinstance(course_price, str):
        course_price = 0.0 if course_price.lower() == "free" else float(course_price)
    
    payment_method = "FREE" if course_price == 0 else "CREDIT_CARD"
    
    # Call payment service to create payment record
    PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://localhost:8004")
    async with httpx.AsyncClient() as client:
        try:
            payment_data = {
                "user_id": user.id,
                "course_id": course_id,
                "amount": float(course_price),
                "currency": "USD",
                "status": "completed",
                "payment_method": payment_method
            }
            await client.post(
                f"{PAYMENT_SERVICE_URL}/api/v1/payments/",
                json=payment_data,
                timeout=5.0
            )
        except Exception as e:
            # Log error but don't fail enrollment if payment service is down
            print(f"Failed to create payment record: {e}")

    return enrollment_to_dict(enrollment, course)


@app.post("/courses/{course_id}/enroll")
async def enroll_course_by_path(
    course_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Enroll the current student into a course (RESTful path)."""
    return await _enroll_current_student(course_id, authorization, session)


@app.delete("/courses/{course_id}/enroll")
async def unenroll_course(
    course_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Unenroll the current student from a course and clear their progress."""
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
            detail="Only students can leave courses",
        )

    # Find enrollment
    result = await session.execute(
        select(Enrollment).where(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        # Idempotent behavior
        return {"detail": "not_enrolled"}

    # Try to fetch course lessons to clear progress
    lesson_ids: List[str] = []
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{COURSE_SERVICE_URL}/courses/{course_id}/full"
            )
            if resp.status_code == 200:
                course_data = resp.json()
                for module in course_data.get("modules", []):
                    for lesson in module.get("lessons", []):
                        lid = lesson.get("id")
                        if lid:
                            lesson_ids.append(lid)
        except Exception:
            # If we can't fetch course details, we'll still remove enrollment
            lesson_ids = []

    # Delete progress for this course's lessons
    if lesson_ids:
        await session.execute(
            delete(Progress).where(
                Progress.user_id == user.id,
                Progress.lesson_id.in_(lesson_ids),
            )
        )

    # Delete any certificates for this course so the student can earn
    # a new certificate if they re-enroll and complete the course again.
    await session.execute(
        delete(Certificate).where(
            Certificate.user_id == user.id,
            Certificate.course_id == course_id,
        )
    )

    # Delete any course review (rating + comment) left by this student
    # so it disappears if they leave the course.
    await session.execute(
        delete(CourseReview).where(
            CourseReview.user_id == user.id,
            CourseReview.course_id == course_id,
        )
    )

    await session.delete(enrollment)
    await session.commit()

    return {"detail": "unenrolled"}


@app.get("/courses/{course_id}/modules/{module_id}/discussion")
async def list_module_discussion(
    course_id: str,
    module_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """List discussion messages for a specific module (students + teacher)."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    result = await session.execute(
        select(ModuleDiscussion)
        .where(
            ModuleDiscussion.course_id == course_id,
            ModuleDiscussion.module_id == module_id,
        )
        .order_by(ModuleDiscussion.created_at.asc())
    )
    items = result.scalars().all()
    return [module_discussion_to_dict(item) for item in items]


@app.post("/courses/{course_id}/modules/{module_id}/discussion")
async def post_module_discussion(
    course_id: str,
    module_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Post a discussion message at the end of a module (student or teacher)."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    text = (payload.get("message") or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message is required",
        )

    # Fetch course to check teacher and existence
    course = await fetch_course(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    teacher_id = course.get("teacher_id")

    # Authorization rules:
    # - Teacher: must be the owner of the course
    # - Student: must be enrolled in the course
    if user.role == "teacher":
        if not teacher_id or user.id != teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the teacher of this course",
            )
        author_role = "teacher"
    elif user.role == "student":
        # Ensure student is enrolled
        result = await session.execute(
            select(Enrollment).where(
                Enrollment.user_id == user.id,
                Enrollment.course_id == course_id,
            )
        )
        enrollment = result.scalar_one_or_none()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must be enrolled in the course to participate in discussion",
            )
        author_role = "student"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students and the course teacher can post discussion messages",
        )

    msg = ModuleDiscussion(
        course_id=course_id,
        module_id=module_id,
        author_id=user.id,
        author_name=user.name,
        author_role=author_role,
        message=text,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return module_discussion_to_dict(msg)

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


@app.post("/certificates")
async def issue_certificate(
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Issue a certificate for a course if the student meets the criteria."""
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
            detail="Only students can request certificates",
        )

    course_id = payload.get("course_id")
    score_pct = payload.get("score_pct")
    if not course_id or score_pct is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="course_id and score_pct are required",
        )

    try:
        score_pct_int = int(score_pct)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="score_pct must be an integer",
        )

    if score_pct_int < 60:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score is below the minimum threshold for a certificate",
        )

    # Ensure student is enrolled in the course
    result = await session.execute(
        select(Enrollment).where(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be enrolled in the course to receive a certificate",
        )

    # Check if certificate already exists
    result = await session.execute(
        select(Certificate).where(
            Certificate.user_id == user.id,
            Certificate.course_id == course_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return certificate_to_dict(existing)

    # Fetch course to get title
    course = await fetch_course(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    cert = Certificate(
        user_id=user.id,
        course_id=course_id,
        course_title=course.get("title") or "Course",
        score_pct=score_pct_int,
    )
    session.add(cert)
    await session.commit()
    await session.refresh(cert)

    return certificate_to_dict(cert)


@app.get("/certificates/me")
async def get_my_certificates(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """List certificates issued to the current student."""
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
            detail="Only students can view their certificates",
        )

    result = await session.execute(
        select(Certificate).where(Certificate.user_id == user.id).order_by(
            desc(Certificate.issued_at)
        )
    )
    items = result.scalars().all()
    return [certificate_to_dict(item) for item in items]


@app.get("/certificates/{certificate_id}/pdf")
async def download_certificate_pdf(
    certificate_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Download a certificate as a PDF (student only, must own certificate)."""
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
            detail="Only students can download certificates",
        )

    result = await session.execute(
        select(Certificate).where(Certificate.id == certificate_id)
    )
    cert = result.scalar_one_or_none()
    if not cert or cert.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )

    issued = cert.issued_at.strftime("%Y-%m-%d %H:%M UTC")
    pdf = _simple_pdf_bytes(
        [
            "Certificate of Completion",
            "",
            f"Student: {user.name}",
            f"Course: {cert.course_title}",
            f"Score: {cert.score_pct}%",
            f"Issued at: {issued}",
        ]
    )

    filename = f"certificate-{cert.course_id}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/courses/{course_id}/reviews")
async def create_or_update_review(
    course_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Create or update a student's review for a course."""
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
            detail="Only students can leave reviews",
        )

    rating = payload.get("rating")
    comment = (payload.get("comment") or "").strip()
    if rating is None or not (1 <= int(rating) <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rating must be an integer between 1 and 5",
        )
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="comment is required",
        )

    # Optional: ensure the student is enrolled in this course
    result = await session.execute(
        select(Enrollment).where(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be enrolled in the course to leave a review",
        )

    # Upsert: if review exists for (user, course), update it
    result = await session.execute(
        select(CourseReview).where(
            CourseReview.user_id == user.id,
            CourseReview.course_id == course_id,
        )
    )
    review = result.scalar_one_or_none()
    now = datetime.utcnow()
    if review:
        review.rating = int(rating)
        review.comment = comment
        review.updated_at = now
    else:
        review = CourseReview(
            user_id=user.id,
            course_id=course_id,
            rating=int(rating),
            comment=comment,
            student_name=user.name,
            created_at=now,
        )
        session.add(review)

    await session.commit()
    await session.refresh(review)
    return review_to_dict(review)


@app.get("/courses/{course_id}/reviews")
async def list_course_reviews(
    course_id: str,
    session: AsyncSession = Depends(get_session),
):
    """List reviews for a course (public)."""
    result = await session.execute(
        select(CourseReview)
        .where(CourseReview.course_id == course_id)
        .order_by(desc(CourseReview.created_at))
    )
    items = result.scalars().all()
    return [review_to_dict(item) for item in items]


@app.get("/courses/{course_id}/metrics")
async def get_course_metrics(
    course_id: str,
    session: AsyncSession = Depends(get_session),
):
    """
    Aggregate metrics for a course:
    - students_count: number of enrollments
    - rating: average review rating (1-5), 1 decimal
    - ratings_count: number of reviews
    """
    # Count students (enrollments)
    result = await session.execute(
        select(func.count(Enrollment.id)).where(Enrollment.course_id == course_id)
    )
    students_count = result.scalar() or 0

    # Average rating + count
    result = await session.execute(
        select(func.avg(CourseReview.rating), func.count(CourseReview.id)).where(
            CourseReview.course_id == course_id
        )
    )
    avg_rating, ratings_count = result.first() or (None, 0)
    if avg_rating is None:
        rating_value = 0.0
    else:
        rating_value = float(round(float(avg_rating), 1))

    return {
        "students_count": int(students_count),
        "rating": rating_value,
        "ratings_count": int(ratings_count or 0),
    }


@app.get("/analytics/top-courses")
async def analytics_top_courses(
    session: AsyncSession = Depends(get_session),
):
    """
    Return top 10 most popular courses by student count.
    Each item includes course_id, title, and students_count.
    """
    result = await session.execute(
        select(Enrollment.course_id, func.count(Enrollment.id).label("students"))
        .group_by(Enrollment.course_id)
        .order_by(desc("students"))
        .limit(10)
    )
    rows = result.all()
    if not rows:
        return []

    top_courses = []
    for course_id, students in rows:
        course = await fetch_course(course_id)
        title = course.get("title") if course else "Course"
        top_courses.append(
            {
                "course_id": course_id,
                "title": title,
                "students_count": int(students or 0),
            }
        )

    return top_courses


@app.get("/progress/course/{course_id}")
async def get_course_progress(
    course_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Return IDs of lessons completed by the current student in a given course."""
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
            detail="Only students can view course progress",
        )

    # Fetch course to get all lesson IDs
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{COURSE_SERVICE_URL}/courses/{course_id}/full")
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Course not found",
                )
            course_data = resp.json()
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to fetch course details",
            )

    lesson_ids: List[str] = []
    for module in course_data.get("modules", []):
        for lesson in module.get("lessons", []):
            lesson_id = lesson.get("id")
            if lesson_id:
                lesson_ids.append(lesson_id)

    if not lesson_ids:
        return {"completedLessonIds": []}

    result = await session.execute(
        select(Progress.lesson_id)
        .where(Progress.user_id == user.id)
        .where(Progress.lesson_id.in_(lesson_ids))
        .where(Progress.is_completed == True)
    )
    completed_ids = [row[0] for row in result.all()]

    return {"completedLessonIds": completed_ids}


# ============================================================================
# TEACHER ↔ MANAGER MESSAGING
# ============================================================================

def manager_message_to_dict(msg: ManagerMessage) -> dict:
    return {
        "id": msg.id,
        "teacher_id": msg.teacher_id,
        "teacher_name": msg.teacher_name,
        "subject": msg.subject,
        "message": msg.message,
        "reply": msg.reply,
        "status": msg.status,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "replied_at": msg.replied_at.isoformat() if msg.replied_at else None,
    }


@app.post("/manager/messages")
async def send_message_to_manager(
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Teacher sends a message to the course manager."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can message the manager")

    subject = payload.get("subject", "").strip()
    message = payload.get("message", "").strip()
    if not subject or not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject and message are required")

    msg = ManagerMessage(
        teacher_id=user.id,
        teacher_name=user.name or f"{user.first_name} {user.last_name}",
        subject=subject,
        message=message,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return manager_message_to_dict(msg)


@app.get("/manager/messages")
async def get_manager_messages(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Manager gets all messages from teachers."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can view these messages")

    result = await session.execute(
        select(ManagerMessage).order_by(desc(ManagerMessage.created_at))
    )
    messages = result.scalars().all()
    return [manager_message_to_dict(m) for m in messages]


@app.get("/manager/messages/mine")
async def get_my_messages_to_manager(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Teacher gets their own messages sent to the manager."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can view their messages")

    result = await session.execute(
        select(ManagerMessage)
        .where(ManagerMessage.teacher_id == user.id)
        .order_by(desc(ManagerMessage.created_at))
    )
    messages = result.scalars().all()
    return [manager_message_to_dict(m) for m in messages]


@app.post("/manager/messages/{message_id}/reply")
async def reply_to_teacher_message(
    message_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Manager replies to a teacher's message."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can reply")

    result = await session.execute(
        select(ManagerMessage).where(ManagerMessage.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    reply_text = payload.get("reply", "").strip()
    if not reply_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reply text is required")

    msg.reply = reply_text
    msg.status = "answered"
    msg.replied_at = datetime.utcnow()
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return manager_message_to_dict(msg)


@app.post("/manager/messages/to-teacher")
async def manager_send_message_to_teacher(
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """
    Manager sends a message directly to a teacher (e.g. course rejection explanation).
    This creates a ManagerMessage visible in the teacher's dashboard.
    """
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can send these messages",
        )

    teacher_id = (payload.get("teacher_id") or "").strip()
    subject = (payload.get("subject") or "").strip()
    message = (payload.get("message") or "").strip()

    if not teacher_id or not subject or not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="teacher_id, subject and message are required",
        )

    msg = ManagerMessage(
        teacher_id=teacher_id,
        teacher_name=None,
        subject=subject,
        message=message,
        status="answered",
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return manager_message_to_dict(msg)

