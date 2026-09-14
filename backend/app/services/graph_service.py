from sqlalchemy.orm import Session

from app.database.neo4j import get_neo4j_driver
from app.models.entity import Entity
from app.models.document import Document, DocumentPage
from app.models.claim import Claim
from app.models.evidence import Evidence
from app.models.document_chunk import DocumentChunk

def sync_entities_to_neo4j(
    db: Session,
    case_id: int,
) -> int:
    """
    Synchronize PostgreSQL entities for a case into Neo4j.

    PostgreSQL remains the source of truth for extracted entities.
    Neo4j stores the graph representation used for relationships
    and graph visualization.
    """

    entities = (
        db.query(Entity)
        .filter(Entity.case_id == case_id)
        .order_by(Entity.id)
        .all()
    )

    if not entities:
        return 0

    driver = get_neo4j_driver()

    with driver.session() as session:
        for entity in entities:
            entity_type = entity.entity_type.upper()

            if entity_type == "PERSON":
                session.run(
                    """
                    MERGE (e:Entity:Person {postgres_id: $entity_id})
                    SET e.case_id = $case_id,
                        e.name = $name,
                        e.entity_type = $entity_type,
                        e.description = $description,
                        e.confidence = $confidence,
                        e.document_id = $document_id,
                        e.page_id = $page_id,
                        e.page_number = $page_number
                    """,
                    entity_id=entity.id,
                    case_id=entity.case_id,
                    name=entity.name,
                    entity_type=entity.entity_type,
                    description=entity.description,
                    confidence=entity.confidence,
                    document_id=entity.document_id,
                    page_id=entity.page_id,
                    page_number=entity.page_number,
                )

            elif entity_type == "ORGANIZATION":
                session.run(
                    """
                    MERGE (e:Entity:Organization {postgres_id: $entity_id})
                    SET e.case_id = $case_id,
                        e.name = $name,
                        e.entity_type = $entity_type,
                        e.description = $description,
                        e.confidence = $confidence,
                        e.document_id = $document_id,
                        e.page_id = $page_id,
                        e.page_number = $page_number
                    """,
                    entity_id=entity.id,
                    case_id=entity.case_id,
                    name=entity.name,
                    entity_type=entity.entity_type,
                    description=entity.description,
                    confidence=entity.confidence,
                    document_id=entity.document_id,
                    page_id=entity.page_id,
                    page_number=entity.page_number,
                )

            elif entity_type == "LOCATION":
                session.run(
                    """
                    MERGE (e:Entity:Location {postgres_id: $entity_id})
                    SET e.case_id = $case_id,
                        e.name = $name,
                        e.entity_type = $entity_type,
                        e.description = $description,
                        e.confidence = $confidence,
                        e.document_id = $document_id,
                        e.page_id = $page_id,
                        e.page_number = $page_number
                    """,
                    entity_id=entity.id,
                    case_id=entity.case_id,
                    name=entity.name,
                    entity_type=entity.entity_type,
                    description=entity.description,
                    confidence=entity.confidence,
                    document_id=entity.document_id,
                    page_id=entity.page_id,
                    page_number=entity.page_number,
                )

            else:
                session.run(
                    """
                    MERGE (e:Entity {postgres_id: $entity_id})
                    SET e.case_id = $case_id,
                        e.name = $name,
                        e.entity_type = $entity_type,
                        e.description = $description,
                        e.confidence = $confidence,
                        e.document_id = $document_id,
                        e.page_id = $page_id,
                        e.page_number = $page_number
                    """,
                    entity_id=entity.id,
                    case_id=entity.case_id,
                    name=entity.name,
                    entity_type=entity.entity_type,
                    description=entity.description,
                    confidence=entity.confidence,
                    document_id=entity.document_id,
                    page_id=entity.page_id,
                    page_number=entity.page_number,
                )

    return len(entities)


def sync_documents_to_neo4j(
    db: Session,
    case_id: int,
) -> int:
    """
    Synchronize PostgreSQL documents for a case into Neo4j.

    PostgreSQL remains the source of truth for documents.
    Neo4j stores document nodes that can be connected to
    entities, claims, evidence, and other graph objects.
    """

    documents = (
        db.query(Document)
        .filter(Document.case_id == case_id)
        .order_by(Document.id)
        .all()
    )

    if not documents:
        return 0

    driver = get_neo4j_driver()

    with driver.session() as session:
        for document in documents:
            session.run(
                """
                MERGE (d:Document {postgres_id: $document_id})
                SET d.case_id = $case_id,
                    d.file_name = $file_name,
                    d.document_type = $document_type,
                    d.mime_type = $mime_type,
                    d.processing_status = $processing_status,
                    d.created_at = $created_at
                """,
                document_id=document.id,
                case_id=document.case_id,
                file_name=document.file_name,
                document_type=document.document_type,
                mime_type=document.mime_type,
                processing_status=document.processing_status,
                created_at=(
                    document.created_at.isoformat()
                    if document.created_at
                    else None
                ),
            )

    return len(documents)


