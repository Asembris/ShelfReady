# ShelfReady
Rehearse supplier catalog updates in a disposable WooCommerce store before they touch production.

This branch implements Phase 1 feasibility only. Synthetic fixture products are
used in **real** Vultr, Docker and native WooCommerce probes. There is no UI,
production-store integration, deployed service, or application agent loop yet.

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

Only bounded stdout is released in this feasibility probe; no generated files
are exported. Phase 2 must add immutable per-job inputs, safe file validation,
the fixed SSH dispatcher on a separate Vultr runner VM, durable reaping and
quotas before exposing untrusted uploads. Docker shares the host kernel and
does not provide absolute isolation. These probes validate local Docker
feasibility, not the future deployment boundary.

`pytest` includes live Docker containment tests and requires the pinned Python
image. `pytest -m "not live"` runs only host validation tests; that is insufficient
for a GO verdict. No test replaces an external integration with simulated success.

References: [Vultr API](https://api.vultrinference.com/docs/reference),
[WooCommerce native CSV importer](https://woocommerce.com/document/product-csv-importer-exporter/).

See [recorded Phase 1 evidence](docs/feasibility.md) for actual measured results
and the GO/NO-GO decision.
