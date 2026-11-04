# Phase 6 — Catalog Rescue

**NO-GO for incremental agent value. NARROW for the local operator-reviewed
rescue workflow/manual fallback.** The frozen agent review failed closed before
execution, so mandatory completion parity was not met. A stronger deterministic
reviewer already covered the scenario's actionable risks without correction.
Do not present the manual fallback as an agent-review victory.

The **verified deterministic reviewer/manual fallback is now the default CLI
experience**. Model advice requires explicit `--experimental-agent-review` and
is labelled experimental in the terminal and saved review notes. The existing
`--baseline-review` flag remains a compatibility alias for the default. This
changes review selection only: the separately confirmed `execute` command still
uses Vultr-generated transformations with the existing trusted verification gates.

## Scope and freeze

Started from clean main `8d99994`, fast-forwarded from origin, on
`feat/catalog-rescue`. Read the architecture and Phase 3/4 evaluations before
implementation. One focused session, one paired scored pass, no prompt/comparator
tuning after scoring. Cases and criteria were committed as `cca4f6c` before
implementation or model calls. LF-normalized case SHA-256:
`5f600d4257a71fb015cb7c2ddc726decc03c7269490d39ac5f04996bea46df71`.
This developer-authored synthetic case is neither blinded nor customer evidence.

The operator receives eight supplier rows: alternative retail/offer price
columns; a suspicious 90% price cut and 9999-stock jump; conflicting duplicate
warehouse rows; returns and reserved-stock caveats; an unknown SKU; and a genuine
buyer-approved promotion. Only the routine bracket update and explicitly
acknowledged promotion should be released. No duplicate merging, quantity
arithmetic, new products, currency/tax conversion or row editing is supported.

## Operator workflow and security boundary

This is a **local CLI workflow**, not a new web/API/public input surface. It uses
the existing canonical WooCommerce baseline columns and explicit EUR/dot-decimal/
individual-unit intent only. Human review is mandatory for both arms.

Review outputs `review.json`, a readable `review.txt`, exact source-cell quotes,
uncertainties/questions, an input snapshot and a non-authorizing decision draft.
The operator must fill source-column names, approve exact row IDs, set explicit
consent, and give a bounded acknowledgement for each warned approved row. Model
advice can add review requirements but cannot remove the trusted risk floor.
Exact citation validation proves source provenance, not semantic truth.

Trusted code rejects duplicate, unknown and invalid rows even when someone tries
to approve them. It checks price/stock deltas and supplier caveats independently
of model advice. Unapproved rows remain explicitly unresolved. Every source row
must appear once in the approved/unresolved partition. Changed input after
review requires a new review. Execution requires a separate command and explicit
local-Docker opt-in; review never executes code.

Both arms transform the full supplier table in the existing isolated sandbox;
the complete candidate output must match trusted deterministic expectations.
Only then does trusted code filter operator-approved row IDs and validate again.
Fresh native WooCommerce imports and independent SQL verify all baseline products,
exact SKU strings, Decimal prices, stock, IDs and supported unchanged fields.
Verified CSV/report are written only after cleanup succeeds. No validator or
existing sandbox limit was weakened; generated code cannot change decisions or
verification expectations. The agent retains the existing three-attempt cap.

## Strong comparator and measured result

The comparator combines existing fuzzy/multilingual/sample-based mapping and
literal intent hints with conservative price-column abstention. It screens all
competing price columns, case-insensitive duplicate identities, unknown SKUs,
Decimal price deltas >=50%, stock >10x baseline, and broad note/caveat terms.
There are no case-specific SKU or row-number lookups. It sees the same complete
CSV and intent, has the same confirmation opportunities, and uses the same floor,
sandbox, native staging and SQL validators. Gold decisions never enter the LLM.

Primary run: `artifacts/rescue/20261104-172036-d1b04186/results.json`, source
`5eb807bf306c3417e11ee396af8340e2a35663c7`. SHA-256:
`336741f9c507ddb4463123f808d0af1a7937dd1ce9e43b36fdc22ebe5fdf3e9a`.

