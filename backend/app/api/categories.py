from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.db.database import get_db
from app.models.user import User
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Category).filter(
        or_(Category.user_id == current_user.id, Category.user_id.is_(None))
    )
    if type:
        q = q.filter(Category.type == type)
    cats = q.order_by(Category.type, Category.name).all()
    return [CategoryResponse.model_validate(c) for c in cats]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.name == data.name, Category.type == data.type)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    cat = Category(
        name=data.name,
        type=data.type,
        icon=data.icon,
        color=data.color or "#64748b",
        is_default=False,
        user_id=current_user.id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return CategoryResponse.model_validate(cat)


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current_user.id)
        .first()
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found or not editable")
    if cat.is_default:
        raise HTTPException(status_code=400, detail="Default categories cannot be modified")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cat, key, value)
    db.commit()
    db.refresh(cat)
    return CategoryResponse.model_validate(cat)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current_user.id)
        .first()
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found or not deletable")
    if cat.is_default:
        raise HTTPException(status_code=400, detail="Default categories cannot be deleted")
    db.delete(cat)
    db.commit()
    return None
