from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models import Case, Document, User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):

    total_cases = db.scalar(
        select(func.count()).select_from(Case)
    ) or 0

    total_documents = db.scalar(
        select(func.count()).select_from(Document)
    ) or 0

    ongoing = db.scalar(
        select(func.count())
        .select_from(Case)
        .where(Case.status.in_(["ACTIVE", "ONGOING"]))
    ) or 0

    case_types = db.execute(
        select(Case.case_type, func.count())
        .group_by(Case.case_type)
    ).all()

    cases_count_by_type = {
        (case_type or "Unclassified"): count
        for case_type, count in case_types
    }

    return {
        "total_cases": total_cases,
        "total_documents": total_documents,
        "total_ongoing_cases": ongoing,
        "total_users": db.scalar(
            select(func.count()).select_from(User)
        ) or 0,
        "cases_count_by_type": cases_count_by_type,
    }