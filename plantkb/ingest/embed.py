"""
embed.py

Shared Qwen3 write-side embedder (documents mode). Query-mode embedding
(prompt_name="query") belongs to the retrieve/ module, not here -- see
CLAUDE.md's asymmetry rule: never apply the query prompt to documents.

HF_HUB_OFFLINE is set before importing sentence_transformers so the model is
loaded only from the local cache (~/.cache/huggingface/hub) -- no runtime
network dependency on huggingface.co, per CLAUDE.md's on-premises/local-first
constraint. Download the model once on a machine with normal internet access
first.
"""

from __future__ import annotations

import os

os.environ.setdefault("HF_HUB_OFFLINE", "1")

from functools import lru_cache
from typing import List

from sentence_transformers import SentenceTransformer
from plantkb import config

@lru_cache(maxsize=1)
def _model() -> SentenceTransformer:
    return SentenceTransformer(config.EMBED_MODEL)

def embed_documents(texts: List[str]) -> List[List[float]]:
    """Document-mode embedding used by reconcile.py's ingest path.

    No prompt_name is applied -- see module docstring's asymmetry rule.
    Vectors are always passed to Chroma explicitly (add/upsert/query
    embeddings=...); Chroma's own embedding-function hook is never used,
    so there's no Chroma-facing wrapper class here.
    """
    return _model().encode(texts, normalize_embeddings=True).tolist()