# Spatial B2A Integration Foundation v1

## Release posture

This package adds a Preview-safe Product integration foundation for future Spatial B1 geometry. The default Product remains the existing synthetic Dubai seed. No normalized real geometry is committed or activated.

Authoritative base: `3a775e6b68c274fe8cb4e02218c48022b73d1862`.

## Source audit

- `MapWorkspaceClient` previously registered the eight `demoLayers` directly; five are visible by default.
- The existing small open-geodata sample remains a separate, unchanged source and selection path.
- Spatial B1 already provides canonical identity, dataset version, provider aliases, freshness, review, quality, limitations and attribution provenance.
- `ReportMapSnapshot` is the existing safe map/report contract and can carry optional attribution and selected-feature lineage without changing print layout.
- Real B1 geometry remains evidence-artifact-only. `publicRepositoryGeometryApproved=false`, `openGeometryActivated=false` and real-bundle `releaseReady=false` remain authoritative.

## Implementation

- Added a typed Product source-mode contract and server-resolved Workspace request.
- Added a typed layer catalogue with one deterministic fallback for every layer.
- Added a read-only bundle-loader abstraction. B2A implements only `static_test_fixture`.
- Added a pure activation resolver covering Production rejection, checksum failure, real-bundle release and distribution gates, and layer-level fallback.
- Added a B1 compatibility adapter that preserves canonical identity and source lineage while keeping map styling separate.
- Added additive overlay attribution and a compact Data Licences disclosure.
- Added a selected-feature source-lineage drawer with nine approved sections.
- Extended map snapshots with optional attribution and selected-feature lineage payloads. Report values, map rendering, CSS, dimensions and pagination are unchanged.

## Source-mode matrix

| Runtime/request | Effective result |
| --- | --- |
| Production / `synthetic_fallback` | Allowed; current synthetic catalogue |
| Production / `open_context_preview` | Rejected with reason; deterministic synthetic fallback |
| Preview or development / controlled fixture / valid checksum | Controlled non-real fixture may be added alongside the unchanged synthetic layers |
| Preview / checksum mismatch | Synthetic fallback |
| Real bundle / `releaseReady=false` | Rejected |
| Real bundle / distribution approval false | Rejected |
| Missing individual fixture layer | Corresponding synthetic layer fallback retained |
| Licensed, client or official mode in B2A | Not approved; synthetic fallback |

The server determines the runtime environment. Query-string values cannot override the Production lock, and no localStorage source-mode override exists.

## Controlled fixture

The fixture contains one invented point and one invented polygon in a Dubai-like test extent. They are not copied from OSM, Overture, Spatial B1 output or any selected AOI. The fixtures exist only to exercise source mode, attribution, selection lineage and rollback contracts.

No runtime request is made to GitHub Actions artifacts. `release_asset`, `object_storage` and `vector_tiles` are interface-only future delivery methods.

## Attribution behavior

- Mapbox basemap attribution remains owned by the existing Mapbox control.
- GeoAI overlay attribution is additive and calculated from active Product overlay sources.
- Synthetic mode shows `GeoAI sample layers`.
- Controlled fixture mode shows `Open-context overlays · source details`.
- OSM/ODbL, Overture and upstream provider records remain separate.
- Inactive external sources produce no overlay attribution.
- The same serializable payload can be attached to a report map snapshot.

## Source-lineage contract

Selection remains backward compatible and can additionally carry the canonical feature key, layer key, source mode, dataset/version, bundle checksum, provider and aliases, freshness, review state, geometry origin/accuracy, quality summary, attribution IDs, limitations, caveat and fallback state.

Closing the drawer does not clear or change the selected object.

## No-activation and rollback

Production permits only `synthetic_fallback`. A non-synthetic request, missing bundle, checksum mismatch, ineligible review state, real bundle without release readiness, or unapproved real-geometry distribution fails closed. The existing synthetic layer is retained globally or per layer as applicable.

Rollback is removal of B2A Product integration files or a source request of `synthetic_fallback`; no data migration or runtime data write is involved.

## Validation and evidence

Required local checks:

- `npm ci`
- `npm run lint`
- `npm run test:workspace-panel`
- `npm run test:data-honesty`
- `npm run test:api-contract`
- `node scripts/spatial-b1-contract-check.mjs`
- `node scripts/spatial-b2-integration-check.mjs`
- `npm run build`
- HTTP 200 smoke for `/`, `/workspace`, `/projects`, `/api/health` and both seeded print routes

The temporary browser workflow must record the five approved viewports, source-mode matrix, catalogue, activation, rollback, attribution, lineage, registration/timing metrics, logs, exact SHA and exact Preview deployment. The temporary workflow and harness are removed after successful evidence capture.

## Limitations

- No normalized OSM or Overture geometry is included.
- No selected AOI or Spatial B1 evidence geometry is distributed.
- No open, licensed, client-validated or official geometry is activated in Production.
- The controlled fixture does not establish browser-performance expectations for real geometry.
- Durable delivery and public-distribution treatment remain blocked for B2B.
- B2C Production activation is not authorized.
- This package does not change scoring, Candidate Search, report values, print pagination, Supabase, Auth, RLS, Storage, environment variables, secrets or Figma.

## Release control

The branch is delivered through one draft pull request. It must remain draft and must not be merged or manually deployed to Production without separate approval. PR #69 remains unchanged.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
