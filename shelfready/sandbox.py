"""Local feasibility runner. Requires a dedicated Linux Docker host in production.

The only result channel is bounded stdout. No host mounts, credentials or socket.
"""
import json
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

IMAGE = "python:3.12.12-slim-bookworm@sha256:593bd06efe90efa80dc4eee3948be7c0fde4134606dd40d8dd8dbcade98e669c"
MAX_CODE = 65536
MAX_OUTPUT = 65536


@dataclass
class Result:
    status: str
    stdout: str
    exit_code: int | None


def run(code: str, timeout: float = 5) -> Result:
    if len(code.encode()) > MAX_CODE:
        raise ValueError("Code exceeds 64 KiB")
    if not 0 < timeout <= 30:
        raise ValueError("Timeout must be in (0, 30]")
    name = "shelfready-sandbox-" + uuid.uuid4().hex
    command = [
        "docker", "run", "--name", name, "--pull=never", "--interactive",
        "--network=none", "--read-only", "--user=65534:65534",
        "--cap-drop=ALL", "--security-opt=no-new-privileges:true",
        "--memory=128m", "--memory-swap=128m", "--cpus=0.5", "--pids-limit=32",
        "--ulimit=nofile=64:64", "--ulimit=fsize=1048576:1048576",
        "--ulimit=core=0:0", "--log-driver=none",
        "--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=8m,mode=1777",
        "--tmpfs=/output:rw,noexec,nosuid,nodev,size=1m,mode=1777",
        "--workdir=/output", IMAGE, "python", "-I", "-B", "-c",
        "import os,sys; os.environ.clear(); os.environ['PATH']='/usr/bin:/bin'; "
        "exec(compile(sys.stdin.buffer.read(65537), '<generated>', 'exec'))",
    ]
    output = bytearray()
    overflow = threading.Event()
    proc = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT)

    def drain():
        while chunk := proc.stdout.read(4096):
            room = MAX_OUTPUT - len(output)
            output.extend(chunk[:room])
            if len(chunk) > room:
                overflow.set()
                # Keep draining/discarding until removal. Closing the attached pipe
                # here can deadlock Docker's kill operation behind a full buffer.

    reader = threading.Thread(target=drain, daemon=True)
    reader.start()

    def feed():
        try:
            proc.stdin.write(code.encode())
        except (BrokenPipeError, OSError):
            pass
        finally:
            proc.stdin.close()

    writer = threading.Thread(target=feed, daemon=True)
    writer.start()
    status = "finished"
    try:
        deadline = time.monotonic() + timeout
        while proc.poll() is None and not overflow.wait(0.02):
            if time.monotonic() >= deadline:
                status = "timeout"
                break
        if overflow.is_set():
            status = "output_limit"
    finally:
        # Removing by our random exact name also kills descendants after timeout.
        removed = subprocess.run(["docker", "rm", "--force", name],
                                 capture_output=True, timeout=20)
        if removed.returncode:
            proc.kill()
            raise RuntimeError("Sandbox cleanup failed: " + removed.stderr.decode()[:300])
        proc.wait(timeout=10)
        writer.join(timeout=10)
        reader.join(timeout=10)
        proc.stdout.close()
    if overflow.is_set():
        status = "output_limit"
    return Result(status, output.decode(errors="replace"), proc.returncode)


def main():
    code = Path("artifacts/inference/generated.py").read_text(encoding="utf-8")
    result = run(code)
    expected = [{"sku": "00017", "price": "13.55", "stock": "4"},
                {"sku": "A-2", "price": "1.35", "stock": "0"}]
    assert result.status == "finished" and result.exit_code == 0, result
    assert json.loads(result.stdout) == expected, result
    print(json.dumps({"generated_code_verified": True, "actual": expected}))


if __name__ == "__main__":
    main()
