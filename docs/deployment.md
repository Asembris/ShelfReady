# Phase 5 live deployment evidence

Status: provisioned, private bootstrap in progress. **NO-GO for public demo**
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
attributed invoice charges are not yet available. Do not confuse account-wide
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
cgroup v2 on both hosts. Control Caddy 2.11.8 is masked pending configuration.
Runner pulled the contracted Python image by digest. Package logs and inventory
are retained under ignored `artifacts/cloud/` and `.runtime/cloud/`. Management
API credentials remain on the local Windows machine; no key values enter Git.
`95.179.218.142.sslip.io` resolves to the control IPv4; TLS is not yet verified.

## Reproduction and teardown

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
