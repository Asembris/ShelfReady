# Phase 3 verification and competitive proof

**Verdict: NARROW.** The local rehearsal/verification workflow is demonstrated.
The hypothesis that generated transformations add competitive value over a
competent deterministic mapping-and-staging pipeline is **not supported**.
Do not claim agent necessity, unfamiliar-schema intelligence or labor/ROI gains.

## Final measured results

Final full run: `20261104-000732-2be46521`, source
`5b7d0dbe6a9e713de48e3b8c8227f529a595ca2a`, completed on November 4, 2026
(Europe/Paris). Raw `results.json` SHA-256:
`f3260e111f55bce125439ca260e938c847e1e5ff0b2ba45a290aae4183d917d7`.
Generated results stay ignored; the committed fixtures, harness and protocol
reproduce the experiment with a Vultr key and the pinned local Docker assets.

| Measure across all eight cases | Deterministic | ShelfReady |
| --- | ---: | ---: |
| Verified eligible row operations | 7/7 | 7/7 |
| Actual changed operations / no-ops | 6 / 1 | 6 / 1 |
| Resolved / all accepted-schema supplier rows | 7/17 (41.2%) | 7/17 (41.2%) |
| Unresolved rows | 10 | 10 |
| Complete or partial staged cases | 5 | 5 |
| Correct input rejections / all-unresolved cases | 2 / 1 | 2 / 1 |
| Failed case executions | 0 | 0 |
| Incorrect accepted changes | 0 | 0 |
| Incorrect candidate rows / rejected candidates in final run | 0 / 0 | 0 / 0 |
| Transformation time | <0.001 s | 13.329 s |
| Total case execution, including native staging and cleanup | 156.189 s | 165.289 s |
| Model attempts / tokens | 0 / 0 | 5 / 3,989 |

The two rejected batches are excluded from the 17 parsed accepted-schema rows;
they are reported as rejected batches rather than silently counted as useful
completion. The seven operations repeat a three-product catalog across cases;
they are not seven distinct customer products. The no-op is explicitly labelled.
No dollar-cost estimate is made from tokens alone.

| Frozen case | Verified rows, both arms | Unresolved, both arms | Deterministic s | ShelfReady s |
| --- | ---: | ---: | ---: | ---: |
| conventional | 2 | 0 | 34.935 | 35.282 |
| unfamiliar_schema | 2 | 0 | 28.233 | 33.007 |
| duplicates_unknown | 1 | 4 | 31.861 | 31.712 |
| ambiguous_intent | rejected | — | <0.001 | <0.001 |
| malformed_quote | rejected | — | <0.001 | <0.001 |
| unsupported_formats | 1 (no-op) | 2 | 31.337 | 30.640 |
| unsafe_content | 1 | 2 | 29.822 | 34.648 |
| all_unresolved | 0 | 2 | <0.001 | <0.001 |

All three controls were rejected. The deliberate wrong native price control
took 28.741 seconds; control time is outside both arm totals. No CSV was released
for that wrong import. Its incorrect write must not be confused with a zero
count of incorrect *accepted* changes in the paired cases.

Live final-run request IDs and total tokens:

- `chatcmpl-f8355377-7652-4c79-a88b-1286f92a1d61`: 755
- `chatcmpl-b54ca87b-09e3-43a9-8bab-21775f073a00`: 827
- `chatcmpl-6be5280f-3f64-4454-9ed7-4442eaf64c90`: 827
- `chatcmpl-6b916cd5-e9fc-4d4b-bc06-51dd93210ce3`: 753
- `chatcmpl-48ec6dc5-117e-4159-bcbe-0990d3f564c8`: 827

The final run had no rejected generated candidates, while the earlier complete
run needed one repair. Both runs tie on completion and accepted correctness.
This variability is retained, not erased by reporting only the cleaner run.

## Agent necessity conclusion

There is no measured incremental useful completion or correctness, including
for unfamiliar vendor headers. The current architecture requires confirmed
mappings before execution, and the trusted validator already computes exact
expected results. Generated code reproduces that deterministic operation inside
an extra inference/sandbox loop. It used additional tokens and transformation
time without expanding supported intent or resolution. Native-store startup
jitter prevents treating the 9.101-second total difference as a precise causal
or statistically significant speed estimate; model overhead and token usage
were observed directly.

Narrow the supported claim to safe local rehearsal of the explicitly supported
small-catalog updates. The evidence does not establish a unique competitive
advantage even for staging, because the comparator includes the same staging.
It is a **NO-GO for an agent-necessity/competitive-superiority claim** on this MVP.
The application still uses Vultr as required; the evaluation comparator does not
silently replace or change that architecture. Any scope change needs the owner.

## Scope and method

Work began from clean, fast-forwarded `main` at `68c4a9f`, with Phase 2 commit
`8dfd64c` verified as an ancestor. The holdout corpus and protocol were committed
as `4c89873` before Phase 3 correctness changes or evaluation calls. Corpus SHA-256
(LF-normalized): `c024fb8a010d44af0a7fdec35283da2a956eed25cf439d5105562674c023d403`.

The eight cases are developer-authored, realistic **synthetic** holdouts, not
independent customer catalogs or a blinded experiment. They include a conventional
schema, unfamiliar vendor headers, conflicting duplicate/unknown SKUs, ambiguous
price intent, malformed quoting, unsupported price formats, unsafe identity/text,
and an entirely unresolved batch. Neither gold outputs nor cases were modified.

