from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth_dependencies import get_current_user
from app.database.connection import get_db
from app.services.rag_service import generate_rag_answer


router = APIRouter(
    prefix="/api/rag",
    tags=["RAG"],
)


@router.get("/ask")
def ask_case_question(
    case_id: int = Query(..., description="Case ID to search"),
    q: str = Query(..., min_length=1, description="Question about the case"),
    limit: int = Query(5, ge=1, le=10, description="Number of evidence chunks"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Ask a natural-language question about a case.

    The answer is generated from semantically retrieved
    document chunks belonging to the specified case.
    """

    return generate_rag_answer(
        db=db,
        question=q,
        case_id=case_id,
        limit=limit,
    )