# Phase 5 approval-ready deployment plan

Status: NOT PROVISIONED. Public HTTPS, remote SSH containment and cloud cleanup
have NOT been verified. Deployment verdict is NO-GO until approval and live gates.
Phase 4 benchmark and its French failure are preserved; the reliability fix is
not a competitive rescore.

## Exact proposed billable resources

Catalog checked November 4, 2026 via public `https://api.vultr.com/v2/plans` and
`/v2/os`. Region: Paris `cdg`. OS: Ubuntu 24.04 LTS x64, OS ID `2284`.

| Role | Plan | CPU/RAM | Local SSD | Included transfer/month | Price |
|---|---|---|---|---|---|
| Control | `vc2-2c-4gb` | 2 shared vCPU / 4096 MB | 80 GB | 3072 GB | $0.027/hour, $20/month |
| Runner | `vc2-1c-2gb` | 1 shared vCPU / 2048 MB | 55 GB | 2048 GB | $0.014/hour, $10/month |

Combined published rate: $0.041/hour; $0.984/24 hours; $2.952/72 hours;
$30/month listed total. These are estimates from current catalog fields, not
account-specific invoices or a guaranteed spend cap. Taxes, inference subscription/
usage and transfer overage are additional/unknown. No backups, snapshots, extra
IPs, block storage, load balancer or paid DNS/domain purchase is proposed. Recheck
availability/rates immediately before creation; request approval if they increase.
Proposed initial authorization window: 72 hours, followed by owner review.
VMs may bill while powered off: destroy approved instances to end their resource
allocation, not just shut them down. No automatic destruction of owner resources.

## Roles and configuration

Control: Caddy static React build + authenticated HTTPS; loopback FastAPI, one
worker, SQLite, pinned trusted native WooCommerce/MariaDB Compose stack. Vultr
inference key and runner private SSH key only in root-owned, restricted
`/etc/shelfready/control.env`/SSH key file. Never copy `.env`, runtime data or the
whole workspace to runner. Public API port is never opened. Use one API process.

Runner: Python 3.12, Docker/cgroup v2, pinned sandbox image, and only the minimal
`shelfready/{__init__,runner,sandbox}.py` dispatcher package. No inference key,
control environment, database, uploads, Docker socket or host mounts inside
transformation containers. Restricted SSH authorized key must use a forced
command pointing to `python3 -m shelfready.runner`, `restrict`, no forwarding,
PTY or user rc. Runner Docker-group membership is host-root-equivalent: dedicate
this VM entirely to this dispatcher. Verify host fingerprint through the Vultr
console before populating control known_hosts; never disable host-key checking.

Firewall: control TCP 80/443 for demo HTTPS; TCP 22 only from owner's admin IP.
Runner TCP 22 only from control public IP and owner's admin IP for setup; no
other inbound ports. After setup remove admin access to the dispatcher account.
Control/runner are separate instances; generated code never executes on control.

Install locked Python dependencies and build static UI from the approved commit.
Install official Caddy and Docker packages, record actual versions/digests in the
cloud evidence, and validate Caddy config before enabling it. Service templates
are supplied, not a claim that bootstrap has run. Generate disposable store
credentials locally with the trusted store setup; its code does not execute
generated Python. Pre-pull all pinned images. Set `RUNNER_HOST`, key path,
`SHELFREADY_PUBLIC_ORIGIN=https://APPROVED_FQDN`, and leave
`SHELFREADY_LOCAL_RUNNER` UNSET. Refuse deployment if it is set to 1.

Caddy needs a systemd environment drop-in for DEMO_DOMAIN/USER/PASSWORD_HASH;
generate the password/hash privately, with no secret in Git or process logs.
Use an invite-only shared Basic Auth credential for this bounded synthetic demo,
not anonymous registration. Supply only baseline/update fixtures via the static
`web/dist/demo/` directory. Public API rejects any different CSV bytes, limits
requests globally to 120/minute, retains the persistent 30-upload lifetime quota,
70 KB HTTP bodies, 16 KiB CSVs, 100 rows, one active job and existing sandbox limits.
Do not reset quotas during public access. Protect all API/download/static routes
with Caddy authentication. This is a bounded demo, not multi-tenant authorization.

## Post-approval evidence gates

1. Record approved IDs/plans/region, rates, versions, host fingerprints and DNS.
2. Confirm HTTPS certificate, no unauthenticated API/download access, wrong-origin
   denial, request/upload/job limits, and rejection of non-allowlisted data.
3. Run the browser against the public FQDN with synthetic fixtures and invite
   credentials: upload, confirm, real Vultr request, SSH runner execution, native
   import, independent readback, verified CSV/report downloads. Record request ID,
   runner container ID/limits and output hashes; redact credentials.
4. Run a controlled infinite loop and denied-network/read-only-root probes ONLY
   through the remote dispatcher. Expect timeout/denial, no CSV release, and no
   remaining labelled containers. Do not run destructive or escape tests on control.
5. Independently list runner labelled containers and control rehearsal volumes/
   networks; verify removal on success/failure. Record evidence in ignored
   `artifacts/cloud/`, manually summarize results in public docs.
6. GO only after those gates pass. A local regression or SSH mock is not cloud
   evidence. Keep access bounded, inspect usage, and review teardown after 72 hours.

Required owner inputs/approval: approve the two configurations and estimated
charges; provide a DNS FQDN under your control, admin source IP/CIDR, and a way to
provision (Vultr account/API access). No billable action has been taken.

## Local preparation evidence (not cloud evidence)

French reliability regression on November 4, 2026: real Vultr request
`chatcmpl-6e167da1-0e81-403c-a1f4-a8cf1490eaf1` used 1,641 total tokens.
Its new program passed the restricted local sandbox and returned both rows:
`00017 / 15.00 / 8` and `AB-020 / 4.00 / 2`. Native WooCommerce persisted both,
independent SQL verified them and unchanged fields, and cleanup completed.
Raw evidence is ignored in `artifacts/phase5-french/result.json`. This is a
targeted reliability regression, not a new competitive score or a guarantee
against every future model error. Frozen Phase 3/4 evidence is unchanged.

Local full suite: 97 passed in 126.68 seconds, one upstream deprecation warning.
The subsequently added public synthetic-file/rate/origin guard test separately
passed (1 test). Ruff and whitespace checks passed. Deployment templates have
not been bootstrapped or cloud-validated. No public HTTPS journey or remote
containment result exists yet. NO-GO for declaring deployment complete.