def sync_entity_document_relationships(
    db: Session,
    case_id: int,
) -> int:
    """
    Create MENTIONS relationships between entities and
    the documents/pages where those entities were extracted.

    PostgreSQL remains the source of truth for the relationship
    because each Entity stores its source document and page.
    """

    entities = (
        db.query(Entity)
        .filter(Entity.case_id == case_id)
        .order_by(Entity.id)
        .all()
    )

    if not entities:
        return 0

    driver = get_neo4j_driver()
    relationship_count = 0

    with driver.session() as session:
        for entity in entities:
            result = session.run(
                """
                MATCH (e:Entity {postgres_id: $entity_id})
                MATCH (d:Document {postgres_id: $document_id})
                MERGE (e)-[:MENTIONS]->(d)
                RETURN count(*) AS matched
                """,
                entity_id=entity.id,
                document_id=entity.document_id,
            )

            record = result.single()

            if record and record["matched"] > 0:
                relationship_count += 1

    return relationship_count


def sync_events_to_neo4j(
    db: Session,
    case_id: int,
) -> int:
    """
    Synchronize PostgreSQL events for a case into Neo4j.

    PostgreSQL remains the source of truth for events.
    Neo4j stores Event nodes that can later be connected
    to documents, entities, claims, and other graph objects.
    """

    from app.models.event import Event

    events = (
        db.query(Event)
        .filter(Event.case_id == case_id)
        .order_by(Event.id)
        .all()
    )

    if not events:
        return 0

    driver = get_neo4j_driver()

    with driver.session() as session:
        for event in events:
            session.run(
                """
                MERGE (e:Event {postgres_id: $event_id})
                SET e.case_id = $case_id,
                    e.document_id = $document_id,
                    e.page_id = $page_id,
                    e.page_number = $page_number,
                    e.event_date = $event_date,
                    e.event_type = $event_type,
                    e.description = $description,
                    e.confidence = $confidence,
                    e.created_at = $created_at
                """,
                event_id=event.id,
                case_id=event.case_id,
                document_id=event.document_id,
                page_id=event.page_id,
                page_number=event.page_number,
                event_date=(
                    event.event_date.isoformat()
                    if event.event_date
                    else None
                ),
                event_type=event.event_type,
                description=event.description,
                confidence=event.confidence,
                created_at=(
                    event.created_at.isoformat()
                    if event.created_at
                    else None
                ),
            )

    return len(events)




def sync_claims_to_neo4j(
    db: Session,
    case_id: int,
) -> int:
    """
    Synchronize PostgreSQL claims for a case into Neo4j.

    PostgreSQL remains the source of truth for claims.
    Neo4j stores Claim nodes used for graph traversal,
    visualization, and evidence provenance.
    """

    claims = (
        db.query(Claim)
        .filter(Claim.case_id == case_id)
        .order_by(Claim.id)
        .all()
    )

    if not claims:
        return 0

    driver = get_neo4j_driver()

    with driver.session() as session:
        for claim in claims:
            session.run(
                """
                MERGE (c:Claim {postgres_id: $claim_id})
                SET c.case_id = $case_id,
                    c.claim_text = $claim_text,
                    c.status = $status,
                    c.confidence = $confidence,
                    c.reason = $reason,
                    c.created_at = $created_at
                """,
                claim_id=claim.id,
                case_id=claim.case_id,
                claim_text=claim.claim_text,
                status=claim.status,
                confidence=claim.confidence,
                reason=claim.reason,
                created_at=(
                    claim.created_at.isoformat()
                    if claim.created_at
                    else None
                ),
            )

    return len(claims)



