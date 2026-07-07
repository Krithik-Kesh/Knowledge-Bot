"""
metadata.py

Stamps policy/context metadata onto chunks, step after partitioning.
Replaces each chunk's `.metadata` with a flat dict (Chroma requires scalar
values, no nested objects) carrying source, doc_type, language, access_level.
"""

from __future__ import annotations

from pathlib import Path

DEFAULT_LANGUAGE = "en"

# TODO: define the real folder-prefix -> access tier policy. access_level is
# a POLICY decision (never inferred from document content) -- see CLAUDE.md.
ACCESS_LEVEL_BY_PREFIX: dict[str, str] = {}
DEFAULT_ACCESS_LEVEL = "operator"


def _doc_type(source: str) -> str:
    return Path(source).suffix.lstrip(".").lower()


def _access_level(source: str) -> str:
    top = Path(source).parts[0] if Path(source).parts else ""
    return ACCESS_LEVEL_BY_PREFIX.get(top, DEFAULT_ACCESS_LEVEL)


def stamp_metadata(chunks, source: str):
    """Attach source/doc_type/language/access_level to every chunk."""
    doc_type = _doc_type(source)
    access_level = _access_level(source)

    for chunk in chunks:
        chunk.metadata = {
            "source": source,
            "doc_type": doc_type,
            "language": DEFAULT_LANGUAGE,
            "access_level": access_level,
        }
    return chunks
