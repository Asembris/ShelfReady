"""Fixed SSH dispatcher; local Docker requires an explicit development opt-in."""
import dataclasses
import json
import os
import re
import subprocess
import sys

from shelfready import sandbox


def reap_local():
    result = subprocess.run(["docker", "ps", "-aq", "--filter", "label=shelfready.execution=1"],
                            capture_output=True, text=True, timeout=20, check=True)
    for identifier in result.stdout.split():
        if not re.fullmatch(r"[0-9a-f]{12,64}", identifier):
            raise RuntimeError("Invalid container identifier")
        subprocess.run(["docker", "rm", "-f", identifier], capture_output=True,
                       timeout=20, check=True)


def reap():
    if os.getenv("SHELFREADY_LOCAL_RUNNER") == "1":
        reap_local()
    else:
        dispatch({"action": "reap"})


def execute(code, data):
    if os.getenv("SHELFREADY_LOCAL_RUNNER") == "1":
        return sandbox.run(code, data=data)
    return sandbox.Result(**dispatch({"code": code, "data": data}))


def dispatch(payload):
    host = os.environ.get("RUNNER_HOST", "")
    key = os.environ.get("RUNNER_SSH_KEY_PATH", "")
    known_hosts = os.environ.get("RUNNER_KNOWN_HOSTS_PATH", "")
    if not re.fullmatch(r"[A-Za-z0-9_.@-]+", host) or host.startswith("-") or not key:
        raise RuntimeError("Configure the fixed SSH runner or explicitly opt into local development")
    trust = ["-oUserKnownHostsFile=" + known_hosts] if known_hosts else []
    proc = subprocess.run([
        "ssh", "-T", "-oBatchMode=yes", "-oStrictHostKeyChecking=yes", "-oConnectTimeout=10",
        "-oIdentitiesOnly=yes", *trust, "-i", key, host, "python3 -m shelfready.runner",
    ], input=json.dumps(payload), text=True,
        capture_output=True, timeout=60)
    if proc.returncode or len(proc.stdout.encode()) > 400000:
        raise RuntimeError("Runner dispatcher failed")
    return json.loads(proc.stdout)


if __name__ == "__main__":
    request = sys.stdin.buffer.read(131073)
    if len(request) > 131072:
        raise ValueError("Runner payload too large")
    payload = json.loads(request)
    if payload.get("action") == "reap":
        reap_local()
        print("{}")
    else:
        print(json.dumps(dataclasses.asdict(sandbox.run(payload["code"], data=payload["data"]))))
