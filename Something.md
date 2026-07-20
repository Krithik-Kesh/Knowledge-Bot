# Something.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PlantKB: a local-first RAG knowledge bot over a corporate HSE document library
synced via OneDrive. It watches a folder, ingests PDFs/DOCX/PPTX/TXT into a
local Chroma vector DB, and serves hybrid (dense + BM25) retrieval over it.
Everything runs on-device — no calls to huggingface.co or any other network
service at query/ingest time (see "Local-first constraint" below).

## Setup on a new machine

`plantkb/config.py` and `.env` are both gitignored (see `.gitignore`) — they
do **not** transfer with the repo and must be recreated by hand on any new
machine:

- `plantkb/config.py` — recreate from `plantkb/index.py`/`ingest/reconcile.py`
  usage. Key values to set: `WATCHED_FOLDER` (absolute path to the synced
  OneDrive HSE folder on that machine), `EMBED_MODEL`
  (`Qwen/Qwen3-Embedding-0.6B`), `COLLECTION` (`plantkb`), plus `DOCS`/
  `DATA_DIR` (default via `DOCS`/`DATA_DIR` env vars, falling back to
  `docs`/`data`).
- `.env` — read by `python-dotenv` in `config.py`; used for anything
  overriding the above via `os.environ`.
- `data/` is also gitignored (Chroma DB + `manifest.json` live there) — a new
  machine starts with an empty index and needs a first full ingest.
- Embedding model: `embed.py` forces `HF_HUB_OFFLINE=1` before importing
  `sentence_transformers`, so `Qwen/Qwen3-Embedding-0.6B` must already be
  present in the local HF cache (`~/.cache/huggingface/hub`) *before* running
  ingest/search on a new machine. Download it once on a machine with normal
  internet access, then copy the cache over (or let it download once with
  `HF_HUB_OFFLINE` unset, then rely on cache afterward).

## Commands

```bash
pip install -r requirements.txt

# First-time bulk index (treats every file in WATCHED_FOLDER as new;
# safe to re-run — later runs report an empty diff)
py -m plantkb.index

# Incremental reconcile (same logic, meant for Windows Task Scheduler)
python scripts/run_reconcile.py

# Ad-hoc retrieval smoke test
py -m plantkb.retrieval.search
```

There is no test suite, linter, or build step configured in this repo.

## Architecture

Two pipelines share `plantkb/config.py` and the same Chroma collection, but
run as **separate processes** — ingest never runs inside the serving
process, and search's in-memory corpus cache (`_corpus()` in `search.py`)
can go stale if reconcile writes while a search process is alive. That's an
accepted tradeoff, not a bug to fix reflexively.

**Ingest path** (`plantkb/ingest/`, driven by `reconcile.py`):
1. `manifest.scan_folder()` — hash every file in `WATCHED_FOLDER` (by
   suffix in `INGEST_SUFFIXES`) into `{source_key: sha256}`.
2. `manifest.compute_diff()` against the last-saved `manifest.json` →
   `added` / `changed` / `deleted` sets, computed live, never persisted.
3. `partition.partition()` — routes by suffix to the matching
   `unstructured` partition function, then `chunk_by_title`. PDFs use the
   `"fast"` strategy deliberately (reads the text layer directly) instead of
   `"hi_res"`, which would need a layout-detection model pulled from
   huggingface.co — that download fails behind this network's
   TLS-inspecting proxy. Tradeoff: no OCR for scanned/image-only PDFs.
4. `metadata.stamp_metadata()` — parses the corporate doc-ID filename
   convention `LOCATION.OWNER.TYPE.NUMBER.LANGUAGE.REVISION.Title.ext`
   (e.g. `COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf`) into flat
   per-chunk metadata (`doc_family`, `language`, `revision`, etc.). Files
   that don't match the convention degrade to `"unknown"` fields rather than
   failing ingestion.
5. `embed.embed_documents()` — Qwen3 embeddings in **document mode** (no
   `prompt_name`). Vectors are always passed to Chroma explicitly via
   `embeddings=`; Chroma's own embedding-function hook is never used for
   this collection.
6. `reconcile._ingest_source()` — delete-then-upsert per changed file (chunk
   ids are deterministic: `f"{source}::{i}"`), so a re-ingest of the same
   file overwrites cleanly and delete-by-source is exact.
7. `manifest.save_manifest()` is written **last**, only after the vector DB
   update succeeds — a mid-run crash re-does work on the next run rather
   than silently losing it.
8. Non-English sources are scanned and hashed but never partitioned/embedded
   — `reconcile.py`'s `INGEST_LANGUAGES = {"en"}` reflects a current
   English-only pilot; `metadata.detect_language()` lets this be skipped
   before the expensive partition/embed steps.

**Retrieval path** (`plantkb/retrieval/search.py`):
- Hybrid dense + BM25, fused with reciprocal rank fusion (RRF), then
  filtered so a superseded doc revision can never outrank its replacement
  (`_is_superseded()`, keyed on `doc_family` + numeric `revision`).
- Dense candidates use Qwen3 in **query mode** (`prompt_name="query"`) —
  this is the one place query-mode embedding happens; document-mode
  (`embed.py`) and query-mode must never be mixed (the "asymmetry rule"
  referenced in both files' docstrings).
- BM25 is intentionally weighted down relative to dense in the RRF fusion
  (`0.5` vs `1.0` in `search()`) — it's a recall backstop for exact-token
  lookups (doc codes, regulation numbers), not an equal partner, since
  unweighted BM25 can rank on incidental token overlap over actual meaning.
- `search()` defaults to `language="en"` to match the English-only pilot;
  pass `language=None` to search across whatever is indexed.

## Local-first / on-premises constraint

No runtime dependency on huggingface.co or any external API for ingest or
search — `HF_HUB_OFFLINE=1` is set before `sentence_transformers` is
imported in `embed.py`. This is a hard constraint, not an optimization:
respect it when adding new models or retrieval steps — anything added must
either work fully offline or be gated the same way PDF `hi_res` was
avoided.
