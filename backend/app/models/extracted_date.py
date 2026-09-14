from datetime import datetime, date

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class ExtractedDate(Base):
    __tablename__ = "extracted_dates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    case_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    page_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("document_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    page_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    original_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    normalized_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )