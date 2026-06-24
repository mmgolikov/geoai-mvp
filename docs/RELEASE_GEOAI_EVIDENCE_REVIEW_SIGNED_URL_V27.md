# Release: GeoAI Evidence Review & Signed URL Verification v2.7

Release date: 2026-06-24

Production URL: https://geoai-mvp.vercel.app

Production deployment: https://geoai-j7npv2a9h-geoaidev.vercel.app

Deployment ID: `dpl_GDh5KkBH2wn1ZiPqRjQ6Rkvm4kXb`

Production commit SHA: `87af607ef497fba07e78c5e2dfd265c8f4de8c15`

## Scope

v2.7 adds a pilot-grade evidence review foundation on top of the v2.6 evidence upload metadata layer. It keeps public demo fallback behavior intact while making review state explicit and safer for AI, reports and pilot-readiness discussions.

## What Changed

- Added evidence review lifecycle, status model and transition policy.
- Added review APIs:
  - `GET /api/validation/evidence/[id]/reviews`
  - `POST /api/validation/evidence/[id]/reviews`
  - `PATCH /api/validation/evidence/[id]/reviews/[reviewId]`
- Added signed URL verification route:
  - `POST /api/storage/evidence-files/[id]/signed-url-test`
- Added upload readiness route:
  - `POST /api/storage/evidence-files/upload-intent`
- Added review status counts and compact review actions to Project Dashboard.
- Added secondary review actions in Workspace Validation Evidence.
- Added review summaries to report preview validation appendix.
- Added review-aware AI decision-score guardrails.
- Updated Known Limitations for secure file storage and validation evidence review.
- Hardened Vercel local-fallback behavior so review APIs do not depend on cross-invocation local metadata durability.

## Current Data And Storage State

- Storage provider: `local_metadata_only` until Supabase Storage is configured and verified.
- Signed URL verification: route available; binary URL generation requires configured private buckets and policies.
- Upload intent: returns `metadata_only` in current production.
- Evidence review: foundation ready in API/UI; durable reviewer identity requires Supabase Auth/RLS.

## Data Honesty Caveats

- Uploaded evidence requires review; it is not a legal, cadastral, zoning, planning, ownership or valuation conclusion.
- Client-validated evidence supports screening review only unless official validation is also recorded.
- Signed URL availability requires configured storage buckets and policies.
- Local/API fallback is not durable production storage.
- GeoAI does not certify ownership, zoning, cadastral status, planning approval or valuation.

## QA Summary

- `npm run lint` passed.
- `npm run build` passed.
- `npm run data:status` passed.
- `npm run storage:check` passed.
- Preview smoke passed.
- Production smoke passed after fallback hardening.
- Production runtime logs showed no error/fatal entries for the final deployment.

## Remaining Limitations

- No secure enterprise storage claim.
- No certified audit trail.
- No durable reviewer identity without configured auth/RLS.
- No official DLD, GeoDubai, cadastral, zoning, ownership or valuation connector automation.
- No direct client-to-bucket upload; server-mediated upload remains the MVP-safe path.

## Recommended Next Sprint

Enterprise Report Pack v2.8.
