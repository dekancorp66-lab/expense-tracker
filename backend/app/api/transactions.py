from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import date
from decimal import Decimal
from app.db.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def _to_response(t: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=t.id,
        description=t.description,
        amount=t.amount,
        type=t.type,
        date=t.date,
        payment_method=t.payment_method,
        notes=t.notes,
        user_id=t.user_id,
        category_id=t.category_id,
        category_name=t.category.name if t.category else None,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.category_id:
        cat = (
            db.query(Category)
            .filter(
                Category.id == data.category_id,
                or_(Category.user_id == current_user.id, Category.user_id.is_(None)),
            )
            .first()
        )
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        if cat.type != data.type:
            raise HTTPException(status_code=400, detail=f"Category type must match transaction type ({data.type})")

    txn = Transaction(
        description=data.description,
        amount=data.amount,
        type=data.type,
        date=data.date,
        payment_method=data.payment_method,
        notes=data.notes,
        category_id=data.category_id,
        user_id=current_user.id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    txn = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.id == txn.id)
        .first()
    )
    return _to_response(txn)


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.user_id == current_user.id)
    )
    if type:
        q = q.filter(Transaction.type == type)
    if category_id:
        q = q.filter(Transaction.category_id == category_id)
    if start_date:
        q = q.filter(Transaction.date >= start_date)
    if end_date:
        q = q.filter(Transaction.date <= end_date)
    if search:
        q = q.filter(Transaction.description.ilike(f"%{search}%"))

    txns = q.order_by(Transaction.date.desc(), Transaction.id.desc()).offset(skip).limit(limit).all()
    return [_to_response(t) for t in txns]


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _to_response(txn)


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = data.model_dump(exclude_unset=True)
    if "category_id" in update_data and update_data["category_id"]:
        cat = (
            db.query(Category)
            .filter(
                Category.id == update_data["category_id"],
                or_(Category.user_id == current_user.id, Category.user_id.is_(None)),
            )
            .first()
        )
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        txn_type = update_data.get("type", txn.type)
        if cat.type != txn_type:
            raise HTTPException(status_code=400, detail="Category type must match transaction type")

    for key, value in update_data.items():
        setattr(txn, key, value)

    db.commit()
    db.refresh(txn)
    txn = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.id == txn.id)
        .first()
    )
    return _to_response(txn)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
    return None
