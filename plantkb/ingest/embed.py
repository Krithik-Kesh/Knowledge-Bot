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
from sentence_transformers import SentenceTransformer
from plantkb import config

from typing import Dict, Any
from chromadb import EmbeddingFunction, Embeddings
from chromadb.utils.embedding_functions import register_embedding_function

@lru_cache(maxsize=1)
def _model() -> SentenceTransformer:
    return SentenceTransformer(config.EMBED_MODEL)

@register_embedding_function
class EmbedFunction(EmbeddingFunction):

    def __init__(self, model):
        self.model = model

    #embed the document
    def __call__(self, texts: str) -> Embeddings:
        return self.model.encode(texts, convert_to_numpy=True).tolist()

    @staticmethod
    def name() -> str:
        return "my-ef"

    def get_config(self) -> Dict[str, Any]:
        return dict(model=self.model)

    @staticmethod
    def build_from_config(config: Dict[str, Any]) -> "EmbeddingFunction":
        return EmbedFunction(config.EMBED_MODEL)