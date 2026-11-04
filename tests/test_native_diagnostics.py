import json
import subprocess

import pytest

from shelfready import native_diagnostics as diagnostics, store


def test_secret_redaction_and_bounded_history(tmp_path, monkeypatch):
    monkeypatch.setenv('VULTR_INFERENCE_API_KEY', 'synthetic-secret-key')
    args = ['docker', 'exec', 'cli', 'wp', 'core', 'install', '--admin_password=admin-secret']
    with diagnostics.scope(tmp_path):
        for _ in range(20):
            diagnostics.record(args, 1, False, 'admin-secret synthetic-secret-key '+('x'*3000))
    text = (tmp_path/'native-diagnostics.json').read_text()
    assert 'admin-secret' not in text and 'synthetic-secret-key' not in text
    events = json.loads(text)
    assert len(events) == 12 and len(events[-1]['stderr']) <= 2048
    assert events[-1]['command_identity'] == 'wp.core.install.baseline'


def test_timeout_retains_redacted_diagnostic(tmp_path, monkeypatch):
    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired('not retained', 180, stderr=b'password=synthetic')
    monkeypatch.setattr(store.subprocess, 'run', timeout)
    with pytest.raises(subprocess.TimeoutExpired) as caught:
        with diagnostics.scope(tmp_path):
            store.command(['docker', 'compose', 'up'])
    event = caught.value.native_diagnostics[-1]
    assert event['timed_out'] and event['exit_code'] is None
    assert event['stderr'] == 'password=[REDACTED]'
