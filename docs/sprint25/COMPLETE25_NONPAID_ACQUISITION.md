# COMPLETE25 — nonpaid Find/Create acquisition

Change request: complete the source-acquisition input to the existing immutable 58-case acceptance matrix. Base `fbe2fa42`; owner scope is operator runner/spec plus acquisition helpers only. No catalogue, denominator, financial gate, product route, Auth, hosted data or Production changes.

## Contract

Use existing scope `quality20-acquire` and its exact root approval. Its paid scope remains `{ai:0,create:0}`. Existing Analyse v1 plans/receipts are unchanged. The child runner terminal status remains `ACQUIRED_NOT_ANALYSED` for compatibility, including Create; the private Create output specifically says `ACQUIRED_NOT_GENERATED`.

The same environment names apply: `GEOAI_QUALITY20_ACQUISITION_PLAN_PATH`, `GEOAI_QUALITY20_ACQUISITION_PLAN_SHA256`, `GEOAI_QUALITY20_ACQUISITION_OUTPUT_PATH`. The plan is a canonical, private, regular non-link file, maximum 16,384 bytes, approved by its byte SHA-256. Output is exclusive-create, mode0600 in a canonical mode0700 directory; no overwrite or symlink following; maximum encoded2,048,000bytes and credential-shaped content excluded.

V2 Find plan fields (exact):

```ts
{
  schemaVersion: "geoai.complete25.nonpaid-acquisition.v2", kind: "find",
  execution: {commit, origin, deploymentId}, caseId: "F01", marketKey: "dubai",
  locale: "en", role, scenario,
  find: {bounds: [west,south,east,north], boundedEnvelope: [west,south,east,north],
    group, mappedMinimumLevels: null, mappedMaximumLevels: null}
}
```

All registered F01–F05 IDs/markets are accepted. `bounds` is the requested camera-fit rectangle. `boundedEnvelope` is the separately approved maximum viewport envelope. After ordinary MapLibre fitting, the lane reads actual rendered bounds, requires the fit rectangle to remain contained, verifies the entire viewport remains in the envelope, and applies the production market/span/area parser. The query is then gated against these **exact observed bounds**; no body rewriting, broad city scan, clamping or silent region substitution. The receipt freezes observed bounds. The envelope is not added to the existing strict manifest schema.

The lane sets real product role/scenario/group/level controls, clicks Find, and selects the first three actual source-order candidates. Fewer than three, duplicate/invalid identities, unusable geometry or a failed response stops the lane; no fallback candidate is selected. It opens the actual comparison dashboard and each of its three **Open object analysis** actions, validates each exact context request before dispatch, and captures source identity, complete Polygon/MultiPolygon or null geometry, received payload, source time/hash and current server evidence lease. It never clicks Analyze/Run/Generate. The lane permits one Find and exactly three context POSTs, not automatic retries.

V2 Create plan fields (exact): `schemaVersion`, `kind:"create"`, `execution`, registered Create `caseId`, matching `marketKey`, `coordinates` (3–24 open vertices, not a closed ring). The lane validates the production AOI/market rules, uploads the exact polygon through the real UI and permits one exact area-context POST. It validates the production response and reads the actual mounted AOI identity from React state without modifying state. It retains the entire area-context response and its SHA-256, including the stable source acquisition timestamp established by the prior area-context fix. No generation or preflight network endpoint is called; the product's ordinary local geometry worker may run. AOI ID is an acquisition-time UI identity, not a parcel ID or a claim that a later independent upload will reuse the same timestamp-derived ID.

## Receipt and immutable manifest handoff

Receipt schema: `geoai.complete25.nonpaid-acquisition-receipt.v2`. Common fields: `kind`, `status`, `execution`, `caseId`, `planSha256`, `receivedAt`, explicit local-receipt-time meaning, `paidPostCount:0`, `comparisonAcceptance:"NOT_EVALUATED_ACQUISITION_ONLY"`, `receivedEvidence`, `canonicalReceivedEvidenceHash`.

Find additionally returns `.find` in the unchanged strict `Quality20Binding.find` format and ordered `.subjects`: `{caseId:"FA01",subject,geometry,receivedAt,receivedEvidence}`. `subject` is the strict source identity/geometryHash/sourceResponseHash/evidencePackHash/acquiredAt tuple. Each `receivedEvidence.evidenceReceipt` preserves the full current server lease, including expiresAt/cacheWindow; the coordinator must preserve that time boundary. Create returns `.create:{coordinates,geometryHash,contextHash,aoiId}`, `.sourceAcquiredAt`, `.sourceResponseHash`; the coordinator supplies only its separately approved prompt.

The coordinator can call `validateComplete25AcquisitionReceipt(loadedPlan, parsedReceipt)` from `tests/e2e/helpers/quality20-cohort-acquisition.ts`. It rebuilds bindings from the captured payloads and rejects changed fields/hashes/identities and invalid/expired Find leases. `loadedPlan` includes `planSha256` and `outputPath`. Root must also require successful runner cleanup/status, expected private output mode/hash and unchanged paid journal; a file alone is not successful execution. Runner now explicitly rejects any new paid journal receipt in acquisition mode.

No manifest is mutated by the lane. The coordinator produces a new exclusive, approved full58-row manifest; all other rows remain present/unbound until their own acquisition, the F/FA cohort must match exactly, and Q/S/D groups retain one snapshot. A changed snapshot in a later case is blocked, never reacquired silently. The source payload does not itself prove rendered comparison, AI quality, Create quality or release acceptance.

## Verification and limits

- New `scripts/complete25-acquisition-check.mjs`:35 offline checks PASS, including exact source/geometry, Polygon/MultiPolygon/point preservation, missing/expired lease, wrong query/market, bounded viewport expansion, region hopping, immutable private output and strict58-row F/FA/Create binding compatibility.
- Existing `quality20-acquisition-check.mjs`, `quality20-frozen-case-check.mjs`, `sprint10-live-journey-runner-offline-check.mjs`:PASS.
- TypeScript noEmit:PASS. Product build remains the integrator's single frozen build; no production source files changed.
- Fixtures are synthetic offline data, never public/runtime acceptance. No credentials read, browser run, network/API/Auth write, paid call, database operation or deployment occurred.
- Actual authenticated Find/Create acquisition, responsiveness and provider/cache availability remain root-runner checks on the exact protected Preview. Lease expiry/changed cache and insufficient candidates remain explicit stop conditions. UI selectors/React state inspection need runtime confirmation; no offline result is presented as browser evidence.

Rollback: revert this commit; legacy Analyse acquisition and paid gates remain unchanged.
