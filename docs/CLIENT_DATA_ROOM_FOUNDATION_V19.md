# GeoAI Client Data Room Foundation v1.9

Date: 2026-06-23

GeoAI Client Data Room Foundation v1.9 adds a lightweight project-level evidence package for the demo/pilot workflow. It links AOIs, uploaded metadata, analyses, reports, comparisons, source readiness, validation checklist items and expected pilot deliverables.

This is not a production data room, secure enterprise repository, official validation system or durable client file store.

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

Storage caveat:

> Local/API fallback is not durable production storage.

## What It Adds

- Project-scoped Client Data Room model.
- `DataRoomAsset` records for AOIs, uploaded metadata, analyses, reports, comparisons, external sources and validation notes.
- Project-specific validation checklist templates for fund/family office, developer and bank/lender workflows.
- Pilot deliverable summary for screening dashboards, AOI libraries, comparison memos, investment memos, validation checklists, source-lineage packs and data room summaries.
- Local/API fallback routes under `/api/data-room`.
- Compact Client Data Room section in `/projects`.
- Collapsed Data Room / Pilot Evidence section in the workspace command panel.
- Metadata-only upload registration for small client files.

## Data Model

Core types live in:

- `src/types/data-room.ts`
- `src/lib/data-room/data-room-types.ts`
- `src/lib/data-room/data-room-summary.ts`
- `src/lib/repositories/data-room-repository.ts`

Key entities:

- `DataRoomAsset`
- `ValidationChecklistItem`
- `PilotDeliverable`
- `ClientDataRoom`

Project scoping is explicit through `projectId` and `projectKey`.

## Asset Types

Supported v1.9 asset types:

- `aoi`
- `uploaded_geojson`
- `uploaded_csv`
- `uploaded_document`
- `analysis`
- `report`
- `comparison`
- `external_source`
- `validation_note`

Allowed source labels include:

- client-provided data
- uploaded metadata
- user-provided AOI
- uploaded GeoJSON AOI
- local/demo fallback
- sample/public snapshot
- planned official validation
- screening evidence package

## Validation Checklist

The checklist adapts by project persona:

- Fund / family office: market evidence, ownership/title, zoning/planning, pipeline/absorption, climate/insurance.
- Developer: planning/zoning, infrastructure capacity, ownership/title, development assumptions, environmental/climate constraints.
- Bank / lender: collateral identity, ownership/title, valuation/comparable evidence, progress evidence, risk flags.

Checklist status is a workflow marker only. Marking an item complete does not mean GeoAI performed official validation.

## Pilot Deliverables

The data room summarizes:

- Screening dashboard
- AOI library
- Comparison memo
- Investment / collateral memo
- Validation checklist
- Source lineage pack
- Data room summary

Each deliverable remains tied to evidence readiness and validation caveats.

## API Routes

- `GET /api/data-room?projectKey=...`
- `GET /api/data-room?projectId=...`
- `POST /api/data-room`
- `POST /api/data-room/assets`
- `PATCH /api/data-room/assets/[id]`
- `DELETE /api/data-room/assets/[id]`
- `POST /api/data-room/checklist`
- `PATCH /api/data-room/checklist/[id]`

All routes are local/API fallback only in v1.9. They should not be described as secure, durable, enterprise or production storage.

## UI Placement

Projects dashboard:

- Compact Client Data Room section below AOI Library.
- Counts for AOIs, uploads, reports, analyses, comparisons and validation items.
- Latest assets, max three.
- Compact validation checklist status controls.
- Metadata-only file registration.

Workspace:

- Collapsed Data Room / Pilot Evidence block below essential scenario/query controls.
- Shows evidence counts and checklist status.
- Adds current AOI or analysis to the project data room as local/demo metadata.

## Data Honesty Constraints

Do not claim:

- verified ownership;
- official parcel proof;
- cadastral proof;
- zoning approval;
- legal conclusion;
- valuation conclusion;
- production-ready storage;
- secure data room;
- enterprise data room;
- pilot-ready without caveat.

Use:

- validation required;
- local/demo fallback;
- client-provided unvalidated;
- planned official validation;
- screening hypothesis;
- official validation required.

## Future Work

- Durable storage.
- Authentication.
- Role-based access.
- Audit trail.
- Secure file storage.
- Client organization workspaces.
- Data room permissions.
- Official validation connectors.
- Supabase/PostGIS-backed data-room records.
- Signed report/data package exports.
