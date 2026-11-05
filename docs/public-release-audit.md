# Public release audit

**Verdict: CONDITIONAL GO.** No new critical security finding was identified in
the reviewed material. The owner should finish the visibility and judging
checklist before publication. This audit reviewed `origin/main` at `83e17f4`
on November 5, 2026. It did not contact the hosted demo, Vultr infrastructure
or inference service.

## Critical blockers

None found. The owner explicitly approved publication of the historical Git
author and committer email. That address appears on 116 commits reachable from
`origin/main` and 120 across the local refs inspected before adding PR refs.
It is omitted here. Git history and existing commit metadata were preserved.

The technical audit does not establish current judge access or confirm that a
submission video and slides are ready. Those are manual gates for submission.

## What publication exposes

| Surface                     | Finding                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git and PRs                 | Tracked source, docs, fixture bytes, commit metadata and historical versions become public. The retained PRs add review discussions and metadata. Unmerged branches matter as well as `main`.                                                                                                                                                                              |
| Actions                     | GitHub makes Actions history and logs visible when the repository becomes public and disables existing push rulesets on that transition. Review downloadable retained artifacts too. [GitHub visibility documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility) |
| Deployment evidence         | The demo hostname embeds the control IPv4. History also contains runner addressing, provider resource identifiers, service account names, on-host paths, topology and operating details. These provide reconnaissance value. Provider resource identifiers alone do not grant management access. Removing them from current files would leave historical copies.           |
| Public engineering evidence | The MIT license, synthetic fixtures, checksums, model configuration, container limits, architecture and measured results are appropriate to publish. The separate Inter font license and attribution accompany the font.                                                                                                                                                   |
| Local private material      | `.env`, the local architecture contract, credentials and raw evidence are ignored. Local ignore rules do not protect text copied into future commits, PR comments, logs or screenshots.                                                                                                                                                                                    |

No repository issues, releases, wiki or GitHub Pages were present in the
authenticated GitHub snapshot. The repository was still private.

## Hosted demo threat assessment

The [deployment evidence](live-deployment.md) records HTTPS and Basic Auth
protecting UI, fixtures, API and downloads. The checked Caddy configuration
proxies the API to loopback and blocks the conventional OpenAPI paths. Source
requires the exact two supplied synthetic CSVs after newline normalization.
Limits are 16 KiB and 100 rows per CSV, 70 KB per request, 120 API requests per
minute in the public API process, one queued or running rehearsal and 30
persistent uploads. Reports and downloads have 24-hour retention. Historical
deployment evidence recorded 4 of 30 upload slots used.

- A leaked or widely shared invite can exhaust the upload quota, consume the
  shared API limit or drive inference usage. One upload permits one optional
  interpretation and up to three transformation calls. Thirty uploads imply a
  ceiling of 120 application model requests for an intact quota lifetime, with
  SDK retries disabled. The optional interpretation endpoint can make its one
  call before transformation confirmation. The job limit governs rehearsals,
  while interpretation has a separate per-upload bound.
- The optional interpretation form sends up to 500 characters of free-text
  intent to Vultr along with synthetic catalog context. The README now tells
  users to keep credentials and personal data out of that field.
- Shared Basic Auth is an invite gate. It has no per-user ownership model.
  Anyone with the invite and another user's job identifier can request its
  status and available downloads. Keep identifiers and traces private. The API
  limiter is behind Caddy, so it does not bound traffic rejected by Basic Auth.
- Publishing the URL increases discovery and traffic exposure. These controls
  have historical positive and negative evidence, with no current reachability,
  certificate, firewall, load or quota check in this audit. Docker shares the
  runner kernel. The repository does not claim kernel escape resistance.
- The recorded compute estimate was $0.041/hour for both VMs. The review
  deadline is November 7, 2026 at 13:42 Europe/Paris. Model calls have count,
  timeout and token bounds. The upload quota does not enforce a currency budget.
  Stopping application services does not end compute charges.

## Repository and Challenge 1 review

- The root [MIT license](../LICENSE) contains the permission grant and disclaimer.
  The packaged Inter WOFF2 includes its [SIL OFL](../brand/fonts/OFL.txt) and
  upstream attribution in the [brand guide](BRAND.md). The
  [showcase notes](readme-showcase.md) document the authored SVG and outlined
  Inter lettering. This review covers checked-in assets and notices.
