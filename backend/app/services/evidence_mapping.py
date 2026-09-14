from sqlalchemy.orm import Session

from app.models.claim import Claim
from app.models.document_chunk import DocumentChunk
from app.models.evidence import Evidence


def create_evidence_mapping(
    db: Session,
    claim_id: int,
    document_chunk_id: int,
    relevance_score: float | None = None,
    evidence_type: str = "RELEVANT",
) -> Evidence:
    """
    Create a persistent mapping between a claim and a document chunk.

    The claim and document chunk must belong to the same case.
    Duplicate claim-to-chunk mappings are not created.
    """

    claim = (
        db.query(Claim)
        .filter(Claim.id == claim_id)
        .first()
    )

    if claim is None:
        raise ValueError("Claim not found.")

    document_chunk = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.id == document_chunk_id)
        .first()
    )

    if document_chunk is None:
        raise ValueError("Document chunk not found.")


    from app.models.document import Document

    document = (
        db.query(Document)
        .filter(Document.id == document_chunk.document_id)
        .first()
    )

    if document is None or document.case_id != claim.case_id:
        raise ValueError(
            "Claim and document chunk must belong to the same case."
        )

    existing = (
        db.query(Evidence)
        .filter(
            Evidence.claim_id == claim_id,
            Evidence.document_chunk_id == document_chunk_id,
        )
        .first()
    )

    if existing is not None:
        return existing

    evidence = Evidence(
        claim_id=claim_id,
        document_chunk_id=document_chunk_id,
        relevance_score=relevance_score,
        evidence_type=evidence_type,
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence

