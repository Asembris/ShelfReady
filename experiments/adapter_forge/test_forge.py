import copy
import json

import pytest

from experiments.adapter_forge import forge


@pytest.mark.parametrize('phase', ['base', 'replay', 'drift', 'currency'])
def test_strong_parser_matches_frozen_reference(phase):
    raw, reference = forge.load(phase)
    result = forge.validate(forge.deterministic(raw, reference['known_skus']), raw, reference, True)
    assert result['verified_rows'] == (0 if phase == 'currency' else 2)
    assert result['unresolved'] == (6 if phase == 'currency' else 4)


@pytest.mark.parametrize('fault', ['value', 'citation', 'missing', 'duplicate', 'ambiguous', 'consent'])
def test_external_validator_fails_closed(fault):
    raw, ref = forge.load('base')
    out = forge.deterministic(raw, ref['known_skus'])
    if fault == 'value':
        out['rows'][0]['price'] = '0.01'
    elif fault == 'citation':
        out['rows'][0]['price_cell'] = [5, 5]
    elif fault == 'missing':
        out['rows'].pop()
    elif fault == 'duplicate':
        out['rows'][2]['decision'] = 'ready'
    elif fault == 'ambiguous':
        out['rows'][4]['decision'] = 'ready'
    with pytest.raises(ValueError):
        forge.validate(out, raw, ref, fault != 'consent')


def test_replay_checks_drift_before_execution(tmp_path, monkeypatch):
    raw, ref = forge.load('base')
    path = tmp_path/'adapter.json'
    forge.save('synthetic-code', raw, ref['known_skus'], path)
    calls = []
    def execute(*args):
        calls.append(args)
        return {'verified_rows': 2}, {}
    monkeypatch.setattr(forge, 'execute', execute)
    replay_raw, replay_ref = forge.load('replay')
    assert forge.replay(path, replay_raw, replay_ref)['verified_rows'] == 2
    assert len(calls) == 1
    for phase in ('drift', 'currency'):
        text, reference = forge.load(phase)
        with pytest.raises(ValueError, match='structural_drift'):
            forge.replay(path, text, reference)
    assert len(calls) == 1


def test_request_cap_prevents_api_call(tmp_path, monkeypatch):
    ledger = tmp_path/'ledger.json'
    ledger.write_text(json.dumps([{'synthetic': True}]*24))
    monkeypatch.setattr(forge, 'BUDGET', ledger)
    def forbidden():
        pytest.fail('Request cap must prevent client creation')
    monkeypatch.setattr(forge.inference, 'client', forbidden)
    with pytest.raises(RuntimeError, match='cap'):
        forge.ask([], tmp_path, 1)
    assert len(json.loads(ledger.read_text())) == 24
    assert not ledger.with_suffix('.lock').exists()


def test_agent_preserves_feedback_and_previous_code(tmp_path, monkeypatch):
    calls = []
    def ask(messages, directory, step):
        calls.append(copy.deepcopy(messages))
        return 'synthetic-code-'+str(step), {'number': step}
    def execute(code, raw, reference):
        if code.endswith('1'):
            return None, {'code': 'source_accounting'}
        return {'verified_rows': 2}, {'code': 'accepted'}
    monkeypatch.setattr(forge, 'ask', ask)
    monkeypatch.setattr(forge, 'execute', execute)
    raw, ref = forge.load('base')
    _, accepted, attempts, _ = forge.generate(raw, ref, 'stateful', tmp_path)
    assert accepted['verified_rows'] == 2 and len(attempts) == 2
    assert any(m['role'] == 'assistant' and m['content'] == 'synthetic-code-1' for m in calls[1])
    assert 'source_accounting' in calls[1][-1]['content']


def test_single_shot_and_agent_step_bounds(tmp_path, monkeypatch):
    monkeypatch.setattr(forge, 'ask', lambda m, d, s: ('invalid', {'number': s}))
    monkeypatch.setattr(forge, 'execute', lambda *args: (None, {'code': 'output_schema'}))
    raw, ref = forge.load('base')
    for arm, count in [('single', 1), ('stateful', 8)]:
        path = tmp_path/arm
        path.mkdir()
        code, _, attempts, _ = forge.generate(raw, ref, arm, path)
        assert code is None and len(attempts) == count
