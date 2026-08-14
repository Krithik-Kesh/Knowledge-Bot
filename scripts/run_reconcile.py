"""
scripts/run_reconcile.py

Windows Task Scheduler entrypoint: `python scripts/run_reconcile.py`.
Runs headless (no console), so failures are logged to a file rather than
raised, and the process exits non-zero so a failed scheduled run is
detectable in Task Scheduler's history instead of failing silently.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from plantkb import config
from plantkb.ingest.embed import embed_documents
from plantkb.ingest.reconcile import reconcile


def main() -> int:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        filename=str(config.DATA_DIR / "reconcile.log"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        reconcile(embed_documents)
        return 0
    except Exception:
        logging.exception("reconcile run failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
