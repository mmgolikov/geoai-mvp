# Sprint 10 Create Saved-Result Preview Handoff

Date: 2026-09-18

Worktree: `/private/tmp/geoai-sprint10-create-preview-20260918`

Branch: `codex/sprint10-create-preview-20260918`

Exact base: `47d9f497e78c6eb05a6e0b3f52cbee82af9aedfb`

## Bounded result

The full-screen Create result now has an optional interactive 3D view of the exact saved A/B concept geometry, alongside the original accessible 2D plan.

- 2D remains the default. MapLibre and its worker load only after the user selects 3D, through a client-only dynamic chunk.
- The 3D scene uses a blank local style with no basemap, tiles, geocoder, provider call or other external data request.
- AOI and every saved concept feature are cloned into a fail-closed preview model. Extrusion uses the saved absolute `heightM` and `baseM`; missing or invalid heights do not receive defaults.
- Initial, reset and A/B camera framing uses the saved maximum height relative to the scene's measured horizontal span, plus bearing-aware ground bounds. The checked desktop and 390 px scenes keep all tower tops and the complete base visible with margin.
- A/B switching reuses the already saved alternative, updates the same KPI and geometry views, and does not generate again.
- Geometry, counts and KPI values are read from the same active saved massing object. A stable geometry key makes an A/B geometry change testable without mutating the artifact.
- Initialisation, invalid-current-geometry, import, MapLibre error and WebGL-unavailable states retain the original 2D plan as fallback. A valid→invalid switch removes the prior canvas immediately, so old geometry cannot remain under the new option label/KPI; switching back to a valid option initializes a clean scene.
- Runtime failure and unmount use one teardown path: MapLibre and listeners are removed, the resize observer is disconnected, and the deferred resize frame is cancelled.
- Keyboard-operable 2D/3D, A/B, zoom and reset controls are provided. Cooperative gestures and `touch-action: pan-y` preserve one-finger page scrolling on touch screens.
- English and Russian copy, 1440 px desktop and 390 px mobile behavior are covered.

The Vercel React Best Practices review directly informed the dynamic/conditional loading boundary: the heavy MapLibre preview is not part of the initial 2D path.

## Files

Product/application:

- `components/point-to-object/create-result-dashboard.tsx`
- `components/point-to-object/create-result-preview-3d.tsx`
- `src/lib/prototype/point-to-object-create-preview.ts`

Dedicated validation:

- `scripts/sprint10-create-preview-check.ts`
- `tests/e2e/sprint10-create-preview.spec.ts`

Handoff:

- `docs/sprint10/CREATE_PREVIEW_HANDOFF.md`

No generator, Create panel, session/provider/auth contract, shared Playwright fixture/config, package manifest/lockfile, migration or infrastructure file was changed.

## Functional evidence

The browser spec uses one exact deterministic `commercial_hub` A/B fixture produced by the existing generator. It lets the application save the fixture through the real public-demo project path, records the request baseline, reopens the saved artifact from Projects, and then proves:

- saved option A has the exact expected feature count, maximum saved height and estimated floor-area KPI in 2D/3D;
- switching to B changes the preview geometry key and exposes B's exact feature count, maximum saved height and KPI;
- returning to 2D shows B's exact saved feature count;
- the stored generated payload is byte-for-value equivalent to the fixture after preview interactions;
- reload/reopen restores B without a new Create generation or area-context request;
- a WebGL-disabled Russian mobile run reports the unsupported state and renders the original 2D plan;
- a real 390 px component transition from valid A to a deliberately malformed saved B (`baseM === heightM`) removes the A canvas, reports `invalid`, shows B's 2D fallback and then recovers a clean A 3D scene;
- neither 1440 px desktop nor 390 px mobile has horizontal document overflow.

Only the initial offline fixture setup uses the intercepted Create route. Preview, A/B switching, Projects reopen and reload make zero new Create or context calls.

Screenshots from the passing run:

- Desktop B, successful local 3D: `/private/tmp/geoai-sprint10-create-preview-20260918/artifacts/playwright-auth-session/sprint10-create-preview-sa-ded96-o-preview-time-source-calls/saved-create-dashboard-desktop-option-b-3d.png`
- Desktop B, original 2D: `/private/tmp/geoai-sprint10-create-preview-20260918/artifacts/playwright-auth-session/sprint10-create-preview-sa-ded96-o-preview-time-source-calls/saved-create-dashboard-desktop-option-b-2d.png`
- Mobile RU, WebGL fallback to 2D: `/private/tmp/geoai-sprint10-create-preview-20260918/artifacts/playwright-auth-session/sprint10-create-preview-Ru-b6e65-n-when-WebGL-is-unavailable/saved-create-dashboard-mobile-ru-webgl-fallback.png`
- Mobile A, height-aware 3D framing: `/private/tmp/geoai-sprint10-create-preview-20260918/artifacts/playwright-auth-session/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-a-3d-framed.png`
- Mobile invalid B, fail-closed 2D fallback: `/private/tmp/geoai-sprint10-create-preview-20260918/artifacts/playwright-auth-session/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-b-invalid-fallback.png`
- Mobile A, recovered clean 3D scene: `/private/tmp/geoai-sprint10-create-preview-20260918/artifacts/playwright-auth-session/sprint10-create-preview-mo-ee931-overs-without-a-stale-scene/saved-create-dashboard-mobile-option-a-3d-recovered.png`

## Exact validation

Runtime: pinned Node.js 24; Next.js 15.5.25; Playwright Chrome channel; localhost only.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  node --experimental-transform-types scripts/sprint10-create-preview-check.ts
```

Result: PASS — exact saved A/B geometry, actual heights/bases, height-responsive camera headroom, immutability, local tile-free MapLibre contract, centralized cleanup and fail-closed fallback contract.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run test:point-to-object-create
```

Result: PASS — existing generator, preflight and actual-route offline contracts.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run test:point-to-object-geocontext
```

Result: PASS — existing context, semantic, session, dashboard and analysis-depth contracts.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run lint
```

Result: PASS.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run build
```

Result: PASS; 80/80 static pages generated.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run start -- -H 127.0.0.1 -p 3118

PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  GEOAI_E2E_BASE_URL=http://127.0.0.1:3118 \
  npx playwright test tests/e2e/sprint10-create-preview.spec.ts --workers=1
```

Result: 3/3 PASS in 12.8 seconds. The owned server was stopped after the run.

## Risks and boundaries

- This is conceptual massing visualization, not BIM, engineering, shadow, terrain, infrastructure, cadastral or planning validation.
- The blank local scene intentionally provides spatial form and height comparison only; it does not imply surrounding context or an authoritative city model.
- Camera headroom is a deterministic screen-fit heuristic based on saved maximum height and measured scene span. It is visually verified for the exact desktop and mobile fixtures, but extreme height-to-site ratios and unusual aspect ratios still require a wider evaluation set.
- Successful desktop coverage is the repository's Chrome channel. The explicit WebGL-unavailable path is covered, but a full physical-device/browser matrix is not.
- No hosted Preview, Production, Supabase, external identity, external data, live provider or customer workflow was tested.
- No paid/provider call, API key, secret access, dependency change, push, deployment, main/Production change, Supabase change or external write occurred.

This bounded result is locally verified; it does not establish release or pilot readiness.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
