# Sprint 10 Find State Handoff

Status: Local Candidate · bounded Find-state correction · Not Released
Branch: `codex/sprint10-find-state-20260918`
Baseline: `c9be8fa6350098072d69c91992e63b97ca0d44ed`

## Implemented contract

- Find keeps its numbered representative marker for every result, including results with a verified Polygon or MultiPolygon footprint.
- Verified footprint geometry is accepted only for `mapped_building_or_landuse` with `confirmed_complete_footprint`. A POI, unknown result or unverified geometry remains an honest point marker; no rectangle or building footprint is invented.
- Map presentation separates `result`, `shortlist`, `hover` and `active` states. Active has precedence over hover, hover over shortlist, and changing/clearing active selection removes the previous active highlight while retaining shortlist state.
- Clicking a result marker or result title focuses it in Find. Opening individual analysis is a separate explicit action, so users can select another result without an implicit mode transition.
- Criteria changes preserve the prior cohort as stale, clear transient active/hover state, and expose the existing `Update search` primary action. Stale results cannot be analysed or added to comparison.
- `Reset results` clears only the Find result, resolved geometry, active/hover state, shortlist/comparison and transient Find session. It does not delete Saved Projects or unrelated Analyse/Create data.
- Two or more current shortlist results retain the existing comparison path. Opening individual analysis continues to persist the cohort through the existing Find session/saved-view contract.
- Style reload and 2D/3D transitions rebuild footprint data from current active/hover/shortlist refs; only the current state is restored.
- Every new Find request receives a monotonically increasing local cohort generation and detaches the prior saved-artifact binding before network or persistence work starts. Reset, project/identity changes and project-overview transitions also detach the binding.
- A completed asynchronous save may bind only when its captured project identity and cohort generation are still current. Queued shortlist/comparison/analysis updates re-check the immutable binding immediately before writing, so a late save or an older queue entry cannot mutate a different cohort's saved artifact.
- Candidate focus, shortlist, comparison and analysis controls use native `disabled` semantics whenever the visible result is stale. The stale cohort remains visible as evidence until Update or Reset, but it is not interactive.

## Verification contract

- `scripts/point-to-object-find-state-check.ts` executes the exported presentation and verified-footprint state logic and covers result/shortlist/hover/active precedence, old-to-new-to-clear, Polygon, MultiPolygon, POI rejection and unverified-geometry rejection.
- `tests/e2e/sprint10-find-state.spec.ts` delays the second cohort's digest/save, reuses the same source candidate identity under changed criteria/source receipt, exercises immediate shortlist plus Reset, releases the late save and proves the prior artifact's serialized bytes remain unchanged.
- Existing Find, V5 interaction, MapLibre replacement and Create regression checks remain required.
- TypeScript and production build remain required before integration.

## Exact correction verification

All commands ran in `/private/tmp/geoai-sprint10-find-state-20260918` on the uncommitted correction tree, with the bundled Node `v24.19.0` first on `PATH` where npm scripts require TypeScript stripping.

| Command | Result |
| --- | --- |
| `npm run lint` | PASS · TypeScript emitted no diagnostics |
| `node --experimental-strip-types scripts/point-to-object-find-state-check.ts` | PASS · Find state checks passed |
| `node scripts/point-to-object-v5-interaction-check.mjs` | PASS · V5 interaction contract checks passed |
| `npm run test:point-to-object-find` | PASS |
| `npm run test:point-to-object-map-replacement` | PASS · replacement, Sprint 07 and Sprint 09 contracts |
| `npm run test:point-to-object-create` | PASS · Create, preflight and route contracts |
| `npm run test:data-honesty` | PASS · 442 files scanned, 0 findings |
| `npm run build` | PASS · Next.js 15.5.25, 80/80 static pages |
| `GEOAI_E2E_BASE_URL=http://127.0.0.1:3117 npx playwright test tests/e2e/sprint10-find-state.spec.ts --workers=1` | PASS · 1/1 in 3.6 s against the local production build |
| `git diff --check` | PASS |

## Boundaries and residual evidence

- No provider, source, hosted database, Auth, environment, deployment or Production change is part of this branch.
- Footprints remain bounded to physically returned, validated open-map geometry. A numbered marker is a representative interaction anchor and is not itself evidence of building geometry.
- Golden visual comparison and broad browser/device coverage remain integration gates. Local screenshots, when captured, are Candidate evidence only.
- The legacy aggregate assertion in `tests/e2e/point-to-object-v5-offline-flow.spec.ts:1005` expects a hydrated footprint to remove `[data-find-result-marker="way/2001"]`. The corrected product contract deliberately keeps that numbered representative marker, so the legacy test reports expected `0`, received `1`. The shared spec was outside this bounded worker's file ownership and must be updated by the integrator to assert marker continuity plus verified footprint geometry; the paired Create regression passed unchanged.
- Mandatory claim boundary remains: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Rollback

Revert the local Find-state commit(s) from baseline `c9be8fa6350098072d69c91992e63b97ca0d44ed`. The correction adds no schema, remote data, secret, environment or deployment state, so rollback is code-only.
