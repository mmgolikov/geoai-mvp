# Quality20 Evidence Receipt Check

Status: Local independent integration check; not Released

## Target

- Integration worktree: `/private/tmp/geoai-four-sprints-20260918`
- Integration HEAD: `0a10e27874078af2454e48016979f3c5904b1be1`
- Route: `app/api/prototype/point-to-object/context/route.ts`
- Tested route SHA-256: `538437c07ecee72e892df73476abfa9a301c48c799f0a61294ea12ce38549ae8`
- Route state: uncommitted root integration change at verification time
- Check: `scripts/quality20-evidence-receipt-check.mjs`

## Contract verified

- The actual route is read, dependency-isolated in memory, transpiled, imported and executed.
- `evidenceReceipt` contains the exact server-acquired `evidencePackHash`, `source.sourceResponseHash` and `source.acquiredAt` values.
- Client-supplied receipt fields are rejected as unknown request input; similarly named headers cannot override the server receipt.
- Authentication and cross-origin negatives return before evidence acquisition.
- Raw provider payload and internal sentinel fields are not exposed in the response.
- Only synthetic fixtures are used. The check performs no hosted/API calls and accesses no secrets.

## Result

Run from the integration root or pass it explicitly:

```text
node scripts/quality20-evidence-receipt-check.mjs /private/tmp/geoai-four-sprints-20260918
```

Expected result: PASS. This is local Candidate evidence only and does not certify hosted source custody or Production.
