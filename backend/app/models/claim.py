from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    case_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("cases.id"),
        nullable=False,
        index=True,
    )

    claim_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )