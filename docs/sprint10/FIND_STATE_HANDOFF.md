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

## Verification contract

- `scripts/point-to-object-find-state-check.ts` executes the exported presentation and verified-footprint state logic and covers result/shortlist/hover/active precedence, old-to-new-to-clear, Polygon, MultiPolygon, POI rejection and unverified-geometry rejection.
- Existing Find, V5 interaction, MapLibre replacement and Create regression checks remain required.
- TypeScript and production build remain required before integration.

## Boundaries and residual evidence

- No provider, source, hosted database, Auth, environment, deployment or Production change is part of this branch.
- Footprints remain bounded to physically returned, validated open-map geometry. A numbered marker is a representative interaction anchor and is not itself evidence of building geometry.
- Golden visual comparison and broad browser/device coverage remain integration gates. Local screenshots, when captured, are Candidate evidence only.
- The legacy aggregate assertion in `tests/e2e/point-to-object-v5-offline-flow.spec.ts:1005` expects a hydrated footprint to remove `[data-find-result-marker="way/2001"]`. The corrected product contract deliberately keeps that numbered representative marker, so the legacy test reports expected `0`, received `1`. The shared spec was outside this bounded worker's file ownership and must be updated by the integrator to assert marker continuity plus verified footprint geometry; the paired Create regression passed unchanged.
- Mandatory claim boundary remains: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Rollback

Revert the local Find-state commit(s) from baseline `c9be8fa6350098072d69c91992e63b97ca0d44ed`. The correction adds no schema, remote data, secret, environment or deployment state, so rollback is code-only.
