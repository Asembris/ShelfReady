"""Adversarial failure injections are synthetic unless explicitly marked live."""
import copy
import json
import subprocess
import sys
from unittest.mock import MagicMock

import pytest

from shelfready import catalog, evaluate, jobs, rehearsal_store, worker
from shelfready.api import app
from shelfready.sandbox import Result
from shelfready.verification import verify_snapshot
from tests_helpers import BASE, MAPPING, SUPPLIER


def state():
    return {"id": "10", "sku": "00017", "price": "13.5500", "active_price": "13.5500",
            "stock": "7", "name": "Bracket", "type": "simple", "parent": "0",
            "slug": "bracket", "status": "publish", "description": "Unchanged description",
            "short_description": "Unchanged summary", "sale_price": "", "manage_stock": "yes",
            "stock_status": "instock"}


def expected():
    return [{"sku": "00017", "price": "13.5500", "stock": "7", "name": "Bracket"}]


@pytest.mark.parametrize("field,value", [
    ("id", "11"), ("sku", "17"), ("price", "13.55"+"0001"), ("active_price", "12.30"),
    ("stock", "8"), ("name", "Changed"), ("type", "variable"), ("parent", "20"),
    ("slug", "changed"), ("status", "draft"), ("description", ""),
    ("short_description", ""), ("sale_price", "2"), ("manage_stock", "no"),
    ("stock_status", "outofstock"), ("price", "NaN"), ("stock", None),
])
def test_reject_corrupted_persisted_field(field, value):
    before = state()
    after = {**before, field: value}
    with pytest.raises(RuntimeError):
        verify_snapshot([after], expected(), [before])


def test_no_missing_rows_or_fields_can_hide_in_readback():
    for snapshot in [[], [state(), state()], [{k: v for k, v in state().items() if k != "slug"}]]:
        with pytest.raises(RuntimeError):
            verify_snapshot(snapshot, expected(), [state()])
    verify_snapshot([state()], expected(), [state()])


