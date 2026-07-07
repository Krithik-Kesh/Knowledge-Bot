"""
partition.py

Routes a source file to the matching unstructured partition function by
suffix, then chunks the resulting elements by title. Only called for files
manifest.INGEST_SUFFIXES already accepted, so the ValueError below is
defensive, not an expected path.

PDFs use the "fast" strategy (reads the text layer directly, no model
download) rather than "hi_res" -- hi_res needs a one-time layout-detection
model pulled from huggingface.co, which fails behind this network's
TLS-inspecting proxy. Trade-off: no layout-aware OCR for scanned/image-only
PDFs, same limitation already noted for the decrypt-removal test.
"""

from __future__ import annotations

from pathlib import Path

from unstructured.chunking.title import chunk_by_title
from unstructured.partition.docx import partition_docx
from unstructured.partition.pdf import partition_pdf
from unstructured.partition.pptx import partition_pptx
from unstructured.partition.text import partition_text


def partition(path: Path):
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        elements = partition_pdf(filename=str(path), strategy="fast")
    elif suffix == ".docx":
        elements = partition_docx(filename=str(path))
    elif suffix == ".pptx":
        elements = partition_pptx(filename=str(path))
    elif suffix == ".txt":
        elements = partition_text(filename=str(path))
    else:
        raise ValueError(f"unsupported doc_type: {suffix}")

    return chunk_by_title(elements)