def sync_claim_evidence_relationships(
    db: Session,
    case_id: int,
) -> int:
    """
    Create SUPPORTED_BY relationships between claims and
    document pages represented by their evidence mappings.

    PostgreSQL remains the source of truth for evidence.
    Neo4j stores the graph representation used for evidence
    provenance and relationship traversal.
    """

    evidence_rows = (
        db.query(Evidence, DocumentChunk)
        .join(
            DocumentChunk,
            Evidence.document_chunk_id == DocumentChunk.id,
        )
        .join(
            Claim,
            Evidence.claim_id == Claim.id,
        )
        .filter(Claim.case_id == case_id)
        .order_by(Evidence.id)
        .all()
    )

    if not evidence_rows:
        return 0

    driver = get_neo4j_driver()
    relationship_count = 0

    with driver.session() as session:
        for evidence, document_chunk in evidence_rows:
            result = session.run(
                """
                MATCH (c:Claim {postgres_id: $claim_id})
                MATCH (p:DocumentPage {postgres_id: $page_id})
                MERGE (c)-[r:SUPPORTED_BY {
                    postgres_id: $evidence_id
                }]->(p)
                SET r.case_id = $case_id,
                    r.document_chunk_id = $document_chunk_id,
                    r.relevance_score = $relevance_score,
                    r.evidence_type = $evidence_type
                RETURN count(r) AS matched
                """,
                claim_id=evidence.claim_id,
                page_id=document_chunk.page_id,
                evidence_id=evidence.id,
                case_id=case_id,
                document_chunk_id=evidence.document_chunk_id,
                relevance_score=evidence.relevance_score,
                evidence_type=evidence.evidence_type,
            )

            record = result.single()

            if record and record["matched"] > 0:
                relationship_count += 1

    return relationship_count



def sync_event_document_relationships(
    db: Session,
    case_id: int,
) -> int:
    """
    Create DERIVED_FROM relationships between events and
    the documents from which those events were extracted.

    PostgreSQL remains the source of truth because each Event
    stores its source document and page information.
    """

    from app.models.event import Event

    events = (
        db.query(Event)
        .filter(Event.case_id == case_id)
        .order_by(Event.id)
        .all()
    )

    if not events:
        return 0

    driver = get_neo4j_driver()
    relationship_count = 0

    with driver.session() as session:
        for event in events:
            result = session.run(
                """
                MATCH (e:Event {postgres_id: $event_id})
                MATCH (d:Document {postgres_id: $document_id})
                MERGE (e)-[:DERIVED_FROM]->(d)
                RETURN count(*) AS matched
                """,
                event_id=event.id,
                document_id=event.document_id,
            )

            record = result.single()

            if record and record["matched"] > 0:
                relationship_count += 1

    return relationship_count


def sync_document_pages_to_neo4j(
    db: Session,
    case_id: int,
) -> int:
    """
    Synchronize PostgreSQL document pages for a case into Neo4j.

    PostgreSQL remains the source of truth for document pages.
    Neo4j stores page nodes for document-level provenance and
    future evidence/source navigation.
    """

    pages = (
        db.query(DocumentPage)
        .join(Document, DocumentPage.document_id == Document.id)
        .filter(Document.case_id == case_id)
        .order_by(
            DocumentPage.document_id,
            DocumentPage.page_number,
        )
        .all()
    )

    if not pages:
        return 0

    driver = get_neo4j_driver()

    with driver.session() as session:
        for page in pages:
            session.run(
                """
                MERGE (p:DocumentPage {postgres_id: $page_id})
                SET p.case_id = $case_id,
                    p.document_id = $document_id,
                    p.page_number = $page_number,
                    p.extracted_text = $extracted_text
                """,
                page_id=page.id,
                case_id=case_id,
                document_id=page.document_id,
                page_number=page.page_number,
                extracted_text=page.extracted_text,
            )

    return len(pages)


def sync_document_page_relationships(
    db: Session,
    case_id: int,
) -> int:
    """
    Create HAS_PAGE relationships between documents and
    their document pages.

    PostgreSQL remains the source of truth because each
    DocumentPage stores its document_id.
    """

    pages = (
        db.query(DocumentPage)
        .join(Document, DocumentPage.document_id == Document.id)
        .filter(Document.case_id == case_id)
        .order_by(
            DocumentPage.document_id,
            DocumentPage.page_number,
        )
        .all()
    )

    if not pages:
        return 0

    driver = get_neo4j_driver()
    relationship_count = 0

    with driver.session() as session:
        for page in pages:
            result = session.run(
                """
                MATCH (d:Document {postgres_id: $document_id})
                MATCH (p:DocumentPage {postgres_id: $page_id})
                MERGE (d)-[:HAS_PAGE]->(p)
                RETURN count(*) AS matched
                """,
                document_id=page.document_id,
                page_id=page.id,
            )

            record = result.single()

            if record and record["matched"] > 0:
                relationship_count += 1

    return relationship_count


