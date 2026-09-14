from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.database.connection import get_db
from app.models import User
from app.schemas.user import UserCreate, UserResponse


router = APIRouter(prefix="/users", tags=["Users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = db.scalar(
        select(User).where(User.email == payload.email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=pwd_context.hash(payload.password),
        role=payload.role,
        company=payload.company,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
):
    return list(
        db.scalars(
            select(User).order_by(User.created_at.desc())
        ).all()
    )