| Measure | Strong deterministic reviewer | Agent reviewer |
|---|---:|---:|
| Verified approved updates | 2 | 0 |
| Incorrect accepted changes | 0 | 0 (nothing released) |
| Unresolved/unreleased input rows | 6 operator/identity holds | 8 technically unreleased |
| Advisory mapping corrections | 0 | unavailable: no retained valid proposal |
| Advisory risk corrections | 0 | unavailable |
| Required mapping answer | 1 | not reached |
| Mandatory mapping review / risk acknowledgements | 1 / 1 | not reached; not a saving |
| Review elapsed | 0.016 s | failed within 4.171 s |
| Total elapsed | 70.391 s | 4.171 s; no staging |
| Inference usage | 0 | unavailable for failed review |

The deterministic reviewer flagged all seven frozen risk rows and required no
correction. Its native SQL verified both gold updates, with six rows unresolved.
The agent review path raised `ValueError` before its proposal/evidence was stored.
The initial failure handler retained neither exact cause nor response/request ID
or usage. These are **missing**, not zero, and the run does not establish why the
review failed. Do not attribute it to an invented model response or provider
outage. Failure evidence retention is now fixed for future runs, without rerunning
or editing this primary result. The raw summary's numeric correction-gain default
of zero is not an observed agent correction score; the agent score is unavailable.
Completion parity is false regardless, so the mandatory GO gate fails.

**Protocol limitation: the frozen GO threshold was mathematically unattainable
on this case once the deterministic baseline achieved zero corrections.**
Correction counts are nonnegative. With baseline corrections B = 0 and agent
corrections A >= 0, the required improvement B - A >= 2 cannot hold: B - A <= 0.
Even a perfect agent could only tie zero corrections. This is a weakness of the
case/acceptance design, not evidence of intrinsic agent inferiority. The agent's
separate completion-parity failure remains an observed limitation. The frozen
protocol, original results and evidence are unchanged; no retrospective threshold
or rescore is substituted. There is still no demonstrated agent superiority.

The reviewer in this evaluation is a frozen scripted oracle, not a person.
Extra model warnings would count as corrections and be removed by that oracle
identically before downstream execution; missing warnings remain enforced by
the trusted floor. No actual typing/review time, cognitive benefit or human
correction burden was measured. The baseline's generic questions can be improved,
but we did not deliberately degrade its information or permissions.

A local pytest run was initially launched while evaluation was still running;
it was stopped to avoid interference with shared Docker projects, then repeated
serially. Both SQL-verified baseline outcomes are retained, but resource contention
may contaminate its timing. Do not use these timings as a throughput or speed
comparison. No best-of repeated scoring was performed.

## Separate real manual-fallback verification

After scoring, a **separately labelled manual-review fallback** used deterministic
grounded advice and the same explicit operator decisions, followed by real Vultr
code generation. This was not another agent-review score and does not rescue
completion parity. Evidence: `artifacts/rescue/manual-fallback-20261104/`.
Request `chatcmpl-97cd0362-a644-4bcd-b2de-4959f4a2c86d`, model `qwen3.8-27b`, one
attempt, 298 prompt + 492 completion = **790 tokens**. USD cost remains unknown.

The isolated local transformation matched all independently computed candidates;
trusted filtering released only source rows 1 and 7. Native import and independent
SQL verified `00017 / 13.5500 / 7` and `KEEP-5 / 20.00 / 0`, with unchanged products
and supported metadata preserved. CSV retained decimal scale and leading zeros.
Six rows remained unresolved. Full before/after SQL is in `readback.json` and
the operator decision trail is in `report.json`. This is real local Docker/
WooCommerce evidence with Vultr inference, not Phase 6 cloud deployment.

## Reproduce the demonstration

Use the existing local setup, pinned images/plugin and ignored inference key.
Do not run tests, evaluations, another worker or rehearsals concurrently.

