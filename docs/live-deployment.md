# Phase 8 deployment: blocked at admin access recovery

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
