# COMPLETE26 — residual-strip Create allocation

## Change request and scope

26 September 2026. Root-authorized local correction from frozen base
`2da333717500c18eead88edc26d164cac8ce9b89`. No provider, hosted, auth,
deployment, palette, renderer or persistence changes. This is offline synthetic
geometry evidence, **not live Create acceptance**.

Three new irregular/concave analogues (oblique stepped notch, asymmetric C,
twin notch), each approximately 749,860 m², exercise all five programmes with
exactly 9 primary blocks, levels 6–53, coverage 38%, open-space allowance 35%
and setback 8 m. The founder's original polygon was unavailable; these are
explicitly analogues, not a reconstruction.

## Before: 11/15 cases pass

The first 15-case receipt and four failures remain unchanged in
`deliverables/2026-09-20-product-quality/complete25-evidence/`:

- `create-analogues-2da3337.mjs` and `create-analogues-2da3337-results.json`
- `create-analogues-2da3337-diagnose.mjs` and `create-analogues-2da3337-diagnostics.json`
- `CREATE_ANALOGUES_2DA3337.md`

Oblique mixed-use and civic had only A: B failed the geometric search.
Oblique commercial A and twin-notch commercial A/B were geometrically contained
and retained exact coverage/count/height, but concentrated towers failed the
existing independent world-axis distribution heuristic.

Cause: `planSiteCells` treated every boundary-vertex strip as compulsory.
The oblique partition contained a 368 × 5 m residual cell; twin-notch
partitions included 285 × 10 m and 530 × 10 m cells. Articulated B forms
could not satisfy existing minimum edge length in a sliver. Towers could not
satisfy existing width/area/support checks there. The entire partition was
discarded, even though larger cells retained enough capacity. Legacy fallback
then omitted B or concentrated towers on one podium.

## Correction

Try both original allocations first. Only if neither works, omit the thinnest
residual strip(s), subdivide the remaining cells to the same primary count,
and apply the original form/height logic and exact target-area scaling.

The bound is two orientations × at most (blockCount + 1) allocations per
variant (20 for this fixture, 26 at the existing 12-block maximum). There is
no unbounded retry or relaxed timeout. Capacity rejection, AOI/setback, form
edge, separation, podium/tower quality and final geometry validators remain
unchanged. No lower coverage fallback or cloned/height-only B is added.
Excluding a strip does not assert that it is landscaped, a road, or public.

## After and verification

- New matrix: **15/15**, 30 valid A/B variants, deterministic replay.
- All variants retain 9 blocks and 6–53 levels; independent unique coverage
  37.999999924–38.000000072%, unbuilt share approximately 62%.
- A/B differ in footprint geometry after ignoring feature order, ring
  direction/start, IDs, heights and sub-millimetre coordinate noise.
- 90 independent overlap/exterior/KPI mutations and 15 hole negatives rejected.
- All 22 massings from previously passing cases are deep-equal to the preserved
  baseline receipt. No previously successful analogue geometry changed.
- Entire new matrix under one second locally on Node 24.19.0; slowest case
  including replay/negative checks 472 ms in the captured run. The test uses
  a fixed 8-second per-case ceiling; no existing performance limit changed.
- Existing 24-vertex performance control: 354–408 ms, unchanged frozen SHA-256,
  existing 2,500 ms limit retained.
- PASS: `npm run test:point-to-object-create` (generator, preflight, offline
  actual route and preview contracts); `sprint20-create-geometry-check.ts`
  (15 earlier large/concave/narrow/rotated cases); `complete25-create-programmes-check.ts`
  (10 programme/shape cases); `complete25-create-geometry-check.ts` independent
  oracle negatives; `complete25-create-environment-check.ts` (20 scenes);
  `sprint20-create-preflight-parity-check.ts`; `quality20-create-perf-check.ts`;
  `npm run test:aoi-integrity` (11 geometry personas).
- PASS: `npm run lint`, optimized `npm run build` (81 routes). The initial
  lint/build found fixture-derived TypeScript literal typing in the new test;
  corrected only the test boundary, then both passed.

Full after geometry, controls, programme and independent metrics:
`create-analogues-complete26-results.json` in the same evidence directory.
The test can produce another immutable receipt (fails if the output exists):

```sh
node --experimental-strip-types scripts/complete26-create-analogues-check.ts \
  --evidence-output /absolute/new-receipt.json
```

## Limits and handoff

The unchanged independent distribution criterion (>40% centroid span in both
world axes) is a regression heuristic, **not a planning law or rotation-invariant
quality proof**. It may be unsuitable for very narrow or differently oriented
sites. No threshold was changed to make these fixtures pass. This bounded search
is not proof of feasibility for every polygon; unsupported combinations may
still fail honestly. The 35% control is an allowance, not measured green-space
geometry; 62% unbuilt is not a claim of landscaped area.

Saved result schema, local A/B switching and renderer are untouched. Root owns
integrated browser/visual review of these new shapes, exact-candidate CI and any
later paid acceptance. No network/AI calls occurred in this matrix. Rollback:
revert this scoped correction to the stated base.

Screening hypothesis; official validation required; not a legal, cadastral,
zoning, planning or valuation conclusion.
