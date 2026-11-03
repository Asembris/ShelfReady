"""Audit ALL paired results against frozen gold; no best-case selection."""
import argparse
import json
from decimal import Decimal
from pathlib import Path

from shelfready.evaluate import corpus


def summarize(path):
    report = json.loads(path.read_text(encoding="utf-8"))
    frozen, digest = corpus()
    if report["corpus_sha256"] != digest:
        raise ValueError("Run uses a different frozen corpus")
    results = report["results"]
    pairs = [(r["case"], r["arm"]) for r in results]
    required = {(c["id"], a) for c in frozen["cases"] for a in ("deterministic", "shelfready")}
    if set(pairs) != required or len(pairs) != len(required):
        raise ValueError("Incomplete/duplicate paired run: do not summarize selected cases")
    if len(report.get("controls", [])) != 3 or not all(c["rejected"] for c in report["controls"]):
        raise ValueError("All three negative controls must complete and reject")
    baseline = {}
    # Independently read frozen source strings, not a model-generated expected file.
    import csv
    import io
    for row in csv.DictReader(io.StringIO(frozen["baseline"])):
        baseline[row["SKU"]] = [Decimal(row["Regular price"]), int(row["Stock"]), row["Name"]]
    cases = {c["id"]: c for c in frozen["cases"]}
    summary = {}
    for arm in ("deterministic", "shelfready"):
        records = [r for r in results if r["arm"] == arm]
        metrics = {"eligible_rows": sum(len(c["resolved"]) for c in frozen["cases"]),
                   "verified_rows": 0, "verified_changed_rows": 0, "verified_noop_rows": 0,
                   "incorrect_released_changes": 0, "unresolved_rows": 0,
                   "complete_or_partial_cases": 0, "correct_rejections": 0,
                   "all_unresolved_cases": 0, "failed_cases": 0,
                   "seconds": sum(r["seconds"] for r in records),
                   "transform_seconds": sum(r["transform_seconds"] for r in records),
                   "model_attempts": sum(len(r["attempts"]) for r in records),
                   "rejected_candidates": sum(r["rejected_candidates"] for r in records),
                   "tokens": sum(a.get("usage", {}).get("total_tokens", 0)
                                 for r in records for a in r["attempts"])}
        for record in records:
            case = cases[record["case"]]
            metrics["unresolved_rows"] += len(case["unresolved"])
            status = record["status"]
            if status in ("complete", "partial"):
                want = {k: list(v) for k, v in baseline.items()}
                for row in case["resolved"]:
                    want[row["sku"]][:2] = [Decimal(row["price"]), int(row["stock"])]
                actual = {sku: [Decimal(price), int(stock), name]
                          for sku, price, stock, name in record["persisted"]}
                incorrect = sum(actual.get(sku) != want.get(sku) for sku in set(actual) | set(want))
                if len(actual) != len(record["persisted"]):
                    incorrect += 1
                metrics["incorrect_released_changes"] += incorrect
                if not incorrect:
                    metrics["verified_rows"] += len(case["resolved"])
                    for row in case["resolved"]:
                        noop = [Decimal(row["price"]), int(row["stock"])] == baseline[row["sku"]][:2]
                        metrics["verified_noop_rows" if noop else "verified_changed_rows"] += 1
                metrics["complete_or_partial_cases"] += 1
            elif status == "correct_rejection":
                metrics["correct_rejections"] += 1
            elif status == "all_unresolved":
                metrics["all_unresolved_cases"] += 1
            else:
                metrics["failed_cases"] += 1
        summary[arm] = metrics
    return {"corpus_sha256": digest, "run": str(path), "arms": summary,
            "controls": report["controls"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    print(json.dumps(summarize(args.report), indent=2))
