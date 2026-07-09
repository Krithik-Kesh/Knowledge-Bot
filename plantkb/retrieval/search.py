from rank_bm25 import BM25Okapi

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

