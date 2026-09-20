# Quality20 frozen harness contract — phases 1 and 2

Status: OFFLINE-VALIDATED HARNESS; no live execution performed. Phase1 was intentionally blocked;
phase2 installs UI and pre-reservation checks. Missing real bindings/server snapshot receipts remain BLOCKED. NOT RUN is not PASS.

## Preregistered amendment (before outcomes)

Authority: control instruction in this task, 2026-09-20. Amendment ID `quality20-dubai-a01-a06-singapore-a07-a08-v1`.
A01/A02 object profile, A03/A04 development screening, A05/A06 redevelopment remain Dubai;
A07/A08 due diligence move to Singapore, with two distinct objects per goal and eight distinct objects overall.
Each core object has Quick, Deep, Standard in that execution order, with identical non-depth inputs/evidence.
A09 Dubai and A10–A12 Singapore Standard baselines remain additional, not waived.
Further explicit control amendment, before outcomes: these four baselines test actual ordinary entry with a nonempty question,
whose current runtime goal is `custom`, Standard depth. They are not object-profile/role-specific goal acceptance.
The24 core cases use the authorized harness-only suppression of exactly the first NONPAID AI challenge GET,
then normal visible focus/depth controls and one real POST. This is follow-up/recovery coverage, NOT initial auto-entry.
No POST is suppressed/retried to manufacture a result. Old default-entry scopes remain unchanged.
Five Find cohorts each preserve three exact candidates, with FA01–FA15 corresponding one-to-one to their position.
Three Create programmes (`residential_mixed_use`, `commercial_hub`, `civic_green`) each use the same two frozen Dubai AOIs (rectangle/concave).

Denominator: 24 core +4 baseline +15 Find analyses +6 Create =49 potential paid requests;
Original planning assumed 13 historical receipts +49 =62, below the original hard maximum64. Subsequent explicitly approved recovery runs reached64 and exposed journal capacity as distinct from the USD15 ceiling. The current helper permits at most80 immutable receipts for the expanded acceptance work, with unchanged USD15 atomic accounting and unknown-charge stops. This does not certify the outstanding matrix or authorize automatic retries.
Five Find-only cases require zero paid requests. Actual internal provider calls/retries remain within canonical ledger telemetry;
this is a paid application-request receipt plan, not a claim of49 provider calls or sufficient money. Shared cap stays USD15.
Failed/unknown/reserved attempts are never erased. No automatic retries, and no case replay under a new manifest hash.
Exact coincident A/FA reuse requires root's explicit equivalence evidence and must remain separately marked NOT RUN here;
the harness does not silently collapse two cases or trigger a second paid request on reopen.

## Minimal bridge contract

Preserve ALL existing secret, identity, deployment, lease and ledger guards. Old scopes unchanged.
New scopes: `quality20-analyse` (one AI POST), `quality20-find` (zero paid POST), `quality20-create` (one Create POST).
Additional explicitly authorized acquisition scope: `quality20-acquire` (zero AI/Create POSTs, no paid result).
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

## Phase2 execution and remaining blockers

UI implementation: existing real auth/source-suggest/context identity chain; exact source ID instead of label matching;
three-member Find cohort, geographic comparison with non-GeoAI rendered basemap features and nonzero WebGL canvas;
each selected Find candidate to Analyse; three Create programme buttons × two uploaded AOIs;
Create actual basemap, A/B and 3D checks; local artifact identity/hash save/reopen without repeated AI/context acquisition.
Paid body checks run BEFORE canonical reservation and disallow changed depth, role, scenario, question, object, programme or geometry.
An existing fatal gate permanently blocks later dispatches. The canonical ledger helper and private bridge are unchanged.

Critical known blocker in this harness checkout's baseline: `/context` returns only mode/schemaVersion/subject. It does NOT expose the server
`evidenceReceipt` with evidencePackHash/sourceResponseHash/acquiredAt that the strict comparable-depth gate requires.
The gate remains strict: no nullable substitution, post-hoc invented hash, changed snapshot acceptance, or source replay mutation.
Thus that baseline cannot honestly PASS core same-snapshot analysis through this strict harness. Root owns the separately authorized product receipt exposure; its integration/runtime acceptance is not asserted here.
Newly acquired/different snapshots are not comparable-depth acceptance; no separate paid NOT_COMPARABLE lane was enabled.
The acquisition receipt helps root freeze exactly what was observed, but its received JSON hash is NOT a server evidence-pack hash.
The expected top-level protected context property is `evidenceReceipt: { evidencePackHash, sourceResponseHash, acquiredAt }`: both hashes are lowercase 64-character SHA256 hex, and acquiredAt is the exact original source timestamp. All three must match the frozen subject binding. No extra source lookup is required by this contract. A runtime snapshot seam must still be integrated and checked for stability.

