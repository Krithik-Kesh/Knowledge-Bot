"""

llm_feed.py
LLM feeds the results from search.py into a prompt template for the LLM to answer a user query.
Grounding policy (hybrid): prefer the retrieved HSE sources and cite them
[S1], [S2]; if they don't cover the question, the model may fall back to its
own general knowledge but must label it and cite no documents (see
SYSTEM_PROMPT).
Like embed.py, the model loads offline from the local HF cache
(HF_HUB_OFFLINE=1). config.LLM_MODEL is a Hugging Face repo id resolved from
~/.cache/huggingface/hub, exactly like EMBED_MODEL.
"""

import os
os.environ.setdefault("HF_HUB_OFFLINE", "1")
import re
from functools import lru_cache
from pathlib import Path
from plantkb import config
from plantkb.retrieval.search import search, _latest_revision_by_family, _is_superseded


CONCISE_PROMPT = """

Answer in ONE PARAGRAPH ONLY (2-3 sentences max).
CITE EVERY CLAIM: Use [S1], [S2], [S3] for each fact from sources.
- No numbering, no lists, no steps
- Plain text only
- Keep it brief

Answer briefly with citations:
"""

DETAILED_PROMPT = """

Write a COMPREHENSIVE ANSWER with 5+ sentences.
CITE EVERY CLAIM: Use [S1], [S2], [S3] for each fact from sources.
Include: background, context, safety, examples, all relevant details.

FOR SAFETY-CRITICAL OR HAZARD QUESTIONS (tanker loading, chemical handling, confined spaces, etc.):
Start with: ⚠️ **HAZARD:** [Primary risk - e.g., boil-overs, explosions, toxic exposure]
Then: **Safe Conditions Required:** [Prerequisites that MUST be met]
Then: **Procedure (Only if all conditions above are met):**
1. Step one - explain with citation [S#]
2. Step two - explain with citation [S#]
Finally: **STOP if any of these apply:** [Red flags, incompatibilities, forbidden conditions]

FOR OTHER "HOW TO", "STEPS", "STEP BY STEP", "PROCEDURE" and "METHODS" QUESTIONS:
1. Step one - explain with citation [S#]
2. Step two - explain with citation [S#]
3. Step three - explain with citation [S#]
(list all steps with citations)

The 'Step One, Step Two' should be bolded

Answer with comprehensive detail and citations. PRIORITIZE HAZARDS OVER PERMISSION:
"""

def format_context(hits: list[dict]) -> str:
    """Render search() hits as tagged, citable source blocks ([S1], [S2], ...)."""
    blocks = []
    for i, hit in enumerate(hits, 1):
        md = hit["metadata"]
        title = md.get("title") or Path(md["source"]).stem
        family = md.get("doc_family", "unknown")
        revision = md.get("revision", "unknown")
        blocks.append(
            f"[S{i}] {title} — {family} rev {revision}\n"
            f"(file: {md['source']})\n{hit['document']}"
        )
    return "\n\n".join(blocks)

def build_messages(query: str, hits: list[dict], promptStyle: str = "concise", safety_critical: bool = False) -> list[dict]:
    """Chat messages: system rules + tagged sources + the question. Zero hits
    still go through (with a notice) so the LLM can fall back to general
    knowledge per the grounding policy rather than dead-ending."""
    context = format_context(hits) if hits else "(no matching HSE documents found)"
    system_prompt = DETAILED_PROMPT if promptStyle == "detailed" else CONCISE_PROMPT

    # For safety-critical questions, add explicit hazard-first instruction
    if safety_critical and promptStyle == "detailed":
        system_prompt += "\n\n⚠️ IMPORTANT: This is a SAFETY question. ALWAYS start your response with the PRIMARY HAZARD and required safe conditions BEFORE providing procedures. Structure: [HAZARD] → [SAFE CONDITIONS REQUIRED] → [PROCEDURE] → [CRITICAL WARNINGS]"

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"SOURCES:\n{context}\n\nQUESTION: {query}"},
    ]


@lru_cache(maxsize=1)
def _llm() -> "Llama":
    """Offloading GPU capacity to the LLM is expensive, so cache the model instance for reuse across multiple
    requests. The LLM is thread-safe, so this is safe for FastAPI's default multi-threaded server."""
    from llama_cpp import Llama, GGML_TYPE_Q8_0

    return Llama(
        model_path=config.LLM_GGUF_PATH,
        n_gpu_layers=-1,
        n_ctx=4096,
        type_k=GGML_TYPE_Q8_0,
        type_v=GGML_TYPE_Q8_0,
        flash_attn=True,  # required by llama.cpp for a quantized V-cache
        verbose=False,
    )


def run_llm(messages: list[dict], max_new_tokens: int = 150) -> str:
    """llama.cpp applies the model's chat template from GGUF metadata automatically."""
    out = _llm().create_chat_completion(
        messages=messages,
        max_tokens=max_new_tokens,
        temperature=0.0,
    )
    return out["choices"][0]["message"]["content"].strip()


def format_procedural_response(reply: str) -> str:
    """Format numbered steps in responses (e.g., '1. step' becomes '1. step')."""
    lines = reply.split('\n')
    formatted_lines = []
    for line in lines:
        if line.strip() and line.strip()[0].isdigit() and '.' in line[:3]:
            formatted_lines.append('• ' + line.strip())
        else:
            formatted_lines.append(line)
    return '\n'.join(formatted_lines)


