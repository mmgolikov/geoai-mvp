# Spatial B2A Integration Foundation v1

## Release posture

PR #81 is merged as an inactive, fail-closed Product integration foundation for future Spatial B1 geometry. The default Product remains the existing synthetic Dubai seed. No normalized real geometry is committed or activated.

Authoritative release: merge `cd5f9efe791ff7d5ac46597925bbf17eb60d2754`; Vercel Production `dpl_94Tz2TZG5Pf8k1PGygTBjQBCQAkf` is READY on the exact merge SHA.

## Source audit

- `MapWorkspaceClient` registers eight synthetic `demoLayers`; five are visible by default.
- The always-registered `openGeodataBaseline` is a local OSM-style sample fixture, not live OSM. Its exact external provenance and licence are not inferred.
- Spatial B1 provides canonical identity, dataset version, provider aliases, freshness, review, quality, limitations and attribution contracts.
- `ReportMapSnapshot` can carry optional attribution and selected-feature lineage without changing print layout.
- Real B1 geometry remains evidence-artifact-only. `publicRepositoryGeometryApproved=false`, `openGeometryActivated=false` and real-bundle `releaseReady=false` remain authoritative.

## Implementation

- Added a typed Product source-mode contract and server-resolved Workspace request.
- Added a typed layer catalogue with deterministic fallback for every layer.
- Added a read-only bundle-loader abstraction. B2A implements only `static_test_fixture`.
- Added a pure activation resolver covering Production rejection, checksum failure, separate delivery/distribution/repository gates and layer-level fallback.
- Added a source-generic B1 compatibility adapter plus an explicit controlled-fixture wrapper.
- Added visible-layer-derived attribution for synthetic overlays, the local fixture and visible user-uploaded data.
- Added basemap-aware attribution modes: `mapbox`, `fallback_grid` and `none`.
- Added an accessible Data Licences dialog and selected-feature Source Lineage drawer.
- Added no-reload synthetic-to-fixture-to-synthetic map synchronization and invalid fixture-selection rollback.
- Extended map snapshots with optional attribution and selected-feature lineage payloads. Report values, map rendering, dimensions and pagination are unchanged.

## Source-mode matrix

| Runtime/request | Effective result |
| --- | --- |
| Production / `synthetic_fallback` | Allowed; current synthetic catalogue |
| Production / `open_context_preview` | Rejected with reason; deterministic synthetic fallback |
| Preview or development / controlled fixture / valid checksum | Controlled non-real fixture may be added alongside synthetic layers |
| Preview / checksum mismatch | Synthetic fallback |
| Real bundle / release, delivery or distribution gate false | Rejected |
| Repository fixture / repository approval false | Rejected |
| Missing individual fixture layer | Corresponding synthetic layer fallback retained |
| Licensed, client or official mode in B2A | Not approved; synthetic fallback |

The server determines the runtime environment. Query-string values cannot override the Production lock, and no localStorage source-mode override exists. The visible Preview/development switch exists only to exercise the controlled non-real activation contract without a page reload.

## Delivery semantics

`deliveryApproved`, `distributionApproved` and `publicRepositoryGeometryApproved` are separate controls. Public-repository approval is required only for `repository_fixture`. Metadata-only contract tests confirm that approved `release_asset`, `object_storage` and `vector_tiles` delivery may pass their delivery-policy check while repository approval remains false. No real delivery mechanism or geometry is implemented in B2A.

## Controlled fixture

The fixture contains one invented point and one invented polygon in a Dubai-like test extent. They are not copied from OSM, Overture, Spatial B1 output or any selected AOI. They exercise source mode, attribution, identity, selection lineage and rollback contracts only.

For the controlled point fixture, lineage keeps distinct values:

- Source ID: `controlled-osm-attribution-fixture`
- Provider feature ID: `invented-point-01`
- Source record ID: `invented-point-01`

## Attribution behavior

- Native Mapbox attribution is visible on Landing and Workspace whenever Mapbox renders.
- The GeoAI disclosure includes a Mapbox record only in `mapbox` mode; fallback grid does not claim Mapbox.
- The local fixture is labelled `GeoAI local OSM-style fixture` / `local fixture`, never live OSM.
- The local fixture attribution appears when at least one of its three layers is visible and disappears when all are hidden.
- Visible user-uploaded GeoJSON is labelled `User-provided local data`; official/client validation is required and no external licence is inferred.
- Attribution IDs are derived from actual visible overlays. The source gate rejects missing or unexpected coverage.
- Controlled Overture fixture and source-provider records remain separate.

