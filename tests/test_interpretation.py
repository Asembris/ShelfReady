"""Synthetic proposal/normalization failures; live evidence is a separate evaluation."""
import copy
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from shelfready import catalog, interpretation, jobs, spike_evaluate, worker
from shelfready.api import app


@pytest.fixture
def sample():
    frozen, _ = spike_evaluate.corpus()
    return frozen, frozen["cases"][4]


def test_confirmed_normalization_has_frozen_independent_values(sample):
    frozen, case = sample
    p = spike_evaluate.reviewed(case)
    data = {"baseline": catalog.parse(frozen["baseline"].encode()),
            "supplier": catalog.parse(case["csv"].encode())}
    mapping = {"baseline":{"sku":"SKU","price":"Regular price","stock":"Stock","name":"Name","type":"Type"},
               "supplier":{f:c["column"] for f,c in p["fields"].items()},
               "interpretation":{"proposal":p,"intent":case["intent"]}}
    _, _, resolved, unresolved = catalog.plan(data, mapping)
    assert resolved == case["rows"] and not unresolved
    mapping["interpretation"]["intent"]["allow_sku_trim"] = False
    with pytest.raises(ValueError, match="not authorized"):
        catalog.plan(data, mapping)


@pytest.mark.parametrize("mutation", ["evidence", "column", "reuse", "arithmetic", "currency", "unit"])
def test_untrusted_proposals_fail_closed(sample, mutation):
    _, case = sample
    proposal = spike_evaluate.reviewed(case)
    intent = dict(case["intent"])
    if mutation == "evidence":
        proposal["fields"]["sku"]["evidence"][0]["value"] = "17"
    elif mutation == "column":
        proposal["fields"]["price"]["column"] = "Imaginary"
    elif mutation == "reuse":
        proposal["fields"]["stock"]["column"] = "Identifier"
    elif mutation == "arithmetic":
        proposal["fields"]["stock"]["rule"] = "multiply_by_12"
    elif mutation == "currency":
        intent["currency"] = "unknown"
    else:
        intent["stock_unit"] = "unknown"
    with pytest.raises(ValueError):
        interpretation.check(proposal, catalog.parse(case["csv"].encode()), intent)


def test_normalization_never_converts_ambiguous_or_unsafe_values():
    for value in ["1,234.56", "EUR 2,00", "1e2", "-1", "2,1234567"]:
        assert interpretation.normal(value, "decimal_comma") == ""
    for value in ["2 cases", "12 boxes", "-2 ea", "1.5 each"]:
        assert interpretation.normal(value, "strip_each") == ""
    assert interpretation.normal("00017", "identity") == "00017"


def test_proposal_does_not_queue_execution_and_is_bounded(sample, tmp_path, monkeypatch):
    frozen, case = sample
    monkeypatch.setattr(jobs, "ROOT", tmp_path)
    api = TestClient(app)
    key = api.post("/api/jobs", json={"baseline":frozen["baseline"],"supplier":case["csv"]}).json()["id"]
    monkeypatch.setattr(interpretation, "propose", lambda *a: (spike_evaluate.reviewed(case), {"synthetic":True}))
    response = api.post(f"/api/jobs/{key}/interpret", json=case["intent"])
    assert response.status_code == 200 and jobs.claim() is None
    assert api.post(f"/api/jobs/{key}/interpret", json=case["intent"]).status_code == 422
    assert api.get(f"/api/jobs/{key}/download/csv").status_code == 409


def test_generated_program_receives_confirmed_raw_schema(sample, monkeypatch):
    _, case = sample
    fake = MagicMock()
    fake.__enter__.return_value.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content="def transform(x): return []"))],
        id="synthetic", model="synthetic", usage=None)
    monkeypatch.setattr(worker.inference, "client", lambda: fake)
    worker.generate({"interpretation":spike_evaluate.reviewed(case)}, "")
    messages = fake.__enter__.return_value.chat.completions.create.call_args.kwargs["messages"]
    assert "raw_supplier" in messages[0]["content"]
    assert "Shelf ticket" in messages[1]["content"]
    assert "decimal_comma" in messages[1]["content"]


def test_uncertain_tax_or_currency_cannot_be_confirmed(sample):
    _, case = sample
    table = catalog.parse(b'SKU,Price USD incl VAT,Stock\n00017,12.30,4\n')
    p = copy.deepcopy(spike_evaluate.reviewed(case))
    for f, column, value in [("sku","SKU","00017"),("price","Price USD incl VAT","12.30"),("stock","Stock","4")]:
        p["fields"][f].update(column=column,rule="identity",evidence=[{"row":1,"value":value}])
    with pytest.raises(ValueError):
        interpretation.check(p, table, {**case["intent"],"price_format":"dot"})
