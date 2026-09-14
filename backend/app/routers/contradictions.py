from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth_dependencies import get_current_user
from app.database.connection import get_db
from app.services.contradiction_detection import detect_contradiction


router = APIRouter(
    prefix="/api/contradictions",
    tags=["Contradictions"],
)


@router.get("/detect")
def detect_case_contradiction(
    case_id: int = Query(..., description="Case ID to search"),
    claim_a: str = Query(..., min_length=1, description="First claim"),
    claim_b: str = Query(..., min_length=1, description="Second claim"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Detect whether two claims potentially contradict each other.

    The comparison uses semantically retrieved case evidence
    and the NVIDIA LLM.
    """

    return detect_contradiction(
        db=db,
        claim_a=claim_a,
        claim_b=claim_b,
        case_id=case_id,
    )