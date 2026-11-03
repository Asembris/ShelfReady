# Phase 2 rehearsal evidence and boundaries

The branch starts from updated `main` at `0e10427`; Phase 1 commit `e140905`
was verified as an ancestor before creating `feat/rehearsal`. No history was rewritten.

## Observed local end-to-end journey

On 2026-11-03, the Playwright browser test exercised the React page, loopback
FastAPI service and separate OS-locked Python worker. It uploaded the synthetic
baseline fixture and three supplier rows, reviewed mappings, verified that
execution was disabled before consent, and explicitly confirmed replacement.
No API, model, Docker or WooCommerce integration was mocked in that test.

Real Vultr `qwen3.8-27b` response
`chatcmpl-e7d72b32-1f86-4880-a183-9731c5e79d5c` supplied the transformation
function. The successful job used one attempt and 711 total tokens (294 prompt,
417 completion). Its code executed in the restricted container, and trusted
validation checked the complete output against separately computed expectations.

Native WooCommerce import and independent SQL readback verified:

| SKU | Before price | After price | Before stock | After stock |
| --- | --- | --- | --- | --- |
| `00017` | `12.30` | `13.5500` | 4 | 7 |
| `A-2` | `0.10` | `1.35` | 0 | 2 |

Both baseline product names were preserved. Supplier row 3, SKU `UNKNOWN`, was
explicitly unresolved because it was absent from the baseline. The result was
labelled **partial**: three input rows = two resolved + one unresolved. Only
the two verified updates appeared in the downloaded CSV. The browser downloaded
the JSON change report as well. Store containers and volumes were removed.

The first successful browser run passed in 54.9 seconds (43.6 seconds in the
test body). The final user-facing summary-table run passed in **42.4 seconds**
(37.4 seconds in the test body). Raw local downloads and screenshot are ignored files under
`artifacts/rehearsal/`; later verification runs may replace these artifacts.

## Checks

The final Python suite passed **40 tests in 45.03 seconds**, including the
Phase 1 live sandbox and native importer gates. The suite covers upload bounds,
confirmation, origin checks, persistent quota/expiry, single-active-job rules,
strict SKU/decimal/row accounting, zero-resolved failure, exhausted repairs,
store failure without CSV release, and the existing optimized-mode store checks.
It also regresses the generated-function invocation contract in real Docker
with a clearly synthetic model response, and rejects implicit local execution
when the SSH runner is unconfigured.
Failure-injection tests are synthetic and are separate from live verification.
One dependency warning remains: Starlette TestClient uses an AnyIO alias that
AnyIO has deprecated. Ruff and `git diff --check` passed. TypeScript checking
and Vite production build passed; the patched Vite pin had zero npm audit findings.

Initial live runs failed closed when reasoning exhausted the completion budget
and when generated code defined but did not invoke a function. The coding request
now explicitly disables reasoning and requests `transform(INPUT_JSON)`, invoked
and JSON-serialized by a trusted wrapper inside the sandbox. Independent validators
were not relaxed. Rejected attempts are recorded and cannot release downloads.

## GO for Phase 3

The complete local rehearsal vertical slice is demonstrated against real Vultr
inference and native WooCommerce. Continue with Phase 3's stronger held-out
verification and failure coverage. No paid cloud resources were provisioned.

This is **not** evidence of a Vultr application deployment or a live remote
SSH runner. The dispatcher is implemented with fixed-command stdin transport,
strict host-key checks and no shell interpolation, but needs independent remote
verification on a separate approved Vultr runner. Browser evidence explicitly
opts into local Docker. Caddy's built-UI configuration is supplied; the observed
browser journey uses the Vite development proxy. Public hosting/authentication
are not claimed.

Other limits are deliberate: CSV only; small catalogs; simple existing products;
confirmed replacement of both price and stock in the same currency; exact SKU
matching; six decimal places; whole nonnegative stock. The local service permits
one active job, expires records after 24 hours and enforces a 30-upload lifetime
quota. Downloads are capability URLs on loopback, not a multi-user authorization
system. Restart reaping requires a reachable Docker/runner service; cleanup
failures stop the worker or fail the job instead of claiming success. Docker
shares the host kernel and does not provide absolute isolation.

Only mapped SKU, name, simple-product type, regular price and stock are seeded
into the disposable baseline; other WooCommerce CSV columns are not rehearsed.
Phase 3 still needs broader unchanged-field and adversarial native-import checks.
