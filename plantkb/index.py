"""
index.py

First-time bulk load: run reconcile() once against an empty manifest, so
every file in WATCHED_FOLDER is treated as added. Safe to re-run -- later
runs just report an empty diff via scripts/run_reconcile.py instead.
"""

from __future__ import annotations

import logging

from plantkb.ingest.embed import embed_documents
from plantkb.ingest.reconcile import reconcile


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    diff = reconcile(embed_documents)
    print(f"indexed: +{len(diff.added)} ~{len(diff.changed)} -{len(diff.deleted)}")


if __name__ == "__main__":
    main()
