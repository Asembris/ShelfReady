# ShelfReady
Rehearse supplier catalog updates in a disposable WooCommerce store before they touch production.

Phase 5 deployment preparation is on `feat/vultr-deployment`. See the
[VM plan](deploy/PLAN.md). The two approved VMs are provisioned; deployment
stopped at a Caddy validation failure with application services inactive and web
ports closed. See [live evidence and billing deadline](docs/deployment.md).
Public HTTPS and remote-runner execution are not yet verified.
Public launch requires verified service-account SSH access, authentication and
downloadable synthetic fixtures. The demo accepts only the supplied baseline and
supplier pair; after deployment invitees obtain them at `/demo/index.html`.

## Approved Phase 4 agent-value spike

An optional interpretation step now accepts explicit currency, numeric-format,
inventory-unit and SKU-padding intent. After upload, choose these deliberately,
describe the intended selling-price/available-stock meaning, and select
**Propose supplier interpretation**. Review source-cell evidence, explanations,
uncertainties, columns and normalization rules before confirming execution.
Only the first five supplier rows, headers and baseline SKU references are sent
for interpretation. Unknown/ambiguous business basis blocks execution.

The generated transformation receives raw columns plus the confirmed rules;
trusted independent normalization, row accounting and native readback remain
outside generated code. The original manual mapping flow still works. There is
no product creation, variants, production-store access or paid cloud provisioning.
See [bounded spike evidence and limitations](docs/agent-value-spike.md).

This branch implements the Phase 2 local upload-to-download rehearsal slice.
It uses real Vultr inference, restricted Python containers, native WooCommerce
import and independent database readback. No cloud resources have been provisioned.
See [Phase 2 evidence and limitations](docs/rehearsal.md).

## Phase 3 verification and competitive evaluation

Measured verdict: **NARROW**. Both arms verified 7/7 eligible operations with zero
incorrect accepted changes; the generated path added model calls/tokens without
improving completion. This is not evidence of agent necessity or market superiority.

The rehearsal now reads complete JSON product snapshots directly from MariaDB,
including records with missing metadata. It checks exact SKU identity, decimal
regular/active prices, integer stock and derived stock status. After baseline
seeding, every update must preserve staged product IDs, parent IDs, names, slugs,
publication status, descriptions, short descriptions, simple-product type,
sale-price metadata and stock-management mode. Unupdated products must retain
their price/stock as well. IDs are preserved within the disposable store; source
or production WooCommerce IDs are not copied or claimed to be equivalent.
Only the supported mapped input fields are seeded; other CSV columns remain
outside the rehearsal's unchanged-field guarantee.

The eight synthetic evaluation holdouts and gold results were frozen before
tuning in `evaluation/cases.json`, with an LF-normalized SHA-256 manifest and
predeclared [paired protocol](evaluation/PROTOCOL.md). They are developer-authored
realistic examples, not independent customer evidence. Both arms receive the same
confirmed mappings and use the same native staging/verification. The deterministic
comparator performs a full exact-SKU join with duplicate detection, validation
and unresolved accounting; it does not deliberately guess unfamiliar headers.

Run only with no application worker or other evaluation already running. Complete
the Phase 1 plugin/image/credential setup first. From the repository root:

```powershell
uv run --locked pytest -q --basetemp=.runtime/pytest-verification
uv run --locked ruff check .
git diff --check
# Real Vultr tokens + local disposable Docker stores, no cloud provisioning:
uv run --locked python -m shelfready.evaluate --live-local
# Use the exact results.json path printed by that run:
uv run --locked python -m shelfready.evaluate_summary artifacts/evaluation/RUN/results.json
```

Every run has a new ignored directory. Raw API request IDs/usage, generated
programs, candidate stdout, wall times and independent before/after snapshots
remain there. The summary refuses incomplete or selected-case runs and audits
accepted final states against the frozen oracle. Never select the best run.
Malformed inputs, unknown/duplicate SKUs, unsupported numeric formats, ambiguous
intent, hostile ignored text and all-unresolved cases are represented. Two
pre-import corruptions and a deliberately incorrect **real native import** serve
as negative controls; synthetic provider/cleanup failures are separate unit tests.
The tests do not establish arbitrary prompt-injection resistance: ignored supplier
notes are not sent to the model, and mapping confirmation precedes generation.
See [measured competitive evidence](docs/verification.md) for the verdict and limits.

