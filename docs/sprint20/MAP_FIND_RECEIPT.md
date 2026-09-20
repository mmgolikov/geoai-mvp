# September 20 — Q01–Q05 Map / Find corrective receipt

Status: LOCAL CANDIDATE / NOT RELEASED. Version: 1.0, 2026-09-20.
Owner: dev_1. Integrator: control (`01a015e0-9932-7093-81a0-f770b0b68da0`).
Branch: `codex/quality20-map`.
Starting commit: `1dab55817e1664870ace88278aaed8f7558ece83`; initially clean.
The commit containing this receipt is the bounded handoff; use `git log -1 --format=%H -- docs/sprint20/MAP_FIND_RECEIPT.md` to resolve its immutable ID.

## Authority and scope

The founder-approved `PLAN_AND_QA_20260920.md` under the control workspace's `deliverables/2026-09-20-product-quality/`, and `/private/tmp/geoai-four-sprints-20260918/docs/sprint20/CHANGE_REQUEST.md`, authorize this correction. Controller messages additionally authorized the exact-source service, trusted-identity method, two persistence enum/parser lines, and narrow obsolete checker updates. No Create modules, Auth enforcement, environment, dependencies, translations registry or hosted state were changed. This is not the old DEV-05 or DEV-G2A package.

## Expected versus observed

| ID | Required correction | Observed local result |
|---|---|---|
| Q01 | Optional context must not erase valid selected-object height/geometry | Exact-object enrichment preserves an existing height when the new height is null. A tile fragment cannot lend height to a complete footprint. Unknown height stays null; storeys are never converted to height. Explicit source metres/feet are parsed. Unit and browser PASS. |
| Q02 | Find-to-Analyse must preserve identity and survive optional-source failure | Navigation carries exact ID, validated footprint and explicit height. Server reuses only its own bounded source snapshot; cold/expired cache performs an exact-ID source query. Wrong ID and wrong-city anchor fail closed. No nearest-object or browser-fact fallback. PASS. |
| Q03 | Find must receive intact source footprints, not only centres | Bounded `out body geom 81` response is normalized into validated way/relation geometry or an explicit missing/point-only state. No gap closure or synthetic square. PASS. |
| Q04 | Comparison needs the shared geographic map, not an SVG diagram | Shared MapLibre map receives all identities and available footprints; bounds include full geometry; map, table and accessible list selection stay linked. Desktop 1440 and mobile 390 PASS on controlled basemap fixtures. Real tile delivery remains an integration/live gate. |
| Q05 | Three close/coincident objects must remain individually selectable | Stable screen-space separation leaves geographic footprints unchanged. Three marker targets do not overlap and each selects its corresponding table column; all source centres are inside fit bounds at 1440/390. PASS. |

Baseline executable failure was retained in the task transcript: `quality20-map-check.mjs` failed its Q03 assertion against the starting tree because the query ended in `out tags center 81;`. Q01 null overwrite, Q02 point-only handoff and Q04 SVG rendering were established by exact baseline source review, not a fabricated baseline browser run. Q05's before screenshot is not claimed.

## Implementation manifest

