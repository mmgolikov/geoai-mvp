# Quality20 frozen harness contract — phase 1

Status: OFFLINE CONTRACT ONLY; expanded UI execution blocked in this commit. NOT RUN is not PASS.

## Preregistered amendment (before outcomes)

Authority: control instruction in this task, 2026-09-20. Amendment ID `quality20-dubai-a01-a06-singapore-a07-a08-v1`.
A01/A02 object profile, A03/A04 development screening, A05/A06 redevelopment remain Dubai;
A07/A08 due diligence move to Singapore, with two distinct objects per goal and eight distinct objects overall.
Each core object has Quick, Deep, Standard in that execution order, with identical non-depth inputs/evidence.
A09 Dubai and A10–A12 Singapore Standard baselines remain additional, not waived.
Five Find cohorts each preserve three exact candidates, with FA01–FA15 corresponding one-to-one to their position.
Three Create programmes (`residential_mixed_use`, `commercial_hub`, `civic_green`) each use the same two frozen Dubai AOIs (rectangle/concave).

Denominator: 24 core +4 baseline +15 Find analyses +6 Create =49 potential paid requests;
13 historical receipts +49 =62, below the original hard maximum64. This harness conservatively stops at62.
Five Find-only cases require zero paid requests. Actual internal provider calls/retries remain within canonical ledger telemetry;
this is a paid application-request receipt plan, not a claim of49 provider calls or sufficient money. Shared cap stays USD15.
Failed/unknown/reserved attempts are never erased. No automatic retries, and no case replay under a new manifest hash.
Exact coincident A/FA reuse requires root's explicit equivalence evidence and must remain separately marked NOT RUN here;
the harness does not silently collapse two cases or trigger a second paid request on reopen.

## Minimal bridge contract

Preserve ALL existing secret, identity, deployment, lease and ledger guards. Old scopes unchanged.
New scopes: `quality20-analyse` (one AI POST), `quality20-find` (zero paid POST), `quality20-create` (one Create POST).
Additional settings (nonsecret, but private file may contain source evidence):

- `GEOAI_QUALITY20_MANIFEST_PATH`: absolute canonical regular file, no links, mode0600, max512KB.
- `GEOAI_QUALITY20_MANIFEST_SHA256`: SHA256 of exact UTF-8 file bytes, approved before outcomes.
- `GEOAI_QUALITY20_CASE_ID`: exactly one catalog ID; arbitrary IDs blocked.

Append `:<caseId>:<manifestSha256>` to existing `paid-live-journey:<ledgerId>:<host>:<commit>:<scope>` approval.
Request key: `Q20:<caseId>:AI|CREATE:<fullManifestSha256>`; no truncation or case collisions.
Freeze execution commit, immutable Preview origin and deployment ID; verify against deployment receipt at runtime.
All54 catalog entries must exist; unknown bindings are `null`, never invented IDs. Selected null binding is BLOCKED.
Frozen manifest may bind a subset before that batch; changes require a newly approved hash and cannot authorize case replays.
Validate all bound core triplets for identical input/evidence and distinct object identities; Find cohort/FA identities and geometry must agree.
Run one case at a time, settle before the next. Reserve current case only; never reserve24 upfront.

## Offline commands

Use Node22–24 (bundled Node24 supports TypeScript stripping):

```text
node --experimental-strip-types scripts/quality20-frozen-case-check.mjs
node --experimental-strip-types scripts/quality20-case-contract.mjs --template
node --experimental-strip-types scripts/quality20-case-contract.mjs --validate
```

`--template` emits unbound JSON to stdout; root creates/binds its private file from read-only observed runtime evidence.
`--validate` uses the three settings above plus existing scope, expected commit and Preview URL settings; reads no ledger or credentials.
The binding type in `tests/e2e/helpers/quality20-frozen-case.ts` is authoritative. All hashes have explicitly defined inputs;
Create geometry hash is SHA256(JSON.stringify(open vertex list)); source geometry hash must match the exact submitted geometry serialization.
Current source/snapshot/hash changes must block before paid dispatch, not be accepted post hoc.

Phase2 must add actual UI selection, exact request pre-dispatch checks, result provenance/timing/basemap assertions, local save/reopen and zero paid/source replay.
No expanded live success is claimed; no runtime identities were discovered or fabricated by this phase. Root-only bridge/ledger are untouched.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
