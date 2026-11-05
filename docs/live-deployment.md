# Phase 8 live deployment evidence

**GO for the invite-only, synthetic, bounded judging demo.** The current cinematic
frontend, API and separate worker are live on the original two Vultr VMs at
**https://95.179.218.142.sslip.io**. HTTP redirects to HTTPS. Basic Auth protects
the UI, fixtures, API and downloads. Retrieve the shared invite locally from
ignored `.runtime/cloud/demo.json` and share it privately with judges; never put
it in Git, screenshots, issues, traces or submission text.

The source release was installed at `88a0e4e`; subsequent commits refine the
operator's deployment/test tools, not application behavior. SHA-256 comparison
confirmed 34 deployed source/config/static files match the final local build.
No frozen evaluation, brand asset, UI design or application validator changed.
This is deployment verification, **not a new competitive agent-value result**.

## Verified public journey

The fresh public Playwright suite passed **3 tests in 1.4 minutes**, without
retries or mocked responses. Its first failure would close provider web access
and stop demo services. One real rehearsal was submitted through the actual UI:
upload allowlisted baseline and supplier files, review mappings, explicitly
confirm intent, run Vultr-generated Python on the separate SSH runner, import
natively into disposable WooCommerce, independently read SQL, and download CSV
and report. Job `e5f5c0f068e644aeb5ef216ae60727ce` completed on attempt one.

- Model `qwen3.8-27b`, request
  `chatcmpl-ce74aa4f-da67-4d6a-8e2c-d4ab71ee2aa1`.
- **298 prompt + 537 completion = 835 tokens**, one request. This is the only
  real inference request in Phase 8, within the prepared six-request ceiling.
  The provider response does not establish a dollar price; actual inference USD
  cost remains unknown, not zero. No repair or corrective inference run occurred.
- Runner container `cb401c11fdfe`: UID 65534, network none, read-only root,
  128 MiB memory/swap, 0.5 CPU, 32 PIDs, all capabilities dropped,
  no-new-privileges and no bind mounts, confirmed outside the generated code.
- An independent host observer queried MariaDB during staging, outside the
  worker. Complete before/after snapshots preserve IDs **10** and **11**, exact
  SKU strings `00017` and `A-2`, and supported unchanged fields. Prices/stock
  change from `12.30/4` to **13.55/7**, and `0.10/0` to **1.35/2**. The trusted
  verifier was also run separately against those observer snapshots.
- Two input rows resolved, zero unresolved. Export CSV SHA-256:
  `d2271f7760fcce61b0cd927e877a9cd5b255bb5e232c834010e0bc35f5012e93`.
  Report SHA-256:
  `a52bd10a00d179660012293b5d02c5cd828176c2bf14b149b73c82620f2c1d0f`.
- The native MariaDB/WordPress/WP-CLI stack had no published ports. Independent
  observers found **zero remaining store containers, volumes or networks and
  zero sandbox containers**. Final job storage has no `rehearsal-*` directories.

The model-free negative control used the same approved files and deliberately
confirmed a wrong SKU/stock mapping. Both rows were held with exact source-row
numbers and `SKU absent from baseline`; zero resolved, no inference attempts,
failed state, no CSV link, and HTTP **409** for both download endpoints. A false
consent request was rejected with **422** before execution. It proves honest
failure/held-row accounting, not a public partial-success or exhausted-model
repair run. Those cases retain automated local coverage; no extra model call or
allowlist expansion was made to demonstrate them live.

## Security, containment and upgraded backend

Owner-assisted console UFW recovery restored strict pinned-key SSH. Only after
both connections succeeded were obsolete admin SSH rules removed at **both**
provider and guest layers; fresh SSH succeeded again. UFW remains active.
Control's provider firewall permits only the approved admin /32 on TCP 22 and
public TCP 80/443. Runner permits TCP 22 only from admin and control /32s. No
unrestricted SSH, replacement host trust, new VM or paid service was used. The
API-key ACL readback contained only two /32 entries and no unrestricted IPv4/IPv6
entry; the old API-key ACL entry was not changed by the SSH-rule cleanup.

