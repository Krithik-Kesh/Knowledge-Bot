import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()  # reads .env when present

WATCHED_FOLDER = Path(r"C:/temp_crawled_sharepoint")
DOCS = Path(os.environ.get("DOCS", "docs")) # folder to scan for source files
DATA_DIR       = Path(os.environ.get("DATA_DIR", "data")) # directory for storing data
CHROMA_DIR     = DATA_DIR / "chroma_db"
MANIFEST_PATH  = DATA_DIR / "manifest.json"
EMBED_MODEL    = "Qwen/Qwen3-Embedding-0.6B"   #embedding model for vectorization
COLLECTION = "plantkb" # chroma db