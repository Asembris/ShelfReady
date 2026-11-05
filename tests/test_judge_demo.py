import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from shelfready import api, jobs, worker
from shelfready.sandbox import Result

ORIGIN = "https://judge.example"
FILES = {
    "baseline": Path("fixtures/baseline.csv").read_text(),
    "supplier": Path("fixtures/update.csv").read_text(),
}
CONSENT = {
    "baseline": {"sku": "SKU", "price": "Regular price", "stock": "Stock",
                 "name": "Name", "type": "Type"},
    "supplier": {"sku": "SKU", "price": "Regular price", "stock": "Stock"},
    "replace_price_and_stock_same_currency": True,
}
EXPECTED = [
    {"row": 1, "sku": "00017", "price": "13.55", "stock": "7"},
    {"row": 2, "sku": "A-2", "price": "1.35", "stock": "2"},
]


def headers(address="192.0.2.1"):
    return {"Origin": ORIGIN, "X-ShelfReady-Visitor": address}


@pytest.fixture
def judge(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, "ROOT", tmp_path)
    monkeypatch.setattr(api, "JUDGE_DEMO", True)
    monkeypatch.setattr(api, "PUBLIC_ORIGIN", ORIGIN)
    monkeypatch.setattr(api, "VISITOR_KEY", b"x" * 32)
    monkeypatch.setattr(api, "_window", [0, 0])
    return TestClient(api.app, client=("127.0.0.1", 12345))


def upload(judge, address="192.0.2.1"):
    result = judge.post("/api/jobs", json=FILES, headers=headers(address))
    assert result.status_code == 200, result.text
    return f"/api/jobs/{result.json()['id']}"


@pytest.mark.parametrize("failure", [None, "missing", "model", "verification", "cleanup"])
def test_anonymous_workflow_and_release_gate(judge, monkeypatch, failure):
    job = upload(judge)
    assert judge.get(job + "/download/csv", headers=headers()).status_code == 409
    assert judge.get(job, headers=headers("192.0.2.2")).status_code == 404
    assert judge.post(job + "/confirm", headers=headers(), json={
        **CONSENT, "replace_price_and_stock_same_currency": False}).status_code == 422
    assert jobs.claim() is None
    assert judge.post(job + "/confirm", json=CONSENT, headers=headers()).status_code == 200

    def stage(baseline, expected, directory):
        assert expected == EXPECTED
        if failure == "cleanup":
            raise RuntimeError("synthetic cleanup failure")
        return expected

    def generate(*args):
        if failure == "missing":
            raise worker.inference.MissingInferenceKey("Missing test inference key")
        if failure == "model":
            raise ConnectionError("synthetic model failure")
        return "synthetic test", {"response_id": "private-test-response"}

    monkeypatch.setattr(worker, "generate", generate)
    monkeypatch.setattr(worker.runner, "execute", lambda *_: Result(
        "finished", json.dumps([] if failure == "verification" else EXPECTED), 0))
    monkeypatch.setattr(worker.rehearsal_store, "rehearse", stage)
    worker.process(jobs.claim())
    result = judge.get(job, headers=headers()).json()
    report = judge.get(job + "/download/report", headers=headers())
    csv = judge.get(job + "/download/csv", headers=headers())
    assert judge.get(job + "/download/csv", headers=headers("192.0.2.2")).status_code == 404
    assert "native_diagnostics" not in result["report"]
    if failure:
        assert result["state"] == "failed"
        assert report.status_code == csv.status_code == 409
    else:
        assert result["state"] == "complete"
        assert report.json()["persisted_readback"] == EXPECTED
        assert csv.status_code == 200
        assert csv.text.splitlines()[1:] == ["00017,13.55,7", "A-2,1.35,2"]
        assert "private-test-response" not in report.text


