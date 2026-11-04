# Phase 5 live deployment evidence

Status: resumed on `fix/vultr-cloud-verification` from merged main `9abf33e`.
Only the existing approved VMs are used; the billing deadline is unchanged.
Now **STOPPED at a genuine native-staging failure**. **NO-GO for public demo**
until HTTPS, authentication, remote isolation, native staging/readback, browser
and cleanup gates pass. This document records live operations, not simulated
cloud evidence. Phase 3/4 benchmark results are unchanged.

## Approved resources and billing window

Only these two Paris `cdg` Ubuntu 24.04 x64 instances were created after explicit
owner approval and unchanged pricing/capacity/permission checks on November 4:

| Role | Instance ID | IPv4 | Plan | Created UTC |
|---|---|---|---|---|
| Control | `85d80015-3128-46bd-9188-50a5a9e092b0` | `95.179.218.142` | `vc2-2c-4gb` | Nov 4 12:42:00 |
| Runner | `ad67b797-3d07-492c-9e5d-5dde7f0ea5ff` | `217.69.13.189` | `vc2-1c-2gb` | Nov 4 12:42:06 |

72-hour owner review deadline: **November 7, 2026 12:42 UTC / 13:42 Europe/Paris**.
Published total rate $0.041/hour, approximately $2.952 for 72 hours; no backups,
IPv6, paid DDoS protection, block storage or other paid add-ons were requested.
This is an accrual estimate, not an invoice or enforced spend cap. Actual
attributed invoice charges are not yet available. On November 4 at 12:50:51 UTC,
the instance API reported **$0.03 control + $0.02 runner = $0.05 pending charges**.
These are provider-reported per-instance pending charges, not final invoices,
and may reflect rounding/minimum billing increments. They continue to accrue.
Do not confuse account-wide
pending charges with the cost of these two instances. Power-off can still bill.

## Provisioning and private gates

Dedicated firewall groups were created and their exact SSH-only /32 rules read
back before creation; instance attachment was read back immediately afterwards.
The runner additionally permits the control IPv4 /32. No public SSH source was
added. Other inbound traffic remains denied; web ports are still closed.
Control firewall: `5b5b5e5f-c49b-4e9a-a12e-d731dcdcf9be`.
Runner firewall: `b87bbeee-ea37-4cf9-8c72-def6959a4f48`.

SSH host keys were generated privately and pinned before creation, then installed
using cloud-init over the authenticated TLS Vultr provisioning request. This is
the explicit alternative to console fingerprint retrieval in the original plan;
no unauthenticated keyscan or disabled host checking was used. The provider and
its cloud-init data delivery remain trusted. Each VM accepted strict pinned-key
SSH and reported `cloud-init status: done`. A transient control boot refusal
cleared within bounded readiness checks; no firewall/trust bypass was made.

Bootstrap installed Python 3.12.3, Docker 29.1.3, Compose 2.40.3 and confirmed
cgroup v2 on both hosts. Control Caddy 2.11.8 remains masked after failed validation.
Runner pulled the contracted Python image by digest. Package logs and inventory
are retained under ignored `artifacts/cloud/` and `.runtime/cloud/`. Management
API credentials remain on the local Windows machine; no key values enter Git.
`95.179.218.142.sslip.io` resolves to the control IPv4; TLS is not yet verified.

## Previous failed gate and retained evidence

The setup command incorrectly sourced `/etc/shelfready/caddy.env` through a
shell. This expanded dollar characters in the bcrypt password hash. Caddy
validation exited 1 with `base64-decoding password: illegal base64 data at
input byte 2`. A redacted diagnostic confirmed that the stored value is still
bcrypt-shaped but shell sourcing changes it. No credential values were printed
or committed. This is an operator setup error, not evidence of a model failure.

Per the owner's explicit stop-on-failure instruction, no further deployment,
service start, web firewall opening or generated-code execution was attempted.
Read-only checks confirmed Caddy masked, API/worker inactive, control firewall
one SSH /32 rule, runner firewall two SSH /32 rules, and no containers on either
host. Strict host checking and authentication were not disabled to pass a gate.

The service key installation itself is verified on Linux:
`/etc/shelfready/ssh` root:shelfready 0750; private key shelfready:shelfready 0400;
known_hosts root:shelfready 0640. The installer successfully parsed the key as
the service account. Runner's source-bound forced-command authorized key is
installed. Actual service-account SSH dispatch and containment are **unverified**.
The control inference credential is installed privately; no inference key or
control private dispatcher key was copied to the runner.