Credential hashes and existing usage **2/30** were verified unchanged across
installation; the SQLite backup was retained root-only. Control now runs locked
FastAPI **0.133.0**, Starlette **1.3.1**, python-dotenv **1.2.2**. Real loopback
checks returned missing job 404, malformed upload 422, wrong origin 403 and
untrusted host 400. The real public journey validates these dependencies beyond
mock/test-client behavior. No runtime application patch was necessary.

Private remote probes, never run as generated code on control, verified UID
65534, absent credentials, denied root write/outbound network, infinite-loop
timeout **5.518 seconds / exit 137**, and 256 MiB allocation termination under
128 MiB. Independent runner inspection confirmed the isolation configuration
and cleanup. Docker still shares the runner's kernel; no kernel-escape or PID
exhaustion stress test is claimed.

Two private test-harness failures are retained honestly. The first wrapper's
incorrect `argv[0]` selected system Python, failing `import dotenv` before native
staging. Correcting the interpreter exposed inherited root `HOME`, preventing
the service user from discovering Docker Compose (`compose.up`, exit 125,
no timeout, `/root/.docker/config.json: permission denied`). The application was
not modified to accommodate either harness error. A transient systemd unit with
the **same user, working directory, EnvironmentFile and umask as the worker**
then passed private native import, SQL verification and cleanup. Earlier empty
observer snapshots and failed diagnostics remain separate from this success.

Fresh HTTPS checks verified TLS **1.3**, a trusted Let's Encrypt YE2 certificate
for the exact hostname, expiring **February 2, 2027**, with certificate validation
enabled. Anonymous root/API/fixture/download and wrong-password requests return
401; docs/redoc/OpenAPI return 404; wrong origin 403, modified CSV 422 and >70 KB
body 413. Both authenticated fixture downloads match source bytes. Security
headers and HTTP-to-HTTPS redirect passed. A bounded live rate probe received
**429 on request 121** using missing-job GETs only; a later normal API request
returned 404 after window recovery. No counter or quota was reset.

## Cinematic and accessible public frontend

The public test exercised real hardware WebGL in Windows Chromium, one canvas,
the once-per-tab intro, context-loss fallback, keyboard studio access, and a
WebGL-unavailable control. Reduced-motion studio deep links passed at **320,
390, 768 and 1440 px**, without intro/canvas or horizontal overflow. Axe WCAG
2 A/AA and 2.1 AA scans found zero violations on mapping, verified result, held
result and the four reduced-motion viewport surfaces.

Screenshot inspection found that the first capture loop photographed chapter
edges before the camera/text arrived. A capture-only correction anchors to the
actual narrative copy and waits for reported scene time and completed line/body
transitions. The separate visual-only rerun passed **1 test in 28.5 seconds**,
with no upload/inference. Settled desktop hero, Verify/Release compositions,
verified studio and mobile fallback screenshots were inspected. No UI change
or weakened original cinematic assertion was made.

Observed opening duration: **3.140 s**, then **3.070 s** on the visual-only run.
For 120 idle-hero animation-frame samples, median and p95 gaps were about
**16.7 ms**. These are client rAF intervals on one Windows machine, not compositor
FPS, scroll benchmarks, VM GPU performance or physical-phone measurements.
In the 30-second host sample window, peak used memory (total minus available)
was **887.8 MiB control / 388.0 MiB runner**. This window is not a guaranteed
worst-case peak across every job. Safari, physical mobile GPUs and screen-reader
usability remain unverified; axe cannot establish canvas contrast or usability.

## Availability, bounds, costs and shutdown

Caddy, API and worker are **active and enabled**, each with zero recorded
restarts. API binds only `127.0.0.1:18765`; the runner has no public application
port. Final authenticated readiness returned UI 200 and missing-job API 404;
anonymous UI remained 401. The final queue had zero active jobs, zero failed
jobs with a released CSV, and **4/30 lifetime uploads consumed**. The original
two slots plus this positive and negative control account for that count.

