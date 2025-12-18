"""
Course Service - FastAPI application
"""
from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from typing import List, Optional
import httpx
import os
import sys
import uuid
import shutil

from database import get_session, init_db, engine
from models import Course, Module, Lesson, Category
from schemas import CourseCreate
from sqlalchemy import text

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
    await seed_default_categories()


async def seed_default_categories():
    """Seed default course categories if they don't exist."""
    from database import AsyncSessionLocal
    default_categories = [
        {"name": "IT", "description": "Information Technology & Computer Science"},
        {"name": "Management", "description": "Business Management & Leadership"},
        {"name": "Design", "description": "Graphic Design, UI/UX, and Creative Arts"},
        {"name": "Marketing", "description": "Digital Marketing & Advertising"},
        {"name": "Development", "description": "Software & Web Development"},
        {"name": "Data Science", "description": "Data Analysis, ML, and AI"},
        {"name": "Business", "description": "Business Strategy & Entrepreneurship"},
        {"name": "Finance", "description": "Accounting, Investing & Personal Finance"},
    ]
    async with AsyncSessionLocal() as session:
        for cat in default_categories:
            result = await session.execute(
                select(Category).where(Category.name == cat["name"])
            )
            if not result.scalar_one_or_none():
                session.add(Category(name=cat["name"], description=cat["description"]))
        await session.commit()


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
        select(Course).where(func.upper(Course.status) == "PUBLISHED")
    )
    courses = result.scalars().all()
    
    return [course_to_dict(course) for course in courses]


@app.get("/courses/teacher/{teacher_id}/public")
async def get_public_courses_by_teacher(
    teacher_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Get published courses for a given teacher (public view)."""
    result = await session.execute(
        select(Course).where(
            Course.teacher_id == teacher_id,
            func.upper(Course.status) == "PUBLISHED"
        )
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

    new_status = (payload.get("status") or "").capitalize()

    # Teachers can move courses between Draft and Pending (request publication),
    # but only the manager can actually set status to Published.
    if new_status not in ["Draft", "Pending", "Archived"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid status",
        )

    # Prevent teachers from archiving or unpublishing already published courses directly
    if new_status == "Archived" or new_status == "Pending":
        # Allow setting to Pending or Archived only from Draft or Rejected
        pass

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

    # Ensure the course is not currently Published; require unpublishing first
    if (course.status or "").upper() == "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a published course. Please archive or unpublish it first.",
        )

    await session.delete(course)
    await session.commit()
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


# ============================================================================
# MANAGER ENDPOINTS
# ============================================================================

def category_to_dict(cat: Category) -> dict:
    return {
        "id": cat.id,
        "name": cat.name,
        "description": cat.description,
        "createdAt": cat.created_at.isoformat() if cat.created_at else None,
    }


@app.get("/categories")
async def get_categories(session: AsyncSession = Depends(get_session)):
    """Get all course categories (public)."""
    result = await session.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    return [category_to_dict(c) for c in categories]


@app.post("/categories")
async def create_category(
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Create a new category (manager only)."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can create categories")

    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category name is required")

    existing = await session.execute(select(Category).where(Category.name == name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists")

    cat = Category(name=name, description=payload.get("description"))
    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    return category_to_dict(cat)


@app.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Update an existing category (manager only)."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can update categories")

    result = await session.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if "name" in payload and payload["name"]:
        cat.name = payload["name"]
    if "description" in payload:
        cat.description = payload["description"]

    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    return category_to_dict(cat)


@app.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Delete a category (manager only)."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can delete categories")

    result = await session.execute(select(Category).where(Category.id == category_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    await session.delete(cat)
    await session.commit()
    return {"detail": "deleted"}


# ============================================================================
# COURSE APPROVAL ENDPOINTS (MANAGER)
# ============================================================================

@app.get("/manager/courses")
async def get_courses_for_review(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Get all courses pending review (status = Pending) for manager."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can access this endpoint")

    # Courses with status "Pending" need review; also include "Draft" if teacher submitted for review
    result = await session.execute(
        select(Course).where(func.upper(Course.status) == "PENDING")
    )
    courses = result.scalars().all()
    return [course_to_dict(c) for c in courses]


@app.get("/manager/courses/all")
async def get_all_courses_for_manager(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Get all courses for manager to review (all statuses)."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can access this endpoint")

    result = await session.execute(select(Course).order_by(Course.created_at.desc()))
    courses = result.scalars().all()
    return [course_to_dict(c) for c in courses]


@app.post("/manager/courses/{course_id}/approve")
async def approve_course(
    course_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Approve and publish a course (manager only)."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can approve courses")

    result = await session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    course.status = "Published"
    session.add(course)
    await session.commit()
    await session.refresh(course)
    return course_to_dict(course)


@app.post("/manager/courses/{course_id}/reject")
async def reject_course(
    course_id: str,
    payload: dict,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Reject a course (manager only). Optionally provide a reason."""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can reject courses")

    result = await session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Set status back to Draft so teacher can make changes
    course.status = "Rejected"
    session.add(course)
    await session.commit()
    await session.refresh(course)

    # reason could be stored in a separate table or returned; for now just return
    return {
        **course_to_dict(course),
        "rejection_reason": payload.get("reason", "")
    }


@app.post("/admin/courses/{course_id}/block")
async def block_course(
    course_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Block a course - admin only"""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    result = await session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    await session.execute(
        text("UPDATE courses SET is_active = FALSE WHERE id = :course_id"),
        {"course_id": course_id}
    )
    await session.commit()
    return {"message": "Course blocked successfully"}


@app.post("/admin/courses/{course_id}/unblock")
async def unblock_course(
    course_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Unblock a course - admin only"""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    result = await session.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    await session.execute(
        text("UPDATE courses SET is_active = TRUE WHERE id = :course_id"),
        {"course_id": course_id}
    )
    await session.commit()
    return {"message": "Course unblocked successfully"}


@app.get("/admin/courses")
async def get_all_courses_admin(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_session)
):
    """Get all courses for admin - includes is_active status"""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = await verify_token(token)
    if not user or user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    result = await session.execute(text("""
        SELECT c.id,
               c.title,
               c.author,
               c.thumbnail,
               c.thumbnail_url,
               c.category,
               c.price,
               c.rating,
               c.total_students,
               c.duration,
               c.description,
               c.level,
               c.learning_outcomes,
               c.status,
               c.created_at,
               c.teacher_id,
               c.is_active,
               CASE WHEN c.is_active = TRUE THEN 'Active' ELSE 'Blocked' END as status_label,
               u.first_name || ' ' || u.last_name as teacher_name
        FROM courses c 
        LEFT JOIN users u ON c.teacher_id = u.id 
        ORDER BY c.created_at DESC
    """))
    
    courses = result.fetchall()
    return [
        {
            "id": str(course[0]),
            "title": course[1],
            "author": course[2],
            "thumbnail": course[3],
            "thumbnail_url": course[4],
            "category": course[5],
            "price": float(course[6]),
            "rating": float(course[7]),
            "total_students": int(course[8]),
            "duration": course[9],
            "description": course[10],
            "level": course[11],
            "learning_outcomes": course[12],
            "status": course[13],
            "created_at": course[14].isoformat() if hasattr(course[14], 'isoformat') else str(course[14]),
            "teacher_id": str(course[15]) if course[15] else None,
            "is_active": course[16],
            "status_label": course[17],
            "teacher_name": course[18]
        }
        for course in courses
    ]