## Run the local rehearsal

First complete the Phase 1 setup below, including `python -m shelfready.store`
to cache the checksum-pinned plugin and generate disposable local credentials.
Use Node 22.12+ (tested with Node 24) and Python 3.12. From the repository root:

```powershell
uv sync --locked
# Terminal 1: loopback API
uv run --locked uvicorn shelfready.api:app --host 127.0.0.1 --port 18765
# Terminal 2: separate worker; explicit local Docker development mode
$env:SHELFREADY_LOCAL_RUNNER='1'
uv run --locked python -m shelfready.worker
# Terminal 3
cd web
npm ci
npm run dev
```

Open `http://127.0.0.1:18766`. Upload UTF-8 baseline and supplier CSV files,
review candidate mappings and previews, choose every required column, and
explicitly confirm same-currency replacement of both price and stock. Execution
cannot begin before confirmation. The worker gets at most three code-generation/
validation attempts. Only independently validated rows enter the disposable store;
CSV and JSON change-report downloads unlock after independent persisted readback
and successful cleanup. Partial success labels every unresolved supplier row.
Zero resolved rows or verification/cleanup failure releases no CSV.

Bounds: 16 KiB, 100 rows, 20 columns, 256 characters/cell; unique headers,
single-line cells, explicit simple-product baseline, nonnegative decimal prices
up to six places and whole nonnegative stock. Matching is exact and preserves
SKU strings. Unknown SKUs, duplicate supplier SKUs and invalid price/stock rows
remain unresolved. Unsupported baseline data fails validation. The trusted
validator computes expectations separately from generated code and rejects
omitted, extra, altered or incorrectly accounted output rows.

SQLite stores local jobs/downloads for 24 hours; expiry is reaped on requests
and worker polls. Original input data is cleared on completion/failure. A persistent
30-upload lifetime quota bounds inference usage; expiry does not reset it. One
queued/running rehearsal and one OS-locked worker are allowed. A worker restart
reaps its disposable store, labelled sandbox containers and temporary catalog
directories, and marks interrupted work failed. Do not run Phase 1 tests and the
worker concurrently, since containment cleanup tests assume no other sandboxes.

The local API has host/origin checks and is intended for loopback use. Job UUIDs
act as download capabilities; keep them private. Public deployment, authentication
and independent runner verification remain deployment work. The default execution
path requires `RUNNER_HOST` and `RUNNER_SSH_KEY_PATH`: it sends JSON over stdin
to a fixed `python3 -m shelfready.runner` SSH command, with batch mode and strict
host-key checking. Install this pinned checkout and Python 3.12 on the runner,
pre-pull the pinned image, restrict SSH/network access and keep model credentials
off that VM. That remote boundary has **not** been deployed or live-verified.
Local mode must be explicitly opted into; generated code is never a shell argument.

For a built-UI local preview, run `npm run build` in `web`, keep the API on
18765, and run `caddy run --config infra/Caddyfile` from the root instead of Vite.
Caddy serves the static build and proxies the API on localhost:18766.

Verification from the root, with no worker already running:

