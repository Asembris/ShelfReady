# Bounded CI hardening

Started from clean, fast-forwarded `main` at `9602716`, on
`chore/ci-hardening`. Existing UI work and frozen evidence are preserved.

## Pipeline and trust boundaries

Inspired by [Aegis's parallel quality/security jobs](https://github.com/edycutjong/aegis/blob/main/.github/workflows/ci.yml)
and [Loci's stubbed browser boundary](https://github.com/edycutjong/loci/blob/main/.github/workflows/ci.yml).
ShelfReady does not inherit their deployment infrastructure, coverage thresholds,
extra linters, or live model services.

Two workflows run on pushes, pull requests and manual dispatch:

- **CI / Offline Python and Ruff:** Python 3.12, `uv sync --frozen`, Ruff, and
  `pytest -m 'not live' --offline --strict-markers`. The 10 marked Docker/native
  tests are explicitly deselected, not reported as passing. The network guard
  rejects ordinary IP/DNS/datagram calls; it permits Windows asyncio's exact
  standard-library socketpair self-pipe. Tests cover both rejection and socketpair.
  This is a regression-test guard, not OS-level containment for malicious code.
- **CI / Portable browser and production frontend:** Node 24, `npm ci`, strict
  TypeScript, pinned formatting, production build, Chromium, all 17 approved
  brand-asset checks, and the explicit portable Playwright suite. The suite has
  synthetic API responses, no API service or worker, and tests the production
  preview on loopback. Accessible/reduced-motion reading, responsive widths,
  unavailable/software WebGL, user authority, failure/partial states, restoration,
  motion mathematics and deep links are covered.
- **Security / Full-history redacted Gitleaks:** full Git fetch including refs
  and tags, `git --log-opts=--all`, official Gitleaks 8.30.1 binary with a fixed
  SHA-256, and 100% redaction. No organization license action or verification
  request against discovered credentials is used.
- **Security / Dependency audits:** all locked npm dependencies at the low
  severity threshold, and all exported Python runtime/dev dependencies with
  hashes, pip-audit 2.10.1, no dependency re-resolution. Audit-service failures
  fail the job. Python audit still runs if npm audit fails. No ignored advisories,
  baseline suppression, `continue-on-error`, or weakened assertions.

All action revisions use full verified upstream commit SHAs; tool versions are
pinned. Permissions are `contents: read`, checkout does not persist credentials,
and workflows have per-ref concurrency cancellation and 10–15 minute job limits.
Only npm/uv download caches are used. Failure reports/traces/screenshots and
redacted audit JSON have a seven-day retention and narrow artifact paths. No
`.env`, credential, application database, or broad workspace artifact upload.

There are no repository/model/cloud/deployment secrets in these workflows.
Installing dependencies/browsers and querying advisory databases needs network;
“offline” describes Python test execution and absence of live application
integrations, not an air-gapped runner. Public documentation uses no canary or
real API credentials. CodeQL remains deliberately deferred while the repo is
private. No paid scanning add-on, deployment or cloud provisioning is introduced.

Dependabot updates GitHub Actions, npm and uv weekly, caps open update PRs at two
per ecosystem, and groups compatible patch/minor updates. Actions are grouped
separately. Major package changes remain reviewable outside the compatible group.
Configuration takes effect on the default branch after the owner merges; this
phase did not create a PR or enable auto-merge.

## Explicit manual lanes

From `web/` after `npm ci`:

```text
npm run build
npm run test:ci          # production preview; portable, no API/worker or inference
npm run test:cinematic   # local hardware GPU; unchanged visual assertions
npm run test:live        # existing real Vultr/local Docker journeys; private credentials
```

`npm run test:e2e` retains the original complete local suite. GPU-dependent intro,
world/context-loss and film cases were physically separated from portable cases;
their assertions are retained in `cinema.spec.ts` and `scroll.spec.ts`.
`playwright.config.ts`, the cinematic config and public live config explicitly
reject `CI`. They are not scheduled or dispatched from hosted workflows. GPU
timing must never be inferred from portable Linux results. Paid/live tests were
not run during this phase.

The portable suite has retries disabled and `forbidOnly`; there is no conditional
“GPU unavailable” skip after a failure. Existing Windows/D3D launch flags remain
only in the manual configuration. LF checkout attributes make formatting stable
on Windows and Linux without reformatting or changing application logic.

## Approved dependency remediation

The initial Python audit found 14 entries (including aliases/duplicates) in three
locked packages. The owner explicitly approved minimum compatible security
updates. Only four packages changed in the lockfile:

| Package | Before | After | Reason |
| --- | --- | --- | --- |
| python-dotenv | 1.2.1 | 1.2.2 | PYSEC-2026-2270 / corresponding GHSA |
| pytest | 8.4.2 | 9.0.3 | PYSEC-2026-1845 / corresponding GHSA |
| Starlette | 0.49.3 | 1.3.1 | Common minimum fixing PYSEC-2026-161, -2280, -2281, -248, -249 and their aliases |
| FastAPI | 0.121.0 | 0.133.0 | First release supporting Starlette 1.x; prior releases constrain it below 1.0 |

Sources: package/version advisory metadata on PyPI,
[FastAPI 0.133.0 support notes](https://fastapi.tiangolo.com/release-notes/#01330),
and [Starlette release/security notes](https://starlette.dev/release-notes/).
Starlette is explicitly pinned to the minimum common fixed version rather than
loosening constraints to whatever is newest. No application refactor or other
dependency upgrade was needed. Offline API/security/cleanup tests passed without
changing their assertions. Upstream httpx test-client and AnyIO deprecation
warnings remain; migration to httpx2 is outside this phase.

Local pip-audit initially failed due to Windows certificate configuration. It
passed with the installed system Python and a temporary public Windows CA bundle,
without disabling TLS. npm used Node's OS trust store. These local adaptations
are not needed on the hosted Ubuntu runners and no certificates were committed.

## Approved deep-link regression fix

The unchanged workflow-position assertion failed in both local portable tests
and the first real Linux CI run: `/#studio` could land at the footer. A trace
showed the initial scroll occurring while the font was still loading, before
the intro/layout readiness boundary. The owner approved the narrow timing fix.

The app now aligns the initial fragment after `introDone`, `document.fonts.ready`
and the next layout frame. It cancels work on cleanup or a changed fragment and
does not rerun for normal workflow-stage changes. No timer delay, design change,
new navigation system, or relaxed viewport assertion. Regression tests hold the
font response explicitly and check reduced and normal motion preferences,
direct entry, refresh and subsequent navigation. They exercise fallback rendering
without claiming a hardware cinematic pass.

## Observed validation

- Local: **109 offline Python tests passed**, 10 live tests explicitly deselected;
  **17 portable Playwright tests passed in 45.7s** after the fix. TypeScript,
  production build, formatting, Ruff, whitespace, known-secret scan, all 17 brand
  assets and both dependency audits passed.
- Local Gitleaks initially scanned **90 commits**, finding no leaks. Hosted scans
  include the subsequent hardening commits and all fetched history.
- First real Linux run: [CI failed at the unchanged deep-link assertion](https://github.com/Asembris/ShelfReady/actions/runs/41931465701),
  with Python/lint/build/brand passing. Its failure screenshot, trace and HTML
  report were actually uploaded (artifact `13372780068`). The failure was fixed,
  not ignored. [Security passed](https://github.com/Asembris/ShelfReady/actions/runs/41931465690).

After the fix, [CI passed on Linux](https://github.com/Asembris/ShelfReady/actions/runs/41931982011)
and [Security passed](https://github.com/Asembris/ShelfReady/actions/runs/41931982042)
for commit `2c8fdeb`. Both workflows were observed executing through GitHub's API,
not inferred from local results. A documentation-only push follows this evidence
record; its status is checked before delivery.

No deployment,
inference, WooCommerce native import, cloud gate or GPU rendering is claimed from
these CI results. Prior live evidence remains unchanged. Hosted Actions minutes
remain subject to the owner's existing GitHub plan; no billing settings changed.
