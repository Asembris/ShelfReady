import json
from types import SimpleNamespace

from shelfready import runner


def test_fixed_ssh_uses_service_key_and_verified_host_file(monkeypatch):
    monkeypatch.setenv("RUNNER_HOST", "dispatcher@192.0.2.10")
    monkeypatch.setenv("RUNNER_SSH_KEY_PATH", "/etc/shelfready/ssh/runner_ed25519")
    monkeypatch.setenv("RUNNER_KNOWN_HOSTS_PATH", "/etc/shelfready/ssh/known_hosts")
    calls = []

    def invoke(argv, **kwargs):
        calls.append((argv, kwargs))
        return SimpleNamespace(returncode=0, stdout='{"ok":true}')

    monkeypatch.setattr(runner.subprocess, "run", invoke)
    payload = {"code": "print('untrusted')", "data": {}}
    assert runner.dispatch(payload) == {"ok": True}
    argv, kwargs = calls[0]
    assert "-oIdentitiesOnly=yes" in argv
    assert "-oStrictHostKeyChecking=yes" in argv
    assert "-oUserKnownHostsFile=/etc/shelfready/ssh/known_hosts" in argv
    assert argv[-4:] == ["-i", "/etc/shelfready/ssh/runner_ed25519",
                         "dispatcher@192.0.2.10", "python3 -m shelfready.runner"]
    assert json.loads(kwargs["input"]) == payload
    assert payload["code"] not in " ".join(argv)
