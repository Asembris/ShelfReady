"""Prevent retroactive acceptance-rule changes in the reporting layer."""
import json

import pytest

from shelfready import spike_evaluate, spike_summary


def test_frozen_numeric_success_does_not_hide_completion_regression(tmp_path):
    frozen, digest = spike_evaluate.corpus()
    rows = []
    for case in frozen["cases"]:
        for arm in ("fuzzy", "agent"):
            failed = arm == "agent" and case["id"] == "french_supplier"
            correction = int(arm == "fuzzy" and case["id"] in ("german_operations", "explicit_normalization"))
            count = len(case["rows"]) if not failed else 0
            rows.append({"case":case["id"],"arm":arm,"status":"failed" if failed else "verified" if count else "unresolved",
                         "verified_rows":count,"uncorrected_verified_rows":count if not correction else 0,
                         "field_corrections":correction,"mandatory_reviews":1,"wrong_nonnull_fields":0,
                         "correct_abstention":not case["rows"],"incorrect_accepted_changes":0,
                         "unresolved_rows":2 if not count else 0,"proposal_seconds":0,"seconds":0,
                         "attempts":[],"inference":{"usage":{"prompt_tokens":0,"completion_tokens":0,"total_tokens":0}}})
    path = tmp_path / "results.json"
    path.write_text(json.dumps({"corpus_sha256":digest,"source_commit":"synthetic",
                                "results":rows,"reviewer":"synthetic","cost":"unknown"}))
    summary = spike_summary.summarize(path)
    assert summary["predeclared_acceptance_met"] is True
    assert summary["post_review_completion_parity"] is False
    assert summary["arms"]["agent"]["failed_cases"] == 1


def test_selected_cases_cannot_be_reported_as_complete(tmp_path):
    _, digest = spike_evaluate.corpus()
    path = tmp_path / "results.json"
    path.write_text(json.dumps({"corpus_sha256":digest,"results":[]}))
    with pytest.raises(ValueError, match="complete"):
        spike_summary.summarize(path)
