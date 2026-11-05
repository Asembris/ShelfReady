# Bounded dependency maintenance — November 5, 2026

Started from clean, fast-forwarded main `d5c8153` on
`chore/dependency-maintenance`. All five Dependabot PRs were inspected read-only:
package/lock diffs, exact proposed versions, check runs and failed job logs.
No PR was merged, closed, edited or rebased. Application architecture, assertions,
brand artwork, frozen evidence and deployed services are unchanged.

## Decisions

| PR | Decision | Evidence and reason |
| --- | --- | --- |
| [#11](https://github.com/Asembris/ShelfReady/pull/11), Actions | Accept all four | Official release tags resolve to the exact proposed SHAs. All use Node 24, supported by the hosted Ubuntu runners; the Actions-only commit passed CI and Security. |
| [#12](https://github.com/Asembris/ShelfReady/pull/12), compatible frontend | Defer after Linux failure | Candidate passes local checks but repeats the unchanged mapping-panel viewport failure in combined Linux CI. Restore original package/lock files; do not weaken the assertion or change UI behavior. |
| [#13](https://github.com/Asembris/ShelfReady/pull/13), Vite 8.3.5 | Defer | Its old CI fails npm peer resolution: Tailwind's Vite plugin 4.1.17 permits Vite 5/6/7 only. Plugin 4.3.3 permits Vite 8, but that frontend group is also deferred; the peer conflict therefore remains on the accepted branch. |
| [#14](https://github.com/Asembris/ShelfReady/pull/14), compatible Python | Accept only python-dotenv 1.2.4 | Its grouped CI stops at 40 Ruff findings, including I001 and UP017, before pytest. Defer Ruff 0.17.3, pytest 9.2.0, FastAPI 0.162.0, Starlette 1.10.0 and uvicorn 0.54.0; avoid a combined source/lint/server migration in this bounded pass. |
| [#15](https://github.com/Asembris/ShelfReady/pull/15), OpenAI SDK 3.42.1 | Defer | Seven test modules fail collection because `httpx` is no longer transitively installed. The application explicitly supplies an `httpx.Client` with verified OS TLS, a 90-second timeout, disabled environment proxy trust and zero retries. This needs an intentional HTTPX2 transport migration, not an extra dependency to conceal the failure. |

Accepted Actions pins: checkout **7.0.1**, setup-node **7.1.0**,
upload-artifact **7.0.2**, setup-uv **10.3.3**. Full commit SHAs remain in the
workflows; permissions, credential persistence, artifact paths/retention,
timeouts, Node 24, Python 3.12 and uv **0.9.18** remain unchanged. setup-node's
registry-token behavior change does not apply: these jobs do not configure a
registry token. setup-uv's new manifest mirror retains checksum verification.
Hosted validation confirms these releases run with our actual inputs.

Frontend versions trialed, then reverted: React/react-dom **19.3.1**, their types **19.3.0**,
Playwright **1.64.1**, Tailwind and its Vite plugin **4.3.3**. React-dom's peer
requires React ^19.3.1; Playwright requires Node >=20, satisfied by Node 24.
Vite remains **7.3.7**, TypeScript **5.9.3**, Three.js **0.187.0**.

python-dotenv **1.2.4** supports Python >=3.10, compatible with our pinned 3.12.
Its upstream fixes concern empty values and CLI variable precedence; the existing
literal Caddy-environment and configuration regressions still pass. Only its
pin and locked distribution metadata changed; other Python versions remain fixed.

The deferred Python proposals also meet Python 3.12's interpreter requirement:
FastAPI/uvicorn/pytest require >=3.10, Starlette >=3.11 and Ruff >=3.7.
FastAPI declares Starlette >=0.46.0 and Pydantic >=2.9.0. Interpreter requirements
are not the blocker; passing the larger group's lint and server regressions
without unrelated source changes remains unestablished.

## Major-upgrade evaluation

[Vite's migration guide](https://vite.dev/guide/migration) changes the bundler to
Rolldown and the transformation/minification pipeline to Oxc, with browser target,
CommonJS and plugin compatibility considerations. Our Vite config is small, but
the product has lazy Three.js chunks, shaders and timing-sensitive rendering.
Node 24 meets Vite 8's engine requirement (^20.19 or >=22.12). A future isolated
Vite migration should compare build outputs, development/preview behavior,
cinematic scroll performance and fallbacks. No force/legacy-peer-deps flag was
used and no Vite 8 success is claimed from Vite 7 tests.

[SDK 3.0's release notes](https://github.com/openai/openai-python/releases/tag/v3.0.0)
explicitly identify HTTPX2 as a breaking change and point to the
[transport migration guide](https://github.com/openai/openai-python/blob/main/httpx2.md).
SDK 3.42.1's later WebSocket fixes do not remove that migration requirement.
TLS/proxy/timeout/retry boundaries and Vultr's compatible endpoint must be
preserved and independently tested before adopting it. No legacy escape hatch,
suppressed import error or paid provider probe was used here.

## Actual failures and validation

The old frontend PR's failing job was a mapping-panel `toBeInViewport` assertion
with viewport ratio zero. Locally on current main the same assertion passes under the
proposed versions; the combined Linux CI repeats the same failure on current main. This does not
establish a unique root cause or justify changing the test. The frontend group
is therefore deferred, despite local passes; original dependencies are restored. Vite's security job also failed at npm peer resolution,
not a reported vulnerability; its Python audit still ran successfully.

Local candidate results (not final frontend acceptance):

- **118 offline Python tests passed**, 10 marked Docker/native tests explicitly
  deselected; two known upstream deprecation warnings. No assertion changed.
- **17 portable browser tests passed in 21.3 seconds**, including the formerly
  failing mapping-panel position assertion, accessibility and responsive/fallback
  controls. These use synthetic API responses and no application worker.
- **2 existing hardware cinematic tests passed in 15.0 seconds** against a static
  production preview only: intro timing/session/skip behavior, real WebGL and
  context-loss fallback. No API, worker, native staging or inference was started.
  Full scroll captures and physical mobile devices were not re-certified.
- Strict TypeScript/Vite production build and formatting passed. Main JS is
  258.65 kB / 80.89 kB gzip; lazy world remains 591.78 / 153.32 kB. The existing
  lazy-chunk warning remains; this is not a performance improvement claim.
- npm audit and the hashed frozen Python runtime/dev audit found zero known
  vulnerabilities. All 17 locked brand checks and the current README artwork
  validator passed. Ruff, whitespace and configured-credential scanning passed.

Two private cinematic-harness setup attempts failed before tests: a relative
config path resolved outside the workspace, then preview ran from the repository
root rather than web/. The corrected absolute config and web working directory
passed without changing the original tests. Harness logs remain private.

The Actions-only commit `0eb8203` passed hosted
[CI](https://github.com/Asembris/ShelfReady/actions/runs/42027547245) and
[Security](https://github.com/Asembris/ShelfReady/actions/runs/42027547404).
The first combined branch failed Linux CI at the unchanged mapping-panel
assertion ([run](https://github.com/Asembris/ShelfReady/actions/runs/42028427968));
its Python job and Security passed. The frontend package/lock files were restored
in a follow-up commit, preserving that failure in history. The final reduced
branch is checked again after pushing. Existing live evidence
describes its original deployed versions; **these new dependencies are not
deployed or live-provider verified**. No production-version claim was updated.
No paid inference, live integration test, VM operation or deployment occurred.

Final accepted scope is the four Actions pins and python-dotenv 1.2.4 only.
React/DOM remain 19.2.0, their types 19.2.2, Playwright 1.56.1, and
Tailwind/plugin 4.1.17. Neither the candidate Linux failure nor its local successes
are relabelled as a verified frontend upgrade.

After restoration, all **17 portable tests passed in 32.8 seconds**, production
TypeScript/build and formatting passed, and the original bundle sizes returned
(main 229.29 kB / 72.26 kB gzip). Brand/artwork checks and the npm audit passed
again. The 118-test offline Python pass and frozen Python audit apply to the
accepted dotenv version; neither changed during frontend restoration.
