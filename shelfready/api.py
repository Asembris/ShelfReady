"""Loopback API with an opt-in, fixture-only judge mode behind Caddy."""
import json
import hashlib
import hmac
import ipaddress
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

JUDGE_DEMO = os.getenv("SHELFREADY_JUDGE_DEMO") == "1"
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None) if JUDGE_DEMO else FastAPI()
PUBLIC_ORIGIN = os.getenv("SHELFREADY_PUBLIC_ORIGIN", "")
if PUBLIC_ORIGIN and (urlparse(PUBLIC_ORIGIN).scheme != "https" or not urlparse(PUBLIC_ORIGIN).hostname):
    raise ValueError("Public origin must be an explicit HTTPS origin")
VISITOR_KEY = os.getenv("SHELFREADY_VISITOR_KEY", "").encode()
if JUDGE_DEMO and (not PUBLIC_ORIGIN or len(VISITOR_KEY) < 32):
    raise ValueError("Judge mode requires a public HTTPS origin and a dedicated visitor key")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"] +
                   ([urlparse(PUBLIC_ORIGIN).hostname] if PUBLIC_ORIGIN else []))
_window = [0, 0]


@app.middleware("http")
async def local_only(request, call_next):
    if not JUDGE_DEMO and "x-shelfready-visitor" in request.headers:
        return Response("Judge mode is unavailable", status_code=503)
    if JUDGE_DEMO and request.method == "POST" and request.headers.get("origin") != PUBLIC_ORIGIN:
        return Response("Origin denied", status_code=403)
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


def visitor(request):
    if not JUDGE_DEMO:
        return None
    try:
        # The dedicated Caddy config overwrites this header from the socket peer.
        if not request.client or request.client.host != "127.0.0.1":
            raise ValueError("Expected loopback proxy")
        values = request.headers.getlist("x-shelfready-visitor")
        if len(values) != 1 or "%" in values[0]:
            raise ValueError("Expected one proxy address")
        address = ipaddress.ip_address(values[0])
        if isinstance(address, ipaddress.IPv6Address):
            address = address.ipv4_mapped or ipaddress.ip_network(f"{address}/64", strict=False).network_address
    except ValueError:
        raise HTTPException(403, "Demo proxy identity unavailable") from None
    return hmac.digest(VISITOR_KEY, address.packed, "sha256").hex()


def load(key, owner=None):
    try:
        return jobs.get(key, owner)
    except KeyError:
        raise HTTPException(404, "Job missing or expired") from None


@app.post("/api/jobs")
async def upload(request: Request):
    owner = visitor(request)
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
        key = jobs.create(data, owner)
    except jobs.DemoLimit as error:
        raise HTTPException(429, str(error)) from None
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
    if JUDGE_DEMO:
        raise HTTPException(404, "Interpretation is unavailable in the judge demo")
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
    owner = visitor(request)
    raw = await body(request)
    try:
        confirmation = Confirmation.model_validate(raw).model_dump()
        if JUDGE_DEMO and confirmation["interpretation"] is not None:
            raise ValueError("Confirm fixture columns directly in the judge demo")
        if not confirmation.pop("replace_price_and_stock_same_currency"):
            raise ValueError("Explicit same-currency price/stock replacement consent is required")
        row = load(key, owner)
        catalog.plan(json.loads(row["data"]), confirmation)
        jobs.confirm(key, confirmation, owner)
    except jobs.DemoLimit as error:
        raise HTTPException(429, str(error)) from None
    except KeyError:
        raise HTTPException(404, "Job missing or expired") from None
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    return {"state": "queued"}


def report_for(row):
    report = json.loads(row["report"]) if row["report"] else None
    if JUDGE_DEMO and report is not None:
        report.pop("native_diagnostics", None)
        if "attempts" in report:
            report["attempts"] = [{"attempt": attempt["attempt"]} for attempt in report["attempts"]]
    return report


@app.get("/api/jobs/{key}")
def status(key: str, request: Request):
    row = load(key, visitor(request))
    return {"id": key, "state": row["state"], "report": report_for(row)}


@app.get("/api/jobs/{key}/download/{kind}")
def download(key: str, kind: str, request: Request):
    row = load(key, visitor(request))
    if row["state"] not in ("complete", "partial") or not row["csv"] or kind not in ("csv", "report"):
        raise HTTPException(409, "No verified download is available")
    content = row["csv"] if kind == "csv" else row["report"]
    if JUDGE_DEMO and kind == "report":
        content = json.dumps(report_for(row))
    return Response(content,
                    media_type="text/csv" if kind == "csv" else "application/json",
                    headers={"Content-Disposition": f'attachment; filename="shelfready.{"csv" if kind == "csv" else "json"}"',
                             "Cache-Control": "no-store"})