This is a shared-invite demo, not multi-tenant production access. Keep the exact
two-file allowlist, downloadable `/demo/index.html` fixtures, 16 KiB/100-row CSV
bounds, 70 KB requests, 120 API requests/minute, one active job, 30-upload lifetime
quota, three transformation attempts and existing inference time/token limits.
Do not reset the quota for judges. Each new upload can request at most one
interpretation plus three transformations; remaining quota is not a dollar
budget. Reports/downloads expire under the existing 24-hour retention policy.

At **November 5 10:06:39 UTC / 11:06:39 Paris**, the existing VMs were both
active/running/OK with unchanged plans and attached firewalls:

| Role | Existing VM ID | IPv4 | Rate | Provider pending |
| --- | --- | --- | --- | --- |
| Control | `85d80015-3128-46bd-9188-50a5a9e092b0` | `95.179.218.142` | $0.027/hour | $0.66 |
| Runner | `ad67b797-3d07-492c-9e5d-5dde7f0ea5ff` | `217.69.13.189` | $0.014/hour | $0.33 |

Combined **$0.041/hour**, approximately **$0.984/day**, $2.952/original 72 hours,
$30/month listed. Pending charges total **$0.99**, not a final invoice. Inference
USD, taxes and transfer overage are not established by these figures. No paid
add-on or replacement infrastructure was provisioned. The review deadline stays
**November 7, 2026, 12:42 UTC / 13:42 Europe/Paris**. There is no automatic
extension or resource deletion; the owner must review continued allocation.

Monitor without submitting model jobs: run `deploy.inspect_existing` to a new
ignored evidence filename; inspect systemd states/restart counts, private bounded
journals, disk/memory, remaining SQLite usage and provider pending charges.
One authenticated missing-job GET can check API readiness without consuming an
upload. Check certificate/DNS through normal trusted HTTPS. Restrict access or
stop on unhealthy cleanup, unexplained usage, authentication failure or runaway
restarts. Redact any logs before sharing. There is no paid monitoring service.

