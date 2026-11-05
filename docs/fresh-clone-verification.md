# Fresh-clone verification

November 5, 2026. Cloned `origin/main` at `7391760` into a new system temp
directory outside the working checkout. Checked its ancestors for dotenv files.
The clone began without a venv, node_modules, dotenv file, runtime directory or
artifacts. Package and Chromium downloads used dedicated empty caches. The host
provided CPython 3.12.12, uv 0.9.18, Node 24.11.0, npm 11.6.1 and Docker
Desktop with a Linux engine, cgroup v2 and Compose v5.0.0-desktop.1.

An initial trial nested under the existing checkout was unsuitable for a
credential-free run because dotenv could discover the parent's file. The
credential probe constructed a client without sending a request. The reported
results below use the separate system temp clone. Startup used a copy of the
empty `.env.example` and cleared inherited Vultr, OpenAI, ShelfReady and runner
settings from its subprocess environment.

| Check | Observed result |
| --- | --- |
| `uv sync --frozen` | Default certificate bundle rejected the network chain with `UnknownIssuer`. Windows system trust via `UV_NATIVE_TLS=true` installed 29 locked packages from an empty cache. |
| `npm ci` and Chromium | 126 packages installed, zero vulnerabilities reported by npm. Chromium 141 and its supporting binaries downloaded to a fresh browser directory. Node used the system trust store. |
| Offline Python before store setup | 115 passed, 3 skipped because the WooCommerce archive was absent, 10 Docker/native cases deselected. |
| Offline Python after setup and configuration fix | 121 passed, 10 deselected, two upstream deprecation warnings. The default Windows pytest scratch directory raised WinError 5 during fixture setup. The documented fresh `--basetemp` path resolved it. |
| Frontend | Strict TypeScript and Vite production build passed with the existing lazy-chunk warning. All 17 portable browser tests passed in 41.2 seconds. |
| Repository checks | Ruff, frontend and README formatting, 17 brand assets, showcase validator, whitespace and tracked-file credential scan passed. |
| Real local launch | Vite returned HTTP 200 and proxied an actual API upload. The API returned mapping candidates and rejected absent consent with 422. The worker handled a confirmed job with a blank key and returned a configuration failure. CSV and report endpoints returned 409. |
| Disposable native store | Fresh WooCommerce 10.3.5 archive matched the pinned SHA-256. Native baseline import and update passed. SQL read `00017` at 13.55/7 and `A-2` at 1.35/2. The database reset was empty and project containers, volumes and network were absent afterward. |

Docker pulls checked all four pinned image digests against the registry. The
existing engine already held matching layers, so cold Docker layer transfer
remains unverified. The native probe used newly created project containers,
volumes, store credentials and plugin archive. Both Compose project labels and
the sandbox label were checked for leftovers after the smoke test.

The first startup harness hit a Windows OpenSSL error while creating an
unnecessary HTTPS handler for loopback. Direct HTTP resolved that harness issue.
One subsequent run lost the API after confirmation. A fresh job directory and
separate logs produced a pass with direct venv invocations, then another pass
with the exact README launch commands. The initial interruption's cause remains
unconfirmed. All launched process trees were stopped.

The configuration fix rejects missing, empty and whitespace-only keys before
constructing the inference client. The worker surfaces the configuration message
through its existing failure report. Regression tests exercise all three
inputs and check download denial. The smoke job reached the real worker and
failed before inference. The portable browser suite uses synthetic API responses,
while the local startup check used the real API through Vite.

A developer with the documented prerequisites can reproduce the local setup,
offline checks, native store probe, and upload-to-mapping workflow. This check
covers Windows with Docker Desktop. A successful inference-backed rehearsal
requires a configured Vultr key and was outside this verification.
