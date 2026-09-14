from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    file_name: str
    document_type: str | None
    mime_type: str | None
    processing_status: str
    created_at: datetime


class DocumentPageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    page_number: int
    extracted_text: str


class ExtractedDateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    document_id: int
    page_id: int
    page_number: int
    original_text: str
    normalized_date: date
    confidence: float | None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    document_id: int
    page_id: int
    page_number: int
    event_date: date | None
    event_type: str | None
    description: str
    confidence: float | None