Find source acquiredAt and Create whole-context hash are also strict frozen bindings; fresh source responses may differ and block.
Map viewport bounds tolerance is1e-7 degrees, and source geometry comparison is exact JSON serialization hash, not visual resemblance.
Create AOI identity parity remains root-owned: saved ID must equal the bound aoiId; this harness does not normalize away a mismatch.
Visual/independent geometry-oracle acceptance beyond the existing Create validations is NOT asserted by this test harness.
No source IDs were invented; no paid calls, hosted persona execution, private bridge edit, ledger edit, push or deployment occurred.

## Runnable nonpaid acquisition contract

Use existing root runner/credential/deployment/ledger controls, with scope `quality20-acquire` and these extra settings:

- `GEOAI_QUALITY20_ACQUISITION_PLAN_PATH`: mode0600 absolute canonical non-link JSON, max16KB.
- `GEOAI_QUALITY20_ACQUISITION_PLAN_SHA256`: root-approved SHA256 of exact plan bytes.
- `GEOAI_QUALITY20_ACQUISITION_OUTPUT_PATH`: new file in a canonical mode0700 private directory; no overwrite.

Plan JSON shape (values below are unbound descriptions, NOT runnable invented IDs):

```json
{
  "schemaVersion": "geoai.quality20.nonpaid-acquisition.v1",
  "execution": {"commit": "EXACT_VERIFIED_SHA", "origin": "EXACT_PREVIEW_ORIGIN", "deploymentId": "EXACT_DEPLOYMENT_ID"},
  "caseId": "A01-Q",
  "marketKey": "dubai",
  "query": "READ_ONLY_OBSERVED_SEARCH_QUERY",
  "expectedSourceIdentity": "READ_ONLY_OBSERVED_OSM_ID"
}
```

Approval suffix remains `:<caseId>:<planSHA256>` after the existing ledger/host/commit/scope approval.
Runner: `node --experimental-strip-types scripts/sprint10-live-journey-run.mjs` through root's existing credential bridge ONLY.
Hosted-probe seam forwards the three acquisition settings, preserves strict result parsing and emits `ACQUIRED_NOT_ANALYSED`, never analysis PASS.
Acquisition selects the exact source through normal UI, gets actual context, aborts the initial NONPAID challenge GET,
confirms zero paid POSTs, saves the private receipt and stops. Source API queries are network use but not OpenAI paid use.
Receipt includes actual subject/source ID, available geometry (null remains null), full received context JSON,
canonical received JSON SHA256 (recursive lexicographic object keys; array order preserved), and local receivedAt.
`receivedAt` is explicitly browser receipt time, NOT source acquisition/freshness. Unavailable server hashes/time remain null in
this NONPAID receipt only, not in the frozen paid-case bindings. When a valid actual `evidenceReceipt` is exposed, acquisition preserves its fields verbatim as `serverEvidencePackHash`, `sourceResponseHash`, and `sourceAcquiredAt`, with `comparisonAcceptance: NOT_EVALUATED_ACQUISITION_ONLY`. A malformed present receipt fails closed. Acquisition never grants same-snapshot acceptance or paid-case PASS.

Additional offline checks:

```text
node --experimental-strip-types scripts/quality20-acquisition-check.mjs
node --experimental-strip-types scripts/quality20-bridge-check.mjs
node --experimental-strip-types scripts/sprint10-live-journey-offline-check.ts
node --experimental-strip-types scripts/sprint10-live-journey-runner-offline-check.mjs
node --experimental-strip-types scripts/sprint10-hosted-auth-live-check.mjs
```

The last command is an existing deterministic offline mock suite despite its historical filename, not hosted execution.
TypeScript passed. Production build was attempted and blocked by `ENOTFOUND fonts.googleapis.com` while fetching Geist;
no application build success or expanded browser/live PASS is claimed.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
