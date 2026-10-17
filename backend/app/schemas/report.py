from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date


class CategoryBreakdown(BaseModel):
    category_id: Optional[int]
    category_name: str
    total: Decimal
    percentage: float
    count: int


class MonthlySummary(BaseModel):
    month: int
    year: int
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    savings_rate: float
    transaction_count: int


class SummaryResponse(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    savings_rate: float
    transaction_count: int
    period_start: date
    period_end: date
    category_breakdown: List[CategoryBreakdown]
    monthly_summaries: Optional[List[MonthlySummary]] = None
