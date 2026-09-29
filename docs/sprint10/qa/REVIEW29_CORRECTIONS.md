# Founder review corrections — 29 September 2026

Scope: protected Preview correction to the S2 baseline `ec5657796c678c92a89beda4301fcb19df90a00e`. Direct founder feedback covers source loading, selected 3D geometry, first express overview, cross-mode selection and saved Create visibility/materials. This contract does not declare a deployment accepted.

## Product invariants

- Opening Analyse gives a useful source-bound express overview without AI/challenge or renewed source acquisition. Optional focused AI remains an explicit separate action. Failed context does not erase the selected local geometry or imply zero nearby objects.
- Selected-object identity is separate from a nearest POI. Source height is rendering metadata only when bound to trusted display geometry; raw source tags remain available. A parent relation ID alone does not authorize replacing a clicked tile member.
- In 3D, eligible mapped geometry uses a translucent selected volume while unrelated native buildings keep their original appearance. Never invent authoritative height or suppress neighboring relation members. Mode changes remove Analyse overlays, not stored reports or Create drafts.
- Saved Create geometry is independent of transient basemap loading, retained during zoom/pan, and restored after style changes. A/B switching must not call AI. Plain materials replace checkerboard facade patterns. Pending replacement must not masquerade as complete source inventory.

## Regression mapping

| Boundary | Regression |
|---|---|
| Real context route output → real browser parser | `scripts/review29-context-response-check.ts` |
| Selected tile member → late parent geometry | `scripts/quality20-map-check.mjs` |
| Express first value + no implicit AI + identity/units/partial evidence | `tests/e2e/review29-express-overview.spec.ts` |
| Source failure + express access + unchanged retry cooldown | `tests/e2e/point-to-object-v5-offline-flow.spec.ts` |
| Translucent selection, siblings, mode isolation, zoom and delayed tiles | `tests/e2e/review29-map-persistence.spec.ts`, existing MAP10/Sprint07 suites |
| Existing explicit-start, drafts, role/scenario and saved reports | `tests/e2e/sprint10-analysis-state.spec.ts`, `sprint10-analysis-provenance.spec.ts`, affected geocontext restore cases, explicit Sprint06 J06 in `point-to-object-v5-offline-flow.spec.ts` |

The impact registry and regular offline CI include the new regressions. Synthetic/provider-mocked tests prove contracts, not live source availability or new AI quality. Browser screenshots require visual review. A delayed-source test must actually hold new tile loading, not only pan through already cached tiles.

## Release boundaries

Pre-push checks on 29 September: optimized Node24 build/types PASS; express 10 cases, old analysis/provenance 21, affected restore 6, context-error/cooldown 2, new map persistence 3 and legacy map 4 PASS. J06 separately passed on the optimized local build (1 case, 6 seconds; retained `artifacts/review29-j06-final-junit.xml`). Runtime/route-parser, map replacement, identity, test-selector, credential boundary and secret checks passed. These are scoped local checks, not terminal CI or hosted acceptance. Initial test-harness/startup failures and the independent review's fixes remain in the correction history.

No main/Production, new paid AI dispatch, Auth/env/rate-limit changes, cloud data writes or historical budget edits. The founder's global USD25 authority is separate from the frozen USD20 operator and does not authorize a new paid pack. Saved result reuse is not a new generation.

Final exact candidate, terminal CI, hosted screenshots, retained failures, plan/actual and limitations are recorded in the current operating-system correction result and canonical roadmap before handoff. The local and hosted gates are independent; this document alone is not a readiness signal.
