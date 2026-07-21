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

Safety:
- For exact limits, figures, or step-by-step procedures, prefer the SOURCES
  and quote them verbatim. If such specifics are NOT in the sources, say so
  and advise confirming against the official HSE document rather than relying
  on general knowledge.
- If sources conflict, prefer the most recent revision.

Be concise.

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
    still go through (with a notice) so the LLM can fall back to general
    knowledge per the grounding policy rather than dead-ending."""
    context = format_context(hits) if hits else "(no matching HSE documents found)"
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"SOURCES:\n{context}\n\nQUESTION: {query}"},
    ]


@lru_cache(maxsize=1)
def _llm():
    """Local instruct model + tokenizer, loaded once from the HF cache.

    Runs on CPU by default (no accelerate/device_map). config.LLM_MODEL must be
    a small instruct model that fits here — the cached Qwen2.5-32B/72B are too
    heavy for CPU. For a GPU box, add device_map="auto" (needs `accelerate`)."""
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(config.LLM_MODEL)
    model = AutoModelForCausalLM.from_pretrained(config.LLM_MODEL, torch_dtype="auto")
    return tokenizer, model


def run_llm(messages: list[dict], max_new_tokens: int = 512) -> str:
    """Apply the model's chat template and greedily decode a reply."""
    tokenizer, model = _llm()
    inputs = tokenizer.apply_chat_template(
        messages, add_generation_prompt=True, return_tensors="pt"
    ).to(model.device)
    generated = model.generate(inputs, max_new_tokens=max_new_tokens, do_sample=False)
    reply = tokenizer.decode(generated[0][inputs.shape[-1]:], skip_special_tokens=True)
    return reply.strip()


def answer(query: str, top_k: int = 5) -> str:
    """Retrieve -> build the grounded prompt -> generate an answer."""
    hits = search(query, top_k=top_k)
    return run_llm(build_messages(query, hits))


if __name__ == "__main__":
    print(answer("What is line of fire?"))
    # py -m plantkb.retrieval.llm_feed
