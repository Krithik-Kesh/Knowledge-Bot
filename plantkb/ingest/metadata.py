"""
metadata.py

Stamps context metadata onto chunks, step after partitioning. Replaces each
chunk's `.metadata` with a flat dict (Chroma requires scalar values, no
nested objects).

Filenames follow the corporate doc-ID convention:
    LOCATION.OWNER.TYPE.NUMBER.LANGUAGE.REVISION.Title.ext
e.g. COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf

Parsed fields let retrieval filter/group by type, language, owning
department, and doc_family (the same document across languages/revisions
shares one family key -- e.g. EN and FR editions of doc 001). Files that
don't match the convention degrade gracefully to "unknown" fields rather
than failing ingestion.
"""

from __future__ import annotations

from pathlib import Path

def _file_type(source: str) -> str:
    return Path(source).suffix.lstrip(".").lower()


def _parse_doc_id(stem: str) -> dict[str, str]:
    """Parse LOCATION.OWNER.TYPE.NUMBER.LANGUAGE.REVISION.Title from a
    filename stem (no extension). Falls back to "unknown" fields for any
    file that doesn't follow the convention."""
    if 'FR' in stem.upper():
        DEFAULT_LANGUAGE = "fr"
    else:
        DEFAULT_LANGUAGE = "en"
    parts = stem.split(".")
    if len(parts) < 7:
        return {
            "location_id": "unknown",
            "owner_id": "unknown",
            "doc_type": "unknown",
            "doc_number": "unknown",
            "language": DEFAULT_LANGUAGE,
            "revision": "unknown",
            "doc_family": "unknown",
            "title": stem,
        }

    location_id, owner_id, doc_type, doc_number, language, revision = parts[:6]
    return {
        "location_id": location_id,
        "owner_id": owner_id,
        "doc_type": doc_type,
        "doc_number": doc_number,
        "language": language.lower(),
        "revision": revision,
        "doc_family": f"{location_id}-{owner_id}-{doc_type}-{doc_number}",
        "title": ".".join(parts[6:]),
    }


def detect_language(source: str) -> str:
    """Language field parsed from the doc-ID filename convention (same logic
    stamp_metadata uses), exposed standalone so reconcile.py can skip a file
    before the expensive partition/embed steps rather than after."""
    return _parse_doc_id(Path(source).stem)["language"]


def stamp_metadata(chunks, source: str):
    """Attach source, file_type, and parsed doc-ID fields to every chunk."""
    doc_id_fields = _parse_doc_id(Path(source).stem)

    for chunk in chunks:
        chunk.metadata = {
            "source": source,
            "file_type": _file_type(source),
            **doc_id_fields,
        }
    return chunks
