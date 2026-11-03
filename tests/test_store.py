import contextlib
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from shelfready import store


def check_store_scenario(scenario):
    """Synthetic failure-path regression, also invoked by an optimized interpreter.

    Explicit test checks here must survive -O as well. This is not live evidence.
    """
    baseline = "00017\t12.30\t4\tLeading zero product\nA-2\t0.10\t0\tDecimal product"
    updated = "00017\t13.55\t7\tLeading zero product\nA-2\t1.35\t2\tDecimal product"
    messages = {
        "version": "WooCommerce version mismatch",
        "baseline": "Baseline SQL readback mismatch",
        "update": "Updated SQL readback mismatch",
        "reset": "Database reset incomplete",
        "volumes": "Store cleanup incomplete",
        "import_failure": "deliberate import failure",
        "timeout": "timed out",
    }

    def fake_compose(*args, **kwargs):
        if kwargs.get("input") == "SHOW TABLES;":
            return "wp_posts" if scenario == "reset" else ""
        return ""

    def fake_wp(*args):
        if args == ("plugin", "get", "woocommerce", "--field=version"):
            return "wrong-version" if scenario == "version" else store.WOO_VERSION
        return ""

    with tempfile.TemporaryDirectory() as directory, contextlib.chdir(directory):
        Path(".runtime").mkdir()
        package = b"synthetic package for unit regression"
        Path(f".runtime/woocommerce.{store.WOO_VERSION}.zip").write_bytes(package)
        evidence = Path("artifacts/store/result.json")
        evidence.parent.mkdir(parents=True)
        evidence.write_text('{"stale": true}')
        import_error = None
        if scenario == "import_failure":
            import_error = RuntimeError("deliberate import failure")
        elif scenario == "timeout":
            import_error = subprocess.TimeoutExpired("synthetic importer", 180)
        with (
            patch.object(store, "WOO_SHA256", hashlib.sha256(package).hexdigest()),
            patch.object(store, "compose", side_effect=fake_compose) as compose,
            patch.object(store, "wp", side_effect=fake_wp) as wp,
            patch.object(store, "command", return_value=(
                "leftover-volume" if scenario == "volumes" else "")) as command,
            patch.object(store, "import_csv", side_effect=import_error, return_value="{}"),
            patch.object(store, "readback", side_effect=[
                "wrong-baseline" if scenario == "baseline" else baseline,
                "wrong-update" if scenario == "update" else updated,
            ]),
        ):
            try:
                store.main()
            except (RuntimeError, subprocess.TimeoutExpired) as error:
                if scenario == "success" or messages[scenario] not in str(error):
                    raise AssertionError(f"Unexpected error for {scenario}: {error}") from error
            else:
                if scenario != "success":
                    raise AssertionError(f"Unsafe acceptance of {scenario}")
            compose.assert_any_call("down", "--volumes", "--remove-orphans")
            if sum(call.args[:1] == ("down",) for call in compose.call_args_list) != 1:
                raise AssertionError("Cleanup must run exactly once")
            command.assert_any_call([
                "docker", "volume", "ls", "-q", "--filter",
                f"label=com.docker.compose.project={store.PROJECT}",
            ])
            wp.assert_any_call("plugin", "get", "woocommerce", "--field=version")
            if scenario == "success":
                report = json.loads(evidence.read_text())
                if (report["before"], report["after"], report["reset_empty"],
                        report["volumes_removed"]) != (baseline, updated, True, True):
                    raise AssertionError("Successful report changed")
            elif evidence.exists():
                raise AssertionError("Failed probe released success evidence")


@pytest.mark.parametrize("optimized", [False, True], ids=["normal", "optimized"])
@pytest.mark.parametrize("scenario", [
    "success", "version", "baseline", "update", "reset", "volumes", "import_failure", "timeout",
])
def test_store_validation_and_cleanup(scenario, optimized):
    script = ("import runpy, sys; "
              "runpy.run_path('tests/test_store.py')['check_store_scenario'](sys.argv[1])")
    result = subprocess.run(
        [sys.executable, *(["-O"] if optimized else []), "-c", script, scenario],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr


@pytest.mark.live
def test_native_import_readback_reset():
    store.main()