- The README explains the actual workflow, Vultr-hosted frontend and backend,
  Serverless Inference, separate execution runner and SQL verification. Its
  dated live claims match the retained deployment summary. The 128-test badge
  refers to a prior run that included native Docker tests. The portable browser
  lane uses synthetic API responses. The paired CSV fixtures are checked in
  and the local reference path does not require access to the hosted demo.
- The README's lockfile installs, platform-specific startup, credential-free
  failure path and native prerequisites agree with the retained
  [fresh-clone verification](fresh-clone-verification.md). That run covered
  Windows and Docker Desktop. Cold Docker layer transfer remained unverified.
  This audit did not repeat the fresh-clone or native Docker runs.
- CI and Security use read-only repository permissions, pinned actions, checkout
  without persisted credentials, bounded jobs, cancellation of superseded runs
  and seven-day failure artifacts. No workflow uses `pull_request_target` or
  calls cloud or inference services. GitHub reported both workflows successful
  on the audited main commit.
- LabLab requires public GitHub source with setup, a Vultr-hosted app and demo
  URL, Vultr Serverless Inference for Challenge 1, isolated execution, a recorded
  demo containing a containment moment, slides and official LabLab submission.
  The repository and retained live evidence support the technical requirements.
  Public visibility, current judge access and the actual submission materials
  were outside this audit. Confirm that the judges can use the invite under the
  event rules. [Official Vultr Agent Rush requirements](https://lablab.build/ai-hackathons/vultr-hackathon)

## Exact verification results

| Check                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git secret scan       | Gitleaks with full redaction, `--all` and first-parent merge diffs scanned 141 commits and reported zero leaks. Scope included local refs, fetched origin branches and all 20 available PR heads. No tags were present.                                                                                                                                                                                                                             |
| Exact Git value scan  | 141 commits, 362 trees and 379 blobs checked for eight known values or categories covering configured Vultr keys, the demo password, private console fields and historical admin addresses. Zero matches. Host ACLs denied direct reads of three local SSH key files. Gitleaks and the tracked-file private-key marker check still ran.                                                                                                             |
| GitHub PR review      | Fetched 20 PR records and their review records, two conversation comments and zero inline review comments. Scanned with the hosted evidence below.                                                                                                                                                                                                                                                                                                  |
| GitHub Actions review | Downloaded 84 of 84 listed run log archives and 10 of 10 listed artifacts. None of those artifacts was expired. Scanned 842 retained entries from PR and Actions data, including unpacked nested trace archives. Gitleaks reported zero leaks across 22.77 MB. Known-value searches reported zero matches. Windows OCR processed all 146 PNG/JPEG entries with no failures. The extracted text also returned zero Gitleaks and known-value matches. |
| Locked dependencies   | npm audit at low severity threshold returned zero advisories across 126 entries. pip-audit returned zero known vulnerabilities across 29 locked Python dependencies with zero skips.                                                                                                                                                                                                                                                                |
| Python                | 121 passed, 10 live/native cases deselected. Two upstream deprecation warnings and one local pytest cache write warning. Ruff passed.                                                                                                                                                                                                                                                                                                               |
| Frontend and assets   | TypeScript, Prettier and Vite build passed. Vite reported its existing lazy-world chunk size warning. Brand validation passed for 17 SVGs. The showcase validator passed XML, animation loop, poster, reduced-motion, layout and README link checks.                                                                                                                                                                                                |
| Portable Playwright   | 17 tests passed in 35.3 seconds on a clean rerun. The initial sandboxed run passed all assertions but needed the audit-owned preview stopped for teardown.                                                                                                                                                                                                                                                                                          |
| Tracked credentials   | The project's tracked-file scan passed.                                                                                                                                                                                                                                                                                                                                                                                                             |

These scans can miss unknown secrets, text the OCR did not recognize,
or content removed or expired before enumeration. Dependency results cover the
npm and Python lockfiles at audit time. They do not cover operating-system or
container-image CVEs.

## Before changing visibility

1. Accept that historical infrastructure details will be visible. Confirm
   Actions and branch protections after the visibility change.
2. Verify judge access and expiry privately. Share the invite through a private
   channel, keep the existing limits, and confirm remaining quota, service health
   and costs before the operating review deadline.
3. Verify the recorded containment moment is in the submission video. Confirm
   the slides and LabLab submission links, then make the repository public
   manually and verify it from a signed-out browser.
