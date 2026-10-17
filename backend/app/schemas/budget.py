from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


class BudgetCreate(BaseModel):
    category_id: int
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Budget amount must be greater than zero")
        return round(v, 2)


class BudgetUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, max_digits=12, decimal_places=2)
    month: Optional[int] = Field(None, ge=1, le=12)
    year: Optional[int] = Field(None, ge=2000, le=2100)

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Budget amount must be greater than zero")
        if v is not None:
            return round(v, 2)
        return v


class BudgetResponse(BaseModel):
    id: int
    amount: Decimal
    month: int
    year: int
    user_id: int
    category_id: int
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class BudgetProgress(BaseModel):
    budget_id: int
    category_id: int
    category_name: str
    budget_amount: Decimal
    spent: Decimal
    remaining: Decimal
    percentage: float
    status: str  # under, approaching, exceeded
    month: int
    year: int
