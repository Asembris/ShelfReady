"""Read-only, bounded inspection of the two approved hosts; never provision or reboot."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess

from dotenv import dotenv_values

APPROVED = {
    "control": ("85d80015-3128-46bd-9188-50a5a9e092b0", "95.179.218.142"),
    "runner": ("ad67b797-3d07-492c-9e5d-5dde7f0ea5ff", "217.69.13.189"),
}
COMMAND = """hostname; uptime;
systemctl is-active caddy shelfready-api shelfready-worker 2>/dev/null || true;
docker ps -a --format '{{.Names}}'; free -m; df -h /"""


def validate_inventory(state):
    if set(state["instances"]) != set(APPROVED):
        raise ValueError("Exactly the two existing approved instances are required")
    for role, (identifier, address) in APPROVED.items():
        instance = state["instances"][role]
        if instance["id"] != identifier or instance["main_ip"] != address:
            raise ValueError("Instance identity differs; stop before remote access")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if not output.is_relative_to(Path("artifacts/live-deployment").resolve()):
        raise ValueError("Write private evidence only under artifacts/live-deployment")
    if output.exists():
        raise FileExistsError("Preserve earlier evidence; choose a new output path")
    state = json.loads(Path(".runtime/cloud/inventory.json").read_text())
    validate_inventory(state)
    private = Path(".runtime/cloud").resolve()
    secrets = [v for k, v in dotenv_values(".env").items()
               if v and len(v) >= 8 and any(s in k for s in ("KEY", "TOKEN", "PASSWORD", "SECRET"))]

    def redact(value):
        for secret in sorted(secrets, key=len, reverse=True):
            value = value.replace(secret, "[REDACTED]")
        return value[-16384:]

    results = {"observed_utc": datetime.now(timezone.utc).isoformat(), "hosts": {}}
    for role, (_, address) in APPROVED.items():
        command = ["ssh", "-T", "-oBatchMode=yes", "-oStrictHostKeyChecking=yes",
                   "-oIdentitiesOnly=yes", "-oConnectTimeout=10", "-oConnectionAttempts=1",
                   "-oUserKnownHostsFile=" + str(private / "known_hosts"),
                   "-i", str(private / "admin_ed25519"), "root@" + address, COMMAND]
        try:
            proc = subprocess.run(command, capture_output=True, text=True, timeout=30)
            result = {"ssh_exit": proc.returncode, "timed_out": False,
                      "stdout": redact(proc.stdout), "stderr": redact(proc.stderr)}
        except subprocess.TimeoutExpired:
            result = {"ssh_exit": None, "timed_out": True,
                      "stdout": "", "stderr": "SSH inspection exceeded 30 seconds"}
        results["hosts"][role] = result
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as stream:
        json.dump(results, stream, indent=2)
    for role, result in results["hosts"].items():
        print(f"{role}: ssh_exit={result['ssh_exit']}, timed_out={result['timed_out']}")
    if any(r["ssh_exit"] != 0 for r in results["hosts"].values()):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
