# Frozen Supplier Adapter Forge research protocol

Authored synthetic wholesale export, not independent customer evidence. A short
public-source search found templates/customer-feed descriptions, not a suitable
independent messy input with permission/reference answers. No market claim.
Freeze all four CSVs, references and hashes before inference. No fixture or
acceptance changes after results. One run, no best-of selection/prompt retuning.
Timebox <=5 hours; stop when gate decided. Shared durable inference budget <=24
requests (including failures), maximum 8 generation/execution steps per agent
phase. Retain all messages/feedback, generated code, results and usage. No
production code changes, frontend, public inputs, VM operations or deployment.

Case: sectioned wholesale stock list, repeated headers, differing price/stock
labels, pack-size metadata, duplicate warehouse exports and distant quality
notes. Two valid individual-unit updates, four held rows. Replay changes numeric
values without structural changes. Drift reorders price/stock columns (headers
move too). Currency negative control changes one section to USD: those rows must
remain held, not converted. The operator authorizes only exact known SKU updates
in EUR/each with no pending quality release, and confirms the pack column is not
a price divisor. No taxonomy/variants, conversion or quantity arithmetic.

Output: JSON rows with physical source_row, exact sku/price/stock strings,
sku_cell/price_cell/stock_cell [1-based physical CSV row, 1-based column],
decision ready|hold and bounded reason; ignored is the list of all non-product
physical row numbers, including blank lines. Every physical CSV record must be
accounted exactly once. Source citations do not prove business meaning.

Trusted reference validator outside sandbox checks full source coverage, exact
physical product rows, duplicate holds, exact known SKUs, decimal/integer syntax,
source-value/citation equality, hold decisions, and operator authorization.
Frozen references never enter prompts or execution data. Feedback gives error
codes/observed runtime errors, not gold mappings or expected values. Release only
on full validation; a partly correct rejected batch counts zero verified rows.

Arms: existing rectangular parser; strong generic section/header/notes parser;
same pinned Vultr model single-shot adapter generation; stateful generation with
retained conversation and structured execution feedback. Strong deterministic
parser receives equivalent business rules, all CSV data and known SKUs, no gold.
Both model arms get identical initial messages, settings and token limits.
Single-shot gets one request per base/drift phase; agent <=8 per phase. Neither
sees references. Drift model context includes previous successful code for both
arms; agent may additionally retain prior conversation and feedback by design.
No gold-fed model repair or unbounded retry. Errors fail closed.

Successful adapters are saved with code hash and structural fingerprint, and
replayed in the existing sandbox without inference on fresh numeric inputs.
Fingerprint mismatch refuses replay before code execution. Failed base adapters
cannot claim replay. Drift repair requires all drift oracle checks; adapters
cannot silently switch source columns. Negative currency change must be detected
and remain held, even if adapter rejects rather than repairs it. Safety controls
include false values/citations, omissions, duplicate override and absent consent.

Report verified rows, incorrect accepted changes, unresolved/unreleased rows,
repairs (only a failed attempt followed by accepted code), requests and measured
prompt/completion tokens, elapsed times, replay and drift outcome. Missing usage
is unknown, never zero. Token usage is not USD billing. All blocked rows are
reported distinctly from successfully parsed business holds.

BUILD only if agent completes the meaningful base case that BOTH strong
deterministic and single-shot alternatives fail, OR repairs drift that BOTH
alternatives fail (substantial advantage = two verified rows vs zero), with zero
incorrect accepted changes, all ambiguous rows held, successful inference-free
replay, safely detected drift and credible focused build within remaining time.
Otherwise NO-GO, or INSUFFICIENT EVIDENCE for environmental/instrumentation
failures that prevent comparison. Authored single-case evidence cannot alone
establish broad market advantage. Do not alter thresholds to obtain BUILD.
