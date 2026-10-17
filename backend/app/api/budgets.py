from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from typing import List, Optional
from decimal import Decimal
from app.db.database import get_db
from app.models.user import User
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetProgress
from app.api.deps import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def _to_response(b: Budget) -> BudgetResponse:
    return BudgetResponse(
        id=b.id,
        amount=b.amount,
        month=b.month,
        year=b.year,
        user_id=b.user_id,
        category_id=b.category_id,
        category_name=b.category.name if b.category else None,
        created_at=b.created_at,
        updated_at=b.updated_at,
    )


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = (
        db.query(Category)
        .filter(Category.id == data.category_id, Category.user_id == current_user.id)
        .first()
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if cat.type != "expense":
        raise HTTPException(status_code=400, detail="Budgets can only be set for expense categories")

    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category_id == data.category_id,
            Budget.month == data.month,
            Budget.year == data.year,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this category/month/year")

    budget = Budget(
        amount=data.amount,
        month=data.month,
        year=data.year,
        category_id=data.category_id,
        user_id=current_user.id,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    budget = (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.id == budget.id)
        .first()
    )
    return _to_response(budget)


@router.get("", response_model=List[BudgetResponse])
def list_budgets(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.user_id == current_user.id)
    )
    if month:
        q = q.filter(Budget.month == month)
    if year:
        q = q.filter(Budget.year == year)
    budgets = q.order_by(Budget.year.desc(), Budget.month.desc()).all()
    return [_to_response(b) for b in budgets]


@router.get("/progress", response_model=List[BudgetProgress])
def get_budget_progress(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.user_id == current_user.id, Budget.month == month, Budget.year == year)
        .all()
    )
    result = []
    for b in budgets:
        spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.category_id == b.category_id,
                Transaction.type == "expense",
                extract("month", Transaction.date) == month,
                extract("year", Transaction.date) == year,
            )
            .scalar()
        )
        spent = Decimal(str(spent))
        remaining = b.amount - spent
        pct = float((spent / b.amount) * 100) if b.amount > 0 else 0.0
        if pct >= 100:
            status_str = "exceeded"
        elif pct >= 80:
            status_str = "approaching"
        else:
            status_str = "under"
        result.append(
            BudgetProgress(
                budget_id=b.id,
                category_id=b.category_id,
                category_name=b.category.name if b.category else "Unknown",
                budget_amount=b.amount,
                spent=spent,
                remaining=remaining,
                percentage=round(pct, 1),
                status=status_str,
                month=month,
                year=year,
            )
        )
    return result


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(budget, key, value)
    db.commit()
    db.refresh(budget)
    budget = (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.id == budget.id)
        .first()
    )
    return _to_response(budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
    return None
