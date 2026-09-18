# Sprint 10 Create 3D Host-Sizing Correction Handoff

Date: 2026-09-18

Worktree: `/private/tmp/geoai-sprint10-create-host-sizing-20260918`

Branch: `codex/sprint10-create-host-sizing-20260918`

Exact base: `dab8916b7ffeff51e4e77f27a47ae89302e6fd28`

Implementation commit: `81a59ab8b9cb5de35ac144ed4861c55a028f1503`

## Root cause and bounded correction

GitHub Quality Gate run `35383035451` exposed a genuine layout defect in the saved-result 3D preview. MapLibre adds its `maplibregl-map` class to the supplied host, and that library class declares `position: relative`. The Create preview depended only on Tailwind `absolute inset-0`, so CSS import order could collapse the host to zero layout height even though the child WebGL canvas retained dimensions and the MapLibre load callback set `data-preview-status="ready"`.

The correction mirrors the already-proven live-map host contract: the Create 3D host now pins `position: absolute`, `inset: 0`, `width: 100%`, and `height: 100%` inline while preserving `touch-action: pan-y`. No camera, frustum, geometry, state, teardown, API, fixture, workflow, package, shared map, profile, database, environment, source or paid-provider path changed.

The browser test now rejects blank/zero-size `ready` states. It requires both the MapLibre host and its child `canvas.maplibregl-canvas` to be visible and to have real non-zero bounding boxes for:

- desktop Alternative A;
- desktop Alternative B after the saved-option switch;
- mobile initial Alternative A;
- mobile recovered Alternative A after deliberately invalid B fails closed.

All existing assertions remain active: exact saved A/B geometry metadata, camera controls, KPI correspondence, geometry-key change, byte-for-value saved artifact preservation, reload/reopen, WebGL-unavailable 2D fallback, invalid-B host removal, no horizontal overflow, and zero preview-time Create/context requests.

## Files changed

- `components/point-to-object/create-result-preview-3d.tsx`
- `tests/e2e/sprint10-create-preview.spec.ts`
- `docs/sprint10/CREATE_HOST_SIZING_HANDOFF.md` (this handoff; separate documentation commit)

No optional source-contract script change was needed because the runtime browser assertions directly measure the affected host and child canvas.

## Exact validation

Runtime: pinned Node.js `24.19.0`; Next.js `15.5.25`; `@playwright/test 1.61.1`; Chrome `153.0.8010.50`; bundled Playwright WebKit. All browser routes use offline fixtures and abort external HTTPS requests.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run lint
```

Result: **PASS**.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run test:point-to-object-create
```

Result: **PASS** — generator, preflight, actual-route offline and saved-preview static contracts.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run build
```

Result: **PASS** — optimized build compiled; TypeScript passed; 80/80 static pages generated.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run test:data-honesty
```

Result: **PASS** — 445 user-facing TypeScript files scanned; zero findings.

The owned server used only `127.0.0.1:3118` with `GEOAI_AUTH_MODE=demo_public`:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  GEOAI_AUTH_MODE=demo_public npm run start -- -H 127.0.0.1 -p 3118
```

Chrome:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  GEOAI_E2E_BASE_URL=http://127.0.0.1:3118 \
  npx playwright test tests/e2e/sprint10-create-preview.spec.ts --workers=1
```

Result: **3/3 PASS in 8.2 s**.

WebKit:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  GEOAI_E2E_BASE_URL=http://127.0.0.1:3118 \
  npx playwright test --config playwright.webkit.config.ts tests/e2e/sprint10-create-preview.spec.ts --workers=1
```

Result: **3/3 PASS in 14.1 s**.

Local route smoke on the same server returned HTTP 200 for `/`, `/workspace`, `/projects`, `/api/health`, `/api/db/health`, `/api/platform/activation-status`, and `/api/pilot-backend/status`; current route policy returned HTTP 307 for `/explore` and `/demo`.

An initial sandbox-contained Chrome launch aborted before any test body with OS process permission `EPERM`. The authorized local-browser rerun above is the product evidence and passed 3/3; the launch denial was environmental, not a product/test failure.

## Visual inspection and screenshots

Chrome and WebKit screenshots were opened at original resolution. Both engines show actual teal extruded A/B massing and AOI outlines rather than a blank `ready` surface. Desktop B is fully framed; mobile initial A and recovered A show the same clean scene; invalid B shows the intended 2D fallback and no stale 3D scene.

Chrome:

- Desktop B real 3D: `/private/tmp/geoai-sprint10-create-host-sizing-20260918/artifacts/playwright-auth-session/sprint10-create-preview-sa-ded96-o-preview-time-source-calls/saved-create-dashboard-desktop-option-b-3d.png`
- Mobile initial A real 3D: `/private/tmp/geoai-sprint10-create-host-sizing-20260918/artifacts/playwright-auth-session/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-a-3d-framed.png`
- Mobile invalid B fail-closed fallback: `/private/tmp/geoai-sprint10-create-host-sizing-20260918/artifacts/playwright-auth-session/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-b-invalid-fallback.png`
- Mobile recovered A real 3D: `/private/tmp/geoai-sprint10-create-host-sizing-20260918/artifacts/playwright-auth-session/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-a-3d-recovered.png`

WebKit:

- Desktop B real 3D: `/private/tmp/geoai-sprint10-create-host-sizing-20260918/artifacts/playwright-webkit-regressions/sprint10-create-preview-sa-ded96-o-preview-time-source-calls/saved-create-dashboard-desktop-option-b-3d.png`
- Mobile initial A real 3D: `/private/tmp/geoai-sprint10-create-host-sizing-20260918/artifacts/playwright-webkit-regressions/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-a-3d-framed.png`
- Mobile invalid B fail-closed fallback: `/private/tmp/geoai-sprint10-create-host-sizing-20260918/artifacts/playwright-webkit-regressions/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-b-invalid-fallback.png`
- Mobile recovered A real 3D: `/private/tmp/geoai-sprint10-create-host-sizing-20260918/artifacts/playwright-webkit-regressions/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-a-3d-recovered.png`

## Boundaries

This is a local public-demo prototype correction. It does not establish hosted Preview, Production, physical-iPhone, BIM, engineering, planning, valuation or pilot readiness. No push, deployment, main/Production mutation, Supabase access, secret access, environment mutation, external data request or paid API call occurred.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
