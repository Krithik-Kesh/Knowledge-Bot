"""
search.py

Hybrid retrieval: dense (Qwen3 query-mode embeddings) + BM25 (lexical),
fused with reciprocal rank fusion, then filtered so a superseded doc
revision never outranks its replacement.

Dense alone misses exact-token lookups (a doc code like COR.HSE.TRN.001,
a regulation number) since semantic similarity can drift toward
conceptually-related-but-wrong chunks. BM25 alone misses paraphrases.
Fusing both widens recall without giving up precision.
"""

from __future__ import annotations

import re
from functools import lru_cache
from pprint import pprint
from typing import Optional

import chromadb
from rank_bm25 import BM25Okapi

from plantkb import config
from plantkb.ingest.embed import _model

RRF_K = 60
CANDIDATE_POOL = 30  # widen recall before fusion/filtering, then cut to top_k

_TOKEN_RE = re.compile(r"\w+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _get_collection():
    client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
    return client.get_collection(name=config.COLLECTION)

#runs once ever in the lifetime


@lru_cache(maxsize=1)
def _corpus():
    """Every chunk's id/text/metadata, cached..

    Backs both the BM25 index and the latest-revision lookup. Rebuilding
    per query would be wasteful once this runs inside a long-lived web app;
    the tradeoff is that this cache goes stale if reconcile.py writes new
    chunks while the process is alive acceptable for now since ingest
    and serving run as separate processes.
    """
    got = _get_collection().get(include=["documents", "metadatas"])
    return got["ids"], got["documents"], got["metadatas"]


@lru_cache(maxsize=1)
def _bm25_index() -> BM25Okapi:
    _, documents, _ = _corpus()
    return BM25Okapi([_tokenize(doc) for doc in documents])


@lru_cache(maxsize=1)
def _latest_revision_by_family() -> dict[str, int]:
    """doc_family -> latest revision, from numeric revisions only.

    Families with no numeric revision on record aren't tracked here, so
    their chunks are never dropped by the supersede filter below.
    """
    _, _, metadatas = _corpus()
    latest: dict[str, int] = {}
    for md in metadatas:
        revision = md.get("revision", "unknown")
        if revision.isdigit():
            family = md.get("doc_family", "unknown")
            latest[family] = max(latest.get(family, -1), int(revision))
    return latest

 
def _is_superseded(metadata: dict) -> bool:
    """True if this chunk's revision is not the latest known one for its
    doc_family -- safety-critical content should never let an old
    procedure outrank the one that replaced it."""
    revision = metadata.get("revision", "unknown")
    if not revision.isdigit():
        return False
    latest = _latest_revision_by_family().get(metadata.get("doc_family", "unknown"))
    return latest is not None and int(revision) != latest


def _dense_candidates(query: str, n: int, language: Optional[str]) -> list[str]:
    embedding = _model().encode(
        [query], prompt_name="query", normalize_embeddings=True
    ).tolist()
    where = {"language": language} if language else None
    results = _get_collection().query(query_embeddings=embedding, n_results=n, where=where)
    return results["ids"][0]


def _bm25_candidates(query: str, n: int, language: Optional[str]) -> list[str]:
    ids, _, metadatas = _corpus()
    scores = _bm25_index().get_scores(_tokenize(query))
    ranked = sorted(range(len(ids)), key=lambda i: scores[i], reverse=True)
    if language:
        ranked = [i for i in ranked if metadatas[i].get("language") == language]
    return [ids[i] for i in ranked[:n]]


def _reciprocal_rank_fusion(*weighted_id_lists: tuple[list[str], float]) -> list[str]:
    """RRF over multiple ranked lists, each carrying its own weight.

    Equal weighting sounds fair but isn't: BM25 rewards literal token
    overlap regardless of sense (a query about the "line of fire" hazard
    zone can out-rank on a chunk that just happens to mention electrical
    "fire"), while the Qwen3 embeddings already carry real domain meaning.
    BM25 is a recall backstop for exact terms (doc codes, regulation
    numbers), not an equal partner -- so it's weighted down relative to
    dense by default in search()'s call below.
    """
    scores: dict[str, float] = {}
    for ranked_ids, weight in weighted_id_lists:
        for rank, doc_id in enumerate(ranked_ids):
            scores[doc_id] = scores.get(doc_id, 0.0) + weight / (RRF_K + rank)
    return sorted(scores, key=scores.get, reverse=True)


def search(query: str, top_k: int = 5, language: Optional[str] = "en") -> list[dict]:
    """Hybrid dense + BM25 retrieval for `query`, fused with RRF and
    filtered to the latest known revision per doc_family.

    Defaults to English -- the pilot only ingests English sources (see
    reconcile.py's INGEST_LANGUAGES) and only serves English queries.
    Pass language=None to search across whatever languages are indexed.
    """
    dense_ids = _dense_candidates(query, CANDIDATE_POOL, language)
    bm25_ids = _bm25_candidates(query, CANDIDATE_POOL, language)
    fused_ids = _reciprocal_rank_fusion((dense_ids, 1.0), (bm25_ids, 0.5))

    ids, documents, metadatas = _corpus()
    by_id = dict(zip(ids, zip(documents, metadatas)))

    hits = []
    for doc_id in fused_ids:
        doc, md = by_id[doc_id]
        if _is_superseded(md):
            continue
        hits.append({"id": doc_id, "document": doc, "metadata": md})
        if len(hits) == top_k:
            break
    return hits


if __name__ == "__main__":
    for hit in search("What is line of fire?", top_k=2):
        pprint(hit)
#py -m plantkb.retrieval.search