# Release: GeoAI Validation Governance & Official Connector Readiness v2.5

Date: 2026-06-24

## Deployment

- Production URL: https://geoai-mvp.vercel.app
- Production deployment URL: https://geoai-g4v1mzj5j-geoaidev.vercel.app
- Deployment ID: `dpl_6837V1g1jU5Cs4XU8LHq2q8zm8sE`
- Production commit SHA: `8805145c314592ff87ac94b9b53b572d1156bda3`

## Scope

GeoAI v2.5 adds validation governance and official connector readiness to the existing investor-demo and pilot-foundation product. It introduces project-scoped validation evidence metadata, connector readiness, conservative claim policy, report appendices and AI decision-scoring guardrails.

This release does not add live official integrations and does not certify any legal, cadastral, zoning, planning, ownership, suitability or valuation conclusion.

Required caveat:

```text
screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
```

## What Changed

- Added `GET /api/validation` for project validation evidence, summary, claim policy and connector readiness.
- Added `GET /api/validation/connectors` for official connector readiness metadata.
- Added validation evidence metadata mutation routes for create, update and delete.
- Added a compact Validation Governance panel to `/projects`.
- Added a collapsed Validation Evidence block to `/workspace`.
- Linked validation evidence metadata into Data Room and Pilot Workflow readiness calculations.
- Added a Validation Governance Appendix to report preview and printable analysis/comparison reports.
- Updated AI decision scoring to consume validation summary and claim policy.
- Updated known limitations for official validation, DLD, GeoDubai, cadastral/zoning/ownership and valuation dependencies.

## Connector Status

- DLD Public Real Estate Data: manual/sample snapshot path ready.
- DLD API Gateway: permission required; no live API calls.
- Dubai Pulse / Data Dubai: manual public export path when available.
- GeoDubai / Dubai Municipality: planned validation and permission required.
- Client Uploaded Official Document: metadata-only tracking; secure file storage is not active.
- Licensed Valuation / Market Provider: readiness metadata only; provider license required.

## Demo Value

v2.5 makes GeoAI more credible for investor and client demos because it separates:

- what is screening/demo context;
- what evidence exists;
- what official or client validation is still required;
- which claims are unsupported;
- which connector paths are ready, planned or permission-dependent.

## Limitations

- Local/API fallback is not durable production storage.
- Secure file storage is not active.
- Supabase Auth/RBAC is not fully enforced in public demo mode.
- No live official DLD, Dubai Pulse, GeoDubai or Dubai Municipality connector is active.
- No official parcel, zoning, cadastral, ownership, planning, legal or valuation conclusion is produced.
- Validation evidence metadata does not mean GeoAI certifies the underlying evidence.
- Official validation requires client/authority evidence, access rights, licensing and review workflow.

## Verification

- `npm run lint` passed.
- `npm run build` passed.
- `npm run data:status` passed.
- Preview smoke passed on `/`, `/workspace`, `/projects`, validation APIs, known limitations, decision-score route and seeded printable reports.
- Production smoke passed on `/`, `/demo`, `/workspace`, `/projects`, validation APIs, platform/storage health, known limitations, decision-score route and seeded printable reports.
- Production runtime logs for the deployment window showed no `error` or `fatal` entries.

## Recommended Next Sprint

Secure File Storage & Evidence Uploads v2.6.
