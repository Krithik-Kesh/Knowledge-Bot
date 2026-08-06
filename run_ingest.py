#!/usr/bin/env python
"""
Run the corpus ingest and embedding update.
This script is meant to be run by Windows Task Scheduler every night.
"""
import sys
from pathlib import Path

# Add project to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from plantkb.ingest.manifest import ingest_and_embed

if __name__ == "__main__":
    print("[Corpus Update] Starting corpus ingest and embedding...")
    try:
        ingest_and_embed()
        print("[Corpus Update] Completed successfully!")
    except Exception as e:
        print(f"[Corpus Update] Error: {e}")
        sys.exit(1)
