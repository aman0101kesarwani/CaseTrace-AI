from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth_dependencies import get_current_user
from app.database.connection import get_db
from app.models import Case, Event
from app.schemas.document import EventResponse


router = APIRouter(
    prefix="/api/cases/{case_id}/events",
    tags=["Events"],
)


@router.get(
    "",
    response_model=list[EventResponse],
)
def list_case_events(
    case_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    events = db.scalars(
        select(Event)
        .where(Event.case_id == case_id)
        .order_by(Event.event_date)
    ).all()

    return list(events)