from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth_dependencies import get_current_user
from app.database.connection import get_db
from app.models import Case, ExtractedDate
from app.schemas.document import ExtractedDateResponse


router = APIRouter(
    prefix="/api/cases/{case_id}/dates",
    tags=["Dates"],
)


@router.get(
    "",
    response_model=list[ExtractedDateResponse],
)
def list_case_dates(
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

    dates = db.scalars(
        select(ExtractedDate)
        .where(ExtractedDate.case_id == case_id)
        .order_by(ExtractedDate.normalized_date)
    ).all()

    return list(dates)