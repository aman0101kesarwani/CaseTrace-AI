import re

from sqlalchemy.orm import Session

from app.models.document import DocumentPage
from app.models.entity import Entity


# Common legal titles / organization words that should
# never be treated as person names.
NON_PERSON_TERMS = {
    "high court",
    "supreme court",
    "district court",
    "court",
    "corporation",
    "company",
    "government",
    "authority",
    "department",
    "case number",
    "case type",
    "case background",
    "key documents",
    "testing notes",
    "statement of facts",
    "registered property",
    "residential property",
    "synthetic case document",
    "for testing",
    "for testing demonstration",
    "mehta property dispute",
}


PERSON_PATTERN = re.compile(
    r"\b"
    r"[A-Z][a-z]+"
    r"[ \t]+"
    r"[A-Z][a-z]+"
    r"(?:[ \t]+[A-Z][a-z]+)?"
    r"\b"
)


ORGANIZATION_PATTERNS = [
    re.compile(
        r"\b[A-Z][A-Za-z0-9&'-]*(?:\s+[A-Z][A-Za-z0-9&'-]*)*"
        r"\s+(?:Corporation|Company|Ltd|Limited|Bank|University)\b"
    ),
    re.compile(
        r"\b(?:High Court|Supreme Court|District Court)\b"
    ),
]


LOCATION_NAMES = {
    "Delhi",
    "Mumbai",
    "Kolkata",
    "Chennai",
    "Bangalore",
    "Bengaluru",
    "Hyderabad",
    "Pune",
    "Lucknow",
    "Jaipur",
}


def extract_entities_from_text(text: str) -> list[dict]:
    """
    Extract basic PERSON, ORGANIZATION, and LOCATION entities.

    This is an MVP rule-based extractor intended for
    predictable testing before introducing more advanced
    NLP/LLM-based extraction.
    """

    text = text or ""

    entities: list[dict] = []
    seen: set[tuple[str, str]] = set()

    def add_entity(
        name: str,
        entity_type: str,
        confidence: float,
    ):
        name = name.strip().rstrip(".,;:")

        if not name:
            return

        key = (name.lower(), entity_type)

        if key in seen:
            return

        seen.add(key)

        entities.append(
            {
                "name": name,
                "entity_type": entity_type,
                "confidence": confidence,
            }
        )

    # -------------------------------------------------
    # ORGANIZATIONS
    # -------------------------------------------------

    for pattern in ORGANIZATION_PATTERNS:
        for match in pattern.finditer(text):
            name = match.group(0).strip()

            add_entity(
                name=name,
                entity_type="ORGANIZATION",
                confidence=0.85,
            )

    # -------------------------------------------------
    # PERSONS
    # -------------------------------------------------

    for match in PERSON_PATTERN.finditer(text):
        name = match.group(0).strip().rstrip(".,;:")

        normalized = name.lower()

        if normalized in NON_PERSON_TERMS:
            continue

        # Do not classify names that contain organization
        # or court terms as people.
        if any(
            term in normalized
            for term in NON_PERSON_TERMS
        ):
            continue

        # If this exact text was already detected as an
        # organization, don't also call it a person.
        if any(
            existing["name"].lower() == normalized
            and existing["entity_type"] == "ORGANIZATION"
            for existing in entities
        ):
            continue

        add_entity(
            name=name,
            entity_type="PERSON",
            confidence=0.80,
        )

    # -------------------------------------------------
    # LOCATIONS
    # -------------------------------------------------

    for location in LOCATION_NAMES:
        pattern = re.compile(
            rf"\b{re.escape(location)}\b",
            re.IGNORECASE,
        )

        for match in pattern.finditer(text):
            add_entity(
                name=match.group(0),
                entity_type="LOCATION",
                confidence=0.85,
            )

    return entities


def extract_and_save_page_entities(
    db: Session,
    page: DocumentPage,
    case_id: int,
) -> list[Entity]:

    extracted_entities = extract_entities_from_text(
        page.extracted_text
    )

    saved_entities: list[Entity] = []

    for item in extracted_entities:

        existing = (
            db.query(Entity)
            .filter(
                Entity.page_id == page.id,
                Entity.name == item["name"],
                Entity.entity_type == item["entity_type"],
            )
            .first()
        )

        if existing:
            saved_entities.append(existing)
            continue

        entity = Entity(
            case_id=case_id,
            document_id=page.document_id,
            page_id=page.id,
            page_number=page.page_number,
            name=item["name"],
            entity_type=item["entity_type"],
            confidence=item["confidence"],
        )

        db.add(entity)
        saved_entities.append(entity)

    db.commit()

    for entity in saved_entities:
        db.refresh(entity)

    return saved_entities