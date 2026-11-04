# Supplier Adapter Forge — bounded feasibility spike

**Verdict: NO-GO. Do not build Supplier Adapter Forge for this hackathon;
proceed directly to Phase 7 when authorized.** No Phase 7 work started here.
The stronger deterministic parser handled the authored case and drift. Neither
model approach produced a reference-validated adapter, so the stateful agent
demonstrated no incremental completion, repair or reusable-adapter advantage.

## Scope and provenance

Started from clean, fast-forward-only synchronized `origin/main` at `a421863`,
on `feat/adapter-forge-spike`. Architecture, existing sandbox/inference code and
Phase 4/6 limitations were inspected. Only `experiments/adapter_forge/` and this
document change. No production workflow, validator, prior experiment, frozen
benchmark, UI, public endpoint, VM or deployment was modified.

This was one focused session within the 4–5-hour maximum, stopped after one
frozen comparison decided the gate. Input/reference freeze: `f9b4f3c`, November
4, 2026 18:27 Europe/Paris. Implementation before inference: `1b87cfc`.
No post-result prompt tuning, fixture edits, extra model runs or threshold changes.

The CSV is **developer-authored synthetic data**, not an independent supplier
file. A quick public search returned fictional templates and customer-feed
descriptions, not a suitable independently obtained messy CSV/reference set.
For example, [Puckator describes CSV customer feeds](https://www.puckator-wholesale.eu/customer-product-feed);
we did not obtain or use its customer data. This was not a comprehensive source
survey. Authorship and known parser coverage materially weaken external validity.

The plausible wholesale export includes title/date records, section currency/unit
metadata, pack sizes, repeated headers, conflicting warehouse duplicates, an
unspecified unit and a distant quality-release note. There are six physical
product rows, two authorized EUR/each updates and four business/identity holds.
The replay changes prices/stock without changing structure; drift swaps the
price/stock columns together with their headers; the currency negative changes
one section to USD. No arithmetic, pack conversion, fuzzy SKU matching, variants,
XLSX or PDF support was added.

All four inputs and reference answers were frozen before inference. Their
LF-normalized hashes are in `experiments/adapter_forge/fixtures/sha256.json`.
The full predeclared gate is in `experiments/adapter_forge/protocol.md`.

## Prototype and safety boundary

`forge.py` is an isolated executable research harness. The raw file and explicit
operator business rules go to the pinned Vultr `qwen3.8-27b` model. Both model
arms receive identical initial messages/settings, including complete raw data
and known SKUs, but **never reference row/column mappings or expected answers**.
They generate a deterministic `adapt(raw, known_skus)` function. Generated code
executes only inside the existing sandbox: non-root, network none, read-only
root, no host mounts/socket/secrets, existing CPU/memory/PID/time/output bounds.
No generated Python is imported, evaluated or executed on the host.

External trusted validation checks exact physical source record coverage,
including ignored blank/context/header records; exact product identities;
source value and 1-based citation equality; Decimal/integer syntax; duplicate
holds; frozen business holds; and the explicit frozen operator authorization.
Only a fully accepted batch may release rows. Partial rejected batches count
zero verified rows. Citations establish source provenance, **not business meaning**.
The reference annotations are a research oracle, not a deployable general
semantic validator. The scripted operator approves the two known safe rows;
`--authorize-frozen-operator-decisions` makes this explicit. There is no human
usability study or autonomous authorization claim.

Stateful generation retains previous code and conversation, receives structured
error codes/runtime feedback, and allows at most **eight steps per base/drift
phase**. One step is one generation followed by sandbox execution/validation.
Single-shot gets one generation per phase. Both can attempt drift even if base
failed. Drift context gives previous successful code to both; the stateful arm
also retains history by design. Feedback never supplies gold values or mappings.

The durable ledger reserves a request before dispatch; failures count toward the
24-request cap. SDK retries remain disabled. An exclusive lock guards the ledger,
and restart is refused when a ledger already exists. Do not delete/reset it to
get more calls. Code/structural hashes guard saved adapters. Structural/context
changes refuse replay before execution; successful replay still must pass the
external validator. This conservative fingerprint is not a semantic drift oracle.

## Side-by-side live results

Single frozen run: `artifacts/adapter-forge/20261104-183134-0d40c347/results.json`.
SHA-256: `640e3a7932888a8d6e5bcc6ff153e327eee5dd5f42987bfa00faff1f7cdf7d84`.

| Measure | Existing rectangular parser | Strong section-aware parser | Single-shot model | Stateful agent |
|---|---|---|---|---|
| Base verified rows | 0: irregular input rejected | 2 | 0 | 0 |
| Base holds/unreleased | 6 unreleased | 4 business/identity holds | 6 unreleased | 6 unreleased |
| Drift verified rows | unsupported | 2 | 0 | 0 |
| Incorrect accepted changes | 0 | 0 | 0: all rejected | 0: all rejected |
| Base/drift requests | 0 | 0 | 1 / 1 | 8 / 8 |
| Successful repairs | N/A | not needed | 0 | 0 |
| Learned adapter replay | N/A | not learned | unavailable | unavailable |
| Base + drift wall time | not measured | below timer resolution | 9.750 s | 58.000 s |

The stronger comparator is a generic section/header/notes state machine with
common SKU/price/stock aliases, a full-file note pass, known-SKU checks and a
case-insensitive full-file duplicate counting. It contains no row-number/SKU lookups or
reference imports. It receives the same raw data and business rules. It also
passed the numeric replay input (two rows) and USD negative (zero ready rows,
all six held). Its parser-only validation timings were recorded as 0.000 seconds
on base/replay/drift and 0.016 seconds on currency; zero reflects timer resolution,
not zero work. It runs trusted code on the host, whereas model totals include
inference and Docker overhead. These are not statistically meaningful speed ratios.
The whole comparison took 67.813 seconds, excluding development/tests.

Single-shot base failed `source_value_or_citation`: its emitted citations used
zero-based column positions. Single-shot drift failed `missing_reason`.
All eight stateful base and eight drift steps failed `missing_reason`: generated
programs left ready-row reasons empty, while validation required nonempty bounded
reasons. The feedback did not successfully correct that. This metadata mismatch
can mask deeper extraction/policy errors; it is **not evidence that all parsed
values were wrong**. The prompt specified a string reason but did not explicitly
state the validator's nonempty requirement, a methodological limitation. We did
not relax that requirement or tune the prompt after observing failures. Static
inspection also found first-occurrence duplicate handling that would require
further verification; no counterfactual corrected run was scored.

No model adapter passed, so no model adapter was saved/replayed and no model
drift detection/repair success is claimed. This fails the replay BUILD condition,
independently of the stronger parser's complete coverage. The single authored
case is not enough to conclude that feedback agents can never help real suppliers.

## Requests, tokens and costs

All **18 requests** returned with usage: 2 single-shot, 16 stateful. No further
experimental inference was performed. Six requests remain below the cap, but
the gate is decided; they are not an invitation to retry for a win.

| Arm | Prompt tokens | Completion tokens | Total tokens |
|---|---:|---:|---:|
| Single-shot | 1,233 | 2,153 | 3,386 |
| Stateful | 159,023 | 17,436 | 176,459 |
| Total | 160,256 | 19,589 | 179,845 |

Stateful usage includes 131,456 reported cached prompt tokens. Retaining repeated
adapter code/history increases context usage substantially. Cached and uncached
tokens need not have the same billing treatment. **Inference USD cost is unknown**:
no attributable invoice/rate was obtained. Do not convert these totals into a
fabricated dollar cost or call subscription usage free. Existing VM billing and
the November 7 12:42 UTC / 13:42 Paris review deadline are unchanged; no VM
operation or new infrastructure was part of this spike.

Every request ID, usage/finish reason, full prompt history, generated source,
structured feedback and failed attempt is retained in the ignored request ledger
and run directories. The ledger lives at
`artifacts/adapter-forge/request-ledger.json`; no credentials are retained there.
No earlier benchmark results or evidence were altered.

## Executable reproduction and checks

Use the existing local Python/Docker setup and pinned sandbox image. No cloud
runner, frontend or native WooCommerce staging is involved in this parsing spike.
Do not run another sandbox reaper, worker or experiment concurrently.

```powershell
# Offline/unit tests plus one trusted real-sandbox replay mechanism regression:
.venv/Scripts/python.exe -m pytest -q experiments/adapter_forge/test_forge.py --basetemp=.runtime/pytest-forge
.venv/Scripts/ruff.exe check .
.venv/Scripts/python.exe -m shelfready.credential_scan
git diff --check
# Live reproduction ONLY with a separately authorized fresh experiment workspace/budget:
.venv/Scripts/python.exe -m experiments.adapter_forge.forge --run --authorize-frozen-operator-decisions
```

The live command refuses to restart over an existing ledger. This session's
budget must not be reset. Unit tests use temporary synthetic ledgers/clients;
they do not spend inference requests. A trusted comparator-source adapter is
saved and replayed in the **real local sandbox** by a regression test with the
inference client forbidden. It verifies the replay mechanism only; it is clearly
separate from successful LLM adapter discovery, which did not occur.

Negative tests cover altered values/citations, omitted records, duplicate
override, ambiguous-unit release and absent authorization. Replay tests check
structural/currency drift is refused before execution. Synthetic feedback tests
verify retained code/context, one-shot versus eight-step limits and the 24-call
cap. They are not substituted for successful live repairs.

Final checks: **132 passed in 98.65 seconds**, including 15 isolated prototype
tests and the real trusted replay regression. One upstream Starlette/AnyIO
deprecation warning. Ruff, TypeScript/Vite production build, whitespace and the
tracked-file known-secret/private-key scan passed. The credential scan is not
an exhaustive security audit. Prior Phase 3/4/6 raw result hashes were checked
unchanged. No further inference was used for tests or documentation.

## Recommendation

**Proceed directly to Phase 7; do not build Supplier Adapter Forge now.**
The strong parser already solves this case and drift, neither model arm produces
an accepted adapter, and inference-free replay of an LLM-discovered adapter is
unproven. The BUILD gate is not met. An honest focused public implementation
estimate is therefore not justified. More independent supplier data and stronger
feedback diagnostics would be research prerequisites, not work to add during
this hackathon spike. Stop here rather than using the remaining requests to
manufacture a win.
