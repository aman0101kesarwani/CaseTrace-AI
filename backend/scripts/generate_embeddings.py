from app.database.connection import SessionLocal
from app.models import DocumentChunk
from app.services.embedding_service import generate_embedding


def main():
    db = SessionLocal()

    try:
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.embedding.is_(None))
            .order_by(DocumentChunk.id)
            .all()
        )

        print(f"Found {len(chunks)} chunks without embeddings.")

        for chunk in chunks:
            print(
                f"Generating embedding for chunk "
                f"{chunk.id} (document={chunk.document_id}, page={chunk.page_number})..."
            )

            chunk.embedding = generate_embedding(chunk.text)

        db.commit()

        print(f"Successfully generated embeddings for {len(chunks)} chunks.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()