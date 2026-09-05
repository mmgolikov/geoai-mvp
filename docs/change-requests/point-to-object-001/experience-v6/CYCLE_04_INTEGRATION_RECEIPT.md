# Cycle 04 integration receipt

Status: Integrated local acceptance complete; exact-head CI and protected Preview pending
Date: 2026-09-06
Owner: GeoAI Main
Authority: [Cycle 04 approved change request](CYCLE_04_GEOCONTEXT_GENERATOR_CHANGE_REQUEST.md)
Successor: None

## Scope and publication boundary

Baseline and rollback point: `d5091f2c62e14936fc0440f396b4cfedfd45f53c`, protected Preview `dpl_DrnkECZpvDVGpEftjFoBswgZmFCE`. This receipt does not claim a new deployed Preview. No push, merge, main/Production change, credential/environment change, hosted Supabase/Auth/Storage mutation or paid AI call has occurred in this integration stage.

## Local integration

| Package | Owner head | Integration commits | Result |
| --- | --- | --- | --- |
| UX-04 | `26a0f1ddc5592ba8b57643e306ef3e3707775bfd` | `2445843`, `7c80d04`, `6bfbf7c`, `c1a360d` | Profile owns audience; compatible Find restoration; invalid saved outcomes cleared; Create locale draft retained; uploaded AOI fit preserves bearing/pitch; MapLibre host geometry pinned |
| GEN-04 | `9e150c731c26c03831987db5762e1302108159b2` | `41fafdd` | Articulated campus/tower footprints, bounded distributed placement, topology/local-width checks |
| GEO-04 | `3caa05f5cde6099c9523f6318a2fd8a4dc59a037` | `bb08c29` | Exact-QID Wikidata, bounded source queue/cache, corrected OSM normalization, V6 server brief and V5 historical fallback |

Main's final local UX polish stacks the area heading and presentation button so a long Russian action does not compress the heading. Its focused existing browser regression passed 1/1. The combined local build passed 79/79; hosted exact-head CI is still pending.

## Findings fixed before publication

- Normalizing a saved unsupported/wrong-role Find scenario previously risked relabelling old results. Normalization now clears result, intent, shortlist, comparison and analysis target; valid same-audience intent is retained.
- Uploaded AOI camera fitting now passes the current bearing and pitch explicitly.
- Actual local browser exposed a MapLibre CSS cascade/import-order collision: host `850 x 0`, canvas `850 x 300`, parent `850 x 656`. Explicit host geometry gives host and canvas `850 x 656`. This is a confirmed dev-render defect, not proven Cycle04 causality.
- Whole-envelope calipers did not establish the thickness of articulated tower arms. The fixed grammar now has a level-dependent local-width guard and negative L/U fixtures.
- Spacious-square campus B's all-rectangle fallback was corrected by another bounded target order without relaxing coverage or clearance.
- The validator now rejects a concave L relabelled as chamfered; declared form must match vertex/reflex topology.

## Independent geometry acceptance

Frozen owner SHA: `9e150c731c26c03831987db5762e1302108159b2`. The source remained clean and unchanged before/after the independent runs.

- Ten fixtures x two windings: default 20/20 in 3.883 s; strict 20/20 in 3.993 s; zero failures and unresolved cases.
- Five independent concave-oracle self-tests passed. The oracle uses separate ear-clipping/intersection calculations, not the product validator or placement algorithm.
- Checks include containment, setback, overlap, support/base, counts, coverage, floor area, winding, A/B differences, local widths and form topology.
- Minimum observed high-rise articulated edge: 7.51 m; fixed-grammar arm: 9.62 m. These are bounded prototype visual-quality checks, not engineering standards.
- Geometry source SHA-256: `d4b9207d4457ad5b3ac29fba669265030129edb7f330751775028fcdf1d7fcfe`.
- Strict report SHA-256: `6c41b7d1ffd0cbdd407fabcef92be9c1a04821e75db9fead31cd4b5d81c7a829`.
- Acceptance receipt SHA-256: `1434ca1b41426901430815ee9c0585039a3a287c2d92e82d45fa835f31d74d50`.

Local artifacts are under `/private/tmp/geoai-cycle04-independent-audit/`: `audit.cjs`, `README.md`, `report-9e150c731c26.json`, `acceptance-receipt-9e150c731c26.json`. Earlier failing `77ae683` and Cycle03 artifacts were preserved. Temporary paths are acceptance evidence locations, not a durable external archive.

## Main rendered checks

Local frontend `127.0.0.1:3138`, geometry-only QA proxy `127.0.0.1:3139`; actual OpenFreeMap rendering, deterministic product generator, fixture programme, no OpenAI transport. The QA proxy intentionally returns area-context unavailable and blocks other application APIs. This is not a live geocontext/AI check.

