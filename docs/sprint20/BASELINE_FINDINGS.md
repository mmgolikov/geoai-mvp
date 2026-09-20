# Quality baseline, 20 September

Baseline: `1dab55817e1664870ace88278aaed8f7558ece83`; not accepted as the final product.

## CI failure reproduced from the actual run log

Run `35460560790`, static/API job at `2026-09-19T18:39:49Z`:

`Unexpected redirect for /explore: got http://127.0.0.1:3000/prototype/point-to-object, expected http://127.0.0.1:3000/workspace`

Both `/explore` and `/demo` route source explicitly redirect to `/prototype/point-to-object`, matching the founder-approved current-product entry correction. The permanent CI shell smoke still expected `/workspace`. Correct these two exact expected destinations; retain strict307 and Location validation. This is a test-contract correction, not a relaxation to accept arbitrary redirects. Fresh runtime smoke and full CI remain required.

## Other baselines

- Worker Create reproduced `programme_does_not_fit` on a synthetic approximately749860m² concave L AOI with9 blocks,6–53 levels,38% coverage,35% open space and8m setback. This is an analogue, not recovered founder geometry.
- The existing paid ledger retains unresolved receipt13,422, no accepted telemetry. Its USD0.30 reserve remains counted. No paid requests have been dispatched in this sprint.
- Protected Preview exact baseline is READY (`dpl_G78p6YeC1S94SLrhzF6h7DQrB4BE`). Metadata alone does not certify browser/product behavior.

## Subsequent verified corrections and accounting

The two CI redirect expectations were corrected to `/prototype/point-to-object`; the source guard now ties both legacy route sources and their strict307/Location smoke expectations to that destination. Source guard, TypeScript, original budget and offline live-run gate tests pass locally. A final integrated runtime smoke and remote CI remain required.

On20September the founder explicitly approved conservative full-reserve accounting of receipt13. The tested locked/atomic operator appended one hash-bound event to the existing ledger (generation27); all13 historical receipts remain unchanged. USD0.30 stays counted, actual cost remains unknown. Total estimated/reserved/accounted USD0.8491575, remaining USD14.1508425. New unknown charges still block. New negative tests cover duplicate approval, altered history/hash, partial charge, incorrect identity/time and future unknowns. No new provider call occurred during this operation.

Read-only Production metadata confirms `dpl_AYePGoJLbHmcie2H7sX1biJbbavo`, `main@21b91c43c2fc8dd61b08962e562601b29dd89c76`; current Supabase/Auth/persistence configuration is Preview-only. Founder explicitly approved connecting the existing geoai-dev to closed-MVP Production; the necessary gate/config change and access matrix are not yet executed. No Production mutation has occurred in this checkpoint.
