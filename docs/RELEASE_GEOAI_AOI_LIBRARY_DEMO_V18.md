# GeoAI AOI Library Demo v1.8

Release date: 2026-06-23

Production URL: https://geoai-mvp.vercel.app

Production deployment: https://geoai-69drmjjx8-geoaidev.vercel.app

Vercel deployment ID: `dpl_86bYrNeuPbqozjsgUSoB8gGXdkHg`

Production commit SHA: `d06a3e26e18176bb3a9ab80e68baaee7341e512a`

## Scope

GeoAI AOI Library Demo v1.8 adds reusable area-of-interest workflows for the existing Dubai spatial decision intelligence demo. The release lets users save, reopen, rename, delete, import and export screening AOIs while preserving the current map, analysis, comparison, project dashboard and report flows.

## What Changed

- Added a reusable AOI asset model for user-drawn and uploaded GeoJSON Polygon screening geometries.
- Added project-scoped AOI API routes for create, list, get, update and delete.
- Added Workspace AOI Library controls for save, reopen, rename, delete, GeoJSON import and GeoJSON export.
- Added Project Dashboard AOI Library visibility scoped to the active project.
- Preserved AOI source lineage in selected-object metadata, analysis, evidence, report preview and printable reports.
- Added GeoJSON Polygon import validation and a size guard for uploaded AOI files.
- Kept AOI geometry explicitly framed as user-provided or uploaded screening context.

## Production Verification

- PR #10 was merged into `main` with squash commit `d06a3e26e18176bb3a9ab80e68baaee7341e512a`.
- Vercel production deployment `dpl_86bYrNeuPbqozjsgUSoB8gGXdkHg` reached `READY`.
- Production smoke routes returned `200`:
  - `/`
  - `/demo`
  - `/workspace`
  - `/projects`
  - `/api/aois?projectKey=dubai-investment-screening-demo`
  - `/api/external-data/manifest`
  - `/api/external-data/status`
  - `/reports/seeded-analysis-dubai-marina-report/print`
  - `/reports/seeded-comparison-dubai-shortlist-report/print`
- Printable seeded report routes showed Back and Print / Save as PDF controls and did not show Report not found.
- Runtime error/fatal log check for the production deployment returned no matching entries during the checked release window.

## AOI QA Summary

- Browser QA confirmed production `/workspace` opens and shows AOI Library v1.8 controls.
- Browser QA confirmed valid GeoJSON Polygon import selects an uploaded AOI, shows centroid, area, perimeter, vertex count, source and validation-required status.
- Browser QA confirmed Save AOI updates the project AOI Library count and shows the saved AOI in the command panel.
- Production API QA confirmed create, list, get, rename and delete for project-scoped AOIs.
- Production API QA confirmed a Dubai project AOI does not appear in the bank project AOI list.
- Temporary production QA AOIs were deleted after verification.

## Data Honesty

AOIs in v1.8 are user-provided or uploaded screening geometry. They are not official parcel, zoning, cadastral, planning, ownership, entitlement or valuation boundaries.

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

This release does not add live official DLD, Dubai Pulse, GeoDubai, cadastral, zoning, ownership, title, planning or certified valuation integrations.

## Current Limitations

- AOI persistence uses the current local/API fallback path unless durable Supabase/PostGIS persistence is configured.
- Uploaded GeoJSON is limited to Polygon screening geometry for this demo release.
- AOI import/export is intended for demo screening context, not official GIS exchange.
- Project and report flows remain demo-oriented and require official/client validation before pilot or production decisions.
- There is no auth, multi-tenant governance or enterprise file storage in this release.

## What This Enables In Demos

- Demonstrate a reusable AOI library rather than one-off drawn polygons.
- Show imported GeoJSON screening geometry moving into analysis, report and project contexts.
- Explain a clear path from demo AOIs toward client-provided or officially validated project boundaries.
- Keep data-honesty language visible while presenting a more credible geospatial workflow.

## Recommended Next Sprint

Client Data Room Foundation v1.9.
