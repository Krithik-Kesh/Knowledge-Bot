"""
scripts/resume_ingest.py

One-shot resume for an ingest interrupted before manifest.json was written.
(A truncated .docx -- not a valid ZIP -- aborted reconcile() partway, so no
manifest was saved; a bare `py -m plantkb.index` would then re-embed every
English file since a missing manifest makes them all look "added".)

Instead of trusting the (missing) manifest, this asks Chroma what is already
embedded and ingests only the English-eligible sources still missing, wrapping
each file so one corrupt/unreadable file cannot abort the batch. Failures are
logged inline, summarised at the end, and written to data/ingest_failures.txt
for follow-up (re-sync from SharePoint); they are deliberately kept OUT of the
manifest baseline so a later reconcile retries them.

Resumable: `missing` is recomputed from Chroma each run and upserts persist per
file, so re-running after any interruption simply continues with a smaller set.
Safe to re-run; a fully-synced index does nothing.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from plantkb import config
from plantkb.ingest import manifest as m
from plantkb.ingest.embed import embed_documents
from plantkb.ingest.metadata import detect_language
from plantkb.ingest.reconcile import INGEST_LANGUAGES, _get_collection, _ingest_source

logger = logging.getLogger("resume_ingest")


def _setup_logging() -> None:
    """Log to both the console and data/resume_ingest.log (matches the file
    logging that scripts/run_reconcile.py uses)."""
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter("%(asctime)s %(levelname)s: %(message)s")
    logger.setLevel(logging.INFO)
    for handler in (
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(config.DATA_DIR / "resume_ingest.log", encoding="utf-8"),
    ):
        handler.setFormatter(fmt)
        logger.addHandler(handler)


def _embedded_sources(collection) -> set[str]:
    """Distinct `source` values already present in the collection (Chroma is
    the source of truth for what's embedded -- no vectors fetched)."""
    got = collection.get(include=["metadatas"])
    return {(md or {}).get("source") for md in got["metadatas"]} - {None}


def main() -> int:
    _setup_logging()
    root = config.WATCHED_FOLDER
    if not root.exists():
        logger.error("watched folder missing: %s", root)
        return 1

    current = m.scan_folder(root)                                    # {source: sha256}
    english = {s for s in current if detect_language(s) in INGEST_LANGUAGES}

    collection = _get_collection()
    missing = sorted(english - _embedded_sources(collection))
    logger.info(
        "english=%d already_embedded=%d missing=%d",
        len(english), len(english) - len(missing), len(missing),
    )

    failures: list[tuple[str, str]] = []
    for i, source in enumerate(missing, 1):
        try:
            _ingest_source(collection, source, root, embed_documents)
            logger.info("[%d/%d] ok    %s", i, len(missing), source)
        except Exception as e:  # one bad file must not abort the batch
            failures.append((source, f"{type(e).__name__}: {e}"))
            logger.warning("[%d/%d] FAIL  %s -> %s", i, len(missing), source, e)

    # Manifest baseline = everything actually embedded now + intentionally
    # skipped non-English. Failed files stay OUT so a later reconcile retries.
    embedded_after = _embedded_sources(collection)
    baseline = {
        s: h for s, h in current.items()
        if s in embedded_after or detect_language(s) not in INGEST_LANGUAGES
    }
    m.save_manifest(config.MANIFEST_PATH, baseline)

    # Durable, human-readable "needs attention" list; cleared once all succeed.
    fail_path = config.DATA_DIR / "ingest_failures.txt"
    if failures:
        fail_path.write_text(
            "\n".join(f"{src}\t{err}" for src, err in failures) + "\n",
            encoding="utf-8",
        )
    elif fail_path.exists():
        fail_path.unlink()

    ok = len(missing) - len(failures)
    logger.info(
        "resume done: embedded %d/%d, failed %d, manifest baseline=%d files",
        ok, len(missing), len(failures), len(baseline),
    )
    if failures:
        logger.warning(
            "=== %d file(s) need re-sync from SharePoint (see %s) ===",
            len(failures), fail_path,
        )
        for src, err in failures:
            logger.warning("   %s  (%s)", src, err)
    return 0


if __name__ == "__main__":
    sys.exit(main())