A local correction, `deploy/validate_caddy.py`, loads the environment literally
with interpolation disabled and passes it directly to Caddy via subprocess
environment, preserving dollar characters. Its synthetic regression verifies
the hash and avoids shell execution. It is prepared for review, **not applied
or cloud-validated after the stop**. On authorized resumption use the control
venv Python to run this helper rather than sourcing the environment file.

At 12:51 UTC, idle memory used was 644 MiB control / 429 MiB runner, with zero
swap used; root filesystems used 14 GiB / 9.5 GiB respectively. These are idle
snapshots, not workload measurements or proof of sandbox enforcement. Actual
remote container CPU/memory/PID/time limits, failure containment, HTTPS/auth,
public browser journey, native cloud WooCommerce/independent SQL and job cleanup
remain **NOT RUN**. No destructive probes ran on the control host. The public
Playwright test must not be reported as passed merely because its config lists.

## Resumed private verification

The corrected literal-environment Caddy validation passed on the existing
control VM. Real SSH dispatch as `shelfready` returned `remote-service-account-ok`
with strict host checking. API and separate worker then started privately as
`shelfready`, with zero restarts and a working loopback API.

Real probes through `deploy/verify_remote.py` executed only on runner:
non-root UID 65534, cleared environment, root-filesystem write denied, outbound
network denied; infinite loop timed out in 5.466 seconds with exit 137; a 256 MiB
allocation exited 137 under the 128 MiB cap. Independent host inspection caught
all three containers and confirmed network none, read-only root, 128 MiB memory
and swap cap, 0.5 CPU, 32 PIDs, all capabilities dropped, no-new-privileges, no
bind mounts, bounded tmpfs and file-descriptor/file-size/core limits. A timeout
sample used 49.44% CPU, 7.773 MiB/128 MiB and one PID. Short-lived probes finished
too quickly for a stats sample. No labelled containers remained after cleanup.
PID exhaustion and host-kernel escapes were not stress-tested; Docker shares
the runner kernel. No containment probe executed on control.

Evidence: `artifacts/cloud/caddy-corrected-validation.log`,
`service-account-dispatch.json`, `remote-containment.json`, and
`remote-container-inspection.json`. These are live remote observations, not
synthetic mocks. Public HTTPS/native staging/browser gates are still pending.

## Public verification and genuine end-to-end failure

The first HTTPS readiness attempt failed: UFW on the supplied Ubuntu images
allowed only SSH, although the provider firewall had the correct web rules.
`deploy/configure-firewall.sh` aligned the host rules without disabling UFW.
It also removed the vendor's unrestricted host SSH rules; both layers now use
the approved /32 sources. Provider restrictions protected SSH throughout.
The runner received no web allowances. A second check found that Caddy's SPA
fallback swallowed the documentation 404; using an explicit mutually exclusive
`handle` fixed it. These operational failures are retained, not reported as passes.

After those corrections, real HTTPS passed with TLS 1.3 and a valid Let's Encrypt
YE2 certificate for `95.179.218.142.sslip.io`, expiring February 2, 2027. Certificate
validation was never disabled. Anonymous homepage/API/download/fixture requests
and wrong passwords returned 401; authenticated homepage returned 200; hidden
documentation returned 404; wrong-origin POST returned 403; modified supplier
upload returned 422; oversized body returned 413. Both downloadable fixtures
matched source bytes. Evidence: `https-auth-gates.json`, host firewall logs and
`control-web-firewall.json` under ignored `artifacts/cloud/`.

The first public Playwright run failed **before upload** because its supposedly
anonymous request context inherited configured Basic Auth credentials. The
harness now explicitly clears `httpCredentials`. That failure is preserved in
`artifacts/cloud/first-browser-harness-failure/`; independent HTTP checks had
already shown real anonymous denial. This is a test setup correction, not an
authentication bypass or a passed end-to-end result.

The corrected public Playwright run passed those access checks and uploaded the
two approved fixtures with explicit mapping confirmation. Job
`09db378d210f454e830d78cd6d899919` made real Vultr request
`chatcmpl-285ac8e7-d421-4f47-a986-024258dfeea1` to `qwen3.8-27b`: 298 prompt +
537 completion = **835 tokens**. Inference USD cost remains unknown. One generated
transformation passed trusted validation and executed in runner container
`106928aae54d`; independent inspection confirmed its isolation settings.

