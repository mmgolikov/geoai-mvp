# Phase B Engineering Brief v1

## Status

Draft implementation handoff for founder review. This document does not authorize merge, Production deployment, source activation, Supabase migration, Auth/RLS, Storage, environment, secret or Figma changes.

## Objective

Replace selected arbitrary synthetic demo geometries with versioned, source-backed open-context geometry while preserving the existing Workspace, dashboard, comparison, Project Hub and report contracts.

Phase B must prove that future customer, licensed and official adapters can replace the source bundle without redesigning Product components.

## Delivery model

Use two separate draft PRs.

### B1 — Contract, Snapshot Builder and Open Geometry Bundle

Recommended branch:

`codex/spatial-open-context-foundation-b1`

Scope:

1. Add canonical v1 types for dataset versions, feature envelopes, metric observations, manifests, stable keys, attribution and geometry quality.
2. Add a read-only static spatial repository and source resolver.
3. Convert the current seed into an explicit `synthetic_fallback` bundle for compatibility and rollback.
4. Add deterministic OSM/Overture snapshot build and validation scripts.
5. Generate a reviewed Dubai open-context bundle for focused AOIs.
6. Keep visible Product activation off until B1 evidence is reviewed.

Target B1 datasets:

- primary roads and rail;
- airports, ports, stations and activity anchors;
- open land-use, water and coastline context;
- OSM/Overture building footprints in focused AOIs;
- open construction footprints;
- two to four sample AOIs built from real footprints or transparent derived unions;
- reviewed open community/place context where geometry quality is adequate.

Explicitly exclude environmental derived layers, DLD/Dubai Pulse metrics and official Municipality/GeoDubai data.

Expected structure:

```text
src/types/spatial-v1.ts
src/lib/spatial-v1/
scripts/spatial/
data/spatial-snapshots/dubai-open-context-v1/
```

Required scripts:

```text
spatial:build:open-context
spatial:validate:manifest
spatial:validate:geometry
spatial:validate
spatial:contract
```

B1 acceptance:

- exact source release/snapshot and checksum are pinned;
- licence and attribution manifests are complete;
- deterministic rebuild produces the same normalized checksum;
- stable feature keys are unique;
- topology and coordinate checks pass;
- rejected features and repairs are reported;
- no official, parcel, zoning, cadastral or hazard claims are introduced;
- existing application build and API contracts remain green;
- no Product layer is silently switched.

B1 evidence artifact:

- source and output manifests;
- attribution bundle;
- quality report;
- feature counts and rejected-feature log;
- stable-key registry;
- deterministic rebuild result;
- static before/after map comparisons for Marina/JBR, Business Bay and Dubai South.

### B2 — Product Integration, Source Labels and Visual Evidence

Recommended branch:

`codex/spatial-open-context-product-b2`

B2 starts only after founder review of the B1 snapshot.

Scope:

1. Update the existing `demoLayers` compatibility facade to consume eligible normalized bundles.
2. Pass stable `featureKey`, dataset version, geometry checksum and source lineage through selection, dashboard, comparison and report flows.
3. Migrate layers incrementally with per-layer synthetic fallback.
4. Add compact source, release/date, geometry-role and validation labels.
5. Preserve current responsive, map snapshot and PDF behavior.

Migration order:

1. transport corridors;
2. infrastructure/activity anchors;
3. selected AOIs;
4. buildings and land-use context in focused AOIs;
5. construction targets;
6. reviewed open context areas.

Do not migrate coastal, heat or development derived zones in B2. Those require separately approved methodology and PRs.

Required Product terminology:

- `Open-context geometry`;
- `Open-context building footprint`;
- `Sample AOI on real-world geometry`;
- `Open transport context`;
- `Open spatial anchor`;
- `Open construction monitoring target`;
- `Synthetic fallback` when no approved open bundle is selected.

Never use `official parcel`, `official zoning`, `cadastral validation`, `ownership verification`, `approved site`, `certified valuation`, `live DLD integration` or `live GeoDubai integration` without separate verified evidence.

B2 browser evidence:

- 390×844;
- 430×932;
- 768×1024;
- 1366×768;
- 1440×900.

Locations:

- Dubai Marina/JBR;
- Downtown/Business Bay;
- Dubai South/Jebel Ali;
- optional Creek/DXB.

Hard assertions:

- migrated geometry aligns recognizably with real roads, footprints, coastline or land-use context;
- no arbitrary polygon remains in the approved migrated layer set;
- source attribution and snapshot/release are visible;
- selected feature identity/version is consistent across map, dashboard, comparison and report;
- no horizontal overflow or map-control regression;
- no console/runtime errors;
- map performance remains acceptable;
- printable report and physical PDF remain readable if source/map captions change.

Required validation:

```text
npm ci
npm run lint
npm run build
npm run test:workspace-panel
npm run test:data-honesty
npm run test:api-contract
npm run spatial:contract
npm run spatial:validate
```

Use a temporary read-only browser evidence workflow, remove it after evidence capture, then run the permanent GeoAI Quality Gate on the final clean head. Verify the final Vercel Preview routes and deployment-scoped logs.

## Existing report compatibility

Saved analyses and reports must pin:

- `featureKey`;
- `datasetId`;
- `datasetVersion`;
- `geometryChecksum`.

A new map dataset must not silently alter an already saved report. Any seeded report map change requires a separate report-alignment Change Request and physical PDF evidence.

## Rollback

Every migrated layer must support resolver fallback:

`approved open bundle → synthetic fallback`

Rollback must not require reverting map or dashboard component architecture.

## Explicit exclusions

Phase B does not include:

- DLD/Dubai Pulse ingestion;
- official Municipality/GeoDubai geometry;
- Production Supabase configuration or migration;
- Auth, memberships, live RLS or hard access;
- secure Storage activation;
- customer confidential data;
- environmental derived zones;
- new AI/scoring methodology;
- Production deployment without explicit founder approval.

## Definition of done

Phase B is complete only when:

1. At least three focus locations use credible open-context geometry.
2. Sample AOIs follow real footprints/blocks and are not called parcels.
3. Stable keys and immutable manifests are active.
4. Attribution, source release/date and validation state are visible.
5. Synthetic fallback remains available and honest.
6. Future official/client adapters can emit the same normalized envelope.
7. Map/dashboard/report parity passes.
8. Responsive, performance and physical-PDF evidence pass.
9. Founder approves the visual result and a separate merge/release decision.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**