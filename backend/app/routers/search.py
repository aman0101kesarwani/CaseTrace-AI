from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth_dependencies import get_current_user
from app.database.connection import get_db
from app.models import User
from app.services.semantic_search import semantic_search


router = APIRouter(
    prefix="/api/search",
    tags=["Search"],
)


@router.get("/semantic")
def semantic_search_endpoint(
    case_id: int,
    q: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = semantic_search(
        db=db,
        query=q,
        case_id=case_id,
        limit=limit,
    )

    return {
        "query": q,
        "case_id": case_id,
        "results": results,
    }