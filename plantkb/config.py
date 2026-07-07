import os
from pathlib import Path
#from dotenv import load_dotenv

#load_dotenv()  # reads .env when present

WATCHED_FOLDER = Path(os.environ[r'C:/Users/tamilsk/Colas/HSE - Documents'])
DATA_DIR       = Path(os.environ.get("DATA_DIR", "data"))
EMBED_MODEL    = "Qwen/Qwen3-Embedding-0.6B"   #embedding model for vectorization
COLLECTION = "plantkb" # chroma db