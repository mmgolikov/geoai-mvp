# Q06–Q08 Create geometry, preflight and map receipt

Status: local candidate, not released. Date: 2026-09-20.
Base: `1dab55817e1664870ace88278aaed8f7558ece83`; branch `codex/quality20-create`.
Scope authority: approved September 20 quality plan and control's explicit file ownership. No hosted changes, push, paid API execution or copied secrets.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Reproduced baseline and changed behaviour

The exact founder AOI is **not recovered**. `scripts/sprint20-create-geometry-check.ts` defines synthetic L/U/skew-L/rotated-L analogues near Dubai with approximately 749,860 m² and a 180,000 m² narrow strip. These are not parcel evidence or the founder's original site. The browser fixture is a separate approximately 722,081 m² synthetic L.

Before implementation, the new L regression (9 primary blocks, 6–53 levels, 38% coverage, 35% open-space target, 8 m setback) failed at `planPerimeterOrCourtyard` with `ConceptMassingError: The requested perimeter programme does not fit inside this AOI and setback.` This is retained as the baseline observation, not a proof of physical infeasibility. Existing preflight's eight attempts remain a bounded candidate search, not a capacity calculation.

For sites at least 150,000 m², a new bounded site-cell allocation runs before legacy layout fallback. It rotates into a boundary frame, splits at boundary vertex levels, intersects strip intervals, verifies perpendicular setback, and subdivides the largest retained cells until the requested number is allocated. All retained components participate. A/B change strip direction, ordering and footprint grammar. L/U/chamfered footprints retain their existing form metadata; podiums retain explicit tower support. Final validation and all existing geometric restrictions still apply. Coverage is scaled to the requested total ground area, never silently reduced. Below the threshold the accepted legacy layouts remain unchanged.

The editor performs the existing pure preflight in a cancellable local Web Worker after a 250 ms debounce. A 15 s worker timeout fails closed; obsolete workers are terminated on draft/AOI changes. Fixed programmes must be ready before the generation button can send its challenge/request. A validated lower-coverage preset requires a separate explicit click. Custom programmes remain explicitly unresolved until their model programme is available, preserving the server's existing semantics. No new API or route contract was introduced.

The result defaults to the existing OpenFreeMap Positron basemap in both 2D and 3D. The separate Model mode uses the original tile-free style. Both consume the same saved geometry, height/base values and A/B KPIs. Resize refits the camera. Tile errors preserve the saved model and offer Model mode. Test diagnostics distinguish style load from actual rendered basemap features; GeoAI AOI/massing features are excluded from the basemap count. Unbuilt ground is derived from coverage and includes circulation; it is not labelled planted/accessible parkland.

## Validation and evidence

Runtime: bundled Node 24.19.0, existing root node_modules linked locally (no dependency installation or shared build-file mutation).

| Check | Result and interpretation |
| --- | --- |
| `node --experimental-strip-types scripts/sprint20-create-geometry-check.ts` | PASS: 15 shape/style combinations, two geometrically distinct alternatives each; exact 38% within 0.1 points; 9 primaries; distribution across both main axes (long axis for narrow strip); deterministic rerun; containment/setback, overlap mutations, holes rejected; fixed 6 and 80 levels preserve feasible 38% |
| `npm run test:point-to-object-create` | PASS: entire pre-existing geometry, preflight, actual-route offline, saved-preview contracts. Includes origin/runtime gates, unknown usage, provider mocks, no-fit and explicit suggestions. Not live API evidence |
| `npm run lint` / `npm run build` | PASS on local candidate; rechecked after implementation |
| Local route smoke | 200: `/`, `/workspace`, `/projects`, `/api/health`, `/api/db/health`, `/api/platform/activation-status`, `/api/pilot-backend/status`, `/prototype/point-to-object`; 307: `/explore`, `/demo`. Local environment only, not hosted auth/DB readiness |
| `tests/e2e/sprint10-create-preview.spec.ts` | 3 PASS in Chrome: saved A/B/KPI/local persistence, Russian mobile WebGL fallback, invalid-option recovery. External HTTP blocked; explicit Model mode is tile-free |
| `tests/e2e/sprint20-create-map.spec.ts` | 2 PASS in Chrome: actual free OpenFreeMap streets/labels and model on synthetic geometry; one mocked Create response, no extra generation calls on A/B/view changes; incompatible coverage/open-space controls blocked before any Create request |
| Visual inspection | Real street/label context and generated extrusions visible; Model mode geometry visible; mobile no horizontal page overflow. These are synthetic concepts over a real reference basemap, not official development evidence |

Latest measured geometry run: 15 positive combinations, 4–29 ms per test row including repeat generation and negative checks on this machine. This is not a service p95/SLA. Existing 24-vertex concave regression remained below its 2,500 ms assertion (approximately 989 ms in the final contract run).

Screenshots (local review artifacts, not paid/live programme acceptance):

- `/private/tmp/geoai-quality20-create/artifacts/playwright-auth-session/sprint20-create-map-saved--bfe58-d-unchanged-KPIs-without-AI/synthetic-large-L-real-basemap-A.png`
- `/private/tmp/geoai-quality20-create/artifacts/playwright-auth-session/sprint20-create-map-saved--bfe58-d-unchanged-KPIs-without-AI/synthetic-large-L-local-model-B.png`
- `/private/tmp/geoai-quality20-create/artifacts/playwright-auth-session/sprint20-create-map-saved--bfe58-d-unchanged-KPIs-without-AI/synthetic-large-L-mobile-model-B.png`

Initial browser attempts failed on an invalid synthetic saved-session fixture (ID/prompt/attempt fields, then guest lifecycle) and an exact accessible-name selector that omitted the slider value. The fixture was changed to the normal upload → mocked generation → open-result path, and selectors corrected. An early screenshot taken immediately after style load was blank before source rendering; it was rejected and acceptance strengthened to wait for rendered massing and actual camera pitch. Later successful attempts do not erase these initial failures.

## Integration and remaining gates

Control should cherry-pick only this branch's core commit into the integration branch. No package/config/API/shared translation edits are included. Worker bundling was verified by Next build and Chrome. Existing per-component EN/RU strings were extended; no shared translation keys need handoff. The granted old preview contract and browser test now intentionally cover Map and Model separately; do not restore a blanket tile-free requirement for Map mode.

Run the dedicated new geometry script explicitly (package.json was outside ownership), the full Create script, the two browser specs with loopback URL, and integrated build/lint. The real-basemap browser test permits only OpenFreeMap external HTTP, mocks all application API requests and asserts rendered context features; it needs free basemap network availability. Offline tests retain external denial. All screenshot evidence is local Chrome; independent reviewer, WebKit/device, protected Preview, actual paid model responses and authenticated cloud writer/viewer/outsider/reopen remain control-owned.

Limitations: the strip allocator is conservative and may decline slanted, very fragmented or narrow geometry; the legacy bounded fallback can still exhaust. It is not a complete feasibility solver, exact polygon erosion or optimum-capacity calculation. The 150,000 m² threshold limits behavioural change to district-scale sites in this slice. The exact founder polygon must still become a regression. Count still means primary generated volumes, not dwelling units or independently modelled urban blocks. Circulation is preserved as gaps between cells; a routable access network, individually allocated green/public-space polygons, five fully differentiated programmes, materials, BIM, terrain and normative engineering/planning checks are not implemented by this slice. No such readiness is claimed.
