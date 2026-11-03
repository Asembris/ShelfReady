"""Real Vultr discovery and a bounded coding probe; never execute on the host."""
import argparse
import json
import os
import ssl
from pathlib import Path

import httpx
from dotenv import load_dotenv
from openai import OpenAI

BASE_URL = "https://api.vultrinference.com/v1"
PROMPT = '''Return only executable Python, without Markdown. Read CSV from the literal
string "sku,price,stock\\n00017,12.30,4\\nA-2,0.10,0\\n" using csv.DictReader.
Use Decimal to add exactly 1.25 to each price, preserve SKU strings, preserve stock.
Print JSON list of objects with sku, price (two decimal string), stock (string).
Use only Python standard library. No input(), files, network, or commentary.'''


def client():
    load_dotenv()
    base = os.getenv("VULTR_INFERENCE_BASE_URL") or BASE_URL
    if base.rstrip("/") != BASE_URL:
        raise ValueError("Only the contracted Vultr endpoint is permitted")
    tls = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    tls.load_default_certs()  # Include the OS trust store; keep certificate verification on.
    return OpenAI(api_key=os.environ["VULTR_INFERENCE_API_KEY"],
                  base_url=base, timeout=90, max_retries=0,
                  http_client=httpx.Client(verify=tls, timeout=90, trust_env=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model")
    args = parser.parse_args()
    target = Path("artifacts/inference")
    target.mkdir(parents=True, exist_ok=True)
    for name in ("generated.py", "response.json"):
        (target / name).unlink(missing_ok=True)
    api = client()
    ids = sorted(model.id for model in api.models.list())
    (target / "models.json").write_text(json.dumps(ids, indent=2))
    print(json.dumps({"available_models": ids}))
    pinned = json.loads(Path("config/inference.json").read_text())
    model = args.model or os.getenv("VULTR_INFERENCE_MODEL") or pinned["model"]
    if not model:
        return
    if model not in ids:
        raise ValueError("Pinned model is not available")
    response = api.chat.completions.create(
        model=model, messages=[{"role": "user", "content": PROMPT}],
        max_tokens=2048, temperature=0,
    )
    if response.choices[0].finish_reason != "stop":
        raise ValueError("Incomplete model response")
    code = response.choices[0].message.content or ""
    if code.startswith("```python\n") and code.rstrip().endswith("```"):
        code = code.removeprefix("```python\n").rstrip().removesuffix("```")
    if not code.strip() or len(code.encode()) > 65536:
        raise ValueError("Invalid code response")
    (target / "generated.py").write_text(code, encoding="utf-8")
    evidence = {"requested_model": model, "served_model": response.model,
                "response_id": response.id, "finish_reason": response.choices[0].finish_reason,
                "usage": response.usage.model_dump() if response.usage else None}
    (target / "response.json").write_text(json.dumps(evidence, indent=2))
    print(json.dumps(evidence))


if __name__ == "__main__":
    main()
