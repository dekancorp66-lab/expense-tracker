from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class TransactionCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    type: str = Field(..., pattern="^(income|expense)$")
    date: date
    category_id: Optional[int] = None
    payment_method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return round(v, 2)


class TransactionUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=0, max_digits=12, decimal_places=2)
    type: Optional[str] = Field(None, pattern="^(income|expense)$")
    date: Optional[date] = None
    category_id: Optional[int] = None
    payment_method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Amount must be greater than zero")
        if v is not None:
            return round(v, 2)
        return v


class TransactionResponse(BaseModel):
    id: int
    description: str
    amount: Decimal
    type: str
    date: date
    payment_method: Optional[str]
    notes: Optional[str]
    user_id: int
    category_id: Optional[int]
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
