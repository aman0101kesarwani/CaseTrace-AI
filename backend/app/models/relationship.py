from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Relationship(Base):
    __tablename__ = "relationships"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    case_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    source_entity_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("entities.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    target_entity_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("entities.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    source_event_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    target_event_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    relationship_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    source_document_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    source_page_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("document_pages.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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