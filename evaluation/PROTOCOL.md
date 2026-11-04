# Frozen paired evaluation protocol

Freeze `cases.json` and its SHA-256 before Phase 3 implementation changes or
model calls. Do not edit cases, gold rows, prompt or baseline after seeing scores.
If a correctness fix is necessary, record it and rerun the entire paired suite;
retain all runs locally. No case exclusion or best-of-run selection.

These are realistic, deliberately small synthetic cases authored by the same
developer, not independently held-out customer catalogs. This is a transparent
regression/evaluation holdout, not proof of generalization or a blinded study.

Use one paired pass of all eight cases in listed order. Alternate arm order by
case to reduce first-arm startup bias. Record per-case and total wall time using
perf_counter. Both arms get identical raw CSVs, the same explicit human-confirmed
column mappings/intent, input limits, and frozen gold output/unresolved row IDs.
Ambiguous business intent must be rejected, never guessed. Human mapping time
is excluded because it is supplied identically to both arms; do not claim time
savings in mapping from these timings.

ShelfReady uses its existing Vultr-generated transformation, at most three
attempts, and the existing sandbox. Do not introduce a new schema-inference
feature to rescue the evaluation. The competent deterministic comparator uses
CSV strings, Decimal-safe validation, exact SKU joining, full duplicate detection,
explicit mapping, row accounting and the same native WooCommerce staging and
independent verifier. It may use shared safety gates; transformation selection
must be deterministic and have no model calls. It must not be a deliberately
weak header-only or spreadsheet-guessing baseline.

Before staging, compare each arm against frozen gold, independently of the
production planner. For every nonempty accepted output, create a fresh pinned
store, import baseline and updates natively, independently verify all persisted
products and supported unchanged fields, and destroy the store. Unsupported or
all-unresolved cases do not count as useful completions and do not need staging.

Measure: correctly verified useful rows / eligible gold rows; case outcomes;
unresolved row counts; rejected incorrect candidate rows; incorrectly RELEASED
changes; transformation time; total machine execution time including store
startup/import/readback/cleanup; model attempts, request IDs and token usage.
A no-op requested row counts as a safely processed update, reported explicitly.
Unresolved rows are neither silently dropped nor counted as completion.

Negative controls: deliberately corrupt a correct candidate's price and omit a
gold row, proving pre-import gates reject both. Also natively stage a wrong
price against correct expected values, proving independent database verification
rejects it and cleanup still runs. Mark deliberate corruptions as controls, not
spontaneous model mistakes. Never label synthetic failure injections as live.

Unfamiliar schemas are explicitly included. The existing application confirms
mappings before the model sees canonical fields. Measure that actual architecture,
and state this ceiling on possible agent benefit. Passing tests alone is no GO.
GO requires demonstrated incremental useful completion or correctness over the
competent comparator. Equal completion with more time/cost implies NARROW (safe
staging product may be useful, but agent necessity is unproven). Safety failures
or materially worse completion imply NO-GO for the affected claims. Single-run
small-sample timings are descriptive, not statistical significance or ROI.
