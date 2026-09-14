from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse


router = APIRouter(prefix="/auth", tags=["Authentication"])

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(User.email == payload.email)
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not pwd_context.verify(
        payload.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)

    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expires_at,
    }

    access_token = jwt.encode(
        token_payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }