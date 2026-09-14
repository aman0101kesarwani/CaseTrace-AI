import traceback
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.models import Case, Document, DocumentPage, DocumentChunk
from app.schemas.document import DocumentPageResponse, DocumentResponse

from app.services.document_processor import (
    extract_pdf_pages,
    clean_text,
    chunk_text,
)
from app.services.date_extraction import extract_and_save_page_dates
from app.services.event_extraction import extract_and_save_page_events
from app.services.entity_extraction import extract_and_save_page_entities

from app.services.graph_service import (
    sync_entities_to_neo4j,
    sync_documents_to_neo4j,
    sync_entity_document_relationships,
    sync_events_to_neo4j,
    sync_event_document_relationships,
    sync_document_pages_to_neo4j,
    sync_document_page_relationships,
    sync_entity_page_relationships,
    sync_event_page_relationships,
    sync_case_relationships_to_neo4j,
)


router = APIRouter(
    prefix="/cases/{case_id}/documents",
    tags=["Documents"],
)


ALLOWED = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
}


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    case_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    if file.content_type not in ALLOWED:
        raise HTTPException(
            status_code=400,
            detail="Unsupported document type",
        )

    upload_dir = Path(settings.upload_dir) / str(case_id)

    upload_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    safe_name = (
        f"{uuid4().hex}_"
        f"{Path(file.filename or 'document').name}"
    )

    path = upload_dir / safe_name

    path.write_bytes(await file.read())

    doc = Document(
        case_id=case_id,
        file_name=file.filename or safe_name,
        stored_path=str(path),
        mime_type=file.content_type,
        processing_status="UPLOADED",
    )

    db.add(doc)

    db.commit()

    db.refresh(doc)

    if file.content_type == "application/pdf":
        try:
            pages = extract_pdf_pages(str(path))

            for item in pages:
                cleaned_page_text = clean_text(
                    item["text"]
                )

                # Store the cleaned page.
                page = DocumentPage(
                    document_id=doc.id,
                    page_number=item["page_number"],
                    extracted_text=cleaned_page_text,
                )

                db.add(page)

                db.flush()

                # Extract and save dates from this page.
                extract_and_save_page_dates(
                    db=db,
                    page=page,
                    case_id=case_id,
                )

                # Extract and save events from this page.
                extract_and_save_page_events(
                    db=db,
                    page=page,
                    case_id=case_id,
                )

                # Extract and save entities from this page.
                extract_and_save_page_entities(
                    db=db,
                    page=page,
                    case_id=case_id,
                )

                # Create chunks from the cleaned page text.
                chunks = chunk_text(
                    cleaned_page_text
                )

                for chunk_index, chunk in enumerate(chunks):
                    db.add(
                        DocumentChunk(
                            document_id=doc.id,
                            page_id=page.id,
                            page_number=item["page_number"],
                            chunk_index=chunk_index,
                            text=chunk,
                        )
                    )

            doc.processing_status = "PROCESSED"

            db.commit()

            # Synchronize the processed case data into Neo4j.
            sync_documents_to_neo4j(db, case_id)
            sync_document_pages_to_neo4j(db, case_id)
            sync_entities_to_neo4j(db, case_id)
            sync_events_to_neo4j(db, case_id)

            # Synchronize graph relationships.
            sync_document_page_relationships(db, case_id)
            sync_entity_document_relationships(db, case_id)
            sync_entity_page_relationships(db, case_id)
            sync_event_document_relationships(db, case_id)
            sync_event_page_relationships(db, case_id)
            sync_case_relationships_to_neo4j(db, case_id)

        except Exception:
            # Temporary debugging: print the actual exception.
            traceback.print_exc()

            db.rollback()

            doc.processing_status = "PROCESSING_FAILED"

            db.commit()

    return doc


@router.get(
    "",
    response_model=list[DocumentResponse],
)
def list_documents(
    case_id: int,
    db: Session = Depends(get_db),
):
    if not db.get(Case, case_id):
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    return list(
        db.scalars(
            select(Document)
            .where(Document.case_id == case_id)
            .order_by(Document.created_at.desc())
        ).all()
    )


@router.get(
    "/{document_id}/pages",
    response_model=list[DocumentPageResponse],
)
def list_document_pages(
    case_id: int,
    document_id: int,
    db: Session = Depends(get_db),
):
    doc = db.get(Document, document_id)

    if not doc or doc.case_id != case_id:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    return list(
        db.scalars(
            select(DocumentPage)
            .where(
                DocumentPage.document_id == document_id
            )
            .order_by(DocumentPage.page_number)
        ).all()
    )