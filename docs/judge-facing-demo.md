# Judge-facing demo candidate

This branch prepares anonymous judging on the existing control and runner VMs.
It has no production deployment evidence of its own. The previous invite-only
deployment and its results remain in [live deployment evidence](live-deployment.md).

## Modes and limits

- **Live rehearsal** accepts the two existing synthetic CSVs in their assigned
  roles. A visitor must still review mappings and explicitly confirm intent.
  The worker runs the existing Vultr → restricted SSH runner → sandbox →
  native WooCommerce → independent SQL verification → cleanup pipeline.
  Failed verification or cleanup releases neither download. Public reports
  omit provider response identifiers and internal diagnostic details.
- **Verified replay** is an authored read-only excerpt of the November 5
  recorded observer results. It preserves exact SKU strings, prices and stock.
  The source report and CSV retained locally matched the SHA-256 values in
  the [deployment evidence](live-deployment.md#verified-public-journey). No raw
  report, job capability or generated artifact ships in the replay. Opening it
  creates no job or inference request.
- Caddy serves the frontend, brand assets and exact fixture paths. The public
  API allowlist covers upload, confirmation, status and the two downloads.
  It excludes model interpretation, documentation and administrative paths.
  The API also disables free-text model interpretation and accepts only exact
  same-origin POSTs in judge mode. SSH restrictions and runner configuration
  stay in place.
- Caddy replaces the visitor header with the direct TCP peer address. The API
  accepts it only from its loopback proxy. It uses a keyed digest of IPv4 or
  the IPv6 /64 for ownership and throttling. Status and download require that
  digest and the job UUID. Users on a shared network share limits. A visitor
  who changes networks may lose access to their job. A distributed client can
  exhaust shared limits and a network-level flood can impair availability.
- SQLite admits at most eight confirmed rehearsals globally per rolling hour,
  two confirmations per network per hour, three accepted uploads per network
  per hour, and one queued or running rehearsal at once. Rejected confirmations
  leave the job in mapping state. The application retains the existing 120
  API requests per minute process-wide, 70 KB request limit, 16 KiB and 100 rows
  per CSV, and 24-hour job retention.
- Lifetime uploads default to 30. Set `SHELFREADY_UPLOAD_QUOTA=150` only after
  the deployment checks below. An isolated SQLite sample with 150 fixture
  jobs, half holding the retained successful report and half awaiting mapping,
  occupied 196,608 bytes. This measures database size for that sample.
  Confirm actual disk headroom for staging, Docker, logs and backups.
- Three model attempts per rehearsal, 4,096 completion tokens per attempt,
  90-second inference client timeout and zero SDK retries remain in place.
  Eight admissions can authorize up to 24 model requests and 98,304 completion
  tokens, plus prompt tokens. At lifetime quota 150 with `used` already consumed
  and no pending judge jobs, the maximum additional request count is
  `3 × (150 − used)`. The quota counts uploads, so abandoned mapping sessions
  can exhaust it without running inference. Confirm available credits and actual
  model rates separately. These limits do not implement a dollar budget.

## Future cutover on the two existing VMs

Execute only with separate approval. Keep the existing SSH firewall rules and
runner configuration. The anonymous candidate changes control only.

1. Confirm the November 7, 2026 13:42 Europe/Paris review deadline, current
   instance charges and inference credit headroom. The prior compute estimate
   was $0.041/hour for both VMs. Check actual usage, disk and service health
   using the existing private inspection process. Lower the configured cap if
   the approved inference budget requires it.
2. Close public web ingress under the existing procedure, let queued/running
   jobs drain, and stop Caddy, API and worker on control. Take root-only backups
   of the release files, Caddy config, systemd drop-ins and control environment.
   Back up the existing `jobs.sqlite` with SQLite's backup API. Check backup
   integrity and record job count and `SELECT total FROM usage` without printing
   job data. Keep the existing database path and permissions.
3. Stage the reviewed release and build with
   `VITE_SHELFREADY_JUDGE_DEMO=1 npm --prefix web run build`. Keep the existing
   HTTPS hostname, TLS storage, worker and remote SSH settings. Add
   `SHELFREADY_JUDGE_DEMO=1`, the exact existing HTTPS origin in
   `SHELFREADY_PUBLIC_ORIGIN`, the approved numeric `SHELFREADY_UPLOAD_QUOTA`
   and a fresh random 32-byte-or-longer `SHELFREADY_VISITOR_KEY` in the protected
   control environment. Keep that key stable during judging.
4. While web ingress remains closed, add a systemd API drop-in that clears
   `ExecStart` and reinstates the same loopback service with proxy-header
   processing and access logging disabled:

   ```ini
   [Service]
   ExecStart=
   ExecStart=/opt/shelfready/.venv/bin/uvicorn shelfready.api:app --host 127.0.0.1 --port 18765 --workers 1 --limit-concurrency 8 --timeout-keep-alive 5 --no-proxy-headers --no-access-log
   ```

   Install [the candidate Caddyfile](../deploy/Caddyfile.judge) at
   `/etc/caddy/Caddyfile` and run `python -m deploy.validate_caddy --judge` with
   the control virtual environment. Keep the original Caddyfile and Basic Auth
   environment for rollback. Do not place another proxy or CDN ahead of Caddy
   without revisiting network identity. Reload systemd and start the local
   services after validation.

5. The first SQLite connection creates `judge_owners` and `judge_admissions`
   without modifying pre-existing job rows or the usage counter. Use a
   missing-job GET for the first API probe. Compare the count and usage with
   the backup, accounting for ordinary expiry. Old jobs have no judge owner,
   so their results are inaccessible through the anonymous API. Verify the
   worker has remote execution enabled and both hosts are clear of disposable
   resources before reopening only the existing web ingress.
6. Verify public TLS and HTTP redirect, anonymous landing and fixture reads,
   denied administrative paths, Caddy's visitor-header replacement, wrong
   origin and modified-fixture rejection, and replay without API traffic.
   Run one separately approved real browser rehearsal with the two fixtures.
   Observe inference usage, remote sandbox constraints, the native import,
   independent before/after SQL, downloaded CSV/report and teardown. Check the
   persistent usage and execution counters. Preserve redacted evidence and
   close ingress on any failed gate.

## Rollback

Close web ingress, let active work drain and stop the control services. Restore
the old release, Caddyfile, API unit and control environment. Keep the current
database and the two additive judge tables. The older code can ignore them.
Restoring a pre-cutover database after public requests would lose jobs and
reset consumed allowance. Keep the backup for investigation. Validate Caddy
using the original Basic Auth configuration and verify authenticated access
and anonymous denial before reopening. If the old quota is below current usage,
uploads remain exhausted until the owner approves an explicit allowance.

## Local verification

Run the existing offline commands in the [README](../README.md#verify-without-paid-integrations).
To run the judge-only browser checks in PowerShell:

```powershell
$env:VITE_SHELFREADY_JUDGE_DEMO = '1'
npm --prefix web run build
npm --prefix web run test:judge
Remove-Item Env:VITE_SHELFREADY_JUDGE_DEMO
```

- 132 offline Python tests passed. The separate local Docker-only lane passed
  all 10 tests with the Vultr key empty. The offline workflow tests substitute
  inference, sandbox and store responses and include verification and cleanup
  failure controls.
- Both frontend builds, Ruff, formatting, brand and showcase validation passed.
  Playwright passed 17 portable and two judge-specific tests. The judge lane
  covers replay without API traffic and quota feedback with a synthetic API
  response. Both lockfile audits reported zero known vulnerabilities.
- Caddy 2.10.2 validated the candidate. A real loopback Caddy/API/worker smoke
  tested anonymous fixture reads and confirmation, administrative route denial,
  forged visitor headers, durable counters, and missing-key download denial.
  The successful loopback smoke substituted a trusted model response and ran
  the actual local Docker sandbox and native WooCommerce import. SQL readback
  returned `00017` at `13.55 / 7` and `A-2` at `1.35 / 2`. Both downloads
  succeeded. Post-run inspection found no matching disposable Docker
  containers, volumes or networks.
- Real public HTTPS, remote SSH execution and a new Vultr inference-backed
  journey remain future deployment gates. No production access or inference
  spending occurred in this branch.
