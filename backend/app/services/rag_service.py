from openai import OpenAI
from sqlalchemy.orm import Session

from app.config import settings
from app.services.semantic_search import semantic_search


def generate_rag_answer(
    db: Session,
    question: str,
    case_id: int,
    limit: int = 5,
) -> dict:
    """
    Generate a grounded answer for a case question.

    Flow:
        Question
            ↓
        Semantic Search
            ↓
        Relevant document chunks
            ↓
        NVIDIA Nemotron via OpenRouter
            ↓
        Answer + source information
    """

    # 1. Retrieve relevant chunks using the existing
    #    semantic-search implementation.
    retrieved_chunks = semantic_search(
        db=db,
        query=question,
        case_id=case_id,
        limit=limit,
    )

    # 2. Handle cases where no relevant evidence exists.
    if not retrieved_chunks:
        return {
            "answer": "I could not find relevant evidence in the documents for this question.",
            "sources": [],
        }

    # 3. Build grounded context from retrieved chunks.
    context_parts = []

    for index, chunk in enumerate(retrieved_chunks, start=1):
        context_parts.append(
            f"""
Evidence {index}
Document ID: {chunk["document_id"]}
Page: {chunk["page_number"]}
Chunk: {chunk["chunk_index"]}
Similarity: {chunk["similarity"]:.4f}

Text:
{chunk["text"]}
""".strip()
        )

    context = "\n\n---\n\n".join(context_parts)

    # 4. Create the LLM client.
    client = OpenAI(
        api_key=settings.nvidia_api_key,
        base_url=settings.nvidia_base_url,
    )

    # 5. Ground the model strictly in retrieved evidence.
    system_prompt = """
You are CaseFlow AI, a legal case document analysis assistant.

Answer the user's question using ONLY the retrieved evidence provided
by the system.

IMPORTANT CITATION RULES:
1. Never invent, renumber, or rename documents or evidence.
2. Never create citation labels such as "Evidence 1", "Evidence 2",
   "Document 1", "Document 2", etc.
3. The retrieved evidence already contains authoritative metadata:
   Document ID, Page, and Chunk.
4. When referring to evidence, use the exact metadata provided.
5. Use citations in this exact format:
   [Document ID: <id>, Page: <page>]
6. Do not cite information that is not present in the retrieved evidence.
7. Do not use outside knowledge.
8. If the retrieved evidence does not contain enough information to
   answer the question, clearly say so.
9. Be precise, concise, and factual.
10. Distinguish clearly between what the documents state and what cannot
    be established from the retrieved evidence.

This is an evidence-grounded retrieval task.
"""

    user_prompt = f"""
User question:

{question}

Retrieved case evidence:

{context}

Answer the question using only the retrieved evidence.
"""

    # 6. Call NVIDIA Nemotron through OpenRouter.
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

    answer = response.choices[0].message.content

    # 7. Return answer together with provenance.
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
        "answer": answer,
        "sources": sources,
    }