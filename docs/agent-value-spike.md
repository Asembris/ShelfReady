# Bounded Phase 4 agent-value spike

**Verdict: NARROW for advisory interpretation; NO-GO for an end-to-end agent
advantage.** The frozen numeric proxy thresholds passed, but they omitted
post-review completion parity. Generated-code reliability reduced that completion,
and a simple stronger deterministic intent matcher erased half the correction
gain. Do not retrofit the frozen rule or treat proxy success as production
readiness or competitive superiority. The experiment stops here; no prompt tuning
or repeated model scoring is used to get GO.

## Scope and decision

The owner explicitly approved this expansion on November 4, 2026. Work began
from clean `main`, fast-forward-only pulled to `6149f98`, after verifying merged
Phase 3 commit `9e9ec7f`. No paid infrastructure, production integration, product
creation or variants were added. Phase 3's corpus, results and conclusions remain
unchanged; this is a separate experiment, not a replacement for that evidence.

The spike adds advisory supplier interpretation before execution. It sends actual
headers, at most five source rows, baseline SKU references and explicit intent to
Vultr. Proposals identify columns, quote exact row/cell evidence, explain choices
and list uncertainties. Source grounding proves provenance, **not business meaning**.
A human must confirm or correct columns/rules before execution. The original
manual mapping path remains available and unchanged in purpose.

Only three non-identity rules are allowed: explicitly authorized outer SKU-padding
trim, declared decimal-comma/no-grouping replacement, and removal of `ea/each`
suffixes for declared individual-unit stock. Leading zeros remain strings. There
is no arithmetic, pack conversion, tax calculation or currency conversion.
Unknown currency/numeric format or stock unit forces abstention; tax-labelled
price columns and conflicting currency labels cannot execute through this route.
Incomplete interpretations remain blocked pending explicit resolution.

The confirmed interpretation materially changes the transformation interface:
generated code receives the **raw** supplier headers/rows plus confirmed source
columns/rules. It must perform those normalizations, rather than receive an
already-normalized canonical supplier list. Independent trusted code computes
expected rows using a fixed allowlist, outside the sandbox. Strict row accounting,
three-attempt execution bound, containment, native import, independent SQL
readback and cleanup gates remain intact. Model output cannot edit those checks.

## Frozen evaluation

Seven developer-authored synthetic cases and gold interpretations were frozen
before implementation/model scoring in `evaluation/spike/`. Initial CSV quoting
was corrected and all inputs parsed before final freeze commit `c27e2cf`.
SHA-256 (LF-normalized):
`23c59cac8746bbac10bd7e3a2222a4781d03c59a4f697bc73e42e093c4e203ad`.

The cases cover ordinary fuzzy headers, German operational abbreviations, French
and Spanish supplier headers, explicit normalization, ambiguous currency/tax/unit
intent, and untrusted supplier instructions. This is not a blinded or independent
customer study. No gold/cases or model/comparator policy changed after scoring.

The frozen comparator uses broad domain/multilingual synonyms, token and sequence
matching, numeric samples, known-SKU overlap, conservative ties and the same
structured intent/rule guards. It is substantially stronger than Phase 3's exact
header alias candidates. Both arms see identical inputs and intent. It uses a
trusted stdlib transformation in the same restricted sandbox; the agent uses
Vultr-generated code. Both use identical downstream verification and fresh stores.

The reviewer is a **scripted frozen oracle**, not a real person. Each wrong/missing
column/rule pair costs one correction edit. Mandatory review is counted for both
arms. Scripted corrections are applied identically before downstream execution.
"Without corrections" means the proposed column/rule pairs already matched gold;
it does **not** mean execution without confirmation. No human typing time, review
time, intent-composition effort or real-world labor saving was measured.

Predeclared acceptance requires zero incorrect accepted changes, both negative
abstentions, at least one additional verified correction-free positive batch and
at least two fewer field corrections. Those numeric criteria passed. The frozen
rule did **not** require post-review completion parity or zero failed executions;
that omission is a protocol weakness, not permission to ignore the French failure.
An early summary mistakenly added a zero-failures condition and labelled acceptance
false; the summary was corrected to the actual frozen rule, leaving raw results
unchanged and reporting completion parity separately. We did not rerun the model
or tune after its failure.

## Primary live results

Run: `artifacts/spike/20261104-094129-343241f4/results.json`.
Source: `2033f56094dd8b16b3c716b3f4639a1323ff8e54`.
Raw report SHA-256:
`999f09a06a1c386a621356114424258e7a50e9eb122d6cfb661a088b31c93fb2`.

| Measure, seven cases | Frozen fuzzy baseline | Agent |
| --- | ---: | ---: |
| Verified rows without field corrections | 6 | 8 |
| Verified positive batches without corrections | 3 | 4 |
| Verified rows after scripted corrections | 10 | 8 |
| Field correction proxy | 2 | 0 |
| Mandatory human reviews | 7 | 7 |
| Wrong non-null proposed column/rule pairs | 0 | 0 |
| Correct negative-case abstentions | 2/2 | 2/2 |
| Incorrect accepted changes | 0 | 0 |
| Unreleased/unresolved rows | 4 | 6 |
| Failed positive cases | 0 | 1 |
| Interpretation latency, total | 0.034 s | 12.481 s |
| Whole-run case time | 153.858 s | 163.193 s |
| Model requests | 0 | 14 |
| Prompt / completion / total tokens | 0 / 0 / 0 | 7,160 / 10,159 / 17,319 |
| Monetary inference cost | no inference | **USD unknown** |

The four intent-unresolved rows are in the two negative cases. The agent's other
two unreleased rows are technically blocked by the French transformation failure,
not ambiguous source data. Whole-run time is not an equal-success throughput
comparison: the agent skipped native staging for its failed French batch. Do not
interpret the totals as a causal speed ratio. Interpretation latency is separately
reported across the same seven inputs.

