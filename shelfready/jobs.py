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
QUOTA = int(os.getenv("SHELFREADY_UPLOAD_QUOTA") or "30")
if not 1 <= QUOTA <= 150:
    raise ValueError("SHELFREADY_UPLOAD_QUOTA must be between 1 and 150")


class DemoLimit(ValueError):
    pass


@contextmanager
def connect():
    ROOT.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(ROOT / "jobs.sqlite", timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("BEGIN IMMEDIATE")
    db.execute("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, state TEXT, "
               "created REAL, data TEXT, confirmation TEXT, report TEXT, csv TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS usage (total INTEGER)")
    db.execute("CREATE TABLE IF NOT EXISTS interpretations (job_id TEXT PRIMARY KEY, intent TEXT, result TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS judge_owners (job_id TEXT PRIMARY KEY, visitor TEXT NOT NULL)")
    db.execute("CREATE TABLE IF NOT EXISTS judge_admissions "
               "(kind TEXT NOT NULL, visitor TEXT NOT NULL, admitted REAL NOT NULL)")
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
    db.execute("DELETE FROM interpretations WHERE job_id NOT IN (SELECT id FROM jobs)")
    db.execute("DELETE FROM judge_owners WHERE job_id NOT IN (SELECT id FROM jobs)")


def admit(db, kind, visitor, now):
    db.execute("DELETE FROM judge_admissions WHERE admitted <= ?", (now - 3600,))
    total, own = db.execute(
        "SELECT COUNT(*), COUNT(CASE WHEN visitor = ? THEN 1 END) FROM judge_admissions WHERE kind = ?",
        (visitor, kind),
    ).fetchone()
    if kind == "execution" and total >= 8:
        raise DemoLimit("The demo has reached its hourly rehearsal limit. Try later or view the verified replay.")
    if own >= (2 if kind == "execution" else 3):
        raise DemoLimit("Your network has reached its hourly demo limit. Try later or view the verified replay.")
    db.execute("INSERT INTO judge_admissions VALUES (?, ?, ?)", (kind, visitor, now))


def create(data, visitor=None):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        reap(db)
        if db.execute("SELECT total FROM usage").fetchone()[0] >= QUOTA:
            if visitor is not None:
                raise DemoLimit("The live demo upload allowance is exhausted. The verified replay is still available.")
            raise ValueError(f"Persistent local quota exhausted ({QUOTA} uploads)")
        key = uuid.uuid4().hex
        now = time.time()
        if visitor is not None:
            admit(db, "upload", visitor, now)
            db.execute("INSERT INTO judge_owners VALUES (?, ?)", (key, visitor))
        db.execute("INSERT INTO jobs VALUES (?, 'mapping', ?, ?, NULL, NULL, NULL)", (key, now, json.dumps(data)))
        db.execute("UPDATE usage SET total=total+1")
        return key


def require_owner(db, key, visitor):
    if visitor is not None and not db.execute(
        "SELECT 1 FROM judge_owners WHERE job_id = ? AND visitor = ?", (key, visitor),
    ).fetchone():
        raise KeyError(key)


def get(key, visitor=None):
    with connect() as db:
        reap(db)
        require_owner(db, key, visitor)
        row = db.execute("SELECT * FROM jobs WHERE id=?", (key,)).fetchone()
        if not row:
            raise KeyError(key)
        return dict(row)


def confirm(key, confirmation, visitor=None):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        reap(db)
        require_owner(db, key, visitor)
        if db.execute("SELECT 1 FROM jobs WHERE state IN ('queued','running')").fetchone():
            if visitor is not None:
                raise DemoLimit("Another rehearsal is active. Keep this page open and try again shortly.")
            raise ValueError("One rehearsal is already active")
        changed = db.execute("UPDATE jobs SET state='queued', confirmation=? "
                             "WHERE id=? AND state='mapping'",
                             (json.dumps(confirmation), key)).rowcount
        if not changed:
            raise ValueError("Job is missing, expired or already confirmed")
        if visitor is not None:
            admit(db, "execution", visitor, time.time())


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
