"""Trusted disposable-store adapter for the vertical slice; never production."""
import hashlib
import json
import secrets
import time
from pathlib import Path

from shelfready import store, native_diagnostics
from shelfready.catalog import csv_text
from shelfready.verification import verify_snapshot

PROJECT = "shelfready-rehearsal"
STAGE_CSV = "umask 077; cat > /tmp/catalog.csv"


def compose(*args, **kwargs):
    base = store.COMPOSE.copy()
    base[3] = PROJECT
    return store.command([*base, *args], **kwargs)


def cleanup():
    compose("down", "--volumes", "--remove-orphans")
    if store.command(["docker", "volume", "ls", "-q", "--filter",
                      f"label=com.docker.compose.project={PROJECT}"]):
        raise RuntimeError("Disposable store volumes remain after cleanup")


def rehearse(baseline, updates, directory, *, expected_updates=None):
    with native_diagnostics.scope(directory):
        return _rehearse(baseline, updates, directory, expected_updates=expected_updates)


def _rehearse(baseline, updates, directory, *, expected_updates=None):
    package = store.RUNTIME / f"woocommerce.{store.WOO_VERSION}.zip"
    if not package.exists() or hashlib.sha256(package.read_bytes()).hexdigest() != store.WOO_SHA256:
        raise RuntimeError("Run the Phase 1 store setup to cache the pinned plugin and credentials")

    def wp(*args):
        return compose("exec", "-T", "cli", "wp", *args)

    def snapshot():
        query = Path("infra/snapshot.sql").read_text(encoding="utf-8")
        text = compose("exec", "-T", "db", "sh", "-c",
                       'exec mariadb -ushelfready -p"$MARIADB_PASSWORD" '
                       '--batch --raw --skip-column-names shelfready', input=query)
        return [json.loads(line) for line in text.splitlines()]

    try:
        compose("up", "-d", "--wait", "--wait-timeout", "150")
        for _ in range(60):
            try:
                compose("exec", "-T", "cli", "test", "-f", "/var/www/html/wp-config.php")
                wp("core", "version")
                break
            except RuntimeError:
                time.sleep(1)
        else:
            raise RuntimeError("WordPress configuration did not become ready within 60 polls")
        wp("core", "install", "--url=http://shelfready.invalid", "--title=Rehearsal",
           "--admin_user=localadmin", "--admin_password=" + secrets.token_hex(24),
           "--admin_email=local@example.invalid", "--skip-email")
        container = compose("ps", "-q", "cli")
        for path, destination in [(package, "woocommerce.zip"), (Path("infra/import.php"), "import.php")]:
            store.command(["docker", "cp", str(path), f"{container}:/tmp/{destination}"])
        wp("plugin", "install", "/tmp/woocommerce.zip", "--activate")
        if wp("plugin", "get", "woocommerce", "--field=version") != store.WOO_VERSION:
            raise RuntimeError("WooCommerce version mismatch")
        wp("option", "update", "woocommerce_price_num_decimals", "6")
        before = None
        for rows, update in [(baseline, False), (updates, True)]:
            path = directory / "catalog.csv"
            path.write_text(csv_text(rows, baseline=not update), encoding="utf-8")
            # docker cp preserves mode 0600 but creates a root-owned destination.
            # Write as the trusted CLI UID instead; CSV bytes never enter shell code.
            compose("exec", "-T", "cli", "sh", "-c",
                    STAGE_CSV, input=path.read_text(encoding="utf-8"))
            result = compose("exec", "-T", "-e", f"IMPORT_UPDATE={int(update)}", "cli",
                             "wp", "eval-file", "/tmp/import.php")
            imported = json.loads(result)
            if imported["failed"] or imported["skipped"]:
                raise RuntimeError("Native importer failed or skipped rows")
            if len(imported["updated" if update else "imported"]) != len(rows):
                raise RuntimeError("Native importer row accounting mismatch")
            if not update:
                before = snapshot()
                verify_snapshot(before, baseline)
        merged = {r["sku"]: dict(r) for r in baseline}
        for row in updates if expected_updates is None else expected_updates:
            merged[row["sku"]].update(price=row["price"], stock=row["stock"])
        actual = snapshot()
        verify_snapshot(actual, list(merged.values()), before)
        (directory / "readback.json").write_text(json.dumps({"before": before, "after": actual}),
                                                  encoding="utf-8")
        return [[r["sku"], r["price"], r["stock"], r["name"]]
                for r in sorted(actual, key=lambda r: r["sku"])]
    finally:
        cleanup()
