# DLD / Dubai Pulse Controlled Ingestion Runbook v1

## Scope

This runbook prepares an approved local DLD snapshot for quarantine and aggregate-feature review. It does not acquire data from DLD, apply a database migration, upload a raw file, write normalized facts to Supabase or enable scoring.

## Preconditions

Do not proceed unless all items are true:

1. the dataset is registered in `data/external/catalog/dld_dubai_pulse_dataset_catalog.v1.json`;
2. written rights cover private persistence, transformation and internal aggregate scoring;
3. the official download/API grant is active;
4. the catalogue entry is updated to:
   - `rightsStatus=permitted`;
   - `accessStatus=granted_or_public_download_verified`;
   - `custodyStatus=approved_private`;
5. the rights receipt is approved by an accountable reviewer;
6. the file was acquired through the approved official method;
7. private object storage and the trusted worker plane are approved;
8. no CAPTCHA, WAF or technical-control circumvention was used.

## Validate the catalogue

```bash
npm run dld:catalog:check
```

Expected current state before approval:

- catalogue check passes;
- unresolved rights are reported;
- root `scoringAllowed=false`;
- active scoring datasets equal zero.

## Create a rights receipt

Copy the template:

```bash
cp data/external/catalog/dld_rights_receipt.template.json /secure/operator/path/dld_transactions_rights.json
```

The receipt must remain `pending` until evidence is approved. Do not commit an approved receipt, credentials or confidential terms to Git.

## Acquire the official snapshot

Acquisition is outside this script. Use only the approved official download/API grant and the trusted operator environment.

Never:

- automate the DLD CAPTCHA;
- scrape rendered search results;
- bypass the Dubai Pulse permission workflow;
- place API keys or secrets in command history, source files or Git;
- upload a raw DLD file to a public bucket;
- load multi-gigabyte CSVs through JSON inserts.

## Prepare and quarantine

```bash
npm run dld:snapshot:prepare -- \
  --dataset=dld_transactions-open \
  --file=/secure/operator/path/Transactions.csv \
  --rights-receipt=/secure/operator/path/dld_transactions_rights.json \
  --out-dir=/secure/operator/quarantine/dld-transactions-2026-02-14
```

The script:

- streams the CSV rather than reading it into memory;
- calculates SHA-256 and byte size;
- profiles headers, nulls and maximum field lengths;
- detects area, date, amount and size columns conservatively;
- creates area/month aggregate feature input;
- writes schema, quality and release manifests;
- leaves the release quarantined;
- persists no raw rows;
- keeps scoring disabled.

## Review outputs

Required files:

```text
release_manifest.json
schema.json
quality.json
aggregate_feature_input.csv
```

Reject the release when:

- the checksum does not match the acquisition receipt;
- header names are duplicated after normalization;
- row structure is materially malformed;
- observed dates are implausible;
- amounts or areas are systematically non-numeric;
- area mapping cannot be reconciled;
- contact/person fields would enter a Product projection;
- source rights, attribution or expiry are unclear;
- the file does not match the registered dataset and update date.

## Database load

No database load is authorized by this runbook.

The future trusted loader must:

1. create an immutable SOURCE-01 release and artifact receipt;
2. bulk load typed restricted tables using PostgreSQL COPY or an equivalent server-side mechanism;
3. run deterministic reconciliation and quarantine failures;
4. build approved aggregate marts;
5. store source release IDs and method version on every feature row;
6. expose only bounded aggregate RPC/API projections;
7. leave Product scoring disabled until the separate scoring gate passes.

The review-only DDL is in `docs/sql/DLD_SCORING_FOUNDATION_V1_REVIEW_ONLY.sql`. It must not be executed as a migration without explicit approval.

## Automated controls

```bash
npm run test:dld-controlled-ingestion
```

The control test verifies:

- catalogue consistency;
- pending-rights rejection;
- local streaming preparation with a test-only approved receipt;
- aggregate generation;
- no raw-row persistence;
- scoring remains disabled.

## Rollback

Before scoring activation, rollback consists of revoking/quarantining the source release and rebuilding all dependent aggregates from the prior sealed release. Product current-state pointers must never reference a quarantined or revoked release.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
