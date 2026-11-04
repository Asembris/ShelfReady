"""Loopback-only local API. UUIDs are download capabilities; no public deployment."""
import json
import hashlib
import os
import time
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.concurrency import run_in_threadpool

from shelfready import catalog, jobs, interpretation

app = FastAPI()
PUBLIC_ORIGIN = os.getenv("SHELFREADY_PUBLIC_ORIGIN", "")
if PUBLIC_ORIGIN and (urlparse(PUBLIC_ORIGIN).scheme != "https" or not urlparse(PUBLIC_ORIGIN).hostname):
    raise ValueError("Public origin must be an explicit HTTPS origin")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"] +
                   ([urlparse(PUBLIC_ORIGIN).hostname] if PUBLIC_ORIGIN else []))
_window = [0, 0]


@app.middleware("http")
async def local_only(request, call_next):
    if PUBLIC_ORIGIN:
        minute = int(time.monotonic() // 60)
        if _window[0] != minute:
            _window[:] = [minute, 0]
        _window[1] += 1
        if _window[1] > 120:
            return Response("Demo request limit reached", status_code=429)
    if request.method == "POST" and request.headers.get("origin") not in (
            PUBLIC_ORIGIN,
            None, "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:18766", "http://127.0.0.1:18766",
            "http://localhost:18765", "http://127.0.0.1:18765",
            "http://localhost:8000", "http://127.0.0.1:8000"):
        return Response("Origin denied", status_code=403)
    return await call_next(request)


async def body(request):
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > 70000:
            raise HTTPException(413, "Request exceeds 70 KB")
    try:
        return json.loads(data)
    except (ValueError, UnicodeError):
        raise HTTPException(422, "Invalid JSON") from None


def load(key):
    try:
        return jobs.get(key)
    except KeyError:
        raise HTTPException(404, "Job missing or expired") from None


@app.post("/api/jobs")
async def upload(request: Request):
    raw = await body(request)
    try:
        data = {kind: catalog.parse(raw[kind].encode("utf-8")) for kind in catalog.FIELDS}
        if PUBLIC_ORIGIN:
            # Public demo accepts only exact operator-reviewed synthetic fixtures.
            for kind, path in (("baseline", "fixtures/baseline.csv"), ("supplier", "fixtures/update.csv")):
                digest = hashlib.sha256(raw[kind].encode("utf-8").replace(b"\r\n", b"\n")).digest()
                expected = hashlib.sha256(Path(path).read_bytes().replace(b"\r\n", b"\n")).digest()
                if digest != expected:
                    raise ValueError("Public demo accepts only the supplied synthetic fixtures")
        key = jobs.create(data)
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        raise HTTPException(422, str(error)) from None
    return {"id": key, "state": "mapping", "tables": data,
            "candidates": {k: catalog.candidates(v, k) for k, v in data.items()}}


class Confirmation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    baseline: dict[str, str]
    supplier: dict[str, str]
    replace_price_and_stock_same_currency: bool
    interpretation: dict | None = None


@app.post("/api/jobs/{key}/interpret")
async def interpret(key: str, request: Request):
    try:
        intent = interpretation.Intent.model_validate(await body(request)).model_dump()
        row = load(key)
        if row["state"] != "mapping":
            raise ValueError("Interpretation is allowed only before confirmation")
        data = json.loads(row["data"])
        with jobs.connect() as db:
            # One bounded proposal per upload, within the persistent upload quota.
            if db.execute("SELECT 1 FROM interpretations WHERE job_id=?", (key,)).fetchone():
                raise ValueError("This upload already requested an interpretation")
            db.execute("INSERT INTO interpretations VALUES (?,?,NULL)", (key, json.dumps(intent)))
        sku_headers = catalog.candidates(data["baseline"], "baseline")["sku"]
        skus = ([r[data["baseline"]["headers"].index(sku_headers[0])] for r in data["baseline"]["rows"]]
                if len(sku_headers) == 1 else [])
        proposal, evidence = await run_in_threadpool(
            interpretation.propose, data["supplier"], skus, intent)
        result = {"proposal": proposal, "intent": intent, "inference": evidence}
        with jobs.connect() as db:
            db.execute("UPDATE interpretations SET result=? WHERE job_id=?", (json.dumps(result), key))
        return result
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(502, "Interpretation failed; review manually or upload again") from None


@app.post("/api/jobs/{key}/confirm")
async def confirm(key: str, request: Request):
    raw = await body(request)
    try:
        confirmation = Confirmation.model_validate(raw).model_dump()
        if not confirmation.pop("replace_price_and_stock_same_currency"):
            raise ValueError("Explicit same-currency price/stock replacement consent is required")
        row = load(key)
        catalog.plan(json.loads(row["data"]), confirmation)
        jobs.confirm(key, confirmation)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    return {"state": "queued"}


@app.get("/api/jobs/{key}")
def status(key: str):
    row = load(key)
    return {"id": key, "state": row["state"],
            "report": json.loads(row["report"]) if row["report"] else None}


@app.get("/api/jobs/{key}/download/{kind}")
def download(key: str, kind: str):
    row = load(key)
    if row["state"] not in ("complete", "partial") or kind not in ("csv", "report"):
        raise HTTPException(409, "No verified download is available")
    return Response(row["csv"] if kind == "csv" else row["report"],
                    media_type="text/csv" if kind == "csv" else "application/json",
                    headers={"Content-Disposition": f'attachment; filename="shelfready.{"csv" if kind == "csv" else "json"}"',
                             "Cache-Control": "no-store"})