For a non-billing shutdown, remove only control provider web rules (TCP 80/443),
then `systemctl disable --now caddy shelfready-api shelfready-worker` on control.
After active work has ended, inspect both hosts for labelled sandboxes and the
`shelfready-rehearsal` Compose containers/volumes/networks; use trusted cleanup
only for those exact resources. Preserve SSH restrictions, evidence, credentials
and quota. **Stopping services or powering off does not end VM billing.** Only
owner-directed deletion of the two IDs above ends their allocation; verify absence
and remove dedicated unused firewall/key resources after checking attachments.
See [teardown context](deployment.md#previous-checks-and-teardown).

The hostname remains a temporary third-party `sslip.io` dependency tied to the
retained IPv4, with no owned-domain/SLA guarantee. Shared-kernel Docker, a shared
Basic Auth invite, single-worker capacity and finite quota are explicit limits.
No concurrency/quota-exhaustion cloud stress test or public model-repair failure
injection was performed. Their passing local tests are not live cloud proof.

## Reproduction and final checks

Use the existing private inventory/key/known_hosts and approved API ACL. Never
run `deploy.provision` for this release. The guarded installer rejects unknown
hosts, active/transitional services, existing containers and a prior Phase 8
backup; do not erase evidence to force a rerun. For an approved stopped-host
maintenance checkpoint, build and export before installing:

```powershell
npm --prefix web run build
uv export --frozen --no-dev --no-emit-project --format requirements-txt --output-file .runtime/live-deployment/requirements.txt
.venv/Scripts/python.exe -m deploy.update_existing --evidence artifacts/live-deployment/NEW-release.log
```

The installer selects tracked application files plus the explicit built frontend,
locked requirements and pinned WooCommerce archive. It never copies `.env`,
architecture, evidence, jobs or credentials to the runner. The runner receives
only its three root-owned dispatcher modules. No credential/quota regeneration,
public opening or automatic service start is part of the installer.

For private native reproduction use a fresh transient systemd unit with the
worker's `User=shelfready`, working directory `/opt/shelfready`,
`EnvironmentFile=/etc/shelfready/control.env`, and `UMask=0077`, executing the
**absolute venv Python path** with `-m deploy.private_native` and a new private
artifact directory. For containment execute `-m deploy.verify_remote` in the
same service context with remote runner configuration; never execute its probe
strings on control. Preserve every failed run and inspect cleanup independently.

For public browser reproduction load only the private demo environment into the
process, set `SHELFREADY_PUBLIC_EVIDENCE` to a **new absolute directory under
`artifacts/`**, and run `npm run test:public` from `web/`. This consumes two upload
slots and at most three transformation requests; review remaining quota and
authorization first. `--grep "serve cinematic"` runs only visual/fallback checks
without jobs/inference. Raw Playwright traces/videos are deliberately off because
network traces can retain Basic Auth; `response-trace.json` retains only time,
method, sanitized path and status. Screenshots, response diagnostics, SQL/runner
observers, fixture/output hashes and resource samples stay ignored/private.

Final local checks: **128 Python tests passed in 89.50 seconds**, including local
Docker/native tests; **17 portable browser tests passed in 33.1 seconds**;
strict application TypeScript/production build, formatting (including manually
checked public test files), all 17 brand checks, Ruff, whitespace and tracked-file
credential scan passed. npm audit and hashed frozen runtime/dev Python audit found
**zero known vulnerabilities**. Full-history redacted Gitleaks is run before push.
An additional out-of-project attempt to type-check Node-based Playwright files
cannot resolve Node declarations in the existing dependency set; it is not the
application TS configuration and is not claimed green. Actual public test
collection and browser execution pass. No dependency was added just for that
ad-hoc check. Existing upstream deprecation and lazy-world size warnings remain.

Primary evidence: `artifacts/live-deployment/https-auth-gates.json`,
`remote-containment.json`, `native-systemd-{result,readback,observation}.json`,
`release-manifest.json`, `public-live/`, `public-visual-settled/`,
`public-rate-limit.json`, `judge-service-state.log`, `final-public-health.json`
and private provider/firewall snapshots. Raw credentials, console capabilities,
personal admin addresses and generated artifacts are excluded from Git. All
earlier Phase 5/competitive evidence remains historical and unchanged.

## Historical blocked checkpoints

## November 5 access-recovery checkpoint

On resumption after the owner's PC restart, `feat/live-deployment` was clean and
Docker Desktop responded with client/server 29.1.3, Linux containers and cgroup
v2. No local ShelfReady API/frontend listener or running container was found.
Unrelated stopped containers were left untouched. The complete local Python
suite subsequently passed **121 tests in 88.60 seconds**, including the existing
Docker/native tests, with two upstream deprecation warnings and no real model
requests. Production TypeScript/Vite build, formatting, all 17 brand checks,
Ruff and whitespace checks passed. The existing lazy-world size warning remains.

Two public-IP lookups agreed that the owner's address had changed. The first
management request returned HTTP 401, explicitly rejecting the new source. After
the owner manually authorized its new /32, API access returned HTTP 200. Readback
of the current user's IP whitelist contained exactly two /32 entries, with no
unrestricted IPv4 or IPv6 entry. No API key was regenerated or disclosed.

With explicit owner approval, the new admin /32 was added to **both existing
provider firewall groups**, and read back against the attached existing VMs.
The old admin /32 was deliberately retained pending successful SSH. Runner's
control-VM /32 was preserved. All provider rules remain IPv4 TCP 22 /32 rules;
no web allowance, public SSH, new firewall group or new VM was created.

Strict pinned-key SSH still returned exit 255 with a TCP timeout to both hosts.
The previously verified guest UFW rules allow the old admin source, so a guest
allowance for the new source is a plausible remaining cause, **not yet a fresh
guest-state observation**. Both management records report active/running; actual
service state cannot be established through unreachable SSH. Automated noVNC
inspection again stopped at human verification without bypassing it. The owner
was asked to add only the approved new SSH /32 through each console, preserving
UFW and all existing rules. No reboot or service restart was requested here.

Evidence is retained privately under `artifacts/live-deployment/` in
`hosts-resume-20261105.json`, `hosts-new-admin-source.json`,
`admin-source-added-private.json` and the two `*-console-resume.png` files.
API ACL and console capabilities remain ignored under `.runtime/`; never publish
these private records. The provider's pending charges at this checkpoint were
**$0.63 control + $0.32 runner = $0.95**, not an invoice. Rates and the November 7
13:42 Paris review deadline below are unchanged. No inference request, release
installation or new public test occurred. Once guest access is restored, verify
both SSH connections before removing either old admin rule at either layer.

The earlier checkpoint below is retained as history; its host service snapshot
and pending charges must not be treated as fresh observations after the restart.

**NO-GO for a judge-ready deployment.** On November 5, 2026 (Europe/Paris), work
started from a clean tree, fetched origin and fast-forwarded `main` to `4337d2a`,
then created `feat/live-deployment`. The earlier successful Phase 5 journey is
historical evidence, not a Phase 8 result. No new application release has been
installed, no model request issued, and no public test run in this phase.

## Actual infrastructure observations

Only these already approved Paris instances were inspected:

| Role | Existing instance | IPv4 | Plan | Provider pending charges |
| --- | --- | --- | --- | --- |
| Control | `85d80015-3128-46bd-9188-50a5a9e092b0` | `95.179.218.142` | `vc2-2c-4gb` | $0.33 |
| Runner | `ad67b797-3d07-492c-9e5d-5dde7f0ea5ff` | `217.69.13.189` | `vc2-1c-2gb` | $0.17 |

The management API reports both active/running and the expected firewall-group
attachments. Provider SSH rules remain two narrow approved /32 sources on runner
(admin and control) and one on control (admin). No rule or host-key trust was
changed. Control's provider firewall has no web allowance. Its host UFW remains
active; existing host web rules do not make it public through the provider layer.

Strict pinned-key SSH to control succeeded. Caddy, API and worker are inactive
and disabled, with no listed containers. Idle control memory was 581 MiB used,
no swap used, and 58 GiB free on root. Its installed FastAPI/Starlette versions
remain the old Phase 5 versions; the newly audited source dependencies have
**not** been deployed. Public access was not opened around those old dependencies.

Direct admin SSH to runner timed out before authentication. The same port also
timed out from the explicitly approved control source, including an SSH jump
using only locally held admin keys and the existing pinned host fingerprints.
The current admin IPv4 matched its approved source through two independent
lookups. No public SSH rule, replacement host key or disabled firewall was used.

One reboot request was sent to the **existing runner ID only** after confirming
the control services were stopped. It did not restore observed SSH reachability.
The final read-only snapshot at **November 4 23:37:13 UTC / November 5 00:37:13
Paris** records control exit 0 and runner SSH exit 255 with a TCP connection
timeout. This establishes unreachable SSH, not a particular guest-network,
UFW, sshd, kernel or provider root cause. Guest state cannot yet be inspected.

An authenticated management console link was obtained privately. Browser
inspection encountered the provider's human-verification challenge. It was not
bypassed. The owner has been asked to inspect the runner console and restore
network/SSH without reinstalling, replacing resources, changing host keys or
disabling firewalls. A required security-boundary change needs explicit approval.

## URL, billing, availability and review

Retained hostname: `https://95.179.218.142.sslip.io`. Its DNS A record still equals
the control IPv4. **It is not currently an available Phase 8 public demo.** Fresh
HTTPS/authentication/cinematic/public workflow verification has not occurred.
Services and provider web access remain closed while the runner gate fails.

Current catalog rates remain **$0.027/hour control + $0.014/hour runner =
$0.041/hour**, approximately $0.984/day and $2.952 for the original 72 hours.
The provider pending-charge snapshot totals **$0.50**; this is not a final invoice
and can lag or round allocation charges. No VM, add-on, paid domain, snapshot or
other service was created. No inference calls were made in this phase. Existing
allocation continues billing while this blocker is unresolved, even if powered
off. Taxes, overage and subscription charges are not included in the estimate.

The owner review deadline is unchanged: **November 7, 2026 at 12:42 UTC /
13:42 Europe/Paris**. There is no automatic destruction or extension. After
owner-directed teardown, delete only the two recorded instance IDs, verify their
absence, and remove the dedicated unused firewalls/keys only after checking their
attachments. See [existing teardown instructions](deployment.md#previous-checks-and-teardown).
Stopping services or powering off is not confirmed billing termination.

## Reproducible evidence and resumption

Read-only host inspection, from the repository root:

```powershell
.venv/Scripts/python.exe -m deploy.inspect_existing --output artifacts/live-deployment/NEW-host-snapshot.json
```

This helper validates both exact existing IDs/IPs before SSH, uses strict host
checking and the existing admin key/known-hosts files, bounds connections and
output, redacts configured secrets, returns failure for an unreachable host and
refuses to overwrite evidence. It cannot provision or reboot. Tests reject
replacement/additional inventory entries before any connection.

Ignored evidence: `artifacts/live-deployment/preflight-private.json`,
`hosts-after-reboot.json`, and `runner-console.png`. Private console capabilities
remain under `.runtime/live-deployment/`, never in logs or Git. Original Phase 5,
CI, cinematic and competitive evidence is not relabeled as current verification.

Once the owner restores runner access, resume on this branch: recheck both
firewalls and host trust; inspect the runner before any jobs; privately install
the audited locked release while closed; validate Caddy literally; verify service
key ownership, remote isolation, and a trusted native import/readback/cleanup;
then open authenticated HTTPS and run a fresh public Playwright journey. Preserve
SQLite quota and credentials. Never rerun `deploy/provision.py` for recovery.

Verification budget prepared for resumption: one successful allowlisted public
rehearsal, at most one diagnosed corrective rerun, **maximum six model requests**
total (the existing three-attempt bound per job). A model-free negative control
can deliberately map all source SKUs to unknown values using the unchanged
allowlisted files, proving holds and download denial without inference. No
arbitrary public input expansion, quota reset or guessed business meaning.

After successful verification the requested operating state is authenticated
HTTPS with enabled API/worker/Caddy and existing abuse bounds, left accessible
for judging. That state has **not** been reached. Monitoring should inspect
systemd/journal health, remaining persistent upload quota, TLS, disk/memory and
provider costs without submitting repeated model jobs. Monitoring or shutdown
must never silently clear failed jobs, reset quotas or destroy unrelated hosts.

## Completed local checks and precise limits

Local checks passed: **111 offline Python tests**, 10 live tests explicitly
deselected; **17 portable Playwright tests in 33.6 seconds**; strict TypeScript/
Vite production build, formatting, Ruff, whitespace and tracked-file secret scan.
All 17 locked brand assets passed. npm audit found zero vulnerabilities. Full
history Gitleaks found no leaks across 101 commits at the inspection-tool commit.
Two known upstream httpx/AnyIO deprecation warnings and Vite's existing large
lazy-world chunk warning remain. No validator or test was weakened.

Not run: new cloud release, new HTTPS/auth checks, remote containment, current
native SQL readback, public upload-to-download, cloud cleanup proof, public
desktop/mobile/cinematic/accessibility/fallback checks, or judge availability.
The remaining blocker is **runner SSH reachability requiring guest/provider
console diagnosis**. Local passes do not substitute for these mandatory gates.