The job then failed with `RuntimeError` in the native staging path. Observers
saw the pinned MariaDB/WordPress/WP-CLI containers, with no published store ports,
but obtained **no product SQL snapshots**. The worker report omits the failing
native command and stderr; retained Docker events do not identify its cause.
Do not infer a specific cause, claim persisted-value/readback verification, or
retry the model to manufacture a successful run. Next work requires bounded,
credential-safe native-import diagnostics and an authorized reproduction.

The public browser test therefore **FAILED**, with no verified CSV or change
report downloaded. Both failed-job download endpoints returned 409. The stored
job has `csv=NULL`, cleared input data and confirmation, and one consumed upload
quota slot. No quota was reset. Independent observations confirmed no remaining
runner containers and no native store containers, volumes or networks. This
verifies the real failure cleanup path, **not a successful cloud rehearsal**.

After the genuine failure, no further jobs or generated-code attempts ran.
Caddy/API/worker were stopped and disabled; public provider ports 80/443 were
removed, leaving only the approved SSH /32 rules. UFW remains enabled. Two
existing VMs remain allocated/running, with no added resources. At November 4
13:50:28 UTC, their API pending charges were **$0.06 control + $0.03 runner =
$0.09** (not final invoices). Review remains November 7, 12:42 UTC / 13:42 Paris.

Evidence also includes `failed-public-job.json`, `public-playwright.log`,
`browser-native-observation.json`, `browser-runner-observation.json`,
`failed-job-download-denial.json`, `native-failure-events.json`,
`final-closed-state.json` and role `*-final-cleanup.log` under `artifacts/cloud/`.
No credentials or generated artifacts are committed. Phase 3/4 evidence and
competitive conclusions remain unchanged.

## Current verdict and reproduction

**NO-GO** for deployment completion or public launch. Caddy, valid HTTPS,
authentication, upload restrictions, real inference, remote sandbox containment
and failure cleanup have live evidence. Successful native import, independent
persisted product readback and a passing public upload-to-download journey do not.
Live request-rate exhaustion, lifetime-quota exhaustion and concurrency rejection
were not tested after the genuine failure; their local tests/configuration must
not be labelled live proof. A concurrency probe found no still-active job and
made no confirmation request. Do not reset quota or weaken validators to pass.

On authorized resumption, inspect only the two recorded IDs; do not run
`deploy/provision.py`. Diagnose native staging privately before opening the demo.
Use control venv Python with `deploy/validate_caddy.py` for literal environment
validation. Run `python -m deploy.verify_remote` as the control service account
with its private service environment, then verify host cleanup independently.
For public verification, supply the private demo environment to
`npm run test:public` from `web/`; this starts no local services, retains strict
TLS and has no automatic retries. The two-file allowlist remains intentional.
Keep every failed run and record any corrective rerun separately.

Current local full suite: **100 passed in 126.27 seconds**, one upstream warning;
Ruff, production TypeScript/Vite build and `git diff --check` passed. The browser
harness now saves the job ID and terminal status before asserting success, so
future failures retain useful evidence; that retention-only change was not used
to rerun this stopped cloud job.

## Previous checks and teardown

Final local checks: **100 passed in 79.82 seconds**, one upstream Starlette/AnyIO
deprecation warning; Ruff and `git diff --check` passed. The TypeScript/Vite
production build passed and includes the two downloadable synthetic fixtures.
The earlier pre-correction full run passed 99 tests in 94.79 seconds. These are
local tests, including local Docker verification and a synthetic hash-preservation
regression, not public HTTPS/browser or remote containment results.

Evidence files: `artifacts/cloud/caddy-failed-gate.json`, `stopped-state.json`,
`control-stopped-usage.log`, `runner-stopped-usage.log`, role bootstrap logs and
control release log. All are ignored; private inventory and keys are under
`.runtime/cloud/`. Public demo access remains **NO-GO**. Do not use the failed
deployment as a competitive benchmark improvement.

`deploy/provision.py` performs guarded one-time creation and refuses to run over
an existing inventory. Never rerun it to repair an existing deployment. Review
the two approved IDs and existing firewalls before any operation. Bootstrap uses
`deploy/bootstrap.sh` for the selected role, with web ports blocked throughout.

After owner-directed teardown, delete **only** the two instance IDs above in
Vultr Console or via authenticated `DELETE /v2/instances/INSTANCE_ID`, then verify
both are absent from the instance list. Remove the two dedicated unused firewall
groups and admin SSH-key registration `932792ce-8264-4e5c-8004-75191c0ffa04` only
after verifying they have no other attachments. Remove private deployment keys
and invite credentials locally when recovery is no longer needed. Do not delete
unrelated resources. Record deletion times and final provider billing when
available. No automatic destruction is configured; review is due at the deadline.
