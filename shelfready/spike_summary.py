"""Summarize a complete spike pass, including scripted-review limitations."""
import argparse
import json
from pathlib import Path

from shelfready.spike_evaluate import corpus


def summarize(path):
    frozen, digest = corpus()
    report = json.loads(path.read_text(encoding="utf-8"))
    pairs = [(r["case"], r["arm"]) for r in report["results"]]
    required = {(c["id"], a) for c in frozen["cases"] for a in ("fuzzy", "agent")}
    if report["corpus_sha256"] != digest or set(pairs) != required or len(pairs) != len(required):
        raise ValueError("Only complete, unselected paired runs with the frozen checksum may be summarized")
    arms = {}
    for arm in ("fuzzy", "agent"):
        rows = [r for r in report["results"] if r["arm"] == arm]
        metadata = ([r.get("inference", {}) for r in rows] if arm == "agent" else [])
        metadata += [a for r in rows for a in r["attempts"] if "response_id" in a]
        arms[arm] = {
            "verified_rows_after_scripted_corrections": sum(r["verified_rows"] for r in rows),
            "verified_rows_without_corrections": sum(r["uncorrected_verified_rows"] for r in rows),
            "verified_positive_batches_without_corrections": sum(r["status"] == "verified" and r["field_corrections"] == 0 for r in rows),
            "field_correction_proxy": sum(r["field_corrections"] for r in rows),
            "mandatory_reviews": sum(r["mandatory_reviews"] for r in rows),
            "wrong_nonnull_proposed_fields": sum(r["wrong_nonnull_fields"] for r in rows),
            "negative_cases_correctly_abstained": sum(r["correct_abstention"] for r in rows),
            "incorrect_accepted_changes": sum(r["incorrect_accepted_changes"] for r in rows),
            "unresolved_rows": sum(r["unresolved_rows"] for r in rows),
            "proposal_seconds": sum(r["proposal_seconds"] for r in rows),
            "total_seconds": sum(r["seconds"] for r in rows),
            "model_requests": len(metadata),
            "prompt_tokens": sum(m.get("usage", {}).get("prompt_tokens", 0) for m in metadata),
            "completion_tokens": sum(m.get("usage", {}).get("completion_tokens", 0) for m in metadata),
            "total_tokens": sum(m.get("usage", {}).get("total_tokens", 0) for m in metadata),
            "usage_complete": all(m.get("usage") for m in metadata),
            "usd_cost": None if arm == "agent" else 0,
            "failed_cases": sum(r["status"] == "failed" for r in rows),
        }
    baseline, agent = arms["fuzzy"], arms["agent"]
    acceptance = (agent["incorrect_accepted_changes"] == 0
                  and agent["negative_cases_correctly_abstained"] == 2
                  and agent["verified_positive_batches_without_corrections"] >= baseline["verified_positive_batches_without_corrections"]+1
                  and agent["field_correction_proxy"] <= baseline["field_correction_proxy"]-2
                  and agent["failed_cases"] == 0)
    return {"source_commit": report["source_commit"], "corpus_sha256": digest, "arms": arms,
            "predeclared_acceptance_met": acceptance,
            "reviewer": report["reviewer"], "monetary_cost_limitation": report["cost"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    print(json.dumps(summarize(args.report), indent=2))
