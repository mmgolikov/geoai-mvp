# GeoAI Evidence Review Workflow & Signed URL Verification v2.7

Date: 2026-06-24

GeoAI v2.7 moves evidence uploads from file metadata into a conservative evidence review workflow. It does not create a certified audit trail, official validation connector, enterprise DMS or production-ready secure storage claim.

## v2.8 Report Package Linkage

Enterprise Report Pack v2.8 includes an Evidence Review Appendix. The appendix summarizes linked evidence files and review records, including storage provider, metadata-only/binary availability, signed URL availability status, latest review decision and required next action.

Report package print and JSON exports do not expose raw signed URLs or private file contents. Metadata-only evidence is shown with the caveat that binary file storage is unavailable in the current mode.

## What Exists

- Evidence review lifecycle: `not_started`, `uploaded_unreviewed`, `in_review`, `needs_more_evidence`, `client_validated`, `official_validated`, `rejected`, `expired`, `superseded`.
- Review decision APIs:
  - `GET /api/validation/evidence/[id]/reviews`
  - `POST /api/validation/evidence/[id]/reviews`
  - `PATCH /api/validation/evidence/[id]/reviews/[reviewId]`
- Signed URL verification:
  - `GET /api/storage/evidence-files/[id]/download`
  - `POST /api/storage/evidence-files/[id]/signed-url-test`
- Upload readiness:
  - `POST /api/storage/evidence-files/upload-intent`
- Project Dashboard review status counts and compact review actions.
- Workspace Validation Evidence review actions inside the collapsed evidence block.
- Report appendix review status and linked evidence file posture.
- AI decision-score guardrails that treat unreviewed, rejected or expired evidence as unsupported.

## Review Rules

- Uploaded files start as unreviewed and do not improve claim posture.
- `client_validated` requires an explicit review decision and reviewer notes.
- `official_validated` requires an official source category or official portal evidence plus notes and a linked file/reference.
- `rejected` requires a reason.
- `expired` requires an expiry date or explicit reviewer note.
- Metadata-only files can be reviewed, but the binary-unavailable caveat remains.

## Signed URL Behavior

When Supabase Storage is configured and the object exists, signed URL routes return a short-lived URL and expiry timestamp. When storage is not configured, routes return a controlled `409`:

`File binary is not available because durable storage is not configured.`

Signed URL availability requires configured storage buckets and policies. Local/API fallback is not durable production storage.

## Data Honesty Caveats

- Uploaded evidence requires review; it is not a legal, cadastral, zoning, planning, ownership or valuation conclusion.
- Client-validated evidence supports screening review only unless official validation is also recorded.
- Signed URL availability requires configured storage buckets and policies.
- Local/API fallback is not durable production storage.

## Remaining Limitations

- No durable reviewer identity unless Supabase Auth/RLS is configured.
- No official DLD, GeoDubai, zoning, ownership or cadastral connector automation.
- No certified audit trail.
- No public bucket is required or allowed for evidence storage.
- No secure enterprise storage claim until buckets, private policies, signed URL flows and access enforcement are configured and verified.