```powershell
uv run --locked pytest -q --basetemp=.runtime/pytest-check
uv run --locked ruff check .
git diff --check
cd web
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser test starts its own API and separate worker, uses the real Vultr key
from ignored `.env`, and rehearses synthetic fixture products through real native
import/readback before downloading partial verified output. It spends inference
tokens and writes ignored evidence under `artifacts/rehearsal/`. Unit failure
injections are explicitly synthetic and do not substitute for this live test.
If system CAs are required, use `uv --native-tls` and
`$env:NODE_OPTIONS='--use-system-ca'`; never disable certificate verification.

## Phase 1 probes

The local, ignored `architecture.md` is the owner's binding scope contract.
`AGENTS.md` and `CLAUDE.md` require coding agents to read it. Obtain it from the
owner before development. Never put credentials in source control.

## Setup

Use Python 3.12, uv, Docker Compose v2 and a running Linux Docker engine
(Docker Desktop's Linux backend works on Windows). Run from the repository root.
Use a cgroup v2 engine with Docker's default seccomp profile available.
The Docker daemon is privileged; use a dedicated development machine/runner.
No cloud provisioning is required for these probes.

```powershell
uv sync --locked
# If your network uses a trusted enterprise CA: uv --native-tls sync --locked
Copy-Item .env.example .env  # Only when .env does not already exist
```

Set only `VULTR_INFERENCE_API_KEY` in `.env` for these gates. Empty URL/model
fields use `config/inference.json`: Vultr's `/v1` endpoint and the verified
`qwen3.8-27b` model. An explicit model override is for a new feasibility probe;
revalidate and update the pin before changing the application model. Inference
uses the OpenAI-compatible SDK, OS certificate trust, certificate verification,
no automatic retries, and a 90-second request timeout. It does not use OpenAI or
NVIDIA credentials. Runner SSH fields are reserved for later deployment and are
never sent to generated code.

## Run the three gates

```powershell
docker pull python:3.12.12-slim-bookworm@sha256:593bd06efe90efa80dc4eee3948be7c0fde4134606dd40d8dd8dbcade98e669c
uv run --locked python -m shelfready.inference
uv run --locked python -m shelfready.sandbox
uv run --locked python -m pytest -q
uv run --locked python -m shelfready.store
uv run --locked ruff check .
```

The inference probe discovers the actual model inventory, checks availability and
makes one paid, bounded coding call. The second executes that response in Docker
and independently checks exact JSON values, leading-zero SKUs and decimal prices.
Model output is never run on the control host. Raw model inventory, code and API
response metadata stay in ignored `artifacts/inference/`. A failed new probe
removes stale generated code and metadata before attempting the call.

The store probe downloads WooCommerce **10.3.5**, checks its pinned SHA-256,
generates local disposable credentials in `.runtime/store.env`, and starts
digest-pinned WordPress **6.8.3**, WP-CLI **2.12.0**, and MariaDB **11.4.8**.
It publishes no ports. The runtime network is internal, so the trusted importer
cannot access external stores or the internet. The download happens on the host
before import. These are reproducibility pins, not a production security claim.

The trusted PHP adapter invokes `WC_Product_CSV_Importer`, the native importer,
to create two baseline simple products and update them by SKU. A fresh MariaDB
client independently reads persisted SKU, regular price, stock and product name
after each import. Exact comparisons detect extra products and unchanged-name
regressions. The probe resets the database, checks it contains no tables, then
removes its containers, network and both volumes even on failure. Only a complete
pass writes `artifacts/store/result.json`. Re-running starts a fresh store.
Do not run simultaneous copies; project `shelfready-feasibility` is disposable.

If interrupted outside Python's cleanup (power loss/forced termination), reap only
this project's resources:

```powershell
docker compose --project-name shelfready-feasibility --env-file .runtime/store.env -f infra/compose.yaml down --volumes --remove-orphans
docker ps -a --filter name=shelfready-sandbox-
# Remove any abandoned container by its exact reported name: docker rm -f NAME
```

## Sandbox boundary

Generated Python enters over stdin without shell interpolation or host mounts.
The container has no network, credentials or Docker socket; its image environment
is cleared before execution. It runs as UID/GID 65534 with capabilities dropped,
no-new-privileges and Docker's default seccomp profile. Root is read-only;
scratch space is an 8 MiB tmpfs and output space is a 1 MiB tmpfs. Limits are
0.5 CPU, 128 MiB memory with no extra swap, 32 PIDs, 64 descriptors, 1 MiB/file,
no core dumps, 64 KiB input code and 64 KiB combined stdout/stderr. Container
logging is disabled. Default execution timeout is five seconds, capped at thirty;
cleanup has separate bounded Docker-command timeouts and reports failures.

Only bounded stdout is released; no generated files are exported. Rehearsal
inputs arrive as a serialized JSON string over stdin, without input-file mounts;
generated code cannot modify the trusted host's validation expectations. The
fixed SSH dispatcher is implemented, but its separate Vultr VM boundary still
requires deployment and live verification. Docker shares the host kernel and
does not provide absolute isolation. The observed execution evidence is local.

`pytest` includes live Docker containment tests and requires the pinned Python
image. `pytest -m "not live"` runs only host validation tests; that is insufficient
for a GO verdict. No test replaces an external integration with simulated success.

References: [Vultr API](https://api.vultrinference.com/docs/reference),
[WooCommerce native CSV importer](https://woocommerce.com/document/product-csv-importer-exporter/).

See [recorded Phase 1 evidence](docs/feasibility.md) for actual measured results
and the GO/NO-GO decision.
