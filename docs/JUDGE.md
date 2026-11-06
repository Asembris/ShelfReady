# ShelfReady judge guide

**[Open the public demo](https://95.179.218.142.sslip.io/) · [Watch the submission video](https://youtu.be/UmIIVeOZky4) · [CI results](https://github.com/Asembris/ShelfReady/actions/workflows/ci.yml)**

Supplier spreadsheets can carry price and stock changes that are hard to verify
before import. ShelfReady rehearses those changes in disposable WooCommerce and
releases a CSV and report only after independent verification and cleanup.

## Evaluate in 30 seconds

1. [Open the rehearsal studio](https://95.179.218.142.sslip.io/#studio).
   The public demo opens without an account.
2. Expand **Verified replay · read-only evidence**. It displays a recorded SQL
   comparison without an upload, an inference call, or a new job.
3. Check that SKU `00017` keeps its leading zeros as price and stock change from
   `12.30 / 4` to `13.55 / 7`. SKU `A-2` changes from `0.10 / 0` to `1.35 / 2`.
   [Recorded replay evidence and export checksums](live-deployment.md#verified-public-journey)

## Optional live rehearsal

1. Download the [two approved synthetic fixtures](https://95.179.218.142.sslip.io/demo/index.html).
   Select the baseline and supplier CSVs in the studio, then choose **Upload and review mappings**.
2. Check the source columns, explicitly approve same-currency price and stock
   replacement, and select **Confirm and rehearse**. This starts a live job
   using Vultr Serverless Inference.
3. When verification completes, use **Download verified CSV** and **Download
   change report**. Compare the report's persisted readback with the expected
   values above. If the queue or quota is unavailable, use the replay.

## What makes a result trustworthy

- **Approval stays with the operator.** Vultr generates the Python
  transformation after approval. Trusted validators enforce exact SKU
  matching and check the output independently.
- **Generated code runs on a separate Vultr runner.** The worker uses
  restricted SSH to invoke non-root Docker execution with networking
  disabled, a read-only root filesystem, and CPU, memory, process, and time
  limits. Model credentials stay on the control VM.
- **Verification reads persisted data.** A trusted importer runs against
  disposable WooCommerce. Independent MariaDB queries check persisted values
  and supported unchanged fields. Verification or cleanup failure blocks
  downloads.

## Evidence and limits

The anonymous production rehearsal on November 5, 2026 used one request to
`qwen3.8-27b` (822 tokens), verified two rows, and delivered both downloads.
Independent observers confirmed the runner limits and found no disposable
resources after cleanup. [SQL snapshot query](../infra/snapshot.sql) ·
[Reproduce the local checks](judge-facing-demo.md#local-verification) ·
[Earlier live containment evidence](live-deployment.md#security-containment-and-upgraded-backend) ·
[Architecture and setup](../README.md#architecture)

The live demo accepts only the two synthetic CSVs and runs one rehearsal at
a time. It allows up to eight confirmations per rolling hour globally and
shares per-network limits. The configurable lifetime upload cap is set to 150.
The runner uses Docker with a shared host kernel. Scope is limited to price and
stock updates for existing simple products. ShelfReady produces a verified file
for review. Publishing changes to a production store is outside its scope.
