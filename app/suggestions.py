# app/suggestions.py
from transformers import GPT2Tokenizer, GPT2LMHeadModel
import torch, re, os

# Load a small, fast model once
tokenizer = GPT2Tokenizer.from_pretrained("distilgpt2")
model     = GPT2LMHeadModel.from_pretrained("distilgpt2")
model.eval()

def _clean(tok: str) -> str:
    tok = tok.strip()
    # filter out very short or non-alpha tokens
    return tok if len(tok) > 1 and re.fullmatch(r"[A-Za-z']+", tok) else ""

def get_suggestions(context: str, k: int = 3):
    """
    Return up to k high-probability next-word suggestions
    based on GPT-2's softmax of the very next token.
    Always quick; no sampling loops.
    """
    context = context.strip()
    if not context:
        return []

    # Encode context
    input_ids = tokenizer.encode(context, return_tensors="pt")

    # Get logits for next token
    with torch.no_grad():
        logits = model(input_ids).logits
    next_logits = logits[0, -1]

    # Top-k probabilities (grab a few extra for filtering)
    top_k = torch.topk(next_logits, k * 4)     # more to allow filtering
    tokens = top_k.indices.tolist()

    suggestions = []
    for tid in tokens:
        word = _clean(tokenizer.decode([tid]))
        if word and word not in suggestions:
            suggestions.append(word)
        if len(suggestions) >= k:
            break
    return suggestions
