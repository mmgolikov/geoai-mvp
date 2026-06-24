# Release: GeoAI Enterprise Report Pack v2.8

Date: 2026-06-24

## Release Status

- Production URL: https://geoai-mvp.vercel.app
- Production deployment URL: https://geoai-g9r83b1dy-geoaidev.vercel.app
- Deployment ID: `dpl_JBLXM6LFhN3ngrq4FrRMxVkBgoZz`
- Production commit SHA: `8b17d886c14b55e0314a8a8f07508d04a0892430`
- PR: https://github.com/mmgolikov/geoai-mvp/pull/25

## Scope

GeoAI v2.8 adds the first Enterprise Report Pack foundation. It turns existing analysis, report, validation, evidence, Data Room and pilot workflow context into a structured client/investor deliverable.

This is still browser print/save-as-PDF first. It does not add server-side PDF generation, certified report governance or official validation connectors.

## What Changed

- Added report package TypeScript model.
- Added report package builder.
- Added local/API fallback report package repository.
- Added `GET /api/report-packages?projectKey=...`.
- Added `POST /api/report-packages`.
- Added `GET /api/report-packages/[id]`.
- Added `PATCH /api/report-packages/[id]`.
- Added `GET /api/report-packages/[id]/export`.
- Added `GET /api/report-packages/[id]/json`.
- Added `/report-packages/[id]/print`.
- Added compact Enterprise Report Packages section to Project Dashboard.
- Added collapsed Workspace report package actions inside Data Room / Pilot Evidence.
- Linked locally generated packages back into Data Room metadata.
- Added Known Limitations entries for `report_packaging` and `server_side_pdf`.
- Added v2.8 documentation and QA checklist coverage.

## Package Sections

Report packages can include:

- Executive Memo
- AOI Factsheet
- AI Decision Memo
- Deterministic Score Summary
- External Data / Market Context
- Source Lineage Appendix
- Validation Governance Appendix
- Evidence Review Appendix
- Data Room Summary
- Pilot Workflow / Deliverables Summary
- Comparison Memo
- Known Limitations / Required Validation
- Export Manifest

Missing data is represented honestly as `validation_required`, `missing` or `sample_fallback`.

## QA Summary

Local checks passed:

- `npm run lint`
- `npm run build`
- `npm run data:status`
- `npm run storage:check`

Preview checks passed:

- Vercel preview READY: https://geoai-msgxym8ib-geoaidev.vercel.app
- Preview runtime logs: no error/fatal entries.
- Preview smoke: `/`, `/workspace`, `/projects`, report package APIs, package JSON/export/print and seeded printable report routes returned 200.

Production checks passed:

- Production READY: https://geoai-mvp.vercel.app
- Production deployment: https://geoai-g9r83b1dy-geoaidev.vercel.app
- Production runtime logs: no error/fatal entries after smoke.
- Production smoke returned 200 for:
  - `/`
  - `/login`
  - `/workspace`
  - `/projects`
  - `/api/report-packages?projectKey=dubai-investment-screening-demo`
  - `POST /api/report-packages`
  - `/api/report-packages/[id]`
  - `/api/report-packages/[id]/json`
  - `/api/report-packages/[id]/export`
  - `/report-packages/[id]/print`
  - `/api/reports`
  - `/api/validation?projectKey=dubai-investment-screening-demo`
  - `/api/storage/health`
  - `/api/known-limitations`
  - seeded printable report routes

## Data Honesty

Required caveats remain:

- screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
- Report packages are decision-support deliverables, not certified valuation, legal, zoning, planning, cadastral or ownership conclusions.
- Browser print/save as PDF remains the current PDF workflow.

The JSON export does not include secrets, raw private file contents or signed URLs.

## Known Limitations

- Local/API fallback is not durable production storage.
- Browser print/save as PDF remains the PDF workflow.
- Server-side PDF generation is not implemented.
- No formal e-sign/offline package assembly.
- No enterprise document storage.
- No certified valuation, legal, zoning, planning, cadastral, ownership or official suitability conclusion.
- No official validation connectors are automated.

## Recommended Next Sprint

Search-first Explore Interface v2.9.