def sync_entity_page_relationships(
    db: Session,
    case_id: int,
) -> int:
    """
    Create EXTRACTED_FROM relationships between entities and
    the document pages where those entities were extracted.

    PostgreSQL remains the source of truth because each Entity
    stores its source page_id.
    """

    entities = (
        db.query(Entity)
        .filter(Entity.case_id == case_id)
        .order_by(Entity.id)
        .all()
    )

    if not entities:
        return 0

    driver = get_neo4j_driver()
    relationship_count = 0

    with driver.session() as session:
        for entity in entities:
            result = session.run(
                """
                MATCH (e:Entity {postgres_id: $entity_id})
                MATCH (p:DocumentPage {postgres_id: $page_id})
                MERGE (e)-[:EXTRACTED_FROM]->(p)
                RETURN count(*) AS matched
                """,
                entity_id=entity.id,
                page_id=entity.page_id,
            )

            record = result.single()

            if record and record["matched"] > 0:
                relationship_count += 1

    return relationship_count


def sync_event_page_relationships(
    db: Session,
    case_id: int,
) -> int:
    """
    Create EXTRACTED_FROM relationships between events and
    the document pages where those events were extracted.

    PostgreSQL remains the source of truth because each Event
    stores its source page_id.
    """

    from app.models.event import Event

    events = (
        db.query(Event)
        .filter(Event.case_id == case_id)
        .order_by(Event.id)
        .all()
    )

    if not events:
        return 0

    driver = get_neo4j_driver()
    relationship_count = 0

    with driver.session() as session:
        for event in events:
            result = session.run(
                """
                MATCH (e:Event {postgres_id: $event_id})
                MATCH (p:DocumentPage {postgres_id: $page_id})
                MERGE (e)-[:EXTRACTED_FROM]->(p)
                RETURN count(*) AS matched
                """,
                event_id=event.id,
                page_id=event.page_id,
            )

            record = result.single()

            if record and record["matched"] > 0:
                relationship_count += 1

    return relationship_count


def sync_case_relationships_to_neo4j(
    db: Session,
    case_id: int,
) -> int:
    """
    Synchronize PostgreSQL extracted relationships for a case
    into Neo4j.

    PostgreSQL remains the source of truth for extracted
    relationships. Neo4j stores the graph representation
    used for relationship traversal and visualization.

    The current MVP supports the relationship types produced
    by the deterministic relationship extraction service.
    """

    from app.models.relationship import Relationship

    relationships = (
        db.query(Relationship)
        .filter(Relationship.case_id == case_id)
        .order_by(Relationship.id)
        .all()
    )

    if not relationships:
        return 0

    driver = get_neo4j_driver()
    relationship_count = 0

    with driver.session() as session:
        for relationship in relationships:
            if (
                relationship.source_entity_id is None
                or relationship.target_event_id is None
            ):
                continue

            relationship_type = relationship.relationship_type.upper()

            if relationship_type == "INVOLVED_IN":
                query = """
                    MATCH (source:Entity {postgres_id: $source_entity_id})
                    MATCH (target:Event {postgres_id: $target_event_id})
                    MERGE (source)-[r:INVOLVED_IN {postgres_id: $relationship_id}]->(target)
                    SET r.case_id = $case_id,
                        r.confidence = $confidence,
                        r.description = $description,
                        r.source_document_id = $source_document_id,
                        r.source_page_id = $source_page_id
                    RETURN count(r) AS matched
                """

            elif relationship_type == "ASSOCIATED_WITH":
                query = """
                    MATCH (source:Entity {postgres_id: $source_entity_id})
                    MATCH (target:Event {postgres_id: $target_event_id})
                    MERGE (source)-[r:ASSOCIATED_WITH {postgres_id: $relationship_id}]->(target)
                    SET r.case_id = $case_id,
                        r.confidence = $confidence,
                        r.description = $description,
                        r.source_document_id = $source_document_id,
                        r.source_page_id = $source_page_id
                    RETURN count(r) AS matched
                """

            else:
                continue

            result = session.run(
                query,
                source_entity_id=relationship.source_entity_id,
                target_event_id=relationship.target_event_id,
                relationship_id=relationship.id,
                case_id=relationship.case_id,
                confidence=relationship.confidence,
                description=relationship.description,
                source_document_id=relationship.source_document_id,
                source_page_id=relationship.source_page_id,
            )

            record = result.single()

            if record and record["matched"] > 0:
                relationship_count += 1

    return relationship_count