- `app/api/prototype/point-to-object/context/route.ts`: expose only explicit source height/min-height; existing access/rate/body guards retained.
- `components/point-to-object/find-comparison-dashboard.tsx`: geographic comparison map, full bounds and linked selection/list/table.
- `components/point-to-object/live-object-map.tsx`: exact Find handoff and collision-separated numbered controls; native multipart guard unchanged.
- `components/point-to-object/prototype-client-v5.tsx`: exact-object geometry merge, carry source footprints, avoid per-result hydration for current bounded results.
- `components/point-to-object/live-types.ts`, `live-session.ts`: accept only the added `overpass_exact_identity` method alongside existing methods; no other persistence semantics changed.
- `src/lib/prototype/point-to-object-find-contract.ts`, `point-to-object-find.ts`: bounded source geometry and server-held source snapshot.
- `src/lib/prototype/point-to-object-live-evidence.ts`, `point-to-object-trusted-identity.ts`: exact Overpass source provenance; direct point/reverse path preserved.
- New `src/lib/prototype/point-to-object-source-geometry.ts`: closed-way / endpoint-joined relation validation and explicit height parsing.
- New `src/lib/prototype/point-to-object-exact-source.ts`: server-only cache (160 entries, 100,000 serialized characters per entry, five-minute TTL); exact cold lookup, no browser evidence ingestion.
- New `src/lib/prototype/point-to-object-selection-context.ts`: identity-safe merge and screen-space marker layout.
- `scripts/point-to-object-find-check.mjs`, `point-to-object-contract-check.ts`, `point-to-object-dashboard-contract-check.ts`: update obsolete transport/render assertions while retaining exact-ID, reverse-path, geometry and linking requirements. The pure nearby-normalization lane explicitly rejects accidental exact lookup; real exact-source modules execute in the new regression below.
- New `scripts/quality20-map-check.mjs`: geometry, height, relation, collision, cold/warm/expiry, wrong ID/anchor, optional source outage and save→reopen tests; unknown source method rejected, fetch forbidden during reopen.
- New `tests/e2e/quality20-map-find.spec.ts`: three candidates, geometry, actual renderer/roads, full bounds, linked controls and unavailable-enrichment handoff.
- This receipt.

## Verification environment and receipts

macOS local, Node `24.19.0`, Next `15.5.25`, Playwright `1.61.1`, one Chrome worker, zero retries and `--fail-on-flaky-tests`. Existing dependencies reused through the authorized node_modules symlink; package and lockfile unchanged. No paid API requests.

| Check | Result |
|---|---|
| `node scripts/quality20-map-check.mjs` | PASS, including save→reopen with `overpass_exact_identity`, zero source/AI calls and unknown-method rejection |
| `npm run lint` | PASS (TypeScript) |
| `npm run build` | PASS, 81/81 static-generation entries; first sandbox attempt could not resolve Google Fonts, permitted network-enabled retry succeeded |
| `test:point-to-object` | PASS, full existing contract and provenance checks; stale assertions and the pure-test import adapter updated |
| `test:point-to-object-geocontext` | PASS, full six-script group |
| `test:point-to-object-map-replacement` | PASS, all three scripts; existing native/multipart safety preserved |
| `test:point-to-object-find`, `test:point-to-object-trusted-identity` | PASS |
| `test:point-to-object-runtime-gate` | PASS, including source route default-deny/body/origin/rate tests |
| `test:point-to-object-persistence`, `test:point-to-object-projects` | PASS |
| `test:request-scoped-project-read`, `test:source-connector-foundation`, `test:aoi-integrity` | PASS |
| `test:secret-hygiene`, `test:data-honesty` | PASS |
| Production-mode focused Chrome aggregate: new Q01–Q05 spec plus `point-to-object-map10.spec.ts` | 3 passed / 0 failed / 0 skipped / 0 errors, 11.5 s (JUnit 11.463576999999999), 2026-09-20T11:29Z |
| Prior dev-mode same focused aggregate | 3/3 PASS, supporting only; not substituted for production-mode receipt |
| `git diff --check` | PASS |

The three-test receipt is **not** the entire product E2E suite. Integration, WebKit, diverse real-site and paid scenario/depth acceptance remain control-owned.

Local production server was `http://127.0.0.1:3046` and is now stopped. HTTP smoke: `/`, `/workspace`, `/projects`, `/api/health`, `/api/db/health`, `/api/platform/activation-status`, `/api/pilot-backend/status`, `/api/data-sources`, `/api/data-sources/readiness`, `/api/external-data/manifest`, `/api/source-lineage` all 200. `/explore` and `/demo` return 307 to `/prototype/point-to-object`, the current baseline routing (not the historical `/workspace` expectation). HTTP statuses are not protected/hosted persistence evidence.

