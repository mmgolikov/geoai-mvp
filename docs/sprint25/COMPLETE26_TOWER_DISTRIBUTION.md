# COMPLETE26 — residual podium tower distribution

26 September 2026. Bounded local correction after product `67b8b24`
(worktree parent `b025eb3` also contains browser tests). Root owns integration,
rendered review and any paid acceptance. No network/provider/hosted operations.

## Reproduced boundary

The independent maximum-bound probe used two synthetic radial stars, not the
founder's unavailable AOI. For 24/25 vertices: theta = i × 2π/n + 0.17,
alternating radii 1/0.62, metric point = (cos(theta) × r × 1.12,
sin(theta) × r × 0.91). Scale starts at 500 and is corrected six times to
749,860 m² using the existing measurement function. Origin 55.28,25.2;
longitude scale 111320 × cos(25.2°), latitude scale 110540.
Exact controls: 12 blocks, 6–53 levels, 38% coverage, 35% open-space allowance,
8 m setback. Preflight seed is the actual programme/AOI-hash seed.

Original geometry validators passed all four commercial variants. However
24B and 25A/B failed the existing independent centroid-span heuristic; their
primary footprints, not merely centroids, occupied only 40–42% of one site axis.

Cause: after eliminating 9–11 residual strips, many remaining podiums were
600–1068 m long and 31–88 m wide. Each had one tower, but the internal placement
search restarted from the same first target for every podium. Podium coverage
was correct while the actual towers clustered along one side.

## Minimal correction and budget

Only the residual-strip fallback (omitted > 0) considers refinement. Keep the
original feasible tower plan and try two opposite alternating placements along
each podium's actual long axis (targets at 20%/80%). The original fit, clearance,
footprint-quality, support and final geometry validators remain unchanged.

Choose the candidate with the larger convex-hull area of PRIMARY footprint
vertices. Podiums do not count. This hull is a rotation-invariant spatial-envelope
proxy, not built area, usable open space, uniform density or a planning rule.
The winning score cannot be lower than the original candidate's score.

There are exactly two extra candidate plans after the first successful residual
allocation; no new partition search, retries or timeout increases. At maximum
12 blocks: original allocation bound 26, plus at most 2 refinement attempts per
variant. Normal non-residual layouts and all non-tower code paths are unchanged.
If either extra candidate cannot fit, retain the original valid candidate.

## Before / after

All spans below exclude podiums. X/Y are fixed world axes, so their values are
not rotation-invariant quality criteria.

| Case | Primary footprint span X/Y before → after | Primary hull m² before → after | Primary centre span X/Y after |
| --- | --- | --- | --- |
| 24A | .5931/.7599 → .5455/.7763 | 473,332 → 486,683 | .5213/.7381 |
| 24B | .7559/.4172 → .7706/.5308 | 367,728 → 472,500 | .7314/.4762 |
| 25A | .3972/.7881 → .6096/.7837 | 311,766 → 490,989 | .5715/.7530 |
| 25B | .4119/.7818 → .5885/.7806 | 272,675 → 419,692 | .5518/.7476 |

24A is a disclosed tradeoff: its X span decreases, while its 2D hull and Y span
increase. This is not a claim that every quality measure improves. All four
now pass the unchanged independent >40%-both-world-axes centroid heuristic,
as well as exact coverage/count/height/containment/overlap/support checks.
No heuristic threshold was relaxed.

## Evidence and checks

New reproducible regression:
`node --experimental-strip-types scripts/complete26-create-tower-distribution-check.ts`.
It uses an independent gift-wrapping hull (producer uses monotone chain), frozen
before measurements, original independent geometry oracle, negative overlap
mutations, genuine A/B footprint comparison, deterministic replay and the
existing 2,500 ms two-alternative ceiling. `--diagnostic` explicitly records
pre-fix diagnostics without claiming acceptance. Optional `--evidence-output`
writes a new exclusive-create JSON receipt; it never overwrites prior evidence.

Durable receipts under
`deliverables/2026-09-20-product-quality/complete25-evidence/`:

- `create-max-bound-before-67b8b24.json`: original four variants, all geometry.
- `create-max-bound-after-complete26.json`: new four variants and independent
  footprint/hull measurements; 24/25 preflight+checks 146/87 ms in this run.
- `create-analogues-tower-refinement-results.json`: previous 15-case matrix,
  30 A/B variants, unchanged exact 9/6–53/38/35/8 controls.
- Original `create-analogues-2da3337-results.json` is untouched. All 22 massings
  from its 11 successful cases remain deep-equal after this refinement.

PASS: new four-variant check; prior 15-case/30-variant analogue matrix including
90 negative mutations and 15 hole negatives; `npm run test:point-to-object-create`;
`sprint20-create-geometry-check.ts` (15 earlier geometries);
`complete25-create-programmes-check.ts` (10 programme/shape cases);
`complete25-create-environment-check.ts` (20 scenes);
`quality20-create-perf-check.ts` (339–405 ms; frozen hash
`4146b81d324d8fdef9ea706706eaec2ae18854b884e7241f3aa0bbcfc06d22eb` unchanged);
lint and optimized build. Slowest prior analogue including replay/negative
checks was 585 ms locally versus approximately 425 ms before refinement.

## Remaining limits

This improves the documented commercial concentration, not universal urban
design quality or every maximum-complexity AOI. A hull may bridge concave voids
and does not demonstrate even occupation, walkability, access or feasibility.
The existing centroid oracle has orientation/narrow-site limits and cannot
alone judge long noncommercial buildings; their earlier limitations are not
silently relabelled PASS. The 35% allowance remains distinct from actual green
geometry, and 62% unbuilt is not a claim of landscaping.

Saved schema, old saved geometry, renderer, UI and local A/B behaviour are not
edited. New star fixtures have not yet been visually accepted in the app;
root must inspect them after integration. Offline evidence is not live Create,
release, planning or engineering acceptance.

Screening hypothesis; official validation required; not a legal, cadastral,
zoning, planning or valuation conclusion.
