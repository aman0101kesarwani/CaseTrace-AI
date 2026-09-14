from sqlalchemy.orm import Session

from app.models.claim import Claim
from app.services.evidence_mapping import create_evidence_mapping


def persist_claim_verification(
    db: Session,
    case_id: int,
    claim_text: str,
    status: str,
    confidence: float,
    reason: str,
    sources: list[dict],
) -> Claim:
    """
    Persist a claim verification result and its evidence mappings.

    The claim is reused when the same claim text already exists
    for the same case.
    """

    claim = (
        db.query(Claim)
        .filter(
            Claim.case_id == case_id,
            Claim.claim_text == claim_text,
        )
        .first()
    )

    if claim is None:
        claim = Claim(
            case_id=case_id,
            claim_text=claim_text,
        )
        db.add(claim)
        db.flush()

    claim.status = status
    claim.confidence = confidence
    claim.reason = reason

    db.commit()
    db.refresh(claim)

    for source in sources:
        create_evidence_mapping(
            db=db,
            claim_id=claim.id,
            document_chunk_id=source["id"],
            relevance_score=source["similarity"],
            evidence_type="RELEVANT",
        )

    return claim