def format_sources_footer(hits: list[dict], reply: str) -> str:
    """Deterministic "Sources" list mapping each [S#] tag the model actually
    used back to its real document name built from hit metadata, not the
    model's output, so it's accurate regardless of what the model does with
    the tags in the reply body."""
    cited_numbers: set[int] = set()
    for bracket_group in re.findall(r"\[([^\]]*)\]", reply):
        cited_numbers.update(int(n) for n in re.findall(r"S(\d+)", bracket_group))
    cited = sorted(i for i in cited_numbers if 1 <= i <= len(hits))

    # If no citations found, show all sources that were provided
    if not cited:
        if hits:
            entries = []
            for i, hit in enumerate(hits, 1):
                md = hit["metadata"]
                filename = Path(md["source"]).name
                entries.append(f"[S{i}] {filename}")
            return "Sources used: " + ", ".join(entries)
        return ""

    entries = []
    for i in cited:
        md = hits[i - 1]["metadata"]
        filename = Path(md["source"]).name  # exact filename, incl. doc code + extension
        entries.append(f"[S{i}] {filename}")
    return "Sources: " + ", ".join(entries)


def is_general_question(query: str) -> bool:
    """Check if query is a general greeting or question, not MCA-related."""
    general_keywords = {
        "hello", "hi", "hey", "how are you", "what's up", "thanks", "thank you", "bye", "goodbye", "help", "weather",
         "math", "calculate"
    }
    query_lower = query.lower().strip()

    # Check for direct keyword match or short queries
    if any(keyword in query_lower for keyword in general_keywords) or len(query_lower) < 5:
        return True

    # Check for math-like patterns (numbers with operators)
    import re
    if re.search(r'\d+\s*[\+\-\*\/]\s*\d+', query_lower):
        return True

    return False


def is_safety_critical_question(query: str) -> bool:
    """Detect if a question is safety/hazard-related and should prioritize danger warnings."""
    safety_keywords = {
        "is it safe", "can i", "safe to", "danger", "hazard", "risk", "toxic", "burn", "explosion",
        "confined space", "tanker", "chemical", "compatibility", "react", "boil", "corrosive", "flammable"
    }
    query_lower = query.lower().strip()
    return any(keyword in query_lower for keyword in safety_keywords)


def filter_by_plant(hits: list[dict], plant_code: str) -> tuple[list[dict], list[dict]]:
    """Filter hits by plant code. Returns (plant_specific_hits, corporate_hits)."""
    # Codes that are always included
    always_include = {"COR", "IND", "MLI", "MMT", "ATL", "QUE", "CEN", "WES"}

    plant_specific = []
    corporate_hits = []

    for hit in hits:
        source = hit["metadata"]["source"]
        # Extract just the filename, then get plant code (first part before dot)
        filename = Path(source).name  # e.g., "ASH.HSE.JHA.001.EN.00.pdf"
        source_plant = filename.split(".")[0].upper()  # e.g., "ASH"

        if source_plant == plant_code:
            plant_specific.append(hit)
        elif source_plant in always_include:
            corporate_hits.append(hit)

    return plant_specific, corporate_hits


def answer(query: str, top_k: int = 5, promptStyle: str = "concise", plantCode: str = "ASH") -> str:
    """Retrieve -> build the grounded prompt -> generate an answer."""
    # For general greetings, answer without searching the knowledge base
    if is_general_question(query):
        max_tokens = 600 if promptStyle == "detailed" else 100
        reply = run_llm([
            {"role": "system", "content": "You are a helpful MCA Knowledge Assistant. Answer briefly and naturally."},
            {"role": "user", "content": query}
        ], max_new_tokens=max_tokens)
        return reply

    # For knowledge-base queries, search and filter by plant
    all_hits = search(query, top_k=top_k * 2)  # Get more results to filter
    plant_specific_hits, corporate_hits = filter_by_plant(all_hits, plantCode)

    # Use plant-specific hits if available, otherwise fall back to corporate
    if plant_specific_hits:
        hits = plant_specific_hits[:top_k]
        use_fallback = False
    else:
        hits = corporate_hits[:top_k]
        use_fallback = True

    max_tokens = 600 if promptStyle == "detailed" else 100
    safety_critical = is_safety_critical_question(query)
    reply = run_llm(build_messages(query, hits, promptStyle=promptStyle, safety_critical=safety_critical), max_new_tokens=max_tokens)
    footer = format_sources_footer(hits, reply)

    # DEBUG: Print what we're returning
    print(f"[DEBUG] Footer created: '{footer}'")
    print(f"[DEBUG] Number of hits: {len(hits)}")

    # Build result with sources footer
    parts = [reply]

    if use_fallback and hits:
        plant_name = plantCode
        fallback_msg = f"⚠️ We could not find anything on this topic for {plant_name}. Here's what we found from other locations:"
        parts.append(fallback_msg)

    if footer:
        parts.append(footer)
    else:
        # Fallback: if footer is empty, create one from hits
        if hits:
            entries = []
            for i, hit in enumerate(hits, 1):
                md = hit["metadata"]
                filename = Path(md["source"]).name
                entries.append(f"[S{i}] {filename}")
            fallback_footer = "Sources: " + ", ".join(entries)
            parts.append(fallback_footer)
            print(f"[DEBUG] Using fallback footer: '{fallback_footer}'")

    return "\n\n".join(parts)


if __name__ == "__main__":
    print(answer("What is line of fire?"))
    # py -m plantkb.retrieval.llm_feed

#python -m uvicorn plantkb.main:app --port 8000