Both arms receive identical raw CSVs and identical explicit mapping/intent
confirmation. Human mapping time is excluded. The deterministic comparator uses
string-preserving CSV parsing, exact SKU joining, full case-insensitive duplicate
detection, decimal-safe checks and complete unresolved accounting. It uses no
model and is not handicapped by unfamiliar header names. Both arms pass the same
frozen gold oracle, native WooCommerce staging and independent persisted-state
verifier. Arm order alternates by case. Each successful arm/case gets a fresh
store with the pinned Phase 1 images/plugin; cleanup is included in wall time.

ShelfReady uses the existing pinned Vultr model, its bounded three-attempt loop
and real restricted Docker execution. No new mapping agent or schema inference
feature was added. The current model sees a canonical transformation contract;
raw schema choices have already been resolved by the user. Ignored notes are not
sent to the model. Therefore this experiment does not establish arbitrary prompt
injection resistance or autonomous schema understanding.

## Correctness boundary

Independent SQL now returns JSON snapshots for **all** products/variations,
including products with missing metadata. This closes the earlier inner-join
blind spot. The verifier checks product count, unique exact SKU strings, staged
IDs as strings, finite Decimal regular/active prices, stock and stock status.
Every update preserves these baseline-persisted fields: ID, parent, name, slug,
publication status, description, short description, simple-product type,
sale-price metadata and stock-management mode. Unupdated products also retain
their price and stock. Returned native importer counts must match input counts.

These are identities **within the disposable store**. Production/source product
IDs are not imported or claimed equivalent. Only supported mapped input columns
are seeded; unsupported WooCommerce columns are not covered. Some protected
metadata starts with native defaults; nonempty descriptions are mutation-tested
synthetically, not claimed as supported CSV input. A separate real native test
checks UTF-8 names with commas/quotes, leading-zero SKUs, six-decimal prices,
unchanged IDs and an entirely unchanged product.

Resolved and unresolved row IDs must partition every supplier row exactly once.
Case-colliding identities and invisible controls are rejected or unresolved,
never guessed. Verification, timeout, model, exhausted-repair and cleanup errors
release no verified CSV. A cleanup failure after otherwise successful native
import is specifically regression-tested with synthetic dependencies.

## Run retention and deviations

All raw runs remain ignored under `artifacts/evaluation/`:

1. `20261103-235703-8a186b0f`: interrupted diagnostic run. It exposed a real
   readiness race: WP-CLI could report the version before `wp-config.php` existed.
   The deterministic arm failed setup while the other arm succeeded. This is not
   an agent advantage. The process was stopped, partial results retained, and its
   disposable resources explicitly reaped. Readiness now waits for configuration
   and has an explicit exhaustion failure.
2. `20261103-235943-fd0f5a74`: first complete paired pass after that fix. Both arms
   verified 7/7 eligible rows (six changed, one no-op), with ten unresolved rows,
   two correct input rejections, one all-unresolved case and zero incorrect
   accepted changes. Deterministic total: 164.245 seconds, transform <0.001 seconds.
   ShelfReady total: 169.810 seconds, transform 16.720 seconds, six model attempts,
   4,694 tokens and one rejected candidate before repair. All three controls passed.
   Incorrect candidate **row** counts were not retained in that early instrumented
   pass and are explicitly unavailable, rather than inferred from a rejection.
3. `20261104-000732-2be46521`: final full paired rerun from stable source `5b7d0db`,
   after explicit UTF-8 subprocess decoding and complete candidate stdout/source
   revision retention were committed. The model prompt, baseline and frozen cases
   were not tuned between the complete passes. The final run is used regardless
   of whether its outcome is better or worse; no best-of-run selection is allowed.

The final summary independently recalculates accepted-state errors against frozen
gold and refuses incomplete or selected-case runs. Incorrect candidate rows count
misaligned, different, missing or extra output positions before trusted validation;
they are distinct from incorrect accepted changes. Timing is machine execution,
not agency labor saved. Native startup variance can exceed the observed paired
difference; these small samples establish no statistical significance or ROI.

## Negative controls and claim limits

Two deliberate pre-import controls corrupt a price and omit a resolved row;
trusted validation must reject both. A third control actually imports a wrong
price into native WooCommerce and compares persisted values to the correct
expected update. Independent readback must reject it and cleanup must still run.
This intentional incorrect database write is a **control**, not a spontaneous
model error or a released export. Provider outages, forged success messages,
cleanup failures and readback mutations in unit tests are explicitly synthetic.

This is local Docker evidence with real Vultr Serverless Inference, not a Vultr
application deployment or a live remote SSH runner verification. No paid cloud
resources were provisioned. Docker shares the host kernel. The public deployment,
remote isolation boundary and multi-user authorization remain unverified.

## Final checks

- Full Python suite: **83 passed in 82.09 seconds**, no skips; one upstream
  Starlette TestClient/AnyIO deprecation warning.
- Real browser upload/confirmation/Vultr/sandbox/native-import/readback/download
  regression: **1 passed in 50.5 seconds** (41.9 seconds in the test body).
- Ruff, TypeScript checking/Vite production build and `git diff --check`: passed.
- Locked frontend npm audit: zero reported vulnerabilities.
- No UI redesign, production access, cloud deployment or paid provisioning.

Reproduce with the README commands; the paired evaluation requires the real
Vultr key and local pinned Docker setup. A third party without those credentials
can run synthetic tests but cannot reproduce live inference evidence offline.
