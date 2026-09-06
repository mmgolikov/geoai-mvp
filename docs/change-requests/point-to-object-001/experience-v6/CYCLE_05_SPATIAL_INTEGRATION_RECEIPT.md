# Cycle 05 — bounded spatial integration receipt

Status: Local acceptance passed; protected Preview publication/readback pending
Date: 2026-09-06
Owner: Main; implementation: gen_ai_1; independent review: replacement_review
Scope: Only C05-REPLACE and the product roadmap/documentation, not full Cycle 05 completion

## Exact integration

- Application baseline: `833b575561853942530bb4766d04c2ad8ae06b31`.
- Scope/roadmap docs commit: `e623f8c`.
- Frozen spatial owner: `f7b3772e59f922907fe202127f09cc344ba7121f`, clean; integrated as `4dd9678`.
- Final application change: `71aa34d064018454e86712eba936060a422830b9` (neutral EN/RU overview-zoom state).
- Branch: `codex/point-to-object-clickable-prototype-v1`, Draft PR #147. Main/Production remain separately protected.
- Previous good Preview/rollback reference: `dpl_GazGmmiDkznQwuM2GwWK2RDGZNMu` at baseline833b575.

The publication commit may add receipt/status documentation only. Its exact CI/deployment tuple belongs in the post-publication receipt; this file does not pre-claim it.

## Confirmed defect and correction

The previous replacement filter removed a whole source feature when any part intersected the selected area. A feature can cross the boundary or contain distant disjoint components. That explains collateral hiding without requiring an ID collision. A renderer source layer is not a selected object.

The corrected geometry predicate hides fully contained polygon features and keeps features touching or extending beyond the area, including mixed inside/outside MultiPolygons. Original per-layer filters are preserved and restored. Missing/duplicate feature IDs do not drive deletion. No provider records are deleted.

Boundary policy is deliberately conservative: a mixed multipart or boundary-crossing feature is retained whole. This prevents outside disappearance but can retain its inside portion. Per-component clipping/replacement is future work; do not claim this slice can perfectly erase the inside part of every mixed feature.

Below zoom13 the source filters are restored and generated concepts are hidden; zooming back in reapplies replacement. The user receives a functional EN/RU zoom-in hint rather than a technical failure. Genuine replacement errors still restore source geometry and hide the concept. The operation remains presentation state, not destructive data mutation.

## Acceptance evidence

- Targeted map-filter contract: PASS.
- Create geometry, fixed controls/preflight and actual-route offline contracts: PASS.
- Existing V5 interaction, Wikidata/semantic/V6/session regressions: PASS.
- TypeScript/lint and `git diff --check`: PASS.
- Optimized Next.js build: PASS,79/79 static pages.
- Final integrated browser suite:11 tests,0 failures,0 skipped,0 errors;47.562s. JUnit start:2026-09-06T11:18:37.172Z.
- The new actual MapLibre renderer case preserves an outside landmark, a distant multipart component and a crossing component while hiding the internal target; checks overview-zoom restore/reapply, five restore cycles and style/mode behavior.
- Existing responsive cases preserve the430px desktop drawer, map height, Find comparison, Create A/B and request-count semantics; V6 and historic V5 results retain EN/RU restore behavior.
- Main opened the optimized local build with live OpenFreeMap tiles in the in-app browser: map and controls render, Russian content and2D/Create navigation work, no framework error page. The exact geometry counterexamples use controlled synthetic sources in the real renderer, not a live geodata completeness claim.
- Independent frozen geometry review found no open P0/P1 in this bounded scope. A second read-only review accepted the shared zoom-required type/state/UI integration.

Local browser evidence (generated, not committed):

- `artifacts/auth-session-e2e-junit.xml`
- `artifacts/playwright-auth-session/point-to-object-create-rel-8d1ce-nd-retains-outside-geometry/spatial-replacement-outside-retained.png`
- `artifacts/playwright-auth-session/point-to-object-v5-offline-13a1d-s-and-breakpoint-boundaries/desktop-drawer-{analyse,find,create}.png`

No paid API calls, new provider purchase, hosted Supabase/Auth/env change or Production operation was used for these checks. Synthetic API responses in the regression suite are explicitly test fixtures; they are not new application data.

## Incomplete scope and next work

Selects, Saved Projects and landing are not implemented in this receipt. Their owning tasks rejected writes under older read-only/Figma-only scopes; Main-relayed confirmations were insufficient. They await direct user authorization in those tasks. Main did not bypass the rejected patches. Initial Projects implementation is device-only with a future cloud contract; cloud activation remains separately reviewed and approved.

The [full-version roadmap](CYCLE_05_PRODUCT_TO_PRODUCTION_ROADMAP.md) orders saved work, scenario/radius-based geocontext, source-aware generation, secure cloud/reporting and release gates. Five current Confluence patches are staged; no published parity is claimed here. Figma code/node parity remains unverified.

Iteration correction: resolve each lane's current write authority before a lengthy implementation audit, share the common source audit, and stop repeated denied dispatches. Keep bounded independent review for geometry and one final combined build/browser gate. Do not increase parallelism or model effort to solve an authorization boundary.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
