"""Post-score robustness diagnostic, NOT the frozen primary comparator."""
import re

from shelfready import fuzzy_mapping, interpretation


def propose(table, baseline_skus, intent):
    proposal, evidence = fuzzy_mapping.propose(table, baseline_skus, intent)
    # Only simple literal declarations, not semantic interpretation/translation.
    roles = {"sku": r"sku|identifier|product code", "price": r"selling price|retail price|regular price",
             "stock": r"available|stock|individual units"}
    for field, choice in proposal["fields"].items():
        if choice["column"] is not None:
            continue
        matches = []
        for header in table["headers"]:
            pattern = re.escape(header) + r"\s+(?:is|are)\s+([^.;]+)"
            for match in re.finditer(pattern, intent["request"], re.I):
                if re.search(roles[field], match[1], re.I):
                    matches.append(header)
        if len(set(matches)) != 1:
            continue
        header = matches[0]
        values = [r[table["headers"].index(header)] for r in table["rows"][:5]]
        rule = "identity"
        if field == "sku" and intent["allow_sku_trim"] and any(v != v.strip() for v in values):
            rule = "trim"
        elif field == "price" and intent["price_format"] == "comma":
            rule = "decimal_comma"
        elif field == "stock" and any(re.fullmatch(r"[0-9]+ (?:ea|each)", v) for v in values):
            rule = "strip_each"
        proposal["fields"][field] = {"column": header, "rule": rule,
            "evidence": [{"row": 1, "value": values[0]}],
            "explanation": "Literal column declaration in explicit user intent; human review required"}
    return interpretation.check(proposal, table, intent), evidence


def main():
    import json
    import time
    from pathlib import Path
    from shelfready import spike_evaluate
    frozen, digest = spike_evaluate.corpus()
    root = Path("artifacts/spike") / ("intent-hint-diagnostic-"+time.strftime("%Y%m%d-%H%M%S"))
    root.mkdir(parents=True)
    original = spike_evaluate.fuzzy_mapping.propose
    report = {"kind": "unblinded post-score diagnostic; not a new held-out win",
              "corpus_sha256": digest, "results": []}
    for case in frozen["cases"]:
        directory = root / case["id"]
        directory.mkdir()
        # The primary harness's fixed fuzzy branch shares downstream checks.
        def diagnostic(table, skus, intent):
            spike_evaluate.fuzzy_mapping.propose = original
            try:
                return propose(table, skus, intent)
            finally:
                spike_evaluate.fuzzy_mapping.propose = diagnostic
        spike_evaluate.fuzzy_mapping.propose = diagnostic
        result = spike_evaluate.evaluate(frozen, case, "fuzzy", directory)
        spike_evaluate.fuzzy_mapping.propose = original
        report["results"].append(result)
        (root / "results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(result), flush=True)
    print(f"Diagnostic evidence: {root / 'results.json'}")


if __name__ == "__main__":
    import os
    os.environ["SHELFREADY_LOCAL_RUNNER"] = "1"
    main()
