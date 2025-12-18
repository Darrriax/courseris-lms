from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session
from typing import List, Optional
from models import Payment, PaymentStatus, PaymentBase
from shared.database import get_db
import httpx
import os

router = APIRouter(prefix="/payments", tags=["payments"])

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")

async def verify_admin(authorization: Optional[str] = Header(None)):
    """Verify that the user is an admin"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.split(" ")[1]
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                user = response.json()
                if user.get("role") != "admin":
                    raise HTTPException(status_code=403, detail="Admin access required")
                return user
            raise HTTPException(status_code=401, detail="Invalid token")
        except httpx.HTTPError:
            raise HTTPException(status_code=401, detail="Authentication failed")

@router.post("/", response_model=Payment)
def create_payment(payment: PaymentBase, db: Session = Depends(get_db)):
    db_payment = Payment(**payment.dict())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.get("/", response_model=List[Payment])
def list_payments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Payment).offset(skip).limit(limit).all()

@router.get("/{payment_id}", response_model=Payment)
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@router.post("/{payment_id}/complete")
def complete_payment(payment_id: str, db: Session = Depends(get_db)):
    from datetime import datetime
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = PaymentStatus.COMPLETED
    payment.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success"}

@router.get("/admin/all")
async def get_all_payments_admin(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Get all payments for admin with user and course information"""
    await verify_admin(authorization)
    
    payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
    
    # Fetch user and course information for each payment
    COURSE_SERVICE_URL = os.getenv("COURSE_SERVICE_URL", "http://localhost:8002")
    
    result = []
    async with httpx.AsyncClient() as client:
        for payment in payments:
            payment_dict = {
                "id": payment.id,
                "user_id": payment.user_id,
                "course_id": payment.course_id,
                "amount": payment.amount,
                "currency": payment.currency,
                "status": payment.status,
                "payment_method": payment.payment_method,
                "transaction_id": payment.transaction_id,
                "created_at": payment.created_at.isoformat(),
                "updated_at": payment.updated_at.isoformat(),
                "user_name": "Unknown User",
                "course_title": "Unknown Course"
            }
            
            # Fetch user info
            try:
                user_response = await client.get(
                    f"{AUTH_SERVICE_URL}/users/{payment.user_id}/public",
                    timeout=5.0
                )
                if user_response.status_code == 200:
                    user_data = user_response.json()
                    payment_dict["user_name"] = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
            except Exception:
                pass
            
            # Fetch course info
            try:
                course_response = await client.get(
                    f"{COURSE_SERVICE_URL}/courses/{payment.course_id}/full",
                    timeout=5.0
                )
                if course_response.status_code == 200:
                    course_data = course_response.json()
                    payment_dict["course_title"] = course_data.get("title", "Unknown Course")
            except Exception:
                pass
            
            result.append(payment_dict)
    
    return result