```powershell
# Verified deterministic reviewer / manual fallback (default; no review inference):
.venv/Scripts/python.exe -m shelfready.rescue review evaluation/rescue/case.json artifacts/rescue/my-review
# Backward-compatible explicit alias for the same verified reviewer (new directory):
.venv/Scripts/python.exe -m shelfready.rescue review evaluation/rescue/case.json artifacts/rescue/my-fallback --baseline-review
# Experimental model advice; may fail closed. No transformation/import runs here:
.venv/Scripts/python.exe -m shelfready.rescue review evaluation/rescue/case.json artifacts/rescue/my-experiment --experimental-agent-review
```

Read `review.txt`, inspect the actual CSV, and copy/edit `decisions.example.json`
into your own decisions file. The draft has `confirm:false`, no approvals and
no inferred price column. For this authored demo, the frozen `decisions` object
inside `evaluation/rescue/case.json` documents the scripted operator reply:
choose Offer EUR, approve rows 1 and 7, and acknowledge row 7's promotion.
Do not describe copying that oracle as a human usability test.

```powershell
.venv/Scripts/python.exe -m shelfready.rescue execute evaluation/rescue/case.json artifacts/rescue/my-fallback --decisions artifacts/rescue/my-decisions.json --local-docker
# Reproduce the frozen paired experiment only as a NEW run, preserving old evidence:
.venv/Scripts/python.exe -m shelfready.rescue_evaluate
.venv/Scripts/python.exe -m pytest -q --basetemp=.runtime/pytest-rescue
.venv/Scripts/ruff.exe check .
.venv/Scripts/python.exe -m shelfready.credential_scan
git diff --check
# From web/: npm run build
```

The public two-file demo allowlist and deployed services were not modified or
opened. No VM or paid resource was provisioned. Read-only billing check November
4 at 16:25 UTC: existing control $0.12 and runner $0.06 pending charges; both
provider firewalls SSH-only. VMs still bill. Review remains **November 7, 2026,
12:42 UTC / 13:42 Europe/Paris**; no deadline extension or automatic teardown.
Prior Phase 3 and Phase 4 raw report hashes were checked unchanged.

## Decision

Stop this spike. The case demonstrates explicit human authority and safe partial
release with a useful deterministic/manual fallback, but **does not demonstrate
incremental agent value**. Failed parity, no observed correction reduction,
missing review telemetry and the single authored case preclude GO. Model review
is explicitly opt-in and experimental; the verified deterministic/manual fallback
is the default. No UI redesign, animations, production integration,
new public inputs or expanded infrastructure were added.

Final checks: **114 tests passed in 72.89 seconds**, one upstream Starlette/AnyIO
deprecation warning. Ruff, TypeScript/Vite production build, whitespace checks,
and tracked-file known-secret/private-key scan passed. The scanner does not
claim exhaustive credential detection. Negative tests cover fabricated citations,
absent consent, duplicate/unknown approvals, missing risk acknowledgement, duplicate
approval IDs, Boolean row IDs, ambiguous business intent, wrong/omitted transformed
rows and a non-authorizing review draft. The previous serial full run passed 113
tests before the draft-output regression was added.

Limits: source-grounding and deterministic checks do not prove a human's business
decision correct. English caveat rules are conservative, not complete semantic
understanding. A misleading note or mistaken operator can still choose an
incorrect business interpretation. The evaluation uses a known scripted reviewer;
it provides no evidence about real operator error rates or labor savings.

Phase 6 cleanup verification: **117 tests passed in 112.75 seconds**, one upstream
Starlette/AnyIO deprecation warning. Ruff, TypeScript/Vite build, whitespace and
tracked-file credential checks passed. Regression coverage verifies the default
never invokes model review, the existing alias behaves identically, experimental
advice requires explicit opt-in and is labelled, and conflicting flags fail before
work. All 24 frozen-case/protocol and retained rescue-evidence files were checked
byte-for-byte unchanged. No evaluation or inference was rerun for this cleanup.
