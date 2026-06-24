# GeoAI Enterprise Report Pack v2.8

Date: 2026-06-24

GeoAI v2.8 adds a structured enterprise report package foundation for investor/client demos. A report package is a decision-support deliverable that combines existing GeoAI reports, source lineage, validation governance, evidence review, Data Room metadata and pilot workflow context into a browser-print package plus safe JSON export.

This is not a certified report system and not server-side PDF generation.

## What Exists

- Report package domain model and TypeScript types.
- Local/API fallback report package repository.
- `GET /api/report-packages?projectKey=...`
- `POST /api/report-packages`
- `GET /api/report-packages/[id]`
- `PATCH /api/report-packages/[id]`
- `GET /api/report-packages/[id]/export`
- `GET /api/report-packages/[id]/json`
- `/report-packages/[id]/print`
- Compact Project Dashboard report package section.
- Compact Workspace `Create Report Package` and `Open Latest Package` action inside collapsed Data Room / Pilot Evidence.
- Known Limitations entries for `report_packaging` and `server_side_pdf`.

## Package Sections

Report packages can include executive memo, AOI factsheet, AI decision memo, deterministic scoring, external data/market context, source lineage, validation governance, evidence review, Data Room, pilot workflow, comparison memo, known limitations and export manifest.

If data is missing, the package marks the section as `validation_required`, `missing` or `sample_fallback` instead of failing generation.

## Print And JSON Export

Printable package route:

```text
/report-packages/[id]/print
```

API JSON route:

```text
/api/report-packages/[id]/json
```

The JSON export returns package metadata, section summaries, linked entity IDs, source lineage, validation summary, evidence review summary, export manifest and caveats. It does not include secrets, raw private file contents or signed URLs.

Browser print/save as PDF remains the current PDF workflow.

## Data Honesty

Required caveats:

- screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
- Report packages are decision-support deliverables, not certified valuation, legal, zoning, planning, cadastral or ownership conclusions.
- Browser print/save as PDF remains the current PDF workflow.

Do not claim official parcel boundaries, official zoning boundaries, cadastral validation, ownership verification, certified valuation, legal/planning approval, secure enterprise storage or a certified audit trail.

## Current Limitations

- Local/API fallback is not durable production storage.
- Server-side PDF generation is not implemented.
- No formal e-sign/offline package assembly.
- No enterprise document storage.
- No certified valuation/legal/zoning/cadastral/ownership conclusion.
- No raw file export or signed URL export in package JSON.
- Official validation remains required.

## QA

Run:

```bash
npm run lint
npm run build
npm run data:status
npm run storage:check
```

Smoke:

- `/api/report-packages?projectKey=dubai-investment-screening-demo`
- `POST /api/report-packages`
- `/api/report-packages/[id]`
- `/api/report-packages/[id]/json`
- `/api/report-packages/[id]/export`
- `/report-packages/[id]/print`
- `/projects`
- `/workspace`
