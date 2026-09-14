from app.database.connection import SessionLocal
from app.services.rag_service import generate_rag_answer


db = SessionLocal()

try:
    result = generate_rag_answer(
        db=db,
        question="What is the dispute about?",
        case_id=2,
        limit=5,
    )

    print("ANSWER:")
    print(result["answer"])

    print()
    print("SOURCES:")

    for source in result["sources"]:
        print(
            f"Document {source['document_id']}, "
            f"Page {source['page_number']}, "
            f"Chunk {source['chunk_index']}, "
            f"Similarity {source['similarity']:.4f}"
        )

finally:
    db.close()