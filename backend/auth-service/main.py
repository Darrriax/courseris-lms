"""
Auth Service - FastAPI application
"""
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import shutil
from typing import Optional
from pathlib import Path

from database import get_session, init_db, engine
from models import User
import sys
sys.path.append('/app/shared')
from shared.models import UserCreate, UserResponse, UserUpdate, Token, TokenData
from sqlalchemy import text
from sqlalchemy import select as sa_select

app = FastAPI(title="Auth Service", version="1.0.0")

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount static files for serving uploaded images
app.mount("/static", StaticFiles(directory=str(UPLOAD_DIR)), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "30"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash using bcrypt directly"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session)
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
    
    result = await session.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()
    await ensure_user_columns()
    await seed_manager_user()


async def ensure_user_columns():
    """Ensure required columns exist for users table (idempotent)."""
    async with engine.begin() as conn:
        # Add age column if missing
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER"))
        # Add gender column if missing and set default
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'MALE'")
        )
        # Backfill null genders to MALE to satisfy not-null expectation
        await conn.execute(text("UPDATE users SET gender='MALE' WHERE gender IS NULL"))


async def seed_manager_user():
    """Create the default manager user if it doesn't exist."""
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "manager@gmail.com"))
        existing = result.scalar_one_or_none()
        if not existing:
            manager = User(
                email="manager@gmail.com",
                password_hash=get_password_hash("123456"),
                first_name="Course",
                last_name="Manager",
                role="manager",
                gender="MALE",
                avatar="https://picsum.photos/seed/manager/100/100"
            )
            session.add(manager)
            await session.commit()
            print("✓ Manager user seeded: manager@gmail.com / 123456")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth-service"}


@app.post("/auth/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session)
):
    """Register a new user"""
    normalized_email = user_data.email.lower().strip()
    # Validate gender explicitly (defensive check even though Pydantic enforces Literal)
    if user_data.gender not in {"MALE", "FEMALE"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid gender. Allowed values are MALE or FEMALE."
        )
    # Check if user already exists
    result = await session.execute(select(User).where(User.email == normalized_email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=normalized_email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        age=user_data.age,
        role=user_data.role,
        gender=user_data.gender,
        avatar=f"https://picsum.photos/seed/{user_data.email}/100/100"
    )
    
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        age=new_user.age,
        role=new_user.role,
        gender=new_user.gender,
        avatar=new_user.avatar,
        name=new_user.name,
        created_at=new_user.created_at
    )


@app.post("/auth/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    """Login and get access token"""
    normalized_email = form_data.username.lower().strip()

    # Find user by email (OAuth2PasswordRequestForm uses username field for email)
    result = await session.execute(
        select(User).where(User.email == normalized_email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=JWT_EXPIRATION_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email},
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@app.get("/auth/me", response_model=UserResponse)
@app.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    base_url = os.getenv("AUTH_SERVICE_BASE_URL", "http://localhost:8001")
    
    # Convert relative URLs to full URLs
    avatar_url = None
    if current_user.avatar_url:
        avatar_url = f"{base_url}{current_user.avatar_url}" if current_user.avatar_url.startswith("/") else current_user.avatar_url
    
    banner_url = None
    if current_user.banner_url:
        banner_url = f"{base_url}{current_user.banner_url}" if current_user.banner_url.startswith("/") else current_user.banner_url
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        middle_name=current_user.middle_name,
        age=current_user.age,
        phone_number=current_user.phone_number,
        country=current_user.country,
        bio=current_user.bio,
        role=current_user.role,
        gender=current_user.gender,
        avatar=current_user.avatar,
        avatar_url=avatar_url,
        banner_url=banner_url,
        name=current_user.name,
        created_at=current_user.created_at
    )


@app.put("/users/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update current user profile"""
    # Update only provided fields
    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    if user_update.middle_name is not None:
        current_user.middle_name = user_update.middle_name
    if user_update.age is not None:
        current_user.age = user_update.age
    if user_update.phone_number is not None:
        current_user.phone_number = user_update.phone_number
    if user_update.country is not None:
        current_user.country = user_update.country
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    if user_update.gender is not None:
        current_user.gender = user_update.gender
    
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        middle_name=current_user.middle_name,
        age=current_user.age,
        phone_number=current_user.phone_number,
        country=current_user.country,
        bio=current_user.bio,
        role=current_user.role,
        gender=current_user.gender,
        avatar=current_user.avatar,
        avatar_url=current_user.avatar_url,
        banner_url=current_user.banner_url,
        name=current_user.name,
        created_at=current_user.created_at
    )


