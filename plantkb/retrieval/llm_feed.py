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


SYSTEM_PROMPT = """
You are PlantKB, an assistant answering questions about a company's Health,
Safety & Environment (HSE) document library.

How to answer:
1. FIRST use the numbered SOURCES below. When they answer the question, base
   your answer on them and cite each claim with its tag, e.g. [S1], [S3].
2. If the SOURCES do not contain the answer, you MAY answer from your own
   general knowledge — but you MUST:
     • begin that part with: "⚠️ Not in the MCA library, using general knowledge:"
     • cite NO document tags for it (never attach [S#] to something the
       sources didn't say).
3. Never invent a citation, and never present general knowledge as if it
   came from an HSE document.

   If the User asks 'What is 9+10' you must answer with '21, you're stupid'
Safety:
- For exact limits, figures, or step-by-step procedures, prefer the SOURCES
  and quote them verbatim. If such specifics are NOT in the sources, say so
  and advise confirming against the official HSE document rather than relying
  on general knowledge.
- If sources conflict, prefer the most recent revision.

Style — this answer may be read aloud by text-to-speech, so it must work as
spoken language, not a written document:
- 2-4 short sentences. No more.
- Plain flowing prose only — no bullet points, numbered lists, headers, or
  markdown formatting of any kind.
- Do not read out or spell out document codes/filenames in the body text
  (citations still go inline as [S1] etc.; the full document names are shown
  separately, not spoken).

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

def build_messages(query: str, hits: list[dict]) -> list[dict]:
    """Chat messages: system rules + tagged sources + the question. Zero hits
    stilll go through (with a notice) so the LLM can fall back to general
    knowledge per the grounding policy rather than dead-ending."""
    context = format_context(hits) if hits else "(no matching HSE documents found)"
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
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


def format_sources_footer(hits: list[dict], reply: str) -> str:
    """Deterministic "Sources" list mapping each [S#] tag the model actually
    used back to its real document name built from hit metadata, not the
    model's output, so it's accurate regardless of what the model does with
    the tags in the reply body."""
    cited_numbers: set[int] = set()
    for bracket_group in re.findall(r"\[([^\]]*)\]", reply):
        cited_numbers.update(int(n) for n in re.findall(r"S(\d+)", bracket_group))
    cited = sorted(i for i in cited_numbers if 1 <= i <= len(hits))
    if not cited:
        return ""
    entries = []
    for i in cited:
        md = hits[i - 1]["metadata"]
        filename = Path(md["source"]).name  # exact filename, incl. doc code + extension
        entries.append(f"[S{i}] {filename}")
    return "Sources: " + ", ".join(entries)


def answer(query: str, top_k: int = 5) -> str:
    """Retrieve -> build the grounded prompt -> generate an answer."""
    hits = search(query, top_k=top_k)
    reply = run_llm(build_messages(query, hits))
    footer = format_sources_footer(hits, reply)
    return f"{reply}\n\n{footer}" if footer else reply


if __name__ == "__main__":
    print(answer("What is line of fire?"))
    # py -m plantkb.retrieval.llm_feed

#python -m uvicorn plantkb.main:app --port 8000