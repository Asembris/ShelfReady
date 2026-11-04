"""One bounded paired interpretation evaluation, with a scripted gold reviewer."""
import hashlib
import inspect
import json
import os
import subprocess
import time
import uuid
from decimal import Decimal
from pathlib import Path

from shelfready import catalog, fuzzy_mapping, interpretation, rehearsal_store, runner, worker


def corpus():
    path = Path("evaluation/spike/cases.json")
    digest = hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
    if digest != Path("evaluation/spike/cases.sha256").read_text().strip():
        raise ValueError("Spike corpus changed")
    return json.loads(path.read_text(encoding="utf-8")), digest


def reviewed(case):
    return {"fields": {f: {**choice,
            "evidence": ([{"row": 1, "value": catalog.parse(case["csv"].encode())["rows"][0][
                catalog.parse(case["csv"].encode())["headers"].index(choice["column"])]}]
                         if choice["column"] else []),
            "explanation": "Scripted oracle correction, not an observed human response"}
            for f, choice in case["gold"].items()},
            "uncertainties": ["Unspecified business basis"] if not case["rows"] else []}


BASELINE_CODE = r'''
import json,re
from collections import Counter
def transform(INPUT_JSON):
    p=json.loads(INPUT_JSON)
    fields=p['interpretation']['fields']; table=p['raw_supplier']
    rows=[{'row':i+1,**{f:normal(row[table['headers'].index(c['column'])],c['rule'])
           for f,c in fields.items()}} for i,row in enumerate(table['rows'])]
    counts=Counter(r['sku'].casefold() for r in rows); known={r['sku'] for r in p['baseline']}
    return [r for r in rows if r['sku'] in known and r['sku'] and r['sku']==r['sku'].strip()
            and r['sku'][0] not in '=+-@' and counts[r['sku'].casefold()]==1
            and re.fullmatch(r'[0-9]{1,9}(\.[0-9]{1,6})?',r['price'])
            and re.fullmatch(r'[0-9]{1,7}',r['stock'])]
print(json.dumps(transform(INPUT_JSON)))
'''


def evaluate(frozen, case, arm, directory):
    start = time.perf_counter()
    data = {"baseline": catalog.parse(frozen["baseline"].encode()),
            "supplier": catalog.parse(case["csv"].encode())}
    result = {"case": case["id"], "arm": arm, "mandatory_reviews": 1,
              "verified_rows": 0, "uncorrected_verified_rows": 0, "attempts": [],
              "incorrect_accepted_changes": 0, "usd_cost": None}
    proposal_start = time.perf_counter()
    try:
        if arm == "agent":
            proposal, evidence = interpretation.propose(data["supplier"], ["00017", "AB-020"], case["intent"])
        else:
            proposal, evidence = fuzzy_mapping.propose(data["supplier"], ["00017", "AB-020"], case["intent"])
        result.update(proposal=proposal, inference=evidence)
    except Exception as error:
        proposal = {"fields": {}}
        result.update(proposal_error=str(error)[:1000], inference=getattr(error, "inference", {}),
                      raw_invalid_proposal=getattr(error, "raw_response", None))
    result["proposal_seconds"] = time.perf_counter()-proposal_start
    result["field_corrections"] = sum(
        any(proposal["fields"].get(f, {}).get(k) != gold[k] for k in ("column", "rule"))
        for f, gold in case["gold"].items())
    result["wrong_nonnull_fields"] = sum(
        c.get("column") is not None and any(c.get(k) != case["gold"][f][k] for k in ("column", "rule"))
        for f, c in proposal["fields"].items())
    result["correct_abstention"] = not case["rows"] and result["field_corrections"] == 0
    if not case["rows"]:
        result.update(status="unresolved", unresolved_rows=len(data["supplier"]["rows"]),
                      seconds=time.perf_counter()-start)
        return result
    try:
        confirmed = reviewed(case)
        confirmation = {"baseline": {"sku":"SKU","price":"Regular price","stock":"Stock","name":"Name","type":"Type"},
                        "supplier": {f:c["column"] for f,c in confirmed["fields"].items()},
                        "interpretation": {"proposal": confirmed, "intent": case["intent"]}}
        baseline, supplier, expected, unresolved = catalog.plan(data, confirmation)
        catalog.validate(expected, case["rows"])
        payload = {"baseline": baseline, "raw_supplier": data["supplier"], "interpretation": confirmed}
        feedback = ""
        for number in range(3 if arm == "agent" else 1):
            entry = {"attempt": number+1}
            result["attempts"].append(entry)
            try:
                if arm == "agent":
                    code, metadata = worker.generate(payload, feedback)
                    entry.update(metadata)
                else:
                    code = "import re\n"+inspect.getsource(interpretation.normal)+BASELINE_CODE
                (directory / f"attempt-{number+1}.py").write_text(code, encoding="utf-8")
                execution = runner.execute(code, payload)
                (directory / f"attempt-{number+1}.stdout").write_text(execution.stdout, encoding="utf-8")
                if execution.status != "finished" or execution.exit_code != 0:
                    raise ValueError("Restricted transformation failed")
                output = json.loads(execution.stdout)
                catalog.validate(output, expected)
                break
            except (RuntimeError, ValueError) as error:
                entry["error"] = feedback = str(error)[:300]
                if number == (2 if arm == "agent" else 0):
                    raise
        result["persisted"] = rehearsal_store.rehearse(baseline, output, directory)
        wanted = {r["sku"]: [Decimal(r["price"]), int(r["stock"]), r["name"]] for r in baseline}
        for row in case["rows"]:
            wanted[row["sku"]][:2] = [Decimal(row["price"]), int(row["stock"])]
        actual = {sku:[Decimal(price),int(stock),name] for sku,price,stock,name in result["persisted"]}
        result["incorrect_accepted_changes"] = sum(actual.get(k) != wanted.get(k) for k in set(actual)|set(wanted))
        if result["incorrect_accepted_changes"]:
            raise RuntimeError("Accepted native data differs from frozen oracle")
        result.update(status="verified", verified_rows=len(expected), unresolved_rows=len(unresolved),
                      uncorrected_verified_rows=len(expected) if result["field_corrections"] == 0 else 0)
    except Exception as error:
        result.update(status="failed", failure=str(error)[:1000], unresolved_rows=len(data["supplier"]["rows"]))
    result["seconds"] = time.perf_counter()-start
    return result


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--live-local", required=True, action="store_true")
    parser.parse_args()
    os.environ["SHELFREADY_LOCAL_RUNNER"] = "1"
    frozen, digest = corpus()
    root = Path("artifacts/spike") / (time.strftime("%Y%m%d-%H%M%S")+"-"+uuid.uuid4().hex[:8])
    root.mkdir(parents=True)
    report = {"corpus_sha256": digest,
              "source_commit": subprocess.check_output(["git","rev-parse","HEAD"], text=True).strip(),
              "results": [], "reviewer": "scripted frozen oracle; not measured human time",
              "cost": "Observed tokens; monetary billing cost unavailable from model metadata"}
    for i, case in enumerate(frozen["cases"]):
        for arm in (["fuzzy", "agent"] if i % 2 == 0 else ["agent", "fuzzy"]):
            directory = root / f"{case['id']}-{arm}"
            directory.mkdir()
            result = evaluate(frozen, case, arm, directory)
            report["results"].append(result)
            (root / "results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps(result), flush=True)
    print(f"Raw spike evidence: {root / 'results.json'}", flush=True)


if __name__ == "__main__":
    main()
