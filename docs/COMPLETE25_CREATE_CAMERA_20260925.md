# COMPLETE25 — height-aware result camera

## Request and cause

Independent review of the environment slice found the saved-result scene too small: substantial empty space remained above and around the model. The old fit used MapLibre's unpitched geographic bounding box, then applied a height-dependent zoom-out and pitched the view. This compounded the perspective reduction even for low-rise scenes.

## Change

`point-to-object-create-camera.ts` fits the complete saved envelope: all AOI vertices at ground level and all building vertices at their actual `baseM` and `heightM`. A bounded pure Mercator-perspective search uses viewport dimensions, current field of view, bearing and pitch. No visible intermediate jumps, fixed-fixture zoom offset, building-height change or geometry scaling.

The target is 72% of the panel in the limiting dimension, with a reserved bottom strip for controls. Unusual aspect ratios or very tall buildings cannot occupy the same fraction on both axes without distortion; the complete envelope remains visible. The prior conservative fit remains a fallback if the new calculation is unavailable. Supported framing is the current flat-terrain Mercator scene, zero roll, pitch 0–60°. This does not introduce terrain/globe rendering.

User bearing and last non-zero 3D pitch survive local A/B, resize, 2D/3D and map/model recreation during the mounted result. Reset explicitly returns to the default orientation and refits. A reopened persisted result retains its existing geometry/variant contract and gets a deterministic fit; no new persistent camera-storage schema was added.

Only camera code, dedicated tests and documentation change in this follow-up. Palette, native-building replacement protections, Auth, provider budgets and saved results are unchanged.

## Evidence

- `node --experimental-strip-types scripts/complete25-create-camera-check.ts`: 80 fits across all five programmes, both variants, two viewport sizes, two bearings and 2D/3D. Extent containment, ~68–73% limiting-axis occupancy, actual saved heights, triple-height headroom, determinism, immutability and invalid inputs pass.
- Browser tests independently project vertices with the pinned MapLibre renderer's actual matrix, not the product fitting helper. They require >65% and <76% limiting-axis occupancy and clearance above the controls. Real right-button mouse rotation is followed by 2D/3D and Reset; the orientation must persist and Reset must recover the fit.
- Enhanced Chrome/WebKit × EN1440/RU390 flow: **4/4 PASS** (38.6 s), including actual renderer-matrix containment/occupancy and real pointer rotation. Exactly two mocked Create dispatches; no extra request for camera/view/reopen.
- The existing Create preview and reliability suite: **22/22 PASS**, retaining tall-volume, invalid-saved and WebGL fallback cases. Screenshot review includes desktop and mobile, low-rise hospitality and taller commercial scenes; no clipping was observed.
- Build: **81 routes PASS**; TypeScript and existing Create/route/preview checks **PASS**. Root integrates and performs the final independent visual review.

Renderer equations were checked against the installed, pinned MapLibre GL JS 6.9.0 source (`geo/projection/mercator_transform.ts`, `geo/mercator_coordinate.ts`). Production uses public map methods; private matrix introspection exists only in the independent browser test. Primary API references: [Map camera/project methods](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/), [CameraForBoundsOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/CameraForBoundsOptions/).

Screenshots and receipts use the same ignored `artifacts/complete25-programmes/` and `artifacts/complete25-environment-adjacent/` locations documented in the environment slice; after this change they show the new fit. No live provider or paid call is evidence here.
