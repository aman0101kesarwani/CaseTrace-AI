import json

from openai import OpenAI
from sqlalchemy.orm import Session

from app.config import settings
from app.services.semantic_search import semantic_search


def detect_contradiction(
    db: Session,
    claim_a: str,
    claim_b: str,
    case_id: int,
) -> dict:
    """
    Compare two claims and determine whether they potentially contradict
    each other.

    Possible statuses:
        CONTRADICTION_FOUND
        NO_CONTRADICTION
        INSUFFICIENT
    """

    # 1. Retrieve evidence relevant to both claims.
    query = f"{claim_a}\n{claim_b}"

    retrieved_chunks = semantic_search(
        db=db,
        query=query,
        case_id=case_id,
        limit=5,
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

    # 5. Strict contradiction detection prompt.
    system_prompt = """
You are CaseFlow AI, a legal evidence contradiction detection assistant.

Your task is to compare TWO CLAIMS using ONLY the supplied case evidence.

Classify them as exactly one of:

CONTRADICTION_FOUND
NO_CONTRADICTION
INSUFFICIENT

Definitions:

CONTRADICTION_FOUND:
The evidence shows that the two claims contain directly incompatible
statements about the same fact, event, person, property, date, or issue.

NO_CONTRADICTION:
The evidence does not show that the two claims directly conflict.

INSUFFICIENT:
There is not enough evidence to determine whether the claims conflict.

Rules:
1. Use ONLY the supplied evidence.
2. Do not use outside knowledge.
3. Do not invent facts.
4. Do not assume unstated facts.
5. Do not treat semantic similarity alone as a contradiction.
6. A difference in wording is not necessarily a contradiction.
7. Only identify a contradiction when the claims are materially incompatible.
8. Do not decide which claim is true.
9. Do not decide which party should win.
10. Flag potential contradictions for human review.
11. Confidence must be a number between 0 and 1.
12. Give a short factual reason.
13. Do not invent document numbers or page numbers.

Return ONLY valid JSON in this exact structure:

{
  "status": "CONTRADICTION_FOUND",
  "confidence": 0.0,
  "reason": "Short explanation"
}
"""

    user_prompt = f"""
Claim A:

{claim_a}

Claim B:

{claim_b}

Case evidence:

{context}

Compare the two claims using only the supplied evidence.

Do not decide which claim is true.

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

    if not raw_content:
        return {
            "status": "INSUFFICIENT",
            "confidence": 0.0,
            "reason": "The contradiction detection model did not return a usable result.",
            "sources": [
                {
                    "document_id": chunk["document_id"],
                    "page_id": chunk["page_id"],
                    "page_number": chunk["page_number"],
                    "chunk_index": chunk["chunk_index"],
                    "similarity": chunk["similarity"],
                    "text": chunk["text"],
                }
                for chunk in retrieved_chunks
            ],
        }

    raw_result = raw_content.strip()

    # 8. Parse JSON.
    try:
        detection = json.loads(raw_result)
    except json.JSONDecodeError:
        return {
            "status": "INSUFFICIENT",
            "confidence": 0.0,
            "reason": "The contradiction detection model returned an invalid result.",
            "sources": [
                {
                    "document_id": chunk["document_id"],
                    "page_id": chunk["page_id"],
                    "page_number": chunk["page_number"],
                    "chunk_index": chunk["chunk_index"],
                    "similarity": chunk["similarity"],
                    "text": chunk["text"],
                }
                for chunk in retrieved_chunks
            ],
        }

    # 9. Validate status.
    status = detection.get(
        "status",
        "INSUFFICIENT",
    )

    if status not in {
        "CONTRADICTION_FOUND",
        "NO_CONTRADICTION",
        "INSUFFICIENT",
    }:
        status = "INSUFFICIENT"

    # 10. Validate confidence.
    confidence = detection.get(
        "confidence",
        0.0,
    )

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(
        0.0,
        min(1.0, confidence),
    )

    # 11. Get reason.
    reason = detection.get(
        "reason",
        "The available evidence was insufficient to determine whether the claims contradict.",
    )

    # 12. Return actual retrieval provenance.
    sources = [
        {
            "document_id": chunk["document_id"],
            "page_id": chunk["page_id"],
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "similarity": chunk["similarity"],
            "text": chunk["text"],
        }
        for chunk in retrieved_chunks
    ]

    return {
        "status": status,
        "confidence": confidence,
        "reason": reason,
        "claim_a": claim_a,
        "claim_b": claim_b,
        "sources": sources,
    }