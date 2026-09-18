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
- Every new Find request receives a monotonically increasing local cohort generation and detaches the prior saved-artifact binding before network or persistence work starts. Reset, browser identity reconciliation and project-overview transitions also detach the binding.
- A completed asynchronous save may bind only when its captured browser identity, initiating project and cohort generation are still current and that initiating project remains active. If the user selects another project while the save is pending, the result still lands in its initiating project but the late completion neither reselects nor binds that project.
- Browser-local save and view-update commits use the shared identity operation queue, bounded stable-store verification and a final synchronous raw-store comparison. When same-page project state changes during an awaited hash, the mutation is rebuilt from the latest verified store; it updates the initiating project/artifact and preserves the current active project and unrelated content. Existing legacy normalization can add default updatedAt/viewRevision fields to older unrelated artifacts; byte-for-byte preservation is proven only for the current-format fixtures, not every legacy shape.
- Queued shortlist/comparison/analysis updates re-check their immutable project binding before starting, so a late save or an older queue entry cannot mutate a different cohort's saved artifact.
- Candidate focus, shortlist, comparison and analysis controls use native `disabled` semantics whenever the visible result is stale. The stale cohort remains visible as evidence until Update or Reset, but it is not interactive.

## Verification contract

- `scripts/point-to-object-find-state-check.ts` executes the exported presentation and verified-footprint state logic and covers result/shortlist/hover/active precedence, old-to-new-to-clear, Polygon, MultiPolygon, POI rejection and unverified-geometry rejection.
- `tests/e2e/sprint10-find-state.spec.ts` targets actual persistence digests and covers immediate shortlist catch-up without Reset, A→B selection during a save, creating B during a view update to A, identity-change fail-closed, and the overlapping-candidate Reset case. It proves active selection, unrelated projects/artifacts and the prior artifact's serialized bytes are preserved.
- `scripts/point-object-projects-check.ts` independently holds real project-operation digests for save/project-switch, view-update/project-create and identity-change races.
- Existing Find, V5 interaction, MapLibre replacement and Create regression checks remain required.
- TypeScript and production build remain required before integration.

## Exact correction verification

All commands ran in `/private/tmp/geoai-sprint10-find-state-20260918` on the uncommitted correction tree, with the bundled Node `v24.19.0` first on `PATH` where npm scripts require TypeScript stripping.

| Command | Result |
| --- | --- |
| `npm run lint` | PASS · TypeScript emitted no diagnostics |
| `npm run test:point-to-object-projects` | PASS · browser-local project contract including held-digest race cases |
| `npm run test:point-to-object-persistence` | PASS · hosted persistence boundary unchanged and blocked from apply |
| `node --experimental-strip-types scripts/point-to-object-find-state-check.ts` | PASS · Find state checks passed |
| `node scripts/point-to-object-v5-interaction-check.mjs` | PASS · V5 interaction contract checks passed |
| `npm run test:point-to-object-find` | PASS |
| `npm run test:point-to-object-map-replacement` | PASS · replacement, Sprint 07 and Sprint 09 contracts |
| `npm run test:point-to-object-create` | PASS · Create, preflight and route contracts |
| `npm run test:data-honesty` | PASS · 442 files scanned, 0 findings |
| `npm run build` | PASS · Next.js 15.5.25, 80/80 static pages |
| `GEOAI_E2E_BASE_URL=http://127.0.0.1:3117 npx playwright test tests/e2e/sprint10-find-state.spec.ts --workers=1` | PASS · 2/2 in 7.2 s against the local production build |
| `git diff --check` | PASS |

## Boundaries and residual evidence

- No provider, source, hosted database, Auth, environment, deployment or Production change is part of this branch.
- Footprints remain bounded to physically returned, validated open-map geometry. A numbered marker is a representative interaction anchor and is not itself evidence of building geometry.
- Golden visual comparison and broad browser/device coverage remain integration gates. Local screenshots, when captured, are Candidate evidence only.
- The bounded reconciliation closes deterministic same-page async races and detects a changed raw store around awaited verification. Browser `localStorage` has no compare-and-swap primitive, so this does not claim global multi-tab/process atomicity; the existing raw-byte conflict checks remain fail-closed where available.
- The legacy aggregate assertion in `tests/e2e/point-to-object-v5-offline-flow.spec.ts:1005` expects a hydrated footprint to remove `[data-find-result-marker="way/2001"]`. The corrected product contract deliberately keeps that numbered representative marker, so the legacy test reports expected `0`, received `1`. The shared spec was outside this bounded worker's file ownership and must be updated by the integrator to assert marker continuity plus verified footprint geometry; the paired Create regression passed unchanged.
- Mandatory claim boundary remains: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Rollback

Revert the local Find-state commit(s) from baseline `c9be8fa6350098072d69c91992e63b97ca0d44ed`. The correction adds no schema, remote data, secret, environment or deployment state, so rollback is code-only.
