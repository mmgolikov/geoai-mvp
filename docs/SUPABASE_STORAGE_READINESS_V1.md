# Supabase Storage Readiness v1

Date: 2026-07-08
Project: `geoai-dev`
Supabase ref: `pphdqkurxneyagvnnjdt`

## Status

Supabase Storage readiness was advanced for Preview/demo use.

This is **not** production-ready, pilot-ready, secure enterprise storage, legal, cadastral, zoning, planning, ownership or valuation validation.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

> **Historical ledger correction — 2026-07-16.** The migration names below are repository-drift records. The authoritative [migration ledger baseline](../supabase/migration-ledger-baseline.json) records the applied versions as `20260708142250_geoai_storage_buckets_v1`, `20260708142802_geoai_audit_event_service_role_write_v1` and `20260708143337_geoai_audit_event_types_v1`. Preserve the old table only as point-in-time evidence; do not use it for replay.

## What changed

### Storage buckets

Created private buckets:

| Bucket | Purpose | Status |
| --- | --- | --- |
| `geoai-data-room-assets` | Data-room assets | Created |
| `geoai-validation-evidence` | Validation/evidence files | Created |
| `geoai-report-exports` | Report export artifacts | Created |
| `geoai-aoi-imports` | AOI imports | Created |

All buckets are private and limited to MVP evidence file constraints.

### Signed URL marker

A Preview-only verification pass created a small JSON marker object in `geoai-validation-evidence` and verified:

- signed upload URL creation;
- signed upload using the generated token;
- server-side download;
- signed download URL creation;
- signed download fetch.

The temporary verifier endpoint was removed before merge-readiness review.

### Audit durability

A storage health check now awaits a non-blocking audit event write. Audit readiness is verified from a persisted `storage_health_checked` audit event with storage readiness metadata.

## Applied / documented migrations

| Migration | Purpose |
| --- | --- |
| `20260708143000_geoai_storage_buckets_v1.sql` | Create private Storage buckets |
| `20260708143500_geoai_audit_runtime_write_v1.sql` | Allow trusted server runtime to write/read audit events |
| `20260708143600_geoai_audit_event_types_v1.sql` | Align DB audit event type constraint with app enum |

## Verified Preview result

| Check | Result |
| --- | --- |
| `/api/storage/health` | `storageReady=true`, `bucketReady=true`, `missingBuckets=[]` |
| Signed upload/download | Verified by marker |
| Audit write/read | Verified by persisted storage health audit event |
| `/api/pilot-backend/status` | `status=storage_ready`; Storage and audit capabilities verified |
| Confidential pilot | Still blocked |

## Remaining blockers

1. Supabase Auth is not configured for real users.
2. Hard project access is not enabled.
3. RLS/membership policies are not verified in hard access mode.
4. Production Supabase env remains disabled.
5. No protected client files should be stored until Auth and hard access are verified.

## Out of scope

- No Production Supabase env activation.
- No hard access enforcement.
- No confidential client file storage.
- No live official integrations.
