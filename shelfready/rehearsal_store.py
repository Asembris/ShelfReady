"""Trusted disposable-store adapter for the vertical slice; never production."""
import hashlib
import json
import secrets
import time
from decimal import Decimal
from pathlib import Path

from shelfready import store
from shelfready.catalog import csv_text

PROJECT = "shelfready-rehearsal"


def compose(*args, **kwargs):
    base = store.COMPOSE.copy()
    base[3] = PROJECT
    return store.command([*base, *args], **kwargs)


def cleanup():
    compose("down", "--volumes", "--remove-orphans")
    if store.command(["docker", "volume", "ls", "-q", "--filter",
                      f"label=com.docker.compose.project={PROJECT}"]):
        raise RuntimeError("Disposable store volumes remain after cleanup")


def rehearse(baseline, updates, directory):
    package = store.RUNTIME / f"woocommerce.{store.WOO_VERSION}.zip"
    if not package.exists() or hashlib.sha256(package.read_bytes()).hexdigest() != store.WOO_SHA256:
        raise RuntimeError("Run the Phase 1 store setup to cache the pinned plugin and credentials")

    def wp(*args):
        return compose("exec", "-T", "cli", "wp", *args)

    def snapshot():
        query = """SELECT s.meta_value, p.meta_value, q.meta_value, n.post_title
        FROM wp_posts n JOIN wp_postmeta s ON s.post_id=n.ID AND s.meta_key='_sku'
        JOIN wp_postmeta p ON p.post_id=n.ID AND p.meta_key='_regular_price'
        JOIN wp_postmeta q ON q.post_id=n.ID AND q.meta_key='_stock'
        WHERE n.post_type='product' ORDER BY s.meta_value"""
        text = compose("exec", "-T", "db", "sh", "-c",
                       'exec mariadb -ushelfready -p"$MARIADB_PASSWORD" '
                       '--batch --skip-column-names shelfready', input=query)
        return [line.split("\t") for line in text.splitlines()]

    def verify(actual, expected):
        want = sorted([[r["sku"], Decimal(r["price"]), int(r["stock"]), r["name"]]
                       for r in expected])
        try:
            got = sorted([[sku, Decimal(price), int(stock), name]
                          for sku, price, stock, name in actual])
        except (ValueError, ArithmeticError) as error:
            raise RuntimeError("Malformed independent store readback") from error
        if got != want:
            raise RuntimeError("Persisted products differ from independently expected values")

    try:
        compose("up", "-d", "--wait", "--wait-timeout", "150")
        for _ in range(60):
            try:
                wp("core", "version")
                break
            except RuntimeError:
                time.sleep(1)
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
        for rows, update in [(baseline, False), (updates, True)]:
            path = directory / "catalog.csv"
            path.write_text(csv_text(rows, baseline=not update), encoding="utf-8")
            store.command(["docker", "cp", str(path), f"{container}:/tmp/catalog.csv"])
            result = compose("exec", "-T", "-e", f"IMPORT_UPDATE={int(update)}", "cli",
                             "wp", "eval-file", "/tmp/import.php")
            imported = json.loads(result)
            if imported["failed"] or imported["skipped"]:
                raise RuntimeError("Native importer failed or skipped rows")
            if not update:
                verify(snapshot(), baseline)
        merged = {r["sku"]: dict(r) for r in baseline}
        for row in updates:
            merged[row["sku"]].update(price=row["price"], stock=row["stock"])
        actual = snapshot()
        verify(actual, merged.values())
        return actual
    finally:
        cleanup()
