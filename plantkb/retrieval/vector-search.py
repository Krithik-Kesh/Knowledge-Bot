import torch
from sentence_transformers import SentenceTransformer,  util
from rank_bm25 import BM25Okapi
from config import EMBED_MODEL

model = SentenceTransformer(EMBED_MODEL)

# BM25 requires that each text is tokenized as a (sub)list of words
tokenized_corpus = [doc.lower().split() for doc in documents]
bm25 = BM25Okapi(tokenized_corpus)

def search_bm25(query, top_k=3):
    tokenized_query = query.lower().split()
    
    # Getting scores (lexical relevance to the query) for all documents
    scores = bm25.get_scores(tokenized_query)
    
    # Ranking documents by score
    ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    return ranked_indices[:top_k], scores

def search_semantic(query, top_k=3):
    # Embedding the user's query into a vector
    query_embedding = model.encode(query, convert_to_tensor=True)
    
    # Calculating cosine similarity between the query and all documents
    cosine_scores = util.cos_sim(query_embedding, doc_embeddings)[0]
    
    # Ranking documents by similarity
    ranked_indices = torch.argsort(cosine_scores, descending=True).tolist()
    return ranked_indices[:top_k], cosine_scores.tolist()

def hybrid_search(query, top_k=3):
    # 1. Obtaining the two standalone search rankings
    bm25_ranks, _ = search_bm25(query, top_k=len(documents))
    semantic_ranks, _ = search_semantic(query, top_k=len(documents))
    
    # 2. Applying RRF formula: RRF_score = 1 / (k + rank)
    rrf_scores = {i: 0.0 for i in range(len(documents))}
    k_constant = 60  # The value of 60 is a standard academic convention
    
    # Adding RRF scores from BM25
    for rank, doc_idx in enumerate(bm25_ranks):
        rrf_scores[doc_idx] += 1.0 / (k_constant + rank + 1)
        
    # Adding RRF scores from semantic search
    for rank, doc_idx in enumerate(semantic_ranks):
        rrf_scores[doc_idx] += 1.0 / (k_constant + rank + 1)
    
    # 3. Sorting documents by their final fused RRF score
    final_ranked_indices = sorted(rrf_scores.keys(), key=lambda idx: rrf_scores[idx], reverse=True)
    
    return final_ranked_indices[:top_k], rrf_scores