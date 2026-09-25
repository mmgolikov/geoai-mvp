# COMPLETE25 — conceptual Create environment

## Change request and boundary

Add a small, genuine conceptual environment to the five existing Create programmes, shared by the main map and saved-result 2D/3D view. No AI/provider calls, new dependencies, changes to validated building geometry, heights, footprint, floor area or FAR. No factual parks, roads, trees, construction materials, accessibility compliance or feasibility claims. Root remains integrator/deployer; this is local implementation evidence, not Production acceptance.

## Implemented contract

- A pure derived environment with `version: 1`, `provenance: conceptual` and separate GeoJSON source/layer. The persisted generated result is unchanged, so existing saved results need no migration.
- Bounded 22 × 22 search grid. Candidate rectangular open areas and corridors must be simple, inside the AOI, outside AOI holes and outside every building exterior, including podiums. Exact segment intersections, containment in either direction and a 0.75 m rendering-clearance buffer are checked. This buffer is an algorithmic separation, **not** a planning or accessibility standard.
- One connected free-space component is selected. Breadth-first paths connect the selected open areas; every final corridor is revalidated. No zero-length connections or invented links through buildings. Open areas and links can overlap one another at junctions. Building courtyards are conservatively excluded, not assumed publicly accessible.
- Programme defaults affect open-area count/size, surface and corridor width; A/B affects both the existing buildings and environment placement. These are design proposals, not quantified green-space delivery.
- `ready`, `partial`, or `unavailable` with reason codes. Invalid geometry or no valid candidate yields no decoration and an explicit short caption, without deleting or altering the valid building result. Partial omission never becomes a feasibility claim.
- Full-input bounded cache (12 scenes) avoids repeated searches during map frames. A short deterministic presentation key is used to detect scene changes. Save/reopen determinism is within this version of the algorithm; future software changes may revise derived styling.
- Five neutral finish palettes and two local A/B surface rhythms. Selected UI/outline accent stays `#087f8c`; no programme rainbow. Shared MapLibre image/pattern helpers are used on both maps, restored after style reload. SVG WebGL fallback shows the same valid open-space geometry and neutral building fills.
- Environment visibility follows existing native-building replacement protection. It is hidden with concept buildings during unsafe native-source transitions. Decorative features are excluded from basemap context counts.

## Verification

- `node --experimental-strip-types scripts/complete25-create-environment-check.ts`: PASS — 20 scenes (5 programmes × rectangle/concave × A/B), exact validation and independent dense boundary samples, independent emitted-polygon connectivity, unchanged geometry/KPIs, deterministic JSON reopen/main-result parity, 10 distinct RGBA patterns, collision/outside/hole-crossing/enclosed-hole/self-intersection/no-space/tiny-site negatives. Observed scene checks including validation ~25–60 ms on this machine; not a performance guarantee.
- `npm run lint`: PASS.
- `npm run test:point-to-object-create`: PASS — existing geometry/preflight/actual-route/preview checks. No paid calls.
- `npm run build`: PASS, 81 routes. Initial restricted-network build could not resolve Google Fonts; permitted normal font retrieval completed the same build. No dependency or font policy change.
- `complete25-create-programmes.spec.ts`: **4/4 PASS** (30.9 s), Chrome/WebKit × EN desktop1440/RU mobile390. Verifies unchanged result during draft edits, actual rendered environment on main/result maps, identical scene keys, A/B, map/model recreation, 2D/3D, Projects save/reopen and exactly two mocked Create calls. The initial empty style correctly hides the concept and environment because it cannot establish safe native-building replacement. A small actual synthetic GeoJSON building source/layer is then supplied; the normal replacement path must succeed before `queryRenderedFeatures` reports the environment. No forced visibility or success status.
- Existing `point-to-object-create-reliability.spec.ts` and `sprint10-create-preview.spec.ts`: **22/22 PASS**, Chrome/WebKit. Includes native-target replacement, outside geometry preservation, pending-source reconciliation, no-provider local actions, failed preflight, mobile, invalid-saved fallback and WebGL-unavailable 2D fallback.

Browser receipts and screenshots are in ignored workspace `artifacts/complete25-programmes/` and `artifacts/complete25-environment-adjacent/`; JUnit output is under `artifacts/artifacts/` because the isolated configuration lives in `artifacts/`. These are synthetic, network-blocked loopback tests, not live-data acceptance.

Inspected screenshots (relative to this worktree):

- `artifacts/complete25-programmes/complete25-create-programm-a162a--result-and-saved-B-en-1440-webkit/hospitality-main-map-en-1440.png`
- `artifacts/complete25-programmes/complete25-create-programm-a162a--result-and-saved-B-en-1440-webkit/hospitality-scene-en-1440.png`
- `artifacts/complete25-programmes/complete25-create-programm-19a8e-d-result-and-saved-B-ru-390-webkit/hospitality-scene-ru-390.png`
- `artifacts/complete25-environment-adjacent/sprint10-create-preview-Ru-b6e65-n-when-WebGL-is-unavailable-webkit/saved-create-dashboard-mobile-ru-webgl-fallback.png`

## Known limits and review

This is deliberately a small open-space framework, not a complete landscape, traffic or pedestrian-access design. It does not infer doors, public access, connection to existing streets, vegetation, gradients or actual surfaces. It may omit feasible candidates outside its bounded grid and rejects sites outside its supported geometry bounds.

The standard MapLibre `fill-extrusion-pattern` repeats the procedural finish on roofs as well as walls; it is not a physical façade/window/floor model, BIM or photorealism. No custom mesh was introduced. Root accepted this bounded renderer limitation before integration. The initially conservative/small result framing was subsequently replaced by the height-aware perspective fit documented in [the camera follow-up](COMPLETE25_CREATE_CAMERA_20260925.md); zoom/reset remain available.

Primary renderer references: [MapLibre fill-extrusion-pattern](https://maplibre.org/maplibre-style-spec/layers/#fill-extrusion-pattern), [Map.addImage](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#addimage).

Root next step: review exact screenshots, cherry-pick this slice onto the integrated branch, register the new unit check in CI, and rerun integrated browser/visual acceptance. Existing Auth, AI budget controls, hosted state and Production were not touched. Revert the slice commit to roll back; persisted result compatibility does not depend on this decoration.
