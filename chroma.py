import chromadb

# 1. Initialize a persistent client (saves data to a local directory)
# For temporary testing in RAM instead, you can use: chromadb.EphemeralClient()
client = chromadb.PersistentClient(path="./my_chroma_db")

# 2. Create or fetch a collection (equivalent to a table in SQL)
# We configure it to use cosine similarity for matching vectors
collection = client.get_or_create_collection(
    name="knowledge_base", 
    metadata={"hnsw:space": "cosine"}
)

# 3. Add raw text documents to your collection
# Chroma automatically generates vector embeddings for these texts behind the scenes
collection.add(
    documents=[
        "Python is a high-level, general-purpose programming language.",
        "The quick brown fox jumps over the lazy dog.",
        "Artificial Intelligence and Machine Learning are transforming modern tech.",
        "Apples, bananas, and oranges are popular fruits filled with vitamins."
    ],
    metadatas=[
        {"category": "coding"},
        {"category": "idioms"},
        {"category": "ai"},
        {"category": "food"}
    ],
    ids=["doc1", "doc2", "doc3", "doc4"]  # Unique string identifiers are mandatory
)

# 4. Query the vector database semantically
# Chroma converts your query into an embedding and finds the closest matching documents
results = collection.query(
    query_texts=["Tell me about computer software engineering"],
    n_results=1  # Number of top matching documents to return
)

# 5. Inspect the output
print("Matching Document:", results['documents'][0][0])
print("Document Metadata:", results['metadatas'][0][0])
print("Distance Metric Score:", results['distances'][0][0])
