from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CaseCreate(BaseModel):
    title: str
    description: str | None = None
    case_type: str | None = None
    jurisdiction: str | None = None
    case_number: str | None = None
    status: str = "ACTIVE"

class CaseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    case_type: str | None = None
    jurisdiction: str | None = None
    case_number: str | None = None
    status: str | None = None

class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    case_type: str | None
    jurisdiction: str | None
    case_number: str | None
    status: str
    owner_id: int | None
    created_at: datetime
    updated_at: datetime
