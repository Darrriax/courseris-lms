"""
Course Service - FastAPI application
"""
from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
import httpx
import os
import sys
import uuid
import shutil

from database import get_session, init_db
from models import Course, Module, Lesson
from schemas import CourseCreate

sys.path.append('/app/shared')
from shared.models import UserResponse

app = FastAPI(title="Course Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_UPLOAD_DIR = os.getenv("UPLOADS_DIR", "/Users/daria/Downloads/courseris-frontend/backend/course-service/uploads")
THUMBNAIL_DIR = os.path.join(BASE_UPLOAD_DIR, "thumbnails")
os.makedirs(BASE_UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=BASE_UPLOAD_DIR), name="uploads")

@app.get("/uploads/{path:path}")
async def serve_upload(path: str):
    """Fallback route to serve upload files"""
    file_path = os.path.join(BASE_UPLOAD_DIR, path)
    if os.path.isfile(file_path):
        from fastapi.responses import FileResponse
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth_service:8000")
COURSE_SERVICE_URL = os.getenv("COURSE_SERVICE_URL", "http://course_service:8000")

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


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


def course_to_dict(course: Course) -> dict:
    """Serialize course with consistent fields"""
    thumbnail_value = course.thumbnail_url or course.thumbnail or "https://picsum.photos/400/250"
    return {
        "id": course.id,
        "title": course.title,
        "author": course.author,
        "thumbnail": thumbnail_value,
        "thumbnail_url": course.thumbnail_url,
        "category": course.category,
        "price": course.price if course.price > 0 else "Free",
        "rating": course.rating,
        "totalStudents": course.total_students,
        "duration": course.duration,
        "description": course.description,
        "level": course.level,
        "learning_outcomes": course.learning_outcomes,
        "status": course.status,
        "createdAt": course.created_at.isoformat(),
        "teacher_id": course.teacher_id,
    }


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
    
    return [course_to_dict(course) for course in courses]


@app.get("/courses/me")
async def get_my_courses(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Get courses for current teacher"""
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
            detail="Only teachers can view their courses"
        )

    result = await session.execute(
        select(Course).where(Course.teacher_id == user.id)
    )
    courses = result.scalars().all()
    return [course_to_dict(course) for course in courses]


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
    
    modules_result = await session.execute(
        select(Module).where(Module.course_id == course_id).order_by(Module.order)
    )
    modules = modules_result.scalars().all()
    
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
                    "content": lesson.content,
                    "isCompleted": False,  # Will be set by learning service
                    "isLocked": False,  # Will be set by learning service
                }
                for lesson in lessons
            ]
        })
    
    course_dict = course_to_dict(course)
    course_dict["modules"] = modules_with_lessons
    return course_dict


@app.post("/courses")
async def create_course(
    course: CourseCreate,
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
    
    thumbnail_url = course.thumbnail_url

    new_course = Course(
        title=course.title or "Untitled Course",
        author=user.name,
        thumbnail=thumbnail_url or "https://picsum.photos/400/250",
        thumbnail_url=thumbnail_url,
        category=course.category or "Development",
        price=course.price if isinstance(course.price, (int, float)) else 0.0,
        description=course.description,
        duration=None,
        level=course.level or "Beginner",
        learning_outcomes=course.learning_outcomes,
        status=course.status or "Draft",
        teacher_id=user.id,
    )

    session.add(new_course)
    await session.flush()

    created_modules = []
    for idx, module_data in enumerate(course.modules or []):
        module = Module(
            course_id=new_course.id,
            title=module_data.title or f"Module {idx + 1}",
            order=idx,
        )
        session.add(module)
        await session.flush()  # Get module ID

        module_lessons = []
        for jdx, lesson_data in enumerate(module_data.lessons or []):
            lesson = Lesson(
                module_id=module.id,
                title=lesson_data.title or f"Lesson {jdx + 1}",
                duration=lesson_data.duration or "",
                type=lesson_data.type or "video",
                content=lesson_data.content,
                order=jdx,
            )
            session.add(lesson)
            module_lessons.append(lesson)
        created_modules.append((module, module_lessons))

    await session.commit()

    modules_result = await session.execute(
        select(Module).where(Module.course_id == new_course.id).order_by(Module.order)
    )
    modules = modules_result.scalars().all()

    modules_data = []
    for module in modules:
        lessons_result = await session.execute(
            select(Lesson).where(Lesson.module_id == module.id).order_by(Lesson.order)
        )
        lessons = lessons_result.scalars().all()

        lessons_data = []
        for lesson in lessons:
            lessons_data.append({
                "id": lesson.id,
                "title": lesson.title,
                "duration": lesson.duration,
                "type": lesson.type,
                "content": lesson.content,  # This is the JSON field that was causing issues
                "order": lesson.order,
            })

        modules_data.append({
            "id": module.id,
            "title": module.title,
            "order": module.order,
            "lessons": lessons_data
        })

    return {
        "id": new_course.id,
        "title": course.title or "Untitled Course",
        "author": user.name,
        "thumbnail": course.thumbnail_url or "https://picsum.photos/400/250",
        "thumbnail_url": course.thumbnail_url,
        "category": course.category or "Development",
        "price": course.price if isinstance(course.price, (int, float)) else 0.0,
        "rating": 0.0,
        "totalStudents": 0,
        "duration": None,
        "description": course.description,
        "level": course.level or "Beginner",
        "learning_outcomes": course.learning_outcomes,
        "status": course.status or "Draft",
        "createdAt": new_course.created_at.isoformat(),
        "teacher_id": user.id,
        "modules": modules_data
    }


@app.put("/courses/{course_id}")
async def update_course(
    course_id: str,
    course_data: CourseCreate,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Update an existing course (teacher only)"""
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
            detail="Only teachers can update courses"
        )

    result = await session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.teacher_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")

    # Update course fields
    course.title = course_data.title or course.title
    course.category = course_data.category or course.category
    course.price = course_data.price if course_data.price is not None else course.price
    course.description = course_data.description or course.description
    course.level = course_data.level or course.level
    course.status = course_data.status or course.status
    course.learning_outcomes = course_data.learning_outcomes if course_data.learning_outcomes is not None else course.learning_outcomes

    thumbnail_url = course_data.thumbnail_url
    if thumbnail_url:
        course.thumbnail_url = thumbnail_url
        course.thumbnail = thumbnail_url

    await session.execute(delete(Lesson).where(Lesson.module_id.in_(
        select(Module.id).where(Module.course_id == course_id)
    )))
    await session.execute(delete(Module).where(Module.course_id == course_id))

    created_modules = []
    for idx, module_data in enumerate(course_data.modules or []):
        module = Module(
            course_id=course.id,
            title=module_data.title or f"Module {idx + 1}",
            order=idx,
        )
        session.add(module)
        await session.flush()  # Get module ID

        module_lessons = []
        for jdx, lesson_data in enumerate(module_data.lessons or []):
            lesson = Lesson(
                module_id=module.id,  # Use module_id instead of relationship
                title=lesson_data.title or f"Lesson {jdx + 1}",
                duration=lesson_data.duration or "",
                type=lesson_data.type or "video",
                content=lesson_data.content,
                order=jdx,
            )
            session.add(lesson)
            module_lessons.append(lesson)

        created_modules.append((module, module_lessons))

    await session.commit()

    course_result = await session.execute(select(Course).where(Course.id == course_id))
    updated_course = course_result.scalar_one()

    modules_result = await session.execute(
        select(Module).where(Module.course_id == course_id).order_by(Module.order)
    )
    modules = modules_result.scalars().all()

    modules_data = []
    for module in modules:
        lessons_result = await session.execute(
            select(Lesson).where(Lesson.module_id == module.id).order_by(Lesson.order)
        )
        lessons = lessons_result.scalars().all()

        lessons_data = []
        for lesson in lessons:
            lessons_data.append({
                "id": lesson.id,
                "title": lesson.title,
                "duration": lesson.duration,
                "type": lesson.type,
                "content": lesson.content,
                "order": lesson.order,
            })

        modules_data.append({
            "id": module.id,
            "title": module.title,
            "order": module.order,
            "lessons": lessons_data
        })

    course_dict = course_to_dict(updated_course)
    course_dict["modules"] = modules_data
    return course_dict


