"""Frozen single-pass paired live evaluation. Raw runs are never committed."""
import argparse
import copy
import hashlib
import json
import os
import platform
import tempfile
import time
import uuid
from decimal import Decimal
from pathlib import Path

from shelfready import catalog, deterministic, rehearsal_store, runner, worker


def corpus():
    path = Path("evaluation/cases.json")
    digest = hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
    if digest != Path("evaluation/cases.sha256").read_text().strip():
        raise RuntimeError("Frozen corpus checksum mismatch; refuse evaluation")
    return json.loads(path.read_text(encoding="utf-8")), digest


def run_case(frozen, case, arm, directory):
    start = time.perf_counter()
    result = {"case": case["id"], "arm": arm, "eligible_rows": len(case["resolved"]),
              "verified_rows": 0, "incorrect_released_changes": 0, "attempts": [],
              "unresolved_rows": len(case["unresolved"]), "rejected_candidates": 0,
              "transform_seconds": 0, "stage_seconds": 0}
    try:
        try:
            data = {"baseline": catalog.parse(frozen["baseline"].encode()),
                    "supplier": catalog.parse(case["csv"].encode())}
            if case["mapping"] is None:
                raise ValueError("No explicit price intent/mapping confirmation")
            mapping = {"baseline": frozen["baseline_mapping"], "supplier": case["mapping"]}
            baseline, supplier, expected, unresolved = catalog.plan(data, mapping)
        except ValueError:
            if not case.get("reject"):
                raise
            result["status"] = "correct_rejection"
            return result
        if case.get("reject"):
            raise RuntimeError("Rejected-input negative case was accepted")
        # Frozen manually authored oracle, separate from the production planner.
        catalog.validate(expected, case["resolved"])
        if [r["row"] for r in unresolved] != case["unresolved"]:
            raise RuntimeError("Planner disagrees with frozen unresolved-row oracle")
        if not expected:
            result["status"] = "all_unresolved"
            return result
        transform_start = time.perf_counter()
        try:
            if arm == "deterministic":
                output, missing = deterministic.transform(data, mapping)
                if missing != case["unresolved"]:
                    raise ValueError("Comparator unresolved accounting mismatch")
                catalog.validate(output, case["resolved"])
            else:
                payload = {"baseline": baseline,
                           "supplier": [dict(r, row=i) for i, r in enumerate(supplier, 1)]}
                feedback = ""
                for attempt in range(3):
                    entry = {"attempt": attempt+1}
                    result["attempts"].append(entry)
                    try:
                        code, evidence = worker.generate(payload, feedback)
                        entry.update(evidence)
                        (directory / f"attempt-{attempt+1}.py").write_text(code, encoding="utf-8")
                        execution = runner.execute(code, payload)
                        if execution.status != "finished" or execution.exit_code != 0:
                            raise ValueError("Sandbox execution failed")
                        output = json.loads(execution.stdout)
                        catalog.validate(output, case["resolved"])
                        break
                    except (ValueError, RuntimeError) as error:
                        result["rejected_candidates"] += 1
                        entry["error"] = feedback = str(error)[:200]
                        if attempt == 2:
                            raise
        finally:
            result["transform_seconds"] = time.perf_counter()-transform_start
        stage_start = time.perf_counter()
        try:
            # Both arms enter the SAME trusted native staging and verifier.
            result["persisted"] = rehearsal_store.rehearse(baseline, output, directory)
            wanted = {r["sku"]: [Decimal(r["price"]), int(r["stock"]), r["name"]]
                      for r in baseline}
            for row in case["resolved"]:
                wanted[row["sku"]][:2] = [Decimal(row["price"]), int(row["stock"])]
            actual = {sku: [Decimal(price), int(stock), name]
                      for sku, price, stock, name in result["persisted"]}
            incorrect = sum(actual.get(sku) != wanted.get(sku) for sku in set(actual) | set(wanted))
            result["incorrect_released_changes"] = incorrect
            if incorrect:
                raise RuntimeError("Accepted persisted rows disagree with frozen final-state oracle")
        finally:
            result["stage_seconds"] = time.perf_counter()-stage_start
        result.update(verified_rows=len(output), status="partial" if unresolved else "complete")
    except Exception as error:
        result.update(status="failed", error_type=type(error).__name__, error=str(error)[:400])
    finally:
        result["seconds"] = time.perf_counter()-start
    return result


def controls(frozen, directory):
    case = frozen["cases"][0]
    gold = case["resolved"]
    results = []
    for name, candidate in [("wrong_price", copy.deepcopy(gold)), ("omitted_row", gold[:-1])]:
        if name == "wrong_price":
            candidate[0]["price"] = "999.00"
        try:
            catalog.validate(candidate, gold)
        except ValueError:
            results.append({"control": name, "kind": "deliberate candidate corruption", "rejected": True})
        else:
            raise RuntimeError("Pre-import negative control was not rejected")
    data = {"baseline": catalog.parse(frozen["baseline"].encode()),
            "supplier": catalog.parse(case["csv"].encode())}
    baseline = catalog.mapped(data["baseline"], frozen["baseline_mapping"], "baseline")
    bad = copy.deepcopy(gold)
    bad[0]["price"] = "999.00"
    start = time.perf_counter()
    try:
        rehearsal_store.rehearse(baseline, bad, directory, expected_updates=gold)
    except RuntimeError as error:
        if "Persisted values differ" not in str(error):
            raise
        results.append({"control": "wrong_native_price", "kind": "deliberate real native import",
                        "rejected": True, "seconds": time.perf_counter()-start})
    else:
        raise RuntimeError("Native readback negative control was not rejected")
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live-local", action="store_true", required=True,
                        help="Explicitly spend Vultr tokens and use local disposable Docker stores")
    parser.parse_args()
    os.environ["SHELFREADY_LOCAL_RUNNER"] = "1"
    frozen, digest = corpus()
    root = Path("artifacts/evaluation") / (time.strftime("%Y%m%d-%H%M%S")+"-"+uuid.uuid4().hex[:8])
    root.mkdir(parents=True)
    report = {"corpus_sha256": digest, "platform": platform.platform(), "results": [],
              "local_only": True, "protocol": "evaluation/PROTOCOL.md"}
    report_path = root / "results.json"
    for index, case in enumerate(frozen["cases"]):
        arms = ["deterministic", "shelfready"] if index % 2 == 0 else ["shelfready", "deterministic"]
        for arm in arms:
            directory = root / f"{case['id']}-{arm}"
            directory.mkdir()
            result = run_case(frozen, case, arm, directory)
            report["results"].append(result)
            report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps(result), flush=True)
    with tempfile.TemporaryDirectory(prefix="negative-", dir=root) as temporary:
        report["controls"] = controls(frozen, Path(temporary))
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Full raw report: {report_path}", flush=True)


if __name__ == "__main__":
    main()
