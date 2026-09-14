import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.document import DocumentPage
from app.models.event import Event


DATE_LINE_PATTERN = re.compile(
    r"^\s*(\d{4}-\d{2}-\d{2})\s*$"
)


def classify_event_type(description: str) -> str:
    """
    Classify a basic legal event using deterministic keywords.
    """

    text = description.lower()

    # 1. Property acquisition
    if any(
        keyword in text
        for keyword in [
            "acquisition",
            "acquired",
            "purchase",
            "purchased",
        ]
    ):
        return "PROPERTY_ACQUISITION"

    # 2. Documentation / registration
    if any(
        keyword in text
        for keyword in [
            "documentation",
            "document",
            "recorded",
            "registered",
            "registration",
        ]
    ):
        return "DOCUMENTATION_RECORDED"

    # 3. Court-related events must be checked
    # before general "dispute" events.
    if any(
        keyword in text
        for keyword in [
            "court",
            "judicial",
            "lawsuit",
            "litigation",
            "formally brought",
        ]
    ):
        return "COURT_PROCEEDING"

    # 4. Competing interest / claim
    if any(
        keyword in text
        for keyword in [
            "competing interest",
            "competing claim",
            "asserted a competing",
        ]
    ):
        return "COMPETING_INTEREST"

    # 5. Possession / general dispute
    if any(
        keyword in text
        for keyword in [
            "possession",
            "disagreement",
            "dispute",
        ]
    ):
        return "POSSESSION_DISPUTE"

    # 6. Fallback
    return "CASE_EVENT"


def extract_events_from_page(text: str) -> list[dict]:
    """
    Extract simple date + description events from page text.

    Expected format:

    2024-02-10
    Plaintiff claims acquisition of the residential property.
    """

    lines = [
        line.strip()
        for line in (text or "").splitlines()
        if line.strip()
    ]

    events = []

    for index, line in enumerate(lines):
        match = DATE_LINE_PATTERN.match(line)

        if not match:
            continue

        try:
            event_date = datetime.strptime(
                match.group(1),
                "%Y-%m-%d",
            ).date()
        except ValueError:
            continue

        if index + 1 >= len(lines):
            continue

        description = lines[index + 1].strip()

        if not description:
            continue

        event_type = classify_event_type(description)

        events.append(
            {
                "event_date": event_date,
                "event_type": event_type,
                "description": description,
                "confidence": 0.90,
            }
        )

    return events


def extract_and_save_page_events(
    db: Session,
    page: DocumentPage,
    case_id: int,
) -> list[Event]:

    extracted_events = extract_events_from_page(
        page.extracted_text
    )

    saved_events = []

    for item in extracted_events:
        existing = (
            db.query(Event)
            .filter(
                Event.page_id == page.id,
                Event.event_date == item["event_date"],
                Event.description == item["description"],
            )
            .first()
        )

        if existing:
            saved_events.append(existing)
            continue

        event = Event(
            case_id=case_id,
            document_id=page.document_id,
            page_id=page.id,
            page_number=page.page_number,
            event_date=item["event_date"],
            event_type=item["event_type"],
            description=item["description"],
            confidence=item["confidence"],
        )

        db.add(event)
        saved_events.append(event)

    db.commit()

    for event in saved_events:
        db.refresh(event)

    return saved_events