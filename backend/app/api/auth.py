from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.db.database import get_db
from app.models.user import User
from app.models.category import Category
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import get_settings
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

DEFAULT_CATEGORIES = [
    {"name": "Salary", "type": "income", "icon": "briefcase", "color": "#22c55e"},
    {"name": "Freelance", "type": "income", "icon": "laptop", "color": "#16a34a"},
    {"name": "Investments", "type": "income", "icon": "trending-up", "color": "#15803d"},
    {"name": "Other Income", "type": "income", "icon": "plus-circle", "color": "#4ade80"},
    {"name": "Food & Dining", "type": "expense", "icon": "utensils", "color": "#ef4444"},
    {"name": "Transportation", "type": "expense", "icon": "car", "color": "#f97316"},
    {"name": "Housing", "type": "expense", "icon": "home", "color": "#eab308"},
    {"name": "Utilities", "type": "expense", "icon": "zap", "color": "#84cc16"},
    {"name": "Healthcare", "type": "expense", "icon": "heart", "color": "#06b6d4"},
    {"name": "Entertainment", "type": "expense", "icon": "film", "color": "#8b5cf6"},
    {"name": "Shopping", "type": "expense", "icon": "shopping-bag", "color": "#ec4899"},
    {"name": "Education", "type": "expense", "icon": "book", "color": "#6366f1"},
    {"name": "Personal Care", "type": "expense", "icon": "user", "color": "#a855f7"},
    {"name": "Other Expense", "type": "expense", "icon": "more-horizontal", "color": "#64748b"},
]


def seed_default_categories(db: Session, user_id: int):
    for cat in DEFAULT_CATEGORIES:
        existing = (
            db.query(Category)
            .filter(Category.user_id == user_id, Category.name == cat["name"])
            .first()
        )
        if not existing:
            db.add(
                Category(
                    name=cat["name"],
                    type=cat["type"],
                    icon=cat["icon"],
                    color=cat["color"],
                    is_default=True,
                    user_id=user_id,
                )
            )
    db.commit()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    user = User(
        email=user_in.email.lower(),
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    seed_default_categories(db, user.id)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
