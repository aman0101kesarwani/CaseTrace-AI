from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Contradiction(Base):
    __tablename__ = "contradictions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    case_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("cases.id"),
        nullable=False,
        index=True,
    )

    claim_a: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    claim_b: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str | None] = mapped_column(
        Text,
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