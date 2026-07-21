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
# Generation LLM (chat/instruct). Like EMBED_MODEL this is a Hugging Face repo
# id, resolved from the local HF cache (offline, see llm_feed.run_llm). The
# cached Qwen2.5-32B/72B-Instruct are too heavy for CPU -- point this at a small
# instruct model you've downloaded once (default: Qwen2.5-3B-Instruct).
LLM_MODEL      = os.environ.get("LLM_MODEL", "Qwen/Qwen2.5-3B-Instruct")
COLLECTION = "plantkb" # chroma db
LLM = "Qwen/Qwen-3.0-Chat" # LLM model for answering queries