import copy
import json
from pathlib import Path

import pytest

from shelfready import catalog, rescue


def setup():
    case = json.loads(Path('evaluation/rescue/case.json').read_text())
    data = rescue.tables(case)
    return case, data, rescue.baseline_review(data, case['intent'])


def test_strong_baseline_and_explicit_row_partition():
    case, data, advice = setup()
    assert advice['mapping']['price'] is None
    assert sorted(r['row'] for r in advice['risks']) == case['gold']['risk_rows']
    _, _, _, selected, unresolved = rescue.decide(data, advice, case['decisions'])
    catalog.validate(selected, case['gold']['updates'])
    assert [r['row'] for r in unresolved] == case['gold']['unresolved_rows']


@pytest.mark.parametrize('change', ['consent', 'duplicate', 'unknown', 'ack', 'repeat', 'bool'])
def test_no_decision_can_bypass_floor(change):
    case, data, advice = setup()
    decisions = copy.deepcopy(case['decisions'])
    if change == 'consent':
        decisions['confirm'] = False
    elif change == 'ack':
        decisions['acknowledge'] = {}
    else:
        decisions['approve'] = {'duplicate': [3], 'unknown': [6], 'repeat': [1, 1], 'bool': [True]}[change]
    with pytest.raises(ValueError):
        rescue.decide(data, advice, decisions)


def test_forged_evidence_rejected():
    _, data, advice = setup()
    advice['risks'][0]['evidence'][0]['value'] = 'fabricated'
    with pytest.raises(ValueError, match='Forged'):
        rescue.check(advice, data['supplier'])


def test_transformation_false_success_rejected():
    case, _, _ = setup()
    rows = copy.deepcopy(case['gold']['updates'])
    rows[0]['price'] = '0.00'
    for invalid in (rows, case['gold']['updates'][:1]):
        with pytest.raises(ValueError):
            catalog.validate(invalid, case['gold']['updates'])


def test_ambiguous_business_basis_cannot_enter_rescue():
    case, _, _ = setup()
    case['intent'] = 'Currency unknown; please guess quantities and prices'
    with pytest.raises(ValueError):
        rescue.tables(case)


@pytest.mark.parametrize('flags', [[], ['--baseline-review']])
def test_operator_review_creates_non_authorizing_draft(tmp_path, monkeypatch, flags):
    directory = tmp_path/'review'
    def forbidden(*args):
        pytest.fail('Deterministic review must never call the model')
    monkeypatch.setattr(rescue, 'agent_review', forbidden)
    monkeypatch.setattr('sys.argv', ['rescue', 'review', 'evaluation/rescue/case.json',
                                  str(directory), *flags])
    rescue.main()
    draft = json.loads((directory/'decisions.example.json').read_text())
    assert draft['confirm'] is False and draft['approve'] == []
    assert draft['mapping']['price'] is None
    assert 'ROW 8' in (directory/'review.txt').read_text(encoding='utf-8')
    assert 'Verified deterministic' in (directory/'review.txt').read_text(encoding='utf-8')
    assert json.loads((directory/'inference.json').read_text())['model_calls'] == 0
    assert not (directory/'verified.csv').exists()


def test_model_review_requires_explicit_experimental_opt_in(tmp_path, monkeypatch, capsys):
    _, _, advice = setup()
    calls = []
    def synthetic_review(*args):
        calls.append(args)
        return advice, {'synthetic_test': True}
    monkeypatch.setattr(rescue, 'agent_review', synthetic_review)
    directory = tmp_path/'experimental'
    monkeypatch.setattr('sys.argv', ['rescue', 'review', 'evaluation/rescue/case.json',
                                  str(directory), '--experimental-agent-review'])
    rescue.main()
    assert len(calls) == 1
    assert 'EXPERIMENTAL' in capsys.readouterr().out
    assert 'EXPERIMENTAL' in (directory/'review.txt').read_text(encoding='utf-8')
    assert not (directory/'verified.csv').exists()


def test_conflicting_review_flags_fail_before_work(tmp_path, monkeypatch):
    directory = tmp_path/'conflict'
    monkeypatch.setattr('sys.argv', ['rescue', 'review', 'evaluation/rescue/case.json',
                                  str(directory), '--baseline-review', '--experimental-agent-review'])
    with pytest.raises(SystemExit) as caught:
        rescue.main()
    assert caught.value.code == 2
    assert not directory.exists()