@app.patch("/courses/{course_id}/status")
async def update_course_status(
    course_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can update courses")

    result = await session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.teacher_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")

    new_status = payload.get("status")
    if new_status not in ["Draft", "Published", "Archived"]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    course.status = new_status
    session.add(course)
    await session.commit()
    await session.refresh(course)
    return course_to_dict(course)


@app.delete("/courses/{course_id}")
async def delete_course(
    course_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can delete courses")

    result = await session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.teacher_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")

    async with session.begin():
        await session.delete(course)

    return {"detail": "deleted"}


@app.post("/courses/{course_id}/thumbnail")
async def upload_course_thumbnail(
    course_id: str,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Upload and set course thumbnail (teacher only)"""
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
            detail="Only teachers can update courses"
        )

    result = await session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.teacher_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")

    file_ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(THUMBNAIL_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    public_url = f"/uploads/thumbnails/{filename}"

    course.thumbnail_url = public_url
    course.thumbnail = public_url
    session.add(course)
    await session.commit()
    await session.refresh(course)

    return {"thumbnail_url": public_url}


@app.post("/courses/upload-thumbnail")
async def upload_thumbnail(file: UploadFile = File(...)):
    """Upload thumbnail without requiring course id (used in draft creation flow)"""
    file_ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(THUMBNAIL_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    public_url = f"/uploads/thumbnails/{filename}"
    return {"thumbnail_url": public_url}


@app.post("/courses/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """Upload video file for lessons"""
    allowed_video_types = ["video/mp4", "video/webm", "video/ogg", "video/avi", "video/mov"]
    if file.content_type not in allowed_video_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid video file type. Allowed: {', '.join(allowed_video_types)}"
        )

    content = await file.read()
    file_size = len(content)

    max_size = 500 * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video file too large. Maximum size: 500MB"
        )

    file_ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4()}{file_ext}"

    videos_dir = os.path.join(BASE_UPLOAD_DIR, "videos")
    os.makedirs(videos_dir, exist_ok=True)
    file_path = os.path.join(videos_dir, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    public_url = f"/uploads/videos/{filename}"
    return {"video_url": public_url, "file_size": file_size}

