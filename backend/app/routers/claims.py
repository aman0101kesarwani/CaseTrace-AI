from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth_dependencies import get_current_user
from app.database.connection import get_db
from app.models.claim import Claim
from app.models.document import Document, DocumentPage
from app.models.document_chunk import DocumentChunk
from app.models.evidence import Evidence
from app.services.claim_verification import verify_claim


router = APIRouter(
    prefix="/api/claims",
    tags=["Claims"],
)


@router.get("/verify")
def verify_case_claim(
    case_id: int = Query(..., description="Case ID to search"),
    claim: str = Query(..., min_length=1, description="Claim to verify"),
    limit: int = Query(
        5,
        ge=1,
        le=10,
        description="Number of evidence chunks",
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Verify a claim against evidence retrieved from the specified case.

    The claim is evaluated using semantically retrieved document
    chunks and the NVIDIA LLM.
    """

    return verify_claim(
        db=db,
        claim_text=claim,
        case_id=case_id,
        limit=limit,
    )


@router.get("")
def list_case_claims(
    case_id: int = Query(..., description="Case ID"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Return all persisted claims for the specified case.
    """

    claims = (
        db.query(Claim)
        .filter(Claim.case_id == case_id)
        .order_by(Claim.created_at.desc(), Claim.id.desc())
        .all()
    )

    return {
        "case_id": case_id,
        "claims": [
            {
                "id": claim.id,
                "claim_text": claim.claim_text,
                "status": claim.status,
                "confidence": claim.confidence,
                "reason": claim.reason,
                "created_at": claim.created_at,
            }
            for claim in claims
        ],
    }


@router.get("/{claim_id}/evidence")
def list_claim_evidence(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Return all evidence mapped to a claim, including document,
    page, chunk, and source passage information.
    """

    claim = db.query(Claim).filter(Claim.id == claim_id).first()

    if claim is None:
        return {
            "claim_id": claim_id,
            "evidence": [],
        }

    evidence_rows = (
        db.query(Evidence, DocumentChunk, DocumentPage, Document)
        .join(
            DocumentChunk,
            Evidence.document_chunk_id == DocumentChunk.id,
        )
        .join(
            DocumentPage,
            DocumentChunk.page_id == DocumentPage.id,
        )
        .join(
            Document,
            DocumentChunk.document_id == Document.id,
        )
        .filter(Evidence.claim_id == claim_id)
        .order_by(Evidence.relevance_score.desc(), Evidence.id.asc())
        .all()
    )

    return {
        "claim_id": claim.id,
        "claim_text": claim.claim_text,
        "evidence": [
            {
                "id": evidence.id,
                "document_chunk_id": chunk.id,
                "document_id": document.id,
                "document_name": document.file_name,
                "page_id": page.id,
                "page_number": page.page_number,
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "relevance_score": evidence.relevance_score,
                "evidence_type": evidence.evidence_type,
                "created_at": evidence.created_at,
            }
            for evidence, chunk, page, document in evidence_rows
        ],
    }
