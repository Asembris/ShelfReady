import json
import subprocess

import pytest

from shelfready.sandbox import MAX_CODE, MAX_OUTPUT, run


def test_reject_oversized_code():
    with pytest.raises(ValueError, match="64 KiB"):
        run("x" * (MAX_CODE + 1))


def test_reject_unbounded_timeout():
    with pytest.raises(ValueError, match="Timeout"):
        run("", 31)


@pytest.mark.live
def test_normal_and_nonzero_exit():
    result = run("print('hello')")
    assert (result.status, result.exit_code, result.stdout) == ("finished", 0, "hello\n")
    result = run("raise ValueError('deliberate failure')")
    assert result.exit_code != 0
    assert "deliberate failure" in result.stdout


@pytest.mark.live
def test_timeout_and_cleanup():
    result = run("while True: pass", timeout=2)
    assert result.status == "timeout"
    remaining = subprocess.check_output(
        ["docker", "ps", "-aq", "--filter", "name=shelfready-sandbox-"], text=True)
    assert remaining.strip() == ""


@pytest.mark.live
def test_output_limit():
    result = run("while True: print('x'*4096, flush=True)")
    assert result.status == "output_limit"
    assert len(result.stdout.encode()) <= MAX_OUTPUT


@pytest.mark.live
def test_memory_limit():
    result = run("x = bytearray(512*1024*1024)")
    assert result.exit_code != 0


@pytest.mark.live
def test_containment():
    code = '''
import json, os, pathlib, socket, subprocess
checks = {}
checks['nonroot'] = os.getuid() == 65534
checks['no_secret'] = not any('KEY' in k or 'PASSWORD' in k for k in os.environ)
checks['no_socket'] = not pathlib.Path('/var/run/docker.sock').exists()
checks['no_host'] = not pathlib.Path('/host').exists()
checks['no_new_privs'] = 'NoNewPrivs:\\t1' in pathlib.Path('/proc/self/status').read_text()
checks['no_caps'] = 'CapEff:\\t0000000000000000' in pathlib.Path('/proc/self/status').read_text()
try:
    pathlib.Path('/etc/escape').write_text('bad')
    checks['root_readonly'] = False
except OSError:
    checks['root_readonly'] = True
try:
    socket.create_connection(('1.1.1.1', 443), timeout=.5)
    checks['no_network'] = False
except OSError:
    checks['no_network'] = True
try:
    pathlib.Path('/output/huge').write_bytes(b'x'*(2*1024*1024))
    checks['bounded_disk'] = False
except OSError:
    checks['bounded_disk'] = True
children = []
try:
    for _ in range(40):
        children.append(subprocess.Popen(['sleep','10']))
    checks['bounded_pids'] = False
except OSError:
    checks['bounded_pids'] = True
finally:
    for child in children:
        child.terminate()
    for child in children:
        child.wait()
print(json.dumps(checks))
'''
    result = run(code, timeout=10)
    assert result.exit_code == 0, result
    checks = json.loads(result.stdout)
    assert len(checks) == 10 and all(checks.values()), checks