def test_persisted_verification_remains_active_under_optimization():
    script = '''import runpy
from shelfready.verification import verify_snapshot
module = runpy.run_path('tests/test_verification.py')
before = module['state']()
after = dict(before, id='999')
try:
    verify_snapshot([after], module['expected'](), [before])
except RuntimeError:
    pass
else:
    raise SystemExit('Optimized interpreter accepted changed product ID')
'''
    result = subprocess.run([sys.executable, "-O", "-c", script],
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stdout+result.stderr


@pytest.mark.parametrize("down_failure", [False, True])
def test_cleanup_failure_is_never_reported_as_success(monkeypatch, down_failure):
    down = MagicMock(side_effect=RuntimeError("synthetic removal failure") if down_failure else None)
    monkeypatch.setattr(rehearsal_store, "compose", down)
    monkeypatch.setattr(rehearsal_store.store, "command", lambda *a: "remaining-volume")
    with pytest.raises(RuntimeError):
        rehearsal_store.cleanup()
    down.assert_called_once_with("down", "--volumes", "--remove-orphans")


@pytest.mark.parametrize("resolved,unresolved", [
    ([{"row": 1}], []), ([{"row": 1}], [{"row": 1}]),
    ([{"row": True}], [{"row": 2}]), ([{"row": 0}], [{"row": 2}]),
])
def test_require_exact_supplier_partition(resolved, unresolved):
    with pytest.raises(ValueError, match="partition"):
        catalog.validate_accounting(2, resolved, unresolved)


def test_ambiguous_mapping_never_auto_executes(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    monkeypatch.setattr(jobs, "ROOT", tmp_path)
    api = TestClient(app)
    supplier = "SKU,Price,Regular price,Stock\n00017,10.00,20.00,2\n"
    created = api.post("/api/jobs", json={"baseline": BASE, "supplier": supplier}).json()
    assert created["candidates"]["supplier"]["price"] == ["Price", "Regular price"]
    assert jobs.claim() is None
    bad = copy.deepcopy(MAPPING)
    bad["supplier"]["price"] = "SKU"
    assert api.post(f"/api/jobs/{created['id']}/confirm", json={
        **bad, "replace_price_and_stock_same_currency": True}).status_code == 422
    assert jobs.claim() is None


def test_case_insensitive_duplicate_skus_are_unresolved():
    data = {"baseline": catalog.parse(BASE.encode()), "supplier": catalog.parse(
        b"SKU,Regular price,Stock\n00017,2,3\nABC,1,2\nabc,3,4\n")}
    _, _, resolved, unresolved = catalog.plan(data, MAPPING)
    assert [r["row"] for r in resolved] == [1]
    assert [r["row"] for r in unresolved] == [2, 3]


def test_case_colliding_baseline_identifiers_are_rejected():
    data = {"baseline": catalog.parse(
        b"Type,SKU,Name,Regular price,Stock\nsimple,ABC,One,1,2\nsimple,abc,Two,3,4\n"),
        "supplier": catalog.parse(SUPPLIER.encode())}
    with pytest.raises(ValueError, match="unique"):
        catalog.plan(data, MAPPING)


def test_cleanup_after_successful_native_import_blocks_release(tmp_path, monkeypatch):
    """All native/provider calls are injected; this specifically tests finalization."""
    import hashlib
    monkeypatch.setattr(jobs, "ROOT", tmp_path / "jobs")
    cache = tmp_path / "cache"
    cache.mkdir()
    package = b"synthetic unit-test plugin"
    (cache / f"woocommerce.{rehearsal_store.store.WOO_VERSION}.zip").write_bytes(package)
    monkeypatch.setattr(rehearsal_store.store, "RUNTIME", cache)
    monkeypatch.setattr(rehearsal_store.store, "WOO_SHA256", hashlib.sha256(package).hexdigest())
    baseline = {**state(), "name": "Test", "price": "12.30", "active_price": "12.30", "stock": "4"}
    updated = {**baseline, "price": "13.5500", "active_price": "13.5500", "stock": "7"}
    snapshots = iter([baseline, updated])
    def native(*args, **kwargs):
        if kwargs.get("input"):
            return json.dumps(next(snapshots))
        if args[-2:] == ("eval-file", "/tmp/import.php"):
            update = "IMPORT_UPDATE=1" in args
            return json.dumps({"failed": [], "skipped": [],
                               "imported": [] if update else [10], "updated": [10] if update else []})
        if "plugin" in args and "get" in args:
            return rehearsal_store.store.WOO_VERSION
        return ""
    monkeypatch.setattr(rehearsal_store, "compose", native)
    monkeypatch.setattr(rehearsal_store.store, "command", lambda *args: "")
    cleanup = MagicMock(side_effect=RuntimeError("synthetic cleanup failure after successful import"))
    monkeypatch.setattr(rehearsal_store, "cleanup", cleanup)
    monkeypatch.setattr(worker, "generate", lambda *args: ("synthetic", {}))
    monkeypatch.setattr(worker.runner, "execute", lambda *args: Result("finished", json.dumps([
        {"row": 1, "sku": "00017", "price": "13.5500", "stock": "7"}]), 0))
    key = jobs.create({"baseline": catalog.parse(BASE.encode()), "supplier": catalog.parse(SUPPLIER.encode())})
    jobs.confirm(key, MAPPING)
    worker.process(jobs.claim())
    cleanup.assert_called_once()
    assert jobs.get(key)["state"] == "failed" and jobs.get(key)["csv"] is None


@pytest.mark.parametrize("control", ["\u007f", "\u0085", "\u202e", "\u200b"])
def test_reject_invisible_controls(control):
    with pytest.raises(ValueError, match="control"):
        catalog.parse(f"SKU,Price,Stock\n00017{control},1,2\n".encode())


@pytest.mark.parametrize("failure", ["model", "timeout", "cleanup", "forged", "exhausted"])
def test_failures_never_release_verified_csv(tmp_path, monkeypatch, failure):
    monkeypatch.setattr(jobs, "ROOT", tmp_path)
    key = jobs.create({"baseline": catalog.parse(BASE.encode()), "supplier": catalog.parse(SUPPLIER.encode())})
    jobs.confirm(key, MAPPING)
    generate, execute, stage = MagicMock(), MagicMock(), MagicMock()
    generate.return_value = ("synthetic", {"response_id": "synthetic"})
    execute.return_value = Result("finished", json.dumps([
        {"row": 1, "sku": "00017", "price": "13.5500", "stock": "7"}]), 0)
    if failure == "model":
        generate.side_effect = ConnectionError("synthetic provider outage")
    elif failure == "timeout":
        execute.return_value = Result("timeout", "", None)
    elif failure == "cleanup":
        stage.side_effect = RuntimeError("synthetic cleanup failure")
    elif failure == "forged":
        execute.return_value = Result("finished", '{"success":true}', 0)
    else:
        execute.return_value = Result("finished", "[]", 0)
    monkeypatch.setattr(worker, "generate", generate)
    monkeypatch.setattr(worker.runner, "execute", execute)
    monkeypatch.setattr(worker.rehearsal_store, "rehearse", stage)
    worker.process(jobs.claim())
    record = jobs.get(key)
    assert record["state"] == "failed" and record["csv"] is None
    assert generate.call_count <= 3
    if failure != "cleanup":
        stage.assert_not_called()
    from fastapi.testclient import TestClient
    assert TestClient(app).get(f"/api/jobs/{key}/download/csv").status_code == 409


@pytest.mark.parametrize("where", ["up", "import", "readback"])
def test_native_failure_still_attempts_cleanup(tmp_path, monkeypatch, where):
    # Pinned package checks are exercised live elsewhere, not fabricated here.
    package = rehearsal_store.store.RUNTIME / f"woocommerce.{rehearsal_store.store.WOO_VERSION}.zip"
    if not package.exists():
        pytest.skip("Cached plugin required for this failure injection")
    compose = MagicMock(return_value="")
    def fail(*args, **kwargs):
        if args[:1] == ("up",) and where == "up":
            raise subprocess.TimeoutExpired("synthetic compose", 150)
        if args[-2:] == ("eval-file", "/tmp/import.php"):
            if where == "import":
                raise RuntimeError("synthetic native import failure")
            return '{"failed":[],"skipped":[],"imported":[10],"updated":[]}'
        if "plugin" in args and "get" in args:
            return rehearsal_store.store.WOO_VERSION
        if kwargs.get("input"):
            raise RuntimeError("synthetic readback failure")
        return ""
    compose.side_effect = fail
    cleanup = MagicMock()
    monkeypatch.setattr(rehearsal_store, "compose", compose)
    monkeypatch.setattr(rehearsal_store, "cleanup", cleanup)
    monkeypatch.setattr(rehearsal_store.store, "command", MagicMock(return_value=""))
    baseline = [{"sku": "00017", "price": "1.00", "stock": "2", "name": "Bracket"}]
    with pytest.raises((RuntimeError, subprocess.TimeoutExpired)):
        rehearsal_store.rehearse(baseline, baseline, tmp_path)
    cleanup.assert_called_once()


def test_frozen_oracle_is_independent_of_planner():
    frozen, digest = evaluate.corpus()
    assert len(digest) == 64
    for case in frozen["cases"]:
        if case.get("reject"):
            continue
        data = {"baseline": catalog.parse(frozen["baseline"].encode()),
                "supplier": catalog.parse(case["csv"].encode())}
        _, _, resolved, unresolved = catalog.plan(data, {
            "baseline": frozen["baseline_mapping"], "supplier": case["mapping"]})
        catalog.validate(resolved, case["resolved"])
        assert [r["row"] for r in unresolved] == case["unresolved"]


@pytest.mark.live
def test_native_unicode_names_identifiers_and_untouched_product(tmp_path):
    baseline = [{"sku": "00017", "name": 'Étagère, "acier"', "type": "simple",
                 "price": "1.2300", "stock": "3"},
                {"sku": "KEEP-1", "name": "Support fixe", "type": "simple",
                 "price": "2.50", "stock": "0"}]
    updates = [{"row": 1, "sku": "00017", "price": "0.000001", "stock": "0"}]
    actual = rehearsal_store.rehearse(baseline, updates, tmp_path)
    assert actual == [["00017", "0.000001", "0", 'Étagère, "acier"'],
                      ["KEEP-1", "2.50", "0", "Support fixe"]]
    snapshots = json.loads((tmp_path / "readback.json").read_text(encoding="utf-8"))
    before = {r["sku"]: r for r in snapshots["before"]}
    after = {r["sku"]: r for r in snapshots["after"]}
    assert all(before[sku]["id"] == after[sku]["id"] for sku in before)
    assert before["KEEP-1"] == after["KEEP-1"]
