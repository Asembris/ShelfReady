import json

import pytest
from fastapi.testclient import TestClient

from shelfready import catalog, jobs, worker
from shelfready.api import app
from shelfready.sandbox import Result

BASE = "Type,SKU,Name,Regular price,Stock\nsimple,00017,Test,12.30,4\n"
SUPPLIER = "SKU,Regular price,Stock\n00017,13.5500,7\nmissing,3.00,0\n"
MAPPING = {"baseline": {"sku": "SKU", "price": "Regular price", "stock": "Stock",
                        "name": "Name", "type": "Type"},
           "supplier": {"sku": "SKU", "price": "Regular price", "stock": "Stock"}}


@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, "ROOT", tmp_path)
    return TestClient(app)


def upload(api):
    response = api.post("/api/jobs", json={"baseline": BASE, "supplier": SUPPLIER})
    assert response.status_code == 200
    return response.json()["id"]


def test_confirmation_required_and_download_gated(api):
    key = upload(api)
    assert jobs.claim() is None
    assert api.get(f"/api/jobs/{key}/download/csv").status_code == 409
    assert api.post(f"/api/jobs/{key}/confirm", json={
        **MAPPING, "replace_price_and_stock_same_currency": False}).status_code == 422
    assert jobs.claim() is None
    assert api.post(f"/api/jobs/{key}/confirm", json={
        **MAPPING, "replace_price_and_stock_same_currency": True}).status_code == 200
    assert api.post(f"/api/jobs/{key}/confirm", json={
        **MAPPING, "replace_price_and_stock_same_currency": True}).status_code == 422
    assert jobs.claim()["id"] == key
    assert jobs.claim() is None


def test_upload_bounds_and_quota(api, monkeypatch):
    assert api.post("/api/jobs", content=b"x"*70001).status_code == 413
    assert api.post("/api/jobs", json={"baseline": BASE*1000, "supplier": SUPPLIER}).status_code == 422
    monkeypatch.setattr(jobs, "QUOTA", 1)
    upload(api)
    assert api.post("/api/jobs", json={"baseline": BASE, "supplier": SUPPLIER}).status_code == 422
    assert api.post("/api/jobs", json={}, headers={"Origin": "https://untrusted.example"}).status_code == 403


@pytest.mark.parametrize("raw", [b"a,a\n1,2", b"a,b\n1", b"a\n\x00", b"a\n"+b"1\n"*101])
def test_reject_invalid_csv(raw):
    with pytest.raises(ValueError):
        catalog.parse(raw)


def test_independent_accounting():
    data = {"baseline": catalog.parse(BASE.encode()), "supplier": catalog.parse(SUPPLIER.encode())}
    _, _, expected, unresolved = catalog.plan(data, MAPPING)
    assert expected == [{"row": 1, "sku": "00017", "price": "13.5500", "stock": "7"}]
    assert unresolved[0]["row"] == 2
    for bad in [[], expected*2, [{**expected[0], "sku": "17"}],
                [{**expected[0], "price": "13.55"}], [{**expected[0], "row": True}]]:
        with pytest.raises(ValueError):
            catalog.validate(bad, expected)


@pytest.mark.parametrize("fail_store,valid_after", [(False, 2), (True, 1), (False, 4)])
def test_bounded_repairs_and_no_false_release(api, monkeypatch, fail_store, valid_after):
    """Synthetic dependency failures, separate from the real browser integration."""
    key = upload(api)
    jobs.confirm(key, MAPPING)
    row = jobs.claim()
    calls = []

    def generate(*args):
        calls.append(1)
        return "ignored test code", {"response_id": "synthetic"}

    expected = [{"row": 1, "sku": "00017", "price": "13.5500", "stock": "7"}]
    monkeypatch.setattr(worker, "generate", generate)
    monkeypatch.setattr(worker.runner, "execute", lambda *args: Result(
        "finished", json.dumps(expected if len(calls) >= valid_after else []), 0))

    def store(*args):
        if fail_store:
            raise RuntimeError("synthetic readback failure")
        return [["00017", "13.5500", "7", "Test"]]

    monkeypatch.setattr(worker.rehearsal_store, "rehearse", store)
    worker.process(row)
    result = jobs.get(key)
    assert len(calls) == min(valid_after, 3)
    if fail_store or valid_after > 3:
        assert result["state"] == "failed" and result["csv"] is None
    else:
        assert result["state"] == "partial"
        assert "00017,13.5500,7" in result["csv"]
        report = json.loads(result["report"])
        assert report["input_rows"] == report["resolved_rows"] + len(report["unresolved"])
        assert api.get(f"/api/jobs/{key}/download/report").status_code == 200
