import json

from openai import OpenAI
from sqlalchemy.orm import Session

from app.config import settings
from app.services.semantic_search import semantic_search
from app.services.claim_persistence import persist_claim_verification
from app.services.graph_service import (
    sync_claims_to_neo4j,
    sync_claim_evidence_relationships,
)


def build_sources(retrieved_chunks: list[dict]) -> list[dict]:
    return [
        {
            "id": chunk["id"],
            "document_id": chunk["document_id"],
            "page_id": chunk["page_id"],
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "similarity": chunk["similarity"],
            "text": chunk["text"],
        }
        for chunk in retrieved_chunks
    ]


def verify_claim(
    db: Session,
    claim_text: str,
    case_id: int,
    limit: int = 5,
) -> dict:
    """
    Verify a claim against semantically retrieved case evidence.

    Possible statuses:
        SUPPORTED
        CONTRADICTED
        INSUFFICIENT
    """

    # 1. Retrieve relevant evidence.
    retrieved_chunks = semantic_search(
        db=db,
        query=claim_text,
        case_id=case_id,
        limit=limit,
    )

    # 2. No evidence available.
    if not retrieved_chunks:
        return {
            "status": "INSUFFICIENT",
            "confidence": 0.0,
            "reason": "No relevant evidence was found in the case documents.",
            "sources": [],
        }

    # 3. Build evidence context.
    context_parts = []

    for chunk in retrieved_chunks:
        context_parts.append(
            f"""
Document ID: {chunk["document_id"]}
Page: {chunk["page_number"]}
Chunk: {chunk["chunk_index"]}
Similarity: {chunk["similarity"]:.4f}

Text:
{chunk["text"]}
""".strip()
        )

    context = "\n\n---\n\n".join(context_parts)

    # 4. Create LLM client.
    client = OpenAI(
        api_key=settings.nvidia_api_key,
        base_url=settings.nvidia_base_url,
    )

    # 5. Strict verification prompt.
    system_prompt = """
You are CaseFlow AI, a legal evidence verification assistant.

Your task is to evaluate ONE CLAIM against ONLY the supplied case
evidence.

You must classify the claim as exactly one of:

SUPPORTED
CONTRADICTED
INSUFFICIENT

Definitions:

SUPPORTED:
The supplied evidence directly supports the claim.

CONTRADICTED:
The supplied evidence directly conflicts with the claim.

INSUFFICIENT:
The supplied evidence does not contain enough information to determine
whether the claim is supported or contradicted.

Rules:
1. Use ONLY the supplied evidence.
2. Do not use outside knowledge.
3. Do not invent facts.
4. Do not assume facts that are not stated.
5. Do not treat semantic similarity alone as proof.
6. Base the classification on the actual text of the evidence.
7. Confidence must be a number between 0 and 1.
8. Give a short factual reason.
9. Do not invent document numbers or page numbers.

Return ONLY valid JSON in this exact structure:

{
  "status": "SUPPORTED",
  "confidence": 0.0,
  "reason": "Short explanation"
}
"""

    user_prompt = f"""
Claim:

{claim_text}

Case evidence:

{context}

Verify the claim using only the evidence above.

Return ONLY the requested JSON object.
"""

    # 6. Call the LLM.
    response = client.chat.completions.create(
        model=settings.nvidia_model,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        max_tokens=1000,
        temperature=0.2,
    )

    # 7. Safely read the model response.
    message = response.choices[0].message
    raw_content = message.content

    sources = build_sources(retrieved_chunks)

    # Handle empty model responses without crashing.
    if not raw_content:
        return {
            "status": "INSUFFICIENT",
            "confidence": 0.0,
            "reason": "The verification model did not return a usable result.",
            "sources": sources,
        }

    raw_result = raw_content.strip()

    # 8. Parse JSON.
    try:
        verification = json.loads(raw_result)
    except json.JSONDecodeError:
        return {
            "status": "INSUFFICIENT",
            "confidence": 0.0,
            "reason": "The verification model returned an invalid result.",
            "sources": sources,
        }

    # 9. Validate the status.
    status = verification.get("status", "INSUFFICIENT")

    if status not in {
        "SUPPORTED",
        "CONTRADICTED",
        "INSUFFICIENT",
    }:
        status = "INSUFFICIENT"

    # 10. Validate confidence.
    confidence = verification.get("confidence", 0.0)

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(0.0, min(1.0, confidence))

    # 11. Get reason.
    reason = verification.get(
        "reason",
        "The available evidence was insufficient to verify the claim.",
    )

    # 12. Persist claim and evidence mappings.
    persist_claim_verification(
        db=db,
        case_id=case_id,
        claim_text=claim_text,
        status=status,
        confidence=confidence,
        reason=reason,
        sources=sources,
    )

    # 13. Synchronize claims and evidence relationships to Neo4j.
    sync_claims_to_neo4j(db, case_id)
    sync_claim_evidence_relationships(db, case_id)

    return {
        "status": status,
        "confidence": confidence,
        "reason": reason,
        "sources": sources,
    }