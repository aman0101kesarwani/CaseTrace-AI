from pathlib import Path
import re

from pypdf import PdfReader


def extract_pdf_pages(file_path: str) -> list[dict]:
    """
    Extract text from a PDF page-by-page.

    Returns:
        [
            {
                "page_number": 1,
                "text": "..."
            },
            ...
        ]
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    reader = PdfReader(str(path))

    pages: list[dict] = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""

        pages.append(
            {
                "page_number": page_number,
                "text": text.strip(),
            }
        )

    return pages


def clean_text(text: str) -> str:
    """
    Clean extracted document text while preserving readable content.
    """

    # Fix common PDF encoding artifact seen in extracted text.
    text = text.replace("â", "-")

    # Normalize line endings.
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove excessive spaces and tabs.
    text = re.sub(r"[ \t]+", " ", text)

    # Remove excessive blank lines.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 150,
) -> list[str]:
    """
    Split text into overlapping chunks.

    Args:
        text: Cleaned document text.
        chunk_size: Maximum approximate number of characters per chunk.
        overlap: Number of characters carried into the next chunk.

    Returns:
        List of text chunks.
    """

    text = text.strip()

    if not text:
        return []

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be >= 0 and smaller than chunk_size")

    chunks: list[str] = []

    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = end - overlap

    return chunks