Browser evidence retained outside Git at `/private/tmp/geoai-quality20-map-evidence.GyeHln/` (moved, not deleted, to leave the source worktree clean):

- `auth-session-e2e-junit.xml`, SHA-256 `e27873392724ffea5e3896839bfd2fbf527e325911df3844f40a65a7321e7f93`.
- `output/playwright/quality20-production/quality20-map-find-Q01–Q05-625bf-vive-unavailable-enrichment/comparison-1440.png`.
- Same folder `comparison-390.png`, SHA-256 `2c2a346fb375aea9567b4391ed7942457638427dbb4279a5e3a9f96ba225caed`, visually reviewed: three non-overlapping controls, two footprints, visible controlled roads, exact IDs and unavailable-footprint label.
- Same folder `analysis-source-outage-390.png`.
- Native complex/multipart and captured DIFC footprint screenshots under sibling MAP10 folders.
- Earlier dev-mode screenshots remain under `output/playwright/quality20` and `quality20-final` as historical supporting evidence.

These are controlled offline synthetic-road browser tests using the real renderer, **not fresh live OpenFreeMap tile parity**. Agent-browser also checked the local home route for meaningful content and absence of a framework error overlay. Initial sandbox browser/bind denial was tooling-only; the authorized local launches passed.

## Separate public-source observation

Read-only public Overpass query on 2026-09-20 returned intact Dubai way geometries for `39017900`, `39017901`, `39017902`; source base timestamp `2026-09-20T11:19:04Z`, server `0.7.62.11`. Explicit source heights were respectively 131 m, 130 m and 99 m; geometry vertex counts 10, 8 and 5. This confirms the response shape and availability for those records, not end-to-end live customer acceptance. The first request without policy-identifying headers returned 406; the bounded request with project User-Agent/Referer succeeded. No raw client/customer data or secrets were read.

The live query used a small bbox and `out body geom 3`; it was not claimed as a complete inventory. A boundary-crossing building whose source centre falls outside the Find viewport can be excluded by the existing centre-filter policy. That policy remains unchanged.

Source: OpenStreetMap contributors; ODbL-1.0, attribution retained. Technical reference: https://dev.overpass-api.de/overpass-doc/en/full_data/osm_types.html (accessed 2026-09-20). Official/live legal authority: none; community-map source only.

## Limits, risks and integration handoff

- Source cache is an optimization, never a durable record or cold-instance prerequisite. Source failure remains explicit; no nearest object replaces the selected identity.
- Incomplete/nested relations and unsupported/over-budget geometry stay unavailable; this is not a GIS topology certification for every adversarial multipolygon. Full source/provider reliability has no SLA.
- Screen-space offset acceptance covers three selected candidates. Very dense many-object Find clusters and map-edge marker labels need broader integration stress testing; geographic geometry is never offset.
- New comparison strings are inline EN/RU: candidates on the map, OSM footprint, point/footprint unavailable and separated-control explanation. Control owns any further centralized translation reconciliation.
- No additional UI redesign, PR #143 import, official parcel/zoning/ownership claim or commercial metric introduced.
- React/Next skill review retained client/server boundaries, bounded server memory, stable callbacks and event cleanup. Existing tile-fragment limitations informed native-map regression coverage; no old worktree code was imported.
- Controller must integrate this commit, rerun the combined suite and perform live basemap, exact-site, EN/RU/WebKit/mobile acceptance. Any Production Auth/persistence activation requires a separately dispatched package; it is not part of this commit.

Rollback: before integration, discard/revert only this bounded commit on its local non-main branch; preserve evidence. Integration rollback is a controller-owned revert to the recorded starting commit, never a destructive reset. No hosted rollback is needed: no push, PR, deployment, hosted Auth/DB/Storage/environment/main/Production mutation occurred here.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
