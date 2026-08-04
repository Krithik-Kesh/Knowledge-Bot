"""Manifest: remembers what files existed last run, and diffs against now.
The manifest is a flat snapshot '{source_key: content_hash}' not a record
of what changed. The added/changed/deleted sets are computed live from
(folder vs manifest) and never stored.
"""
from __future__ import annotations
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path


# File types worth ingesting. Adjust to the corpus.
INGEST_SUFFIXES = {".pdf", ".pptx", ".docx", ".txt"}


def _hash_file(path: Path, chunk_size: int = 1 << 20) -> str:
    """
    SHA-256 hash of a file's contents. For large files, read in chunks to avoid
    loading the entire file into memory. """
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(chunk_size), b""):
            h.update(block)
    return h.hexdigest()


def source_key(path: Path, root: Path) -> str:
    """Stable identifier for a file..

    This is the SAME string stamped into chunk metadata as `source`, so a
    changed/deleted file can be traced back to its chunks in the vector DB.
    """
    return path.relative_to(root).as_posix()


def scan_folder(root: Path) -> dict[str, str]:
    """Current state of the watched folder: {source_key: content_hash}."""
    state: dict[str, str] = {}
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in INGEST_SUFFIXES:
            state[source_key(p, root)] = _hash_file(p)
    return state


def load_manifest(manifest_path: Path) -> dict[str, str]:
    """Last-run snapshot. Empty dict on first run (file absent)."""
    if not manifest_path.exists():
        return {}
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def save_manifest(manifest_path: Path, state: dict[str, str]) -> None:
    """Overwrite the manifest with the current snapshot (written last, after
    the vector DB is successfully updated, so a mid-run crash re-does work
    rather than losing it)."""
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(state, indent=2, sort_keys=True), encoding="utf-8"
    )


@dataclass
class Diff:
    added: set[str] = field(default_factory=set)
    changed: set[str] = field(default_factory=set)
    deleted: set[str] = field(default_factory=set)

    @property
    def is_empty(self) -> bool:
        return not (self.added or self.changed or self.deleted)


def compute_diff(current: dict[str, str], previous: dict[str, str]) -> Diff:
    """The whole heart of reconcile: three sets from two snapshots.

    """
    cur, prev = current.keys(), previous.keys()
    return Diff(
        added=cur - prev,
        deleted=prev - cur,
        changed={k for k in cur & prev if current[k] != previous[k]},
    )