- Actual map host/canvas `850 x 656`, drawer 430 px at a 1280 x 720 viewport; no framework error overlay.
- Profile B2C save -> Find exposes Tourist/Resident/Home buyer/Renter/Investor buyer/Family relocation with role scenarios; no Find audience buttons.
- A drawn synthetic Dubai rectangle of 4.34 ha, civic programme 6 blocks, 3–8 floors, 28% coverage, 50% open space, 12 m setback produced meaningful L/U/chamfered footprints. A/B each contain six primary blocks and achieve 28%; floor-area estimates are 66,299.2 and 67,270.6 sq m.
- Generation took 266 ms on the first local run and 202 ms on the second. These are deterministic fixture runtimes, not full API/model latency.
- A/B, 2D/3D, EN/RU, basemap changes, show original/show concept and delete were exercised. Original objects returned and generated objects disappeared on restore/delete. Nearby buildings outside the AOI remain intentionally visible.
- Exactly two explicit local Generate actions were counted across the two tests. Other interactions made zero extra generation calls; provider calls remained zero.
- Russian area heading now has width 347 px and height 20 px; the 44 px action is below it, not alongside a five-line compressed title.

## Contract checks and remaining work

Main ran the integrated Create geometry/preflight/actual-route fixture checks, V5 interaction check and lint/typecheck successfully after UX+GEN integration. Main's subsequent area-heading change passed the focused Create/Profile browser test (1/1, 15.5 s). dev_1 separately reported full offline-flow 6/6 and build 79/79 at its owner SHA; this is not the final combined-build receipt.

Main also passed Find, MapLibre replacement, trusted identity, AOI integrity (11 personas) and data-honesty checks (411 scanned files, zero findings). These were run on the integrated UX+GEN head before GEO integration. An initial check used the system's older Node and stopped on an unsupported runner flag; rerunning on bundled Node 24 passed, with no application change.

The independent GEO review reproduced five defects before publication: coarse coordinate precision accepted as a close match; shared requests overrunning a short caller deadline; concurrent distinct entity requests despite the serial-source contract; false numeric conflicts caused by display units; and a normal-rank compatible class rescuing an incompatible preferred identity class. All five passed the final independent frozen-head retest at `3caa05f5cde6099c9523f6318a2fd8a4dc59a037`, tree `d79423d1cdd8092b1d063ef028d12454d046d020`; the owner tree was clean before/after. No P0/P1 remains in that bounded review scope. The V5 historical-content fallback was separately reviewed and is allowed: original content and telemetry remain accessible, and no automatic locale/source/model regeneration occurs.

Main also passed the integrated source adapter, semantic V6, historical/current session and existing full point-to-object contracts. The synthetic semantic matrix now covers a Dubai hotel, Singapore hotel and unnamed mapped object with unavailable surroundings. Counts/names in these fixtures are test inputs, not live observations of either city. Main corrected Russian sparse-subject grammar and reran the source/semantic/session checks. Initial brief text is deterministic server output; existing model decision and focused-answer behavior remain, with no redundant model echo or extra model call.

The combined optimized local build passed all 79 routes/pages, typechecking and compilation. The first sandboxed attempt could not resolve the public Google Fonts host; the normal approved network-enabled retry retrieved Geist and passed, without changing fonts, dependencies or application permissions.

Source limitations: Wikidata supplies linked community-entity facts only when strict exact-QID/spatial/type/country/precision checks pass. It does not overwrite selected OSM metrics or enter Create. Centre-radius counts and identity deduplication were corrected without extra Overpass queries. Point/AOI semantic parity remains deferred. The serial queue is process-local, not a global deployment quota. A short caller may expire while an independently bounded shared acquisition completes and caches a later validated payload; no timeout/error payload is cached as success. No paid/live AI acceptance is claimed.

New source/semantic/session tests and the new two-case V6 browser test are wired into the existing automated quality gate, not left as one-off local checks.

Final built-runtime acceptance: eight existing map/Find/Create browser journeys passed in 23.7 s; two new V6/V5 analysis journeys passed in 2.6 s. V6 EN/RU rendering, exact initial intent, one explicit locale refresh, zero-call restoration, useful source facts and no visible raw resolver identifiers were checked. Historical V5 locale changes/restoration made zero source/AI calls. The new tests use synthetic intercepted responses, not a live model. The initial new-test run exposed a test-only locator that expected an intentionally filtered low-value paragraph; it was corrected to assert actual retained Signals content, then the full two-test set passed without retries. Main visually read the final Russian full-page screenshot; no overlap was found. Map, analysis and Profile returned HTTP 200 on the built local runtime. V6 contracts, data honesty (413 files, zero findings) and API inventory (76 routes) also passed.

New source, semantic, session and browser regression checks are part of the quality gate. Documentation lifecycle generation/validation passed (171 documents). Exact successor CI/Preview and main/Production readbacks will be recorded externally in Draft PR #147 after publication, avoiding a documentation-only redeployment loop. This in-repository receipt does not pre-claim those external results. Confluence parity remains unverified.

Resource review: three implementation lanes plus bounded acceptance reviewers; completed lanes were not restarted. One source implementation needed five concrete adversarial fixes and a user-facing copy revision; the next source slice should freeze the minimal adapter contract before a broad semantic change. Main retained direct ownership of integration and final checks. Account-wide weekly usage readback at 2026-09-05 22:00 UTC was 47% used, not a per-cycle usage estimate. No reset, plan change or paid AI test occurred.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
