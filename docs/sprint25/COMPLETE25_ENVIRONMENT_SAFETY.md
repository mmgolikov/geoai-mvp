# COMPLETE25 environment safety correction

Bounded correction on base `1479e8d2a183c114720823257c821ccf20ea1ac3`. Only `live-object-map.tsx`, one dedicated regression script and this note change. Palette, generator, saved contracts, sources, AI, Auth and deployment are untouched.

## Reproduced before

`node scripts/complete25-environment-safety-check.mjs --expect-before` executed before the code correction and reported:

```json
{"status":"REPRODUCED_BEFORE","inputRings":2,"renderedRings":1,"retainedNativePlazaOverlapSqM":256.0778666146273,"environmentVisible":true,"massingVisible":"visible"}
```

The script extracts and executes the actual map functions/idle callback and uses the actual environment generator, overlap implementation, preview model and source renderer. Its map double controls retained features and source lifecycle; this is not rendered-browser evidence.

## Corrections

- The main AOI source deep-copies **every ring**, preserving hole coordinates/order without mutating the saved AOI. The result preview already preserves every ring; both sources now agree. Draft drawing remains unchanged.
- Initial Create rendering and subsequent idle/retained-source callbacks independently test proposed environment geometry against currently rendered native buildings. Partial replacement may leave a native building away from the new massing but on a proposed plaza/path. That conflict hides the environment only, keeping valid massing visible.
- Existing massing collision, replacement status, minimum zoom and unknown/query-error safeguards are preserved. Environment inherits the same fail-closed intersection check with a maximum256 polygon comparisons per refresh; exhaustion hides optional decoration. No generated building is removed or regenerated and no fake area or regulatory measure is introduced.
- No conflict-result cache is introduced: retained source changes are rechecked. Existing environment source identity handling repopulates replacement sources after style reloads.

## Verified locally

- Dedicated18 checks PASS: exact rings and immutable input; retained-native plaza overlap; independent massing visibility in2D/3D; actual idle callback; recovery after native removal; existing massing conflict; unknown geometry/query failure; restore/remove; style-source recreation; low zoom; unchanged draft; A/B source updates; comparison cap; multipart native collision.
- `npm run lint`: PASS.
- `npm run test:point-to-object-map-replacement`: PASS, including Sprint07 async restore/readiness and Sprint09 holes, seam parents, multipart and bounded geometry guards.
- `npm run test:point-to-object-v5-interaction`: PASS.
- `node scripts/complete25-create-environment-check.ts`: PASS,20 scenes/10 textures and hole/collision/invalid/blocked negatives, unchanged metrics and deterministic reopen.
- `git diff --check`: PASS.

Root explicitly reserved the single integrated production build and shared browser verification; no standalone build/devserver/browser was run here. No network, paid API, hosted database or deployment calls. Rollback is this isolated commit; no data migration is required.

## Exact additional browser fixture for integration

Use the existing offline map harness, not live tiles/API:

1. Coordinate transform `p([x,y])=[55+x/100000,25+y/110000]`. AOI outer ring `[0,0],[100,0],[100,100],[0,100],[0,0]`; hole `[40,40],[60,40],[60,60],[40,60],[40,40]`. Confirm actual main AOI source has two exact rings and the hole is not filled; compare the result preview AOI source.
2. A massing feature uses `templateId=residential_mixed_use`, height15m/base0, rectangle `[10,10],[25,10],[25,25],[10,25],[10,10]`, variantA. Derive environment with the real builder; use its first plaza polygon as a **retained native building** fixture, not as another generated feature. Force/obtain `replacementStatus=partial` while retaining this native footprint.
3. Confirm the new building remains rendered, but `geoai-concept-environment-fill` is `none` and rendered environment count0. Repeat2D→3D, idle and sourcedata. Removing the retained native footprint and publishing source/idle must restore environment rendering without AI/provider calls.
4. Retain a native footprint on the generated building instead: both massing and environment remain hidden under the existing guard. Reopen saved A/B, reload style, restore originals and remove result; neither stale decorative source nor lost AOI hole may remain.

Fixture geometry is synthetic and labeled accordingly. The extra renderer validation is still owned by the integrator/browser worker, not claimed complete by this unit/function receipt.
