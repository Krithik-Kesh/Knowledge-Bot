import chromadb

client = chromadb.PersistentClient(path="./chroma_data")
collection = client.get_or_create_collection("plant_docs")

# Test adding a document
collection.add(
    documents=["Shutdown procedure for Pump P-204 when pressure drops below 2.1 bar"],
    metadatas=[{"doc_type": "SOP", "equipment_id": "P-204"}],
    ids=["sop-001"]
)



# Test querying
results = collection.query(
    query_texts=["what to do when pump pressure is low"],
    n_results=1
)

print("Query result:", results["documents"])