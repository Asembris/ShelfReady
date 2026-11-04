# Frozen Catalog Rescue protocol

Freeze this developer-authored synthetic case and criteria before implementation
or inference. It is not blinded customer evidence. Timebox: one focused session,
at most one paired scored run, no post-score prompt tuning or case replacement.
Development uses synthetic failures, not repeated model scoring of this case.

Both arms receive the complete bounded CSVs and identical explicit intent, then
the same operator mapping and row decisions. Price-column ambiguity requires
confirmation; no arm may infer it. The comparator uses existing fuzzy and literal
intent matching plus deterministic duplicate/unknown checks, Decimal price delta
>=50%, stock >10x baseline, and broad caveat/approval/reservation note screening.
Its messages must quote exact cells and ask targeted questions, not be weakened
to make narrative explanations look uniquely intelligent. No case-specific SKU
or row lookup in the comparator. Freeze prompt/comparator before live scoring.

Operator workflow: review proposal and exact source cells, confirm source columns,
approve explicit row IDs, acknowledge each warned approved row. Every unapproved
row remains unresolved. Invalid/duplicate/unknown rows cannot be overridden.
Warnings and confirmations are mandatory for BOTH arms. Model warnings are
advisory additions to a trusted risk floor, never an authorization mechanism.
All row numbers refer to data rows, excluding the CSV header. No row edits,
duplicate merging, new products, quantities inferred from prose, currency/tax
conversion or new public inputs. Existing API/public allowlist stays unchanged.

Both arms must execute in the existing isolated local sandbox, independently
validate complete generated candidates, filter only explicit human selections,
account for all source rows, import the same reviewed resolved updates into fresh
native WooCommerce, independently verify SQL including unchanged fields, and
clean up. Agent uses Vultr-generated transformation (max three attempts); baseline
uses a competent trusted stdlib template. Review itself uses one bounded Vultr
request, no repair loop. Negative controls: forged citation, absent consent,
duplicate approval, missing risk acknowledgement, wrong generated price and
missing row must fail closed in automated tests.

Report both raw advisory accuracy and downstream outcomes: required mapping
corrections (one per nonnull wrong field; null is a required answer, not an error),
risk corrections (missing gold risk rows plus extra warned rows), mandatory
mapping answers, approved-row acknowledgements, total unresolved rows, exact
verified useful rows, incorrect accepted changes, review/whole-run latency,
requests/token usage. Reviewer is the frozen scripted oracle, not measured human
time. Do not call it a usability study or count mandatory confirmation as labor
savings. Disclose which risks were added by the trusted floor versus the model.

GO requires completion parity with baseline AND both gold updates verified,
zero incorrect accepted changes for BOTH arms, all six unresolved rows accounted,
and at least two fewer total advisory corrections than the strongest comparator.
No gain means NO-GO for incremental agent value, even when tests pass. NARROW
may describe advisory presentation alone, without claiming measured superiority.
No causal latency claim from one run or local Docker jitter; inference USD cost
unknown unless actually attributable. Preserve all prior evaluations verbatim.