## Generic adapter mapping

The generic adapter derives Product status from catalogue source mode, validation status, geometry origin, review status and source provenance. It has explicit mappings for `synthetic_fallback`, `open_context_preview`, `licensed_provider`, `client_validated` and `official_validated`. Open and licensed records are not marked official; client validation remains distinct; official status requires an explicitly official-validated contract record.

## Activation synchronization and rollback

Preview/development can transition `synthetic_fallback` to `open_context_preview` and back without reload. The map adds active controlled sources/layers, removes obsolete layers before their GeoJSON sources, updates interaction and attribution, and preserves point/AOI state. If a selected controlled fixture becomes inactive, the object and stale result state are cleared, the point/AOI remains, and an explicit rollback reason is recorded.

Production permits only `synthetic_fallback`.

## Modal accessibility

Data Licences and Source Lineage move focus into the dialog, trap Tab and Shift+Tab, close on Escape or backdrop click, lock background scrolling, expose labelled close controls and return focus to the opener. Opening/closing disclosure does not change a valid selected object.

## Validation and evidence

Required local checks:

- `npm run lint`
- `npm run test:workspace-panel`
- `npm run test:data-honesty`
- `node scripts/spatial-b1-contract-check.mjs`
- `node scripts/spatial-b2-integration-check.mjs`
- `npm run build`
- `npm run test:api-contract`
- HTTP 200 smoke for `/`, `/workspace`, `/projects`, `/api/health` and both seeded print routes

The temporary browser evidence workflow records Landing at 390x844 and 1440x900 plus the five approved Workspace viewports. It captures visible/hidden attribution, fallback mode, no-reload source transitions, source/layer inventories, exact identity, keyboard/backdrop/Escape behavior, report regression, logs, tested SHA and Preview deployment.

Final accepted responsive correction evidence:

- Tested Product SHA: `29c5b9f004e0cf65fddf7c23f846391ae87ad29d`.
- Final clean head: `e9b02306857ee5f3584268ed9d5619d5d0296eb8`.
- Workflow run/job: `29367934398` / `87204007323`.
- Artifact: `8324879513`, `cr-dev7-001-responsive-evidence-29367934398`, 14-day retention through 2026-07-28.
- Artifact digest: `sha256:c4775e97297285f4b644bb2149e7fa5abb5fc7f42490e28a93d04d34960986a7`.
- Evidence ZIP digest: `sha256:7f70293642fd4b64c9b4bd5012b1d14d2794890276b67535f7daba7538a29cb2`.
- Result: 17 screenshots and 223/223 assertions passed across the five controlled Workspace viewports.
- Permanent pre-merge Quality Gate: `29368152641` / `87204710137`.
- The final clean Product tree and tested Product tree are identical; the merge adds no Product-tree file difference.
- Browser inventory: 0 JavaScript errors, 16 expected allowlisted WebGL warnings and 0 unexpected warnings.

Browser logging separates JavaScript errors, expected allowlisted headless WebGL warnings and unexpected warnings. The allowlist is restricted to software WebGL fallback deprecation and GPU stall/readback messages. Unexpected warnings fail evidence. The map retains `preserveDrawingBuffer` for the existing report snapshot path; headless `ReadPixels` warnings are a non-blocking performance limitation, not a fully clear console.

## Limitations

- No normalized OSM or Overture geometry is included.
- No selected AOI or Spatial B1 evidence geometry is distributed.
- No open, licensed, client-validated or official geometry is activated in Production.
- The controlled fixture does not establish browser-performance expectations for real geometry.
- Durable delivery and public-distribution treatment remain blocked for B2B.
- B2C Production activation is not authorized.
- Map screenshot capture may produce allowlisted WebGL readback warnings in headless Chromium.
- This package does not change scoring, Candidate Search, report values, print pagination, Supabase, Auth, RLS, Storage, environment variables, secrets or Figma.

## Release control

PR #81 was independently accepted, explicitly approved, merged and deployed through the Git-connected Vercel Production path. The released scope remains inactive. Any real geometry, public distribution, B2B/B2C activation, Production data-plane change or further merge requires a separate decision. PR #69 remains unchanged.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
