from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.embedding_service import generate_embedding


def semantic_search(
    db: Session,
    query: str,
    case_id: int,
    limit: int = 5,
) -> list[dict]:
    """
    Search document chunks belonging to a case using
    pgvector cosine similarity.
    """

    query_embedding = generate_embedding(query)

    sql = text(
        """
        SELECT
            dc.id,
            dc.document_id,
            dc.page_id,
            dc.page_number,
            dc.chunk_index,
            dc.text,
            1 - (dc.embedding <=> CAST(:query_embedding AS vector)) AS similarity
        FROM document_chunks dc
        JOIN documents d
            ON d.id = dc.document_id
        WHERE d.case_id = :case_id
          AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> CAST(:query_embedding AS vector)
        LIMIT :limit
        """
    )

    result = db.execute(
        sql,
        {
            "query_embedding": str(query_embedding),
            "case_id": case_id,
            "limit": limit,
        },
    )

    return [
        {
            "id": row.id,
            "document_id": row.document_id,
            "page_id": row.page_id,
            "page_number": row.page_number,
            "chunk_index": row.chunk_index,
            "text": row.text,
            "similarity": float(row.similarity),
        }
        for row in result
    ]