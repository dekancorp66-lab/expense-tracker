from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from datetime import date, timedelta
from decimal import Decimal
from io import StringIO
import csv
from app.db.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.report import SummaryResponse, CategoryBreakdown, MonthlySummary
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    if not start_date:
        start_date = today.replace(day=1)
    if not end_date:
        # last day of current month
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    base = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.date <= end_date,
    )

    income = base.filter(Transaction.type == "income").with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar()
    expense = base.filter(Transaction.type == "expense").with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar()
    count = base.count()

    income = Decimal(str(income))
    expense = Decimal(str(expense))
    balance = income - expense
    savings_rate = float((balance / income) * 100) if income > 0 else 0.0

    # Category breakdown for expenses
    cat_rows = (
        db.query(
            Category.id,
            Category.name,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("cnt"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= start_date,
            Transaction.date <= end_date,
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    breakdown = []
    for row in cat_rows:
        total = Decimal(str(row.total))
        pct = float((total / expense) * 100) if expense > 0 else 0.0
        breakdown.append(
            CategoryBreakdown(
                category_id=row.id,
                category_name=row.name,
                total=total,
                percentage=round(pct, 1),
                count=row.cnt,
            )
        )

    # Uncategorized
    uncat = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0), func.count(Transaction.id))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.category_id.is_(None),
            Transaction.date >= start_date,
            Transaction.date <= end_date,
        )
        .first()
    )
    if uncat and uncat[1] > 0:
        total = Decimal(str(uncat[0]))
        pct = float((total / expense) * 100) if expense > 0 else 0.0
        breakdown.append(
            CategoryBreakdown(
                category_id=None,
                category_name="Uncategorized",
                total=total,
                percentage=round(pct, 1),
                count=uncat[1],
            )
        )

    # Monthly summaries for last 6 months
    monthly = []
    for i in range(5, -1, -1):
        m_date = (today.replace(day=1) - timedelta(days=30 * i))
        m, y = m_date.month, m_date.year
        m_income = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "income",
                extract("month", Transaction.date) == m,
                extract("year", Transaction.date) == y,
            )
            .scalar()
        )
        m_expense = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                extract("month", Transaction.date) == m,
                extract("year", Transaction.date) == y,
            )
            .scalar()
        )
        m_count = (
            db.query(func.count(Transaction.id))
            .filter(
                Transaction.user_id == current_user.id,
                extract("month", Transaction.date) == m,
                extract("year", Transaction.date) == y,
            )
            .scalar()
        )
        m_income = Decimal(str(m_income))
        m_expense = Decimal(str(m_expense))
        m_balance = m_income - m_expense
        m_rate = float((m_balance / m_income) * 100) if m_income > 0 else 0.0
        monthly.append(
            MonthlySummary(
                month=m,
                year=y,
                total_income=m_income,
                total_expense=m_expense,
                balance=m_balance,
                savings_rate=round(m_rate, 1),
                transaction_count=m_count,
            )
        )

    return SummaryResponse(
        total_income=income,
        total_expense=expense,
        balance=balance,
        savings_rate=round(savings_rate, 1),
        transaction_count=count,
        period_start=start_date,
        period_end=end_date,
        category_breakdown=breakdown,
        monthly_summaries=monthly,
    )


@router.get("/export/csv")
def export_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    if not start_date:
        start_date = today.replace(day=1)
    if not end_date:
        end_date = today

    q = (
        db.query(Transaction)
        .outerjoin(Category)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
        )
    )
    if type:
        q = q.filter(Transaction.type == type)

    txns = q.order_by(Transaction.date.desc()).all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["Date", "Description", "Type", "Category", "Amount", "Payment Method", "Notes"]
    )
    for t in txns:
        writer.writerow(
            [
                t.date.isoformat(),
                t.description,
                t.type,
                t.category.name if t.category else "",
                str(t.amount),
                t.payment_method or "",
                t.notes or "",
            ]
        )
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=transactions_{start_date}_{end_date}.csv"},
    )
