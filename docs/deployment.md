# Phase 5 live deployment evidence

Status: provisioned, **STOPPED at failed Caddy validation gate**. **NO-GO for public demo**
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

## Failed gate and retained safe state

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

## Reproduction and teardown

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
