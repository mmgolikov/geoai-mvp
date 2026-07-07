# GeoAI Product Audit Hardening v1

## Summary

Product Audit Hardening v1 improves source-backed decision output consistency across the existing workspace, Project Hub, report preview, printable reports and API smoke coverage. It does not implement a new visual design and does not change the Figma/design-governance state.

This release keeps GeoAI as an investor/client demo MVP using local/API fallback unless Supabase runtime env is configured.

Required caveat:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## What Changed

- Added Data Foundation v1.3 source-quality vocabulary to Project Hub source-lineage rows.
- Added source group, data mode, confidence, validation status and next-validation framing to report source-lineage surfaces.
- Tightened evidence/source labels so official-looking sources are framed as validation paths, not live official integrations.
- Added the required caveat consistently to report preview, browser-print reports and saved-report print deliverables.
- Extended `npm run test:api-contract` to cover product-critical Data Foundation and backend status routes.
- Added clearer validation-package wording in Project Hub without changing layout or design system.

## User-Facing Product Improvements

- Analysis and report users can see why a result exists, what source context supports it and what still needs validation.
- Project Hub now makes the next validation step clearer for source groups.
- Reports now carry the same data-honesty framing as dashboards and source panels.
- Smoke checks now verify source quality, readiness, lineage, caveat, generated timestamp, blockers and next actions across the data APIs.

## Data / Source Honesty

This release does not claim:

- live official DLD integration;
- live GeoDubai integration;
- official parcel;
- official zoning;
- cadastral validation;
- ownership verification;
- certified valuation;
- approved site;
- guaranteed best use;
- production-ready status;
- pilot-ready status.

Data Foundation source groups remain screening/source-readiness context:

- DLD / Dubai Pulse public real estate snapshots;
- OSM / Geofabrik open geospatial baseline;
- Overture Maps buildings / places / transportation;
- Open-Meteo + NASA POWER climate / energy context;
- Copernicus / Sentinel metadata availability.

## Validation Run

Validation passed for this branch:

- `npm run lint`
- `npm run build`
- `GEOAI_TEST_BASE_URL=http://127.0.0.1:3031 npm run test:api-contract`

Smoke passed against local production server on `http://127.0.0.1:3031`:

- `/`
- `/workspace`
- `/projects`
- `/reports/seeded-analysis-dubai-marina-report/print`
- `/api/health`
- `/api/data-sources`
- `/api/data-sources/readiness`
- `/api/external-data/manifest`
- `/api/external-data/status`
- `/api/source-lineage`
- `/api/db/health`
- `/api/platform/activation-status`
- `/api/pilot-backend/status`

## Known Limitations

- No Figma implementation or visual redesign is included.
- No Supabase migration, data write or runtime env change is included.
- Production remains demo/local fallback unless Supabase runtime env is configured.
- Browser print/save as PDF remains the current report export path.
- Source-quality fields are decision-support metadata, not legal, cadastral, zoning, planning or valuation evidence.

## Design Freeze Confirmation

This release does not touch Figma, PR #34, PR #32, PR #3, PR #2, Page 14, Tailwind palette, visual redesign or design-system structure.
