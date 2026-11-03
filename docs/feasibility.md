# Phase 1 feasibility evidence

Verified on 2026-11-03 using Python 3.12.12 and Docker Desktop 4.56.0,
Linux Docker Engine 29.1.3 on Windows. These are local development results;
no Vultr application/runner VM has been deployed.

## Vultr: PASS

Authenticated discovery returned 36 models. The pinned model is
`qwen3.8-27b`, selected because its real generated Python passed the fixed
CSV/SKU/Decimal coding probe. This establishes suitability for this feasibility
case, not broad transformation accuracy or a model benchmark.

Final request: `chatcmpl-53d1590c-264e-4768-b855-ffbbc4b93da2`.
Requested and served model: `qwen3.8-27b`; finish reason: `stop`.
Usage: 163 prompt tokens, 472 completion tokens, 635 total tokens.
Execution in the restricted container independently produced:

```json
[
  {"sku": "00017", "price": "13.55", "stock": "4"},
  {"sku": "A-2", "price": "1.35", "stock": "0"}
]
```

Raw response metadata, model inventory and generated code are local, ignored
artifacts under `artifacts/inference/`. No keys are included in this document.

## WooCommerce: PASS

Native `WC_Product_CSV_Importer` created product IDs 10 and 11, then updated
those same IDs. Both operations returned empty failed/skipped arrays.
Independent SQL readback, from separate database-client processes:

| SKU | Baseline price | Updated price | Baseline stock | Updated stock | Preserved name |
| --- | --- | --- | --- | --- | --- |
| `00017` | `12.30` | `13.55` | 4 | 7 | Leading zero product |
| `A-2` | `0.10` | `1.35` | 0 | 2 | Decimal product |

Database reset was independently verified by an empty `SHOW TABLES` result.
Compose cleanup succeeded and the project volume listing was empty. The live
pytest run repeated this complete gate successfully. The full local report is
`artifacts/store/result.json`; synthetic input fixtures are committed explicitly.

## Sandbox and checks: PASS

Final complete suite: **8 passed in 37.59 seconds**, no skips or warnings.
Ruff and `git diff --check` passed. The final pinned inference/sandbox probe was
also rerun successfully after hardening the probe's stale-artifact handling.

The suite exercises normal output, nonzero exit, timeout and container cleanup,
output flooding, attempted excessive allocation, and thirteen containment
assertions. Kernel cgroup values confirm 0.5 CPU, 128 MiB memory and 32 PIDs;
behavioral probes confirm PID exhaustion, bounded writable disk and denied
external connectivity. It also checks non-root identity, no credentials/socket/
host mount, no-new-privileges, zero effective capabilities and read-only root.

Initial tests exposed an output-flood cleanup deadlock and image-inherited
environment data. Both were fixed and the complete suite passed afterward.
The environment's certificate configuration initially blocked Python requests;
using verified OS certificate trust resolved it without disabling TLS checks.

## Decision

**GO for Phase 2.** All three roadmap feasibility conditions have been observed
against real services/runtimes. There are no remaining feasibility blockers.
The repository contains probes rather than a complete application. The later
upload-to-download path still needs safe file release, immutable inputs, bounded
repair attempts, durable quotas/reaping and the separate Vultr runner/SSH
boundary required by the architecture contract. Docker shares the host kernel;
these results do not establish absolute isolation or production readiness.
