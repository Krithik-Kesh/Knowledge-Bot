from plantkb import config
from plantkb.ingest.embed import EmbedFunction, _model
from pprint import pprint
import chromadb



top_k = 2
query = list(["What is line of fire?"])

model = _model()
Qwen = EmbedFunction(model)

query_embedding = Qwen.__call__(query)
client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
collection = client.get_collection(name="plantkb")

results = collection.query(
    query_embeddings=[query_embedding],
    n_results=top_k,
)

print(type(Qwen))
#py -m plantkb.retrieval.search