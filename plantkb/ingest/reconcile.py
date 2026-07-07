"""Reconcile the vector DB with the synced folder.

One run = one pass: scan folder, diff against manifest, apply changes to the
vector DB, overwrite manifest. Task Scheduler calls scripts/run_reconcile.py,
which calls reconcile() here.

Flow per run:
    1. scan_folder()      -> what exists now
    2. load_manifest()    -> what existed last run
    3. compute_diff()     -> added / changed / deleted  (in-memory only)
    4. for added|changed: delete-old-chunks then re-ingest -> vector DB
    5. for deleted:       delete chunks                    -> vector DB
    6. save_manifest()    -> new baseline
"""

from __future__ import annotations

import logging
from pathlib import Path

from plantkb import config
from plantkb.ingest import manifest as m

from plantkb.ingest.partition import partition      # partition(path) -> list[chunk]
from plantkb.ingest.metadata import stamp_metadata  # stamp_metadata(chunks, source) -> chunks

logger = logging.getLogger(__name__)

# Reconcile: scan folder, diff against manifest, update vector DB, save manifest
def _get_collection():
    """Chroma collection via PersistentClient (embedded, on local disk)."""
    import chromadb
    client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
    return client.get_or_create_collection(config.COLLECTION)

def _chunk_id(source: str, i: int) -> str:
    """Deterministic chunk id from source + index, so a re-ingest of the same
    file overwrites cleanly and delete-by-source is exact."""
    return f"{source}::{i}"


def _delete_source(collection, source: str) -> None:
    """Remove every chunk belonging to one source file."""
    collection.delete(where={"source": source})


def _ingest_source(collection, source: str, root: Path, embed_fn) -> None:
    """Partition -> stamp -> embed -> upsert, for a single file.

    `source` is the manifest key (relative POSIX path); the real file lives at
    root / source. The same `source` string is stamped into every chunk's
    metadata so it can be found again on change/delete.
    """
    abs_path = root / source
    chunks = partition(abs_path)                 # unstructured routing
    chunks = stamp_metadata(chunks, source=source)  # ensure metadata["source"] = source

    if not chunks:
        # Image-only PDF that decrypted but yielded no text -- log and skip.
        logger.warning("no chunks produced for %s (image-only / empty?)", source)
        return

    texts = [c.text for c in chunks]
    ids = [_chunk_id(source, i) for i in range(len(chunks))]
    metadatas = [dict(c.metadata, source=source) for c in chunks]
    embeddings = embed_fn(texts)

    # delete-then-upsert keeps a changed file from leaving stale chunks behind
    _delete_source(collection, source)
    collection.upsert(
        ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas
    )



def reconcile(embed_fn) -> m.Diff:
    """Run one reconcile pass. `embed_fn(list[str]) -> list[vector]` is the
    Qwen3 document-embedding function (document mode, not query mode)."""
    root = config.WATCHED_FOLDER
    if not root.exists():
        raise FileNotFoundError(
            f"Watched folder does not exist: {root} "
            "(is the OneDrive library synced and kept on this device?)"
        )

    # scan the watched folder and compare to the last-run manifest
    current = m.scan_folder(root)
    previous = m.load_manifest(config.MANIFEST_PATH)
    diff = m.compute_diff(current, previous)


    if diff.is_empty:
        logger.info("nothing changed; vector DB already in sync")
        return diff

    collection = _get_collection()

    # delete the chunks of any deleted files, then re-ingest the added/changed files
    for source in diff.deleted:
        logger.info("deleted: %s", source)
        _delete_source(collection, source)

    #Tale the added and changed files, delete their old chunks, then re-ingest
    for source in sorted(diff.added | diff.changed):
        logger.info("%s: %s", "changed" if source in diff.changed else "added", source)
        _ingest_source(collection, source, root, embed_fn)

    # only now, after the DB is updated, commit the new baseline
    m.save_manifest(config.MANIFEST_PATH, current)
    logger.info(
        "reconcile done: +%d ~%d -%d",
        len(diff.added), len(diff.changed), len(diff.deleted),
    )
    return diff