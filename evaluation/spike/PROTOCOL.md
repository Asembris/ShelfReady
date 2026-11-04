# One-day agent-value spike protocol

Freeze seven developer-authored synthetic cases and explicit gold mappings/rules
before implementation or model calls. This is not independently authored or blind.
Do not edit cases or gold after tuning. Preserve Phase 3 evidence unchanged.
Budget: one focused development day; one full paired live pass after tests.
Stop rather than add features/cases or tune prompts after scoring to obtain GO.

Both arms see identical unfamiliar headers, first five representative rows,
baseline SKU references and explicit intent. The agent proposes grounded source
columns, allowlisted rules, row/value evidence and uncertainties. The comparator
must use broad domain synonyms, token/fuzzy matching, sample type evidence, SKU
overlap and conservative tie abstention. Do not use Phase 3's exact-alias-only
candidate list as the baseline. Freeze comparator and prompt before scoring.

Rules: identity; SKU trim only with explicit padding permission; decimal comma
only with explicit decimal-comma/no-grouping intent; strip ea/each stock suffix
only for explicit individual-unit intent. No arithmetic, pack conversion, tax or
currency conversion. Unknown currency or unit forces price/stock abstention.
The model cannot define code for the trusted normalizer or expected results.
All proposals require human confirmation; source-grounded is not semantically
proven. Wrong proposed business meanings are errors, not accepted merely because
their cells are numeric. Incomplete/ambiguous interpretations cannot execute.

Score field-level corrections versus frozen gold, counting each wrong or missing
column/rule pair as one edit. This is a reproducible correction-burden proxy,
not measured human time. Mandatory confirmation is one review per case for BOTH
arms and is not a correction saving. Report erroneous proposals separately.
The scripted reviewer applies gold corrections identically to both arms and
never pretends to be a real participant.

Report verified useful outcomes WITHOUT corrections and AFTER scripted review,
unresolved rows, incorrect accepted changes, proposal errors, correction edits,
latency, request IDs and prompt/completion/total tokens. If no measured billing
price is available, report token cost and USD unknown; never invent dollar cost.
Each complete proposal gets independent normalization/row validation; corrected
positive cases pass real restricted code execution (Vultr-generated for the agent,
trusted deterministic stdlib template for the baseline), native Woo import,
SQL readback and cleanup for both arms. Unsupported cases remain unresolved.
No outcome is counted verified merely from a model's mapping claim.

Acceptance: zero incorrect accepted changes; correct abstention for both negative
cases; at least one additional verified positive batch requiring zero corrections
AND at least two fewer field edits across all cases than the competent baseline.
GO is limited to reduced interpretation correction burden on this corpus, not
market superiority. Otherwise NARROW if safe with only weak/partial differentiation,
NO-GO if unsafe or no material correction/outcome gain. Always include limits:
small synthetic set, multilingual baseline coverage, scripted reviewer, no human
timing study, local execution and unverified Vultr deployment. No best-of-runs.
