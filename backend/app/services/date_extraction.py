import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.document import DocumentPage
from app.models.extracted_date import ExtractedDate


DATE_PATTERNS = [
    # 12 March 2025
    re.compile(
        r"\b\d{1,2}\s+"
        r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
        r"\s+\d{4}\b",
        re.IGNORECASE,
    ),

    # March 12, 2025
    re.compile(
        r"\b"
        r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
        r"\s+\d{1,2},\s+\d{4}\b",
        re.IGNORECASE,
    ),

    # 12/03/2025 or 12-03-2025
    re.compile(
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b"
    ),

    # 2025-03-12
    re.compile(
        r"\b\d{4}-\d{2}-\d{2}\b"
    ),
]


def normalize_date(date_text: str):
    formats = [
        "%d %B %Y",
        "%d %b %Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
    ]

    for date_format in formats:
        try:
            return datetime.strptime(
                date_text.strip(),
                date_format,
            ).date()
        except ValueError:
            continue

    return None


def extract_dates_from_text(text: str) -> list[dict]:
    results = []
    seen = set()

    for pattern in DATE_PATTERNS:
        for match in pattern.finditer(text or ""):
            original_text = match.group(0).strip()

            normalized = normalize_date(original_text)

            if normalized is None:
                continue

            key = (
                original_text.lower(),
                normalized.isoformat(),
            )

            if key in seen:
                continue

            seen.add(key)

            results.append(
                {
                    "original_text": original_text,
                    "normalized_date": normalized,
                    "confidence": 0.95,
                }
            )

    return results


def extract_and_save_page_dates(
    db: Session,
    page: DocumentPage,
    case_id: int,
) -> list[ExtractedDate]:

    extracted_dates = extract_dates_from_text(
        page.extracted_text
    )

    saved_dates = []

    for item in extracted_dates:
        existing = (
            db.query(ExtractedDate)
            .filter(
                ExtractedDate.page_id == page.id,
                ExtractedDate.original_text == item["original_text"],
                ExtractedDate.normalized_date == item["normalized_date"],
            )
            .first()
        )

        if existing:
            saved_dates.append(existing)
            continue

        extracted_date = ExtractedDate(
            case_id=case_id,
            document_id=page.document_id,
            page_id=page.id,
            page_number=page.page_number,
            original_text=item["original_text"],
            normalized_date=item["normalized_date"],
            confidence=item["confidence"],
        )

        db.add(extracted_date)
        saved_dates.append(extracted_date)

    db.commit()

    for extracted_date in saved_dates:
        db.refresh(extracted_date)

    return saved_dates