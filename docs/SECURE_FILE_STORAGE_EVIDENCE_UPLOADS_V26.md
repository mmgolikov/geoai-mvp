# GeoAI Secure File Storage & Evidence Uploads v2.6

Date: 2026-06-24

## Scope

GeoAI v2.6 adds a storage-ready evidence file workflow for validation governance and the Client Data Room. It introduces file metadata, server-side upload/download APIs, Supabase Storage readiness checks and a bucket policy draft while preserving local/API fallback for public demos.

Required caveats:

```text
Uploaded evidence requires review; it is not a legal, cadastral, zoning, planning, ownership or valuation conclusion.
Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.
Local/API fallback is not durable production storage.
```

## Storage Provider Modes

- `supabase_storage`: Supabase Storage is configured and buckets may be checked by the server runtime.
- `local_metadata_only`: Supabase Storage is not configured; GeoAI records evidence file metadata only.
- `disabled`: storage is unavailable.

Public demo mode remains usable with `local_metadata_only`. Binary files are not durable in this fallback.

## Required Buckets

- `geoai-data-room-assets`
- `geoai-validation-evidence`
- `geoai-report-exports`
- `geoai-aoi-imports`

The policy draft is:

```text
supabase/migrations/20260624_geoai_storage_buckets_policies.sql
```

Do not apply it automatically. Apply from a trusted operator environment only after Supabase Auth, project memberships and RLS expectations are reviewed.

## Upload API

`POST /api/storage/evidence-files`

Multipart fields:

- `projectKey`
- `projectId` optional
- `validationEvidenceId` optional
- `dataRoomAssetId` optional
- `aoiId` optional
- `reportId` optional
- `notes` optional
- `file`

If Supabase Storage is ready, the server uploads to a private bucket and creates metadata. If storage is not ready, the route creates metadata-only fallback and returns a clear caveat.

## Download API

`GET /api/storage/evidence-files/[id]/download`

If storage is ready and the object exists, the route returns a temporary signed URL. If the asset is metadata-only, it returns a controlled response:

```text
File binary is not available because durable storage is not configured.
```

## File Limits

Maximum file size: 5 MB.

Allowed MIME types:

- `application/pdf`
- `text/csv`
- `application/json`
- `application/geo+json`
- `image/png`
- `image/jpeg`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Executable and script file extensions are blocked.

## UI Surfaces

`/projects` includes a compact Evidence Files / Storage section showing provider, bucket status, evidence file count, metadata-only count, next action and caveat.

`/workspace` includes an Attach evidence file action inside the collapsed Validation Evidence block. It remains secondary and does not move the main analysis CTA.

Report validation appendices show linked evidence file metadata, status and download availability. Report prints do not embed file binaries.

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- Buckets are private by default.
- No broad anonymous writes are included in the policy draft.
- Signed URL flows must be verified with project access enforcement before protected client use.
- A file upload does not mean official validation.

## Verification

Commands:

```bash
npm run storage:check
npm run lint
npm run build
npm run data:status
```

Smoke routes:

- `/api/storage/health`
- `/api/storage/evidence-files?projectKey=dubai-investment-screening-demo`
- `/api/storage/evidence-files/[id]/download`
- `/api/validation?projectKey=dubai-investment-screening-demo`
- `/api/data-room?projectKey=dubai-investment-screening-demo`

## Remaining Limitations

- Local/API fallback is metadata-only and not durable production storage.
- Secure enterprise storage is not active until buckets, policies, signed URLs and access enforcement are configured and verified.
- No document parsing, OCR or content extraction is included.
- Uploading evidence does not validate ownership, zoning, cadastral status, planning approval or valuation.

## Next Sprint

Recommended next sprint: Evidence Review Workflow & Signed URL Verification v2.7.

## v2.7 Follow-Up

Evidence Review Workflow & Signed URL Verification v2.7 adds explicit review decisions, conservative status transitions, signed URL verification, upload intent and review-aware report/AI guardrails. Uploading a file still does not mean official validation. See [Evidence Review Workflow & Signed URL Verification v2.7](EVIDENCE_REVIEW_SIGNED_URL_VERIFICATION_V27.md).
