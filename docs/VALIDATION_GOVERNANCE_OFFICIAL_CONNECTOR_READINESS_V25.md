# GeoAI Validation Governance & Official Connector Readiness v2.5

Date: 2026-06-24

## Scope

GeoAI v2.5 adds a validation governance foundation for tracking evidence posture, official connector readiness and conservative claim levels across projects, workspace analysis and reports.

This is not a live official integration and not official validation. It does not certify ownership, zoning, cadastral status, planning approval, suitability or valuation.

Required caveat:

```text
screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
```

## What Was Added

- Validation evidence metadata model for project-scoped evidence posture.
- Official connector readiness matrix for DLD public snapshots, DLD API Gateway, Dubai Pulse / Data Dubai, GeoDubai / Dubai Municipality, client official documents and licensed valuation providers.
- Project validation APIs:
  - `GET /api/validation`
  - `POST /api/validation/evidence`
  - `PATCH /api/validation/evidence/[id]`
  - `DELETE /api/validation/evidence/[id]`
  - `GET /api/validation/connectors`
- Compact Validation Governance panel in `/projects`.
- Collapsed Validation Evidence block in the Workspace command panel.
- Data Room and Pilot Workflow linkage so validation evidence metadata contributes to evidence package readiness.
- Report validation appendix for analysis and comparison reports.
- AI decision scoring guardrails that consume validation posture and cap claims/confidence when evidence remains screening-only.
- Known limitations updates for official validation, DLD, GeoDubai, cadastral/zoning/ownership and valuation dependencies.

## Current Validation Model

Validation evidence is metadata-only in the current demo/fallback mode. Each item tracks:

- project key and optional project id;
- linked AOIs, analyses, reports and Data Room assets;
- source category and source name;
- access mode;
- validation status;
- confidence level;
- allowed claim level;
- limitations, allowed claims, forbidden claims and required caveat.

Allowed claim levels are conservative:

- `screening_only`
- `client_provided_evidence`
- `official_evidence_uploaded`
- `official_validation_recorded`
- `not_supported`

Placeholder validation gaps remain `screening_only` and do not support ownership, zoning, cadastral, planning or valuation claims.

## Official Connector Readiness

Current connector posture:

- DLD Public Real Estate Data: manual/sample snapshot path ready.
- DLD API Gateway: permission required; no live API calls.
- Dubai Pulse / Data Dubai: manual public export path when available.
- GeoDubai / Dubai Municipality: planned validation and permission required.
- Client Uploaded Official Document: metadata-only evidence tracking; secure storage is not active.
- Licensed Valuation / Market Provider: readiness metadata only; provider license required.

This release does not add live official DLD, Dubai Pulse, GeoDubai or Dubai Municipality integrations.

## API Behavior

`GET /api/validation?projectKey=...` returns project evidence, summary, claim policy, connector readiness and soft access metadata.

`GET /api/validation/connectors` returns the connector readiness matrix and the data honesty caveat.

Evidence mutation routes use soft project access in the public demo and local/API fallback storage when durable Supabase persistence is not configured.

## v2.6 Evidence File Upload Linkage

Secure File Storage & Evidence Uploads v2.6 extends validation governance with `EvidenceFileAsset` metadata and `/api/storage/evidence-files` routes. Files can be linked to validation evidence, AOIs, reports and Data Room assets, but uploading a file never means official validation.

If Supabase Storage is not configured, the workflow records metadata only and download remains unavailable. See [Secure File Storage & Evidence Uploads v2.6](SECURE_FILE_STORAGE_EVIDENCE_UPLOADS_V26.md).

## v2.7 Evidence Review Linkage

Evidence Review Workflow & Signed URL Verification v2.7 adds explicit review decisions on top of validation evidence metadata. Uploaded files remain `uploaded_unreviewed` until a reviewer marks evidence in review, requests more evidence, records client validation, records linked official validation, rejects, expires or supersedes the item.

Client-validated evidence supports screening review only unless official validation is also recorded. See [Evidence Review Workflow & Signed URL Verification v2.7](EVIDENCE_REVIEW_SIGNED_URL_VERIFICATION_V27.md).

## UI Behavior

`/projects` shows a compact Validation Governance panel with:

- evidence counts;
- review/client/official validation counts;
- highest allowed claim level;
- required validation gaps;
- connector readiness snapshot;
- action to add validation evidence metadata.

`/workspace` shows a collapsed Validation Evidence block below the primary decision flow so the Run Express Analysis CTA stays visible.

Reports include a Validation Governance Appendix with evidence posture, connector readiness and required gaps.

## AI Decision Scoring Guardrail

Decision scoring receives validation summary, evidence posture and claim policy. When validation remains screening-only:

- confidence is capped conservatively;
- validation gaps remain visible;
- unsupported official/valuation/legal/cadastral claims are flagged;
- the standard caveat is enforced.

OpenAI can interpret evidence context, but it must not transform placeholder, planned, permission-required or sample evidence into official proof.

## Limitations

- Local/API fallback is not durable production storage.
- Secure file storage is not active.
- Auth/RBAC is not fully enforced in public demo mode.
- No live official DLD, Dubai Pulse, GeoDubai or Dubai Municipality connector is active.
- No cadastral, zoning, ownership, planning or valuation conclusion is produced.
- Validation evidence metadata does not mean GeoAI certifies the underlying evidence.
- Official validation requires client/authority evidence, licensing, access rights and review workflow.

## QA Checklist

- `GET /api/validation?projectKey=dubai-investment-screening-demo` returns evidence, summary and claim policy.
- `GET /api/validation/connectors` returns DLD, Dubai Pulse, GeoDubai, client document and licensed valuation readiness records.
- `/projects` shows the Validation Governance panel without overclaiming official validation.
- `/workspace` keeps the Validation Evidence block collapsed/compact below the main CTA.
- Express Analysis and AI Decision Memo remain caveated when validation is screening-only.
- Analysis and comparison reports include the Validation Governance Appendix.
- `/api/known-limitations` includes updated official validation, DLD, GeoDubai, cadastral/zoning/ownership and valuation limitations.

## Next Sprint

Recommended next sprint: Secure File Storage & Evidence Uploads v2.6.
