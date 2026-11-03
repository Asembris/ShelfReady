"""Disposable native importer probe, independently checked through SQL."""
import hashlib
import json
import secrets
import subprocess
import time
from pathlib import Path

PROJECT = "shelfready-feasibility"
RUNTIME = Path(".runtime")
WOO_VERSION = "10.3.5"
WOO_SHA256 = "6e28e5958598a9cc4dea16535dd6140079841a5f92e2d06f0d08ab982ff616f0"
COMPOSE = ["docker", "compose", "--project-name", PROJECT,
           "--env-file", str(RUNTIME / "store.env"), "-f", "infra/compose.yaml"]


def command(args, **kwargs):
    result = subprocess.run(args, capture_output=True, text=True, timeout=180, **kwargs)
    if result.returncode:
        # Commands can contain generated passwords: never include argv in errors.
        raise RuntimeError(result.stderr[-2000:])
    return result.stdout.strip()


def compose(*args, **kwargs):
    return command([*COMPOSE, *args], **kwargs)


def wp(*args):
    return compose("exec", "-T", "cli", "wp", *args)


def readback():
    # Fresh SQL process; does not share importer output or Woo object caches.
    sql = """SELECT sku.meta_value, price.meta_value, stock.meta_value, p.post_title
    FROM wp_posts p
    JOIN wp_postmeta sku ON sku.post_id=p.ID AND sku.meta_key='_sku'
    JOIN wp_postmeta price ON price.post_id=p.ID AND price.meta_key='_regular_price'
    JOIN wp_postmeta stock ON stock.post_id=p.ID AND stock.meta_key='_stock'
    WHERE p.post_type='product' ORDER BY sku.meta_value;"""
    return compose("exec", "-T", "db", "sh", "-c",
                   'exec mariadb -ushelfready -p"$MARIADB_PASSWORD" '
                   '--batch --skip-column-names shelfready', input=sql)


def import_csv(file, update=False):
    container = compose("ps", "-q", "cli")
    command(["docker", "cp", str(file), f"{container}:/tmp/catalog.csv"])
    output = compose("exec", "-T", "-e", f"IMPORT_UPDATE={int(update)}",
                     "cli", "wp", "eval-file", "/tmp/import.php")
    return output


def main():
    RUNTIME.mkdir(exist_ok=True)
    env = RUNTIME / "store.env"
    if not env.exists():
        env.write_text("STORE_PASSWORD=" + secrets.token_hex(24) +
                       "\nROOT_PASSWORD=" + secrets.token_hex(24) + "\n")
    evidence = Path("artifacts/store")
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / "result.json").unlink(missing_ok=True)
    package = RUNTIME / f"woocommerce.{WOO_VERSION}.zip"
    if not package.exists():
        command(["curl.exe" if __import__('os').name == 'nt' else "curl", "-fL",
                 f"https://downloads.wordpress.org/plugin/woocommerce.{WOO_VERSION}.zip",
                 "-o", str(package)])
    report = {"woocommerce": WOO_VERSION,
              "plugin_sha256": hashlib.sha256(package.read_bytes()).hexdigest()}
    if report["plugin_sha256"] != WOO_SHA256:
        raise ValueError("WooCommerce package checksum does not match pinned artifact")
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
        wp("core", "install", "--url=http://shelfready.invalid", "--title=Disposable",
           "--admin_user=localadmin", "--admin_password=" + secrets.token_hex(24),
           "--admin_email=local@example.invalid", "--skip-email")
        container = compose("ps", "-q", "cli")
        command(["docker", "cp", str(package), f"{container}:/tmp/woocommerce.zip"])
        command(["docker", "cp", "infra/import.php", f"{container}:/tmp/import.php"])
        wp("plugin", "install", "/tmp/woocommerce.zip", "--activate")
        installed_version = wp("plugin", "get", "woocommerce", "--field=version")
        if installed_version != WOO_VERSION:
            raise RuntimeError(
                f"WooCommerce version mismatch: expected {WOO_VERSION!r}, "
                f"received {installed_version!r}")
        report["baseline_import"] = import_csv(Path("fixtures/baseline.csv"))
        before = readback()
        if before != "00017\t12.30\t4\tLeading zero product\nA-2\t0.10\t0\tDecimal product":
            raise RuntimeError(f"Baseline SQL readback mismatch: received {before!r}")
        report["update_import"] = import_csv(Path("fixtures/update.csv"), update=True)
        after = readback()
        if after != "00017\t13.55\t7\tLeading zero product\nA-2\t1.35\t2\tDecimal product":
            raise RuntimeError(f"Updated SQL readback mismatch: received {after!r}")
        report.update(before=before, after=after)
        wp("db", "reset", "--yes")
        tables = compose("exec", "-T", "db", "sh", "-c",
                         'exec mariadb -ushelfready -p"$MARIADB_PASSWORD" '
                         '--batch --skip-column-names shelfready', input="SHOW TABLES;")
        if tables != "":
            raise RuntimeError(f"Database reset incomplete: remaining tables {tables!r}")
        report["reset_empty"] = True
    finally:
        compose("down", "--volumes", "--remove-orphans")
        remaining = command(["docker", "volume", "ls", "-q", "--filter",
                             f"label=com.docker.compose.project={PROJECT}"])
        if remaining != "":
            raise RuntimeError(f"Store cleanup incomplete: remaining volumes {remaining!r}")
    report["volumes_removed"] = True
    (evidence / "result.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