@app.get("/users/{user_id}/public", response_model=UserResponse)
async def get_public_user(user_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(sa_select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    base_url = os.getenv("AUTH_SERVICE_BASE_URL", "http://localhost:8001")
    avatar_url = None
    if user.avatar_url:
        avatar_url = f"{base_url}{user.avatar_url}" if user.avatar_url.startswith("/") else user.avatar_url
    banner_url = None
    if user.banner_url:
        banner_url = f"{base_url}{user.banner_url}" if user.banner_url.startswith("/") else user.banner_url

    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        middle_name=user.middle_name,
        age=user.age,
        phone_number=user.phone_number,
        country=user.country,
        bio=user.bio,
        role=user.role,
        gender=user.gender,
        avatar=user.avatar,
        avatar_url=avatar_url,
        banner_url=banner_url,
        name=user.name,
        created_at=user.created_at
    )


@app.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Upload avatar image"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"avatar_{current_user.id}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user's avatar_url (store relative path, frontend will construct full URL)
    avatar_url = f"/static/{filename}"
    current_user.avatar_url = avatar_url
    
    session.add(current_user)
    await session.commit()
    
    # Return full URL for frontend
    base_url = os.getenv("AUTH_SERVICE_BASE_URL", "http://localhost:8001")
    return {"avatar_url": f"{base_url}{avatar_url}"}


@app.post("/users/me/banner")
async def upload_banner(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Upload banner image"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"banner_{current_user.id}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user's banner_url (store relative path, frontend will construct full URL)
    banner_url = f"/static/{filename}"
    current_user.banner_url = banner_url
    
    session.add(current_user)
    await session.commit()
    
    # Return full URL for frontend
    base_url = os.getenv("AUTH_SERVICE_BASE_URL", "http://localhost:8001")
    return {"banner_url": f"{base_url}{banner_url}"}


@app.get("/analytics/users")
async def users_analytics(session: AsyncSession = Depends(get_session)):
    """Return user analytics: gender, activity, roles, and geo distribution."""
    total_result = await session.execute(select(func.count()).select_from(User))
    total_users = total_result.scalar_one() or 0

    # Gender distribution - exclude managers and admins
    gender_result = await session.execute(
        select(User.gender, func.count())
        .where(User.role.in_(["student", "teacher"]))
        .group_by(User.gender)
    )
    gender_counts_raw = {(g or "").upper(): c for g, c in gender_result}
    male = gender_counts_raw.get("MALE", 0)
    female = gender_counts_raw.get("FEMALE", 0)

    # Activity not tracked yet; assume all are active
    activity = {
        "active": total_users,
        "inactive": 0,
    }

    # Role distribution (student vs teacher vs manager vs admin)
    role_result = await session.execute(
        select(User.role, func.count()).group_by(User.role)
    )
    role_counts_raw = {(r or "").upper(): c for r, c in role_result}
    students = role_counts_raw.get("STUDENT", 0)
    teachers = role_counts_raw.get("TEACHER", 0)
    managers = role_counts_raw.get("MANAGER", 0)
    admins = role_counts_raw.get("ADMIN", 0)

    # Country distribution
    country_result = await session.execute(
        select(User.country, func.count()).group_by(User.country)
    )
    countries = [
        {"country": (country or "Unknown"), "count": count}
        for country, count in country_result
    ]

    return {
        "total_users": total_users,
        "gender": {
            "male": male,
            "female": female,
        },
        "activity": activity,
        "roles": {
            "student": students,
            "teacher": teachers,
            "manager": managers,
            "admin": admins,
        },
        "countries": countries,
    }


# Admin endpoints
@app.get("/admin/users")
async def get_all_users(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all users - admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await session.execute(select(User))
    users = result.scalars().all()
    
    return [
        {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "created_at": user.created_at,
            "is_active": True
        }
        for user in users
    ]


@app.get("/admin/permissions")
async def get_all_permissions(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all permissions - admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    permissions = await session.execute(text("SELECT * FROM permissions"))
    return permissions.fetchall()


@app.get("/admin/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get permissions for a specific user - admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    permissions = await session.execute(
        text("""
            SELECT p.* FROM permissions p
            JOIN user_permissions up ON p.id = up.permission_id
            WHERE up.user_id = :user_id
        """),
        {"user_id": user_id}
    )
    return permissions.fetchall()


@app.post("/admin/users/{user_id}/permissions/{permission_id}")
async def grant_permission(
    user_id: str,
    permission_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Grant permission to user - admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        await session.execute(
            text("""
                INSERT INTO user_permissions (user_id, permission_id)
                VALUES (:user_id, :permission_id)
                ON CONFLICT (user_id, permission_id) DO NOTHING
            """),
            {"user_id": user_id, "permission_id": permission_id}
        )
        await session.commit()
        return {"message": "Permission granted successfully"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/admin/users/{user_id}/permissions/{permission_id}")
async def revoke_permission(
    user_id: str,
    permission_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Revoke permission from user - admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        await session.execute(
            text("""
                DELETE FROM user_permissions 
                WHERE user_id = :user_id AND permission_id = :permission_id
            """),
            {"user_id": user_id, "permission_id": permission_id}
        )
        await session.commit()
        return {"message": "Permission revoked successfully"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/admin/users/{user_id}/block")
async def block_user(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Block a user - admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        await session.execute(
            text("UPDATE users SET is_active = FALSE WHERE id = :user_id"),
            {"user_id": user_id}
        )
        await session.commit()
        return {"message": "User blocked successfully"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/admin/users/{user_id}/unblock")
async def unblock_user(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Unblock a user - admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        await session.execute(
            text("UPDATE users SET is_active = TRUE WHERE id = :user_id"),
            {"user_id": user_id}
        )
        await session.commit()
        return {"message": "User unblocked successfully"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/admin/create-manager")
async def create_manager(
    user_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new manager - admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Check if email already exists
        existing_user = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Hash password
        password_hash = bcrypt.hashpw(user_data["password"].encode('utf-8'), bcrypt.gensalt())
        
        # Create new manager
        new_user = User(
            email=user_data["email"],
            password_hash=password_hash.decode('utf-8'),
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            role="manager",
            gender=user_data.get("gender", "MALE"),
            age=user_data.get("age"),
            phone_number=user_data.get("phone_number"),
            country=user_data.get("country"),
            bio=user_data.get("bio")
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        return {
            "message": "Manager created successfully",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "first_name": new_user.first_name,
                "last_name": new_user.last_name,
                "role": new_user.role
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

