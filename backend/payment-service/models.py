from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid
from enum import Enum

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentBase(SQLModel):
    user_id: str
    course_id: str
    amount: float
    currency: str = "USD"
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: str
    transaction_id: Optional[str] = None

class Payment(PaymentBase, table=True):
    __tablename__ = "payments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
