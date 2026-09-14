from sqlalchemy.orm import Session

from app.models.entity import Entity
from app.models.event import Event
from app.models.relationship import Relationship


def extract_and_save_case_relationships(
    db: Session,
    case_id: int,
) -> list[Relationship]:
    """
    Extract deterministic entity-to-event relationships for a case.

    PostgreSQL remains the source of truth for extracted
    relationships.

    The initial MVP uses the existing entity and event data
    together with deterministic rules supported by the
    synthetic case text.

    Relationships are resolved at case level because entities
    and their related events may exist on different pages.

    Relationship provenance is taken from the event source
    document and page because the event provides the textual
    evidence establishing the relationship.
    """

    entities = (
        db.query(Entity)
        .filter(Entity.case_id == case_id)
        .order_by(Entity.id)
        .all()
    )

    events = (
        db.query(Event)
        .filter(Event.case_id == case_id)
        .order_by(Event.id)
        .all()
    )

    saved_relationships: list[Relationship] = []

    for entity in entities:
        for event in events:
            relationship_type = None
            confidence = None
            description = None

            entity_name = entity.name.lower()
            event_type = (event.event_type or "").upper()

            # ---------------------------------------------
            # PERSON → EVENT
            # ---------------------------------------------

            if entity.entity_type == "PERSON":

                # Rahul Sharma
                if entity_name == "rahul sharma":

                    if event_type == "PROPERTY_ACQUISITION":
                        relationship_type = "INVOLVED_IN"
                        confidence = 0.95
                        description = (
                            "Rahul Sharma is identified as the plaintiff "
                            "claiming acquisition of the property."
                        )

                    elif event_type == "DOCUMENTATION_RECORDED":
                        relationship_type = "INVOLVED_IN"
                        confidence = 0.85
                        description = (
                            "The plaintiff's property ownership "
                            "documentation is associated with Rahul Sharma."
                        )

                    elif event_type == "POSSESSION_DISPUTE":
                        relationship_type = "INVOLVED_IN"
                        confidence = 0.80
                        description = (
                            "The possession dispute concerns the property "
                            "whose ownership is claimed by Rahul Sharma."
                        )

                # Vikram Mehta
                elif entity_name == "vikram mehta":

                    if event_type == "POSSESSION_DISPUTE":
                        relationship_type = "INVOLVED_IN"
                        confidence = 0.85
                        description = (
                            "Vikram Mehta is identified as the defendant "
                            "disputing the plaintiff's ownership claim."
                        )

                    elif event_type == "COMPETING_INTEREST":
                        relationship_type = "INVOLVED_IN"
                        confidence = 0.95
                        description = (
                            "Vikram Mehta is identified as the defendant "
                            "asserting a competing interest."
                        )

            # ---------------------------------------------
            # ORGANIZATION → EVENT
            # ---------------------------------------------

            elif entity.entity_type == "ORGANIZATION":

                if (
                    entity_name == "district court"
                    and event_type == "COURT_PROCEEDING"
                ):
                    relationship_type = "ASSOCIATED_WITH"
                    confidence = 0.95
                    description = (
                        "The property dispute was formally brought "
                        "before the District Court."
                    )

            # ---------------------------------------------
            # LOCATION → EVENT
            # ---------------------------------------------

            elif entity.entity_type == "LOCATION":

                if entity_name == "delhi":
                    if event_type in {
                        "PROPERTY_ACQUISITION",
                        "POSSESSION_DISPUTE",
                    }:
                        relationship_type = "ASSOCIATED_WITH"
                        confidence = 0.80
                        description = (
                            "The event concerns the residential property "
                            "located in Delhi."
                        )

            # ---------------------------------------------
            # NO SUPPORTED RELATIONSHIP
            # ---------------------------------------------

            if relationship_type is None:
                continue

            # ---------------------------------------------
            # PREVENT DUPLICATES
            # ---------------------------------------------

            existing = (
                db.query(Relationship)
                .filter(
                    Relationship.case_id == case_id,
                    Relationship.source_entity_id == entity.id,
                    Relationship.target_event_id == event.id,
                    Relationship.relationship_type == relationship_type,
                )
                .first()
            )

            if existing:
                # Keep existing relationship but update its
                # provenance to the event source.
                existing.source_document_id = event.document_id
                existing.source_page_id = event.page_id
                existing.description = description
                existing.confidence = confidence

                saved_relationships.append(existing)
                continue

            # ---------------------------------------------
            # SAVE RELATIONSHIP
            # ---------------------------------------------

            relationship = Relationship(
                case_id=case_id,
                source_entity_id=entity.id,
                target_event_id=event.id,
                relationship_type=relationship_type,
                source_document_id=event.document_id,
                source_page_id=event.page_id,
                description=description,
                confidence=confidence,
            )

            db.add(relationship)
            saved_relationships.append(relationship)

    db.commit()

    for relationship in saved_relationships:
        db.refresh(relationship)

    return saved_relationships