The fuzzy baseline abstained on the German selling-price abbreviation and on
"Ready singles". The model proposed both correctly, including safe normalization.
However, the French interpretation was correct and its **generated program still
failed all three attempts**: attempts 1 and 3 raised `TypeError` from treating list
rows as dictionaries; attempt 2 omitted one row. Trusted checks rejected all three.
No French CSV was released. This failure is retained, not repaired by another
held-out run or hidden behind a successful mapping score.

Observed token usage includes seven interpretation requests and seven generated-
code attempts. The inspected Vultr model metadata exposed no pricing values, and
no invoice/request-level monetary attribution was obtained. Token usage is the
measured inference-cost proxy; USD cost and cost-effectiveness remain unmeasured.
Development smoke calls and browser regressions are outside these benchmark totals.

Primary interpretation request IDs:

- English: `chatcmpl-2613cab4-1f44-46ae-bf3c-9a62f966019b`
- German: `chatcmpl-5cc2cb1b-5702-4269-b130-dc2d7d640c23`
- French: `chatcmpl-47d28360-be34-4fc5-bb0d-37cf2b752390`
- Spanish: `chatcmpl-4ae48bdc-a5d9-4d83-aa96-b1ad6d65bd60`
- Normalization: `chatcmpl-02d5b8ab-2b8d-4325-9951-ee4e5ae11966`
- Ambiguous intent: `chatcmpl-3a9c5272-696a-4d36-a63e-b44b98e78bca`
- Untrusted instructions: `chatcmpl-7fdc8926-01fa-4886-ac9f-2a2f48d43a97`

## Comparison-bias diagnostic

The normalization intent literally names "Ready singles" and describes its role.
The primary fuzzy comparator does not parse such free-form literal declarations.
Therefore a two-edit gain over that comparator alone is optimistic evidence of
agent necessity. A separately labelled **post-score, unblinded** robustness check
adds generic `COLUMN is/are ROLE` matching to the deterministic comparator. It
uses every case and the same native verification, makes no inference calls, and
does not replace the frozen primary scores. It is not a new held-out victory.

Diagnostic: `artifacts/spike/intent-hint-diagnostic-20261104-095352/results.json`,
SHA-256 `d8d0d0b6766f91f5403a6d950beabf8ab065c8308f1154e60db1c7d2d3b73b51`.
Across all seven cases it needed **one** field edit, verified **8** rows without
corrections and **10** after corrections, with zero incorrect accepted changes,
four intent-unresolved rows and no failed cases. It took 0.045 seconds to propose
and 146.568 seconds overall, with no model calls. Both negative cases abstained.
Only the German abbreviation still required correction. This removes the claimed
net correction-free outcome gain; the agent now saves only one scripted field edit
relative to this stronger baseline, while still failing the French batch.
That remaining edit depends on dictionary coverage: the comparator includes some
German terms but not the selling-price abbreviation `VK`. We did not measure an
exhaustively localized or vendor-specific dictionary baseline, and do not claim
that this one-edit gap is intrinsically unsolvable deterministically.

This diagnostic was intentionally added after seeing a comparison limitation.
It is an unblinded sensitivity check that **weakens**, rather than manufactures,
an agent-advantage claim. It is not a replacement primary comparator score or an
independently held-out second experiment. All original scores and failures remain.

## Checks

- Final complete suite: **96 passed in 75.41 seconds**, including reporting-rule
  regressions; one upstream Starlette/AnyIO deprecation warning. The earlier
  implementation suite passed 94 tests in 78.90 seconds. An initial run had eight live failures because
  Docker Desktop was stopped; that environmental failure was not counted as a pass.
- Real browser journeys: **2 passed in 1.3 minutes**; legacy mapping (35.0 seconds)
  and explicit grounded interpretation/confirmation (33.8 seconds). These use
  separate development examples and do not rescore the held-out French failure.
- TypeScript/Vite build, Ruff and `git diff --check`: passed.
- npm audit: zero reported vulnerabilities.
- Phase 3 raw results retain SHA-256
  `f3260e111f55bce125439ca260e938c847e1e5ff0b2ba45a290aae4183d917d7`;
  its corpus and public evidence were not modified.

## Reproduction and bounds

Use the existing local setup, with no worker/evaluation already running:

```powershell
uv run --locked pytest -q --basetemp=.runtime/pytest-spike
uv run --locked ruff check .
git diff --check
uv run --locked python -m shelfready.spike_evaluate --live-local
uv run --locked python -m shelfready.spike_summary artifacts/spike/RUN/results.json
# Optional, explicitly unblinded stronger-baseline diagnostic; no model calls:
uv run --locked python -m shelfready.intent_hint_baseline
```

Every evaluation writes a new ignored directory. Raw proposals, evidence, request
IDs, usage, generated programs, stdout and independent readbacks remain local.
Do not select a better run. The experiment was bounded to this focused session,
one full paired model pass, and the explicitly labelled no-model comparison check.
No additional cases/prompt tuning were used to force a GO.

The API permits one interpretation request per upload, within the existing
persistent upload quota. Proposals and intent expire with job retention. A failed
proposal can be reviewed manually or retried with a fresh upload, not an unbounded
model loop. The new controls are functional review UI, not a redesign.

Safety tests use explicitly synthetic proposals/failures. The comparison and both
browser journeys use real Vultr inference, local Docker and native WooCommerce.
Vultr application deployment, remote SSH execution and broad injection resistance
remain unverified. Human review can be wrong: the deterministic verifier checks
the confirmed interpretation's arithmetic/identity, not independently provable
business semantics. Zero incorrect accepted changes here assumes the scripted
gold reviewer, not error-free future users.