def test_only_trusted_proxy_origin_and_exact_fixtures(judge):
    job = upload(judge)
    assert judge.post("/api/jobs", json=FILES, headers={"Origin": ORIGIN}).status_code == 403
    assert judge.post("/api/jobs", json=FILES, headers={"X-Forwarded-For": "192.0.2.1"}).status_code == 403
    direct = TestClient(api.app, client=("192.0.2.2", 12345))
    assert direct.get(job, headers=headers()).status_code == 403
    assert judge.post("/api/jobs", json=FILES, headers={**headers(), "Origin": "https://other.example"}).status_code == 403
    assert judge.post("/api/jobs", headers=headers(), json={
        **FILES, "supplier": FILES["supplier"].replace("13.55", "13.56")}).status_code == 422
    assert judge.post("/api/jobs", headers=headers(), json={
        "baseline": FILES["supplier"], "supplier": FILES["baseline"]}).status_code == 422
    assert judge.post("/api/jobs", headers=headers(), content=b"x" * 70001).status_code == 413
    assert judge.post(job + "/interpret", headers=headers(), json={}).status_code == 404
    assert judge.post(job + "/confirm", headers=headers(), json={
        **CONSENT, "interpretation": {"request": "untrusted"}}).status_code == 422
    assert judge.get("/api/admin", headers=headers()).status_code == 404
    assert judge.get(job, headers={**headers("192.0.2.2"), "X-Forwarded-For": "192.0.2.1"}).status_code == 404


def test_additive_migration_preserves_lifetime_usage_and_private_jobs(judge, monkeypatch):
    legacy = jobs.create({})
    with jobs.connect() as db:
        db.execute("DROP TABLE judge_owners")
        db.execute("DROP TABLE judge_admissions")
        db.execute("UPDATE usage SET total=149")
    monkeypatch.setattr(jobs, "QUOTA", 150)
    upload(judge)
    restarted = TestClient(api.app, client=("127.0.0.1", 12345))
    exhausted = restarted.post("/api/jobs", headers=headers("192.0.2.2"), json=FILES)
    assert exhausted.status_code == 429 and "replay" in exhausted.text
    assert restarted.get(f"/api/jobs/{legacy}", headers=headers()).status_code == 404
    assert jobs.get(legacy)["state"] == "mapping"
    with jobs.connect() as db:
        assert db.execute("SELECT total FROM usage").fetchone()[0] == 150


def test_rolling_global_and_visitor_execution_limits(judge, monkeypatch):
    now = [1_000_000]
    monkeypatch.setattr(jobs.time, "time", lambda: now[0])
    for visitor in range(1, 5):
        address = f"192.0.2.{visitor}"
        for _ in range(2):
            job = upload(judge, address)
            assert judge.post(job + "/confirm", headers=headers(address), json=CONSENT).status_code == 200
            jobs.finish(jobs.claim()["id"], "failed", {})
        third = upload(judge, address)
        assert judge.post(third + "/confirm", headers=headers(address), json=CONSENT).status_code == 429
        assert judge.post("/api/jobs", headers=headers(address), json=FILES).status_code == 429
    job = upload(judge, "192.0.2.5")
    now[0] += 3599
    response = judge.post(job + "/confirm", headers=headers("192.0.2.5"), json=CONSENT)
    assert response.status_code == 429 and "hourly rehearsal" in response.text
    assert judge.get(job, headers=headers("192.0.2.5")).json()["state"] == "mapping"
    now[0] += 1
    assert judge.post(job + "/confirm", headers=headers("192.0.2.5"), json=CONSENT).status_code == 200


def test_concurrent_confirmation_reserves_one_slot(judge):
    endpoints = [upload(judge) for _ in range(2)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(
            lambda job: judge.post(job + "/confirm", headers=headers(), json=CONSENT).status_code,
            endpoints,
        ))
    assert sorted(results) == [200, 429]
    with jobs.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM judge_admissions WHERE kind='execution'").fetchone()[0] == 1


def test_concurrent_uploads_cannot_exceed_quota(judge, monkeypatch):
    monkeypatch.setattr(jobs, "QUOTA", 1)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(
            lambda address: judge.post("/api/jobs", headers=headers(address), json=FILES).status_code,
            ["192.0.2.1", "192.0.2.2"],
        ))
    assert sorted(results) == [200, 429]
    with jobs.connect() as db:
        assert db.execute("SELECT total FROM usage").fetchone()[0] == 1


def test_anonymous_proxy_cannot_enable_legacy_api(judge, monkeypatch):
    monkeypatch.setattr(api, "JUDGE_DEMO", False)
    assert judge.post("/api/jobs", headers=headers(), json=FILES).status_code == 503
