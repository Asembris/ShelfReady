"""Small durable single-worker queue with bounded retention and lifetime quota."""
import json
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
ROOT = Path(os.getenv("SHELFREADY_DATA_DIR") or ".runtime/rehearsal")
TTL = 86400
QUOTA = 30


@contextmanager
def connect():
    ROOT.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(ROOT / "jobs.sqlite", timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("BEGIN IMMEDIATE")
    db.execute("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, state TEXT, "
               "created REAL, data TEXT, confirmation TEXT, report TEXT, csv TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS usage (total INTEGER)")
    if not db.execute("SELECT * FROM usage").fetchone():
        db.execute("INSERT INTO usage VALUES (0)")
    db.commit()
    try:
        with db:
            yield db
    finally:
        db.close()


def reap(db):
    db.execute("DELETE FROM jobs WHERE created < ? AND state != 'running'", (time.time()-TTL,))


def create(data):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        reap(db)
        if db.execute("SELECT total FROM usage").fetchone()[0] >= QUOTA:
            raise ValueError("Persistent local quota exhausted (30 uploads)")
        key = uuid.uuid4().hex
        db.execute("INSERT INTO jobs VALUES (?, 'mapping', ?, ?, NULL, NULL, NULL)",
                   (key, time.time(), json.dumps(data)))
        db.execute("UPDATE usage SET total=total+1")
        return key


def get(key):
    with connect() as db:
        reap(db)
        row = db.execute("SELECT * FROM jobs WHERE id=?", (key,)).fetchone()
        if not row:
            raise KeyError(key)
        return dict(row)


def confirm(key, confirmation):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        reap(db)
        if db.execute("SELECT 1 FROM jobs WHERE state IN ('queued','running')").fetchone():
            raise ValueError("One rehearsal is already active")
        changed = db.execute("UPDATE jobs SET state='queued', confirmation=? "
                             "WHERE id=? AND state='mapping'",
                             (json.dumps(confirmation), key)).rowcount
        if not changed:
            raise ValueError("Job is missing, expired or already confirmed")


def claim():
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        reap(db)
        row = db.execute("SELECT * FROM jobs WHERE state='queued' ORDER BY created LIMIT 1").fetchone()
        if not row:
            return None
        db.execute("UPDATE jobs SET state='running' WHERE id=?", (row["id"],))
        return dict(row)


def finish(key, state, report, csv=None):
    with connect() as db:
        db.execute("UPDATE jobs SET state=?, report=?, csv=?, data='{}', confirmation=NULL WHERE id=?",
                   (state, json.dumps(report), csv, key))
