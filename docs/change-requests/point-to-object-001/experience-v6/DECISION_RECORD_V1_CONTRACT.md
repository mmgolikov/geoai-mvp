# DecisionRecord V1 Contract

Status: Candidate implementation contract; not runtime-active

Date: 2026-09-04

Owner: GeoAI Product and Decision Architecture

Authority: Contract design for the POINT_TO_OBJECT_001 V6 candidate. It does not authorize persistence, protected data use, ranking, client distribution, merge or Production.

Successor: None. Schema identifier: `urn:geoai:decision-record:1.0.0`.

Machine contract: `DECISION_RECORD_V1.schema.json`.

## Purpose

`DecisionRecord` is the immutable, versioned result of one decision-stage execution. It binds the exact scenario, business question, subjects, criteria, GeoContext snapshots, method executions, outputs, model/provider receipts, validation state, per-operation gates and immutable render template policy.

It prevents the current failure mode in which search, comparison, dashboard and report independently derive similar-looking but different values.

The operating rule is:

> Compute once into a DecisionRecord; dashboard, report and Project Hub consume the same record and hashes without recomputation.

## Lifecycle model

A DecisionRecord is append-only. Product progress creates linked records rather than mutating an earlier one:

1. `find` creates a discovery DecisionRecord with criteria, bounded acquisition and candidate identities.
2. Shortlist promotion builds a GeoContextSnapshot for each chosen candidate under one context profile/version.
3. `compare` creates a successor DecisionRecord that references the Find record and exact candidate snapshots.
4. An individual `analyse` record may reference one of the same snapshots; it does not reacquire unless refresh is explicit.
5. `create` creates successor alternatives and generation artifacts from the selected snapshot/scenario.
6. `evaluate` compares alternatives under versioned methods and the same or explicitly refreshed context.
7. Dashboard renders the selected, already-final DecisionRecord.
8. Report creates a frozen artifact and then a separate `DecisionRenderReceipt` referencing that same finalized record; it does not execute decision methods or mutate the record.

Refreshing source context creates new GeoContextSnapshot(s) and a successor DecisionRecord with a locale-neutral `refreshReasonCode`. Prior records/reports remain reproducible.

## Required envelope

| Field | Contract |
| --- | --- |
| `schemaId`, `schemaVersion` | Exact machine contract and version. |
| `decisionRecordId`, `recordHash`, `status` | Immutable record identity/hash and lifecycle state. |
| `finalization` | Proof that the exact parent bytes passed schema and semantic validation before rendering, including validator ID/version and finalization time. |
| `truthLanguagePolicy` | Fixed policy: system-authored truth is expressed as structured values and locale-neutral keys/codes; localized presentation is external. |
| `projectRef` | Optional project/tenant reference; `null` for bounded public-demo/browser-local flow. |
| `preferenceContext` | B2B/B2C and product role used to frame the question; explicitly not authorization. |
| `scenarioRef` | Exact registry ID/version/hash, scenario ID/version/hash and business-question ID. |
| `operation` | One value from the shared eighteen-operation vocabulary; the record captures the decision-stage operation that produced it. |
| `createdAt`, `decisionAsOf` | Execution and decision time; source times remain on snapshots. |
| `parentRecordRefs` | Immutable predecessor chain. |
| `inputs` | Subjects, criteria hash, snapshot refs and acquisition/refresh posture. |
| `methodExecutions` | Versioned methods, input/output hashes, status and model/provider receipts. |
| `operationGates` | Exactly one `pass`, `partial` or `blocked` receipt for every shared operation, with gap/validation refs and immutable tuple-scoped rights evaluations. |
| `outputs` | Claims, metrics, candidate set/ranking, alternatives, recommendation and validation tasks. |
| `renderPolicy` | Dashboard/report/Project Summary template IDs and versions only; never render-manifest or rendered-artifact hashes. |
| `lineage` | Canonicalization, input/output graph and decision-stage artifact hashes only. |
| `governance` | Claim cap, validation/privacy/release states and locale-neutral caveat-policy ID. |

## Input and snapshot rules

- Every subject reference includes subject ID, geometry hash and role (`primary`, `candidate`, `comparison` or `alternative_site`).
- Every context reference includes snapshot ID/hash, subject ID, context profile ID/version and acquisition window.
- Snapshot bytes are not copied into the record. Consumers resolve by exact ID/hash.
- A comparison cohort requires the same context profile/version, metric definitions and compatible acquisition window declared by the Scenario Registry.
- Discovery candidates may exist without full context snapshots, but they cannot be ranked or compared beyond shallow observed attributes.
- `acquisitionPosture=reuse_exact_snapshot` is the default for follow-up/dashboard/report. `refresh_context` requires a reason and successor lineage.

## Method execution rules

Each execution records method ID/version, operation, status, deterministic flag, input fact/snapshot hashes, output hash, start/end time, locale-neutral failure-reason codes and optional model/provider receipt.

- deterministic methods must reproduce the same output hash from the same canonical inputs and version;
- model methods require provider/model/config or prompt hash, request status, token/cost fields when available, and structured-output validation status;
- model failure cannot overwrite or downgrade source facts; it produces a failed/partial method receipt and explicit gaps;
- dashboard/report renderers are versioned in a later external `DecisionRenderReceipt`; they are not decision-stage method executions and `recomputationAllowed=false`.

## Shared operation gates

The exact shared vocabulary is:

`resolve`, `acquire`, `normalize`, `calculate`, `analyse`, `find`, `shortlist`, `compare`, `rank`, `create`, `generate`, `evaluate`, `model_input`, `dashboard`, `report`, `project`, `export`, `persist`.

`operationGates` contains each value exactly once. A gate is blocked when a referenced snapshot gap, validation task or rights-scope receipt blocks it. A non-blocked gate persists each positive rights decision as an immutable evaluation containing the exact operation, channel, delivery mode, ISO territory, evaluation time, rights receipt ID, rights-scope hash, evaluator ID/version and evaluation hash. The evaluation cannot follow `decisionAsOf` or finalization. The set of `rightsReceiptIds` must equal the set represented by those evaluations. Replaying the tuple against the exact rights scope must still produce `permitted`; a dangling, altered or merely conditional scope is rejected.

Unknown or missing scope blocks every affected operation and cannot be bypassed by a scenario being enabled. Rights evidence captured after the persisted evaluation time is invalid. `permitted_with_conditions` also fails closed until a separate versioned obligation-satisfaction receipt is represented and validated; V1 has no such receipt. `create`, `generate`, `evaluate`, `compare`, `rank`, `report` and `project` therefore have first-class independent gates rather than inheriting a coarse mode status.

## Claims and metrics

Decision claims use the same evidence classes as GeoContext:

- `observed` claims quote/normalize snapshot facts;
- `calculated` claims reference deterministic method output and input facts;
- `modelled` claims reference method/model receipts;
- `hypothesis` claims include assumptions and validation tasks.

Every claim and metric references exact snapshot/fact/method IDs. System-authored claim prose, assumptions and proof limits are represented by `claimKey`, `assumptionKeys` and `proofLimitCode`; localized strings are resolved only by a renderer. A recommendation uses `summaryKey`, references claim/metric/validation IDs and states `continue_screening`, `hold`, `compare_more` or `insufficient_evidence`. It cannot be represented as approval, verified best use or a guaranteed outcome.

## Candidate set and ranking

`outputs.candidateSet` supports factual shortlist/comparison without ranking:

- candidate states: `discovered`, `shortlisted`, `excluded`, `blocked_for_comparison`;
- ordering: `source_identity`, `manual`, `ranked_by_method` or `not_ordered`;
- exclusions and blocked states require locale-neutral reason/gap codes;
- ranking is nullable.

An included ranking records method/version, cohort hash, ordered items, metric contributions, missing-data treatment, tie-policy ID, sensitivity-result hash and gate receipt. The gate must be `pass`; otherwise ranking is `null` and a blocking gap is rendered.

No old mock score, seed candidate or UI-calculated value may populate V1.

## Create alternatives

Alternatives contain:

- alternative ID, locale-neutral label key and state;
- source subject/snapshot refs;
- programme and geometry artifact hashes;
- `modelled` design/programme facts;
- deterministic calculated area/GFA/coverage/height/open-space metrics;
- assumption keys, violation codes, claim refs and validation task refs;
- generation provider/method receipt.

The original map replacement is a reversible visualization state, not a mutation of observed source geometry. “Show existing”, “Show concept”, reset and mode exit operate on UI state; the source snapshot remains immutable.

## Dashboard, report and Project Hub

- Dashboard, report and Project Hub consumers bind to one finalized DecisionRecord ID/hash and the template ID/version frozen in `renderPolicy`.
- The parent DecisionRecord contains no render manifest, rendered artifact or render receipt hash. `lineage.decisionArtifactHashes` is limited to artifacts finalized before the record, such as a generated concept geometry/programme; it cannot contain later dashboard/report/Project Summary artifacts.
- Rendering follows one acyclic order: finalize and hash the DecisionRecord; verify its relevant operation gate; render an artifact that embeds only the parent record ID/hash; hash the artifact; then hash a separate `DecisionRenderReceipt` that binds parent, template, locale, renderer, manifest and artifact.
- The artifact never embeds its later `renderReceiptHash`; the receipt is never inserted back into the parent. A localized re-render creates a new receipt/artifact while preserving the exact parent DecisionRecord and GeoContext hashes.
- Neither may run acquisition, analysis, ranking or generation.
- Project Hub indexes record/snapshot/render-receipt refs and their status; it does not flatten or rewrite their payloads.
- Localization changes labels and narrative presentation only. Numeric values, coded units, claim keys, source references and parent hashes remain invariant.

The hash-bearing DecisionRecord contains no UI locale and no system-authored localized narrative fields. System-owned statements are keys/codes (`claimKey`, `summaryKey`, `titleKey`, `reasonCode`, `proofLimitCode`, assumption/violation/evidence keys). The only language-bearing strings allowed in its truth payload are user-authored criterion values, preserved as input intent and normalized by `normalizedHash`; switching the UI locale never rewrites them. The fixed `truthLanguagePolicy=locale_neutral_codes_and_user_authored_inputs_v1` makes this boundary machine-checkable.

Machine contract for that external receipt: `DECISION_RENDER_RECEIPT_V1.schema.json`; normative behavior: `DECISION_RENDER_RECEIPT_V1_CONTRACT.md`.

## Hash and canonicalization

`recordHash = sha256(JCS-compatible canonical JSON with recordHash omitted)`. `finalization` is part of the hash-bearing payload; the record is hashed only after the named validator has completed. Presentation locale and localized render text are absent.

Method input/output, criteria, candidate cohort, model projection and pre-finalization decision artifacts have separate hashes. Later render manifests/artifacts are intentionally absent and are bound by external receipts. `lineage.inputGraphHash` and `lineage.outputGraphHash` bind the decision reference graph. A semantic validator must reject missing, duplicate, cyclic, hash-mismatched or cross-project references.

## Persistence boundary

The current public-demo candidate may hold DecisionRecords in bounded browser/session storage. Protected persistence requires a separate approved contract/migration with:

- immutable record and snapshot rows or immutable object artifacts;
- exact organization/project scope;
- request-scoped permanent non-anonymous identity;
- capability checks and RLS personas;
- minimal RPC/API projections;
- retention, deletion, audit and Storage policy;
- idempotency and optimistic concurrency;
- no service-role credential in browser/user authorization paths.

This document does not authorize that activation.

## Semantic validation beyond JSON Schema

The DecisionRecord validator must prove:

1. all scenario/registry/snapshot/subject/fact/method/template/artifact references resolve and hashes match;
2. parent chain is acyclic and project scope does not change;
3. method inputs belong to declared snapshots and outputs are unique;
4. claims/metrics follow evidence-class requirements and claim caps;
5. candidate ranking exists only with a passing, comparable cohort and enabled registry ranking policy;
6. ranking contributions reconcile exactly to recorded scores/order and weights;
7. generated alternatives reference source context, programme/geometry artifacts, assumptions and validation tasks;
8. render policy templates have `recomputationAllowed=false`; no manifest, rendered-artifact or render-receipt hash exists in the parent record;
9. a `report`, `dashboard` or `project` render requires a non-blocked matching operation gate and an external DecisionRenderReceipt bound to the already-final record; the child carries a field-identical copy of that gate and cannot relabel its status;
10. refreshed context uses new snapshots and a successor record;
11. locale does not change truth/hash-bearing values;
12. mandatory caveat-policy ID and validation state are present; localized caveat text is rendered only in a child receipt/artifact;
13. exactly eighteen unique operation gates exist and agree with Scenario Registry policies, snapshot gaps, rights scopes and validation tasks;
14. every positive rights evaluation resolves to an exact rights receipt/scope hash and replays the persisted operation/channel/delivery/territory/time tuple as unconditionally permitted; unknown, missing or conditional scope fails closed for every affected operation, including model input, ranking and export.

## Current checker boundary

`scripts/point-to-object-v6-contract-check.mjs` is a focused contract checker, not evidence that all of G2 is complete. It currently proves strict Ajv 2020-12 compilation, deterministic top-level/entry/evaluation hashes, selected registry/snapshot/subject/method/template cross-references, tuple-scoped rights replay, operation-policy monotonicity, locale-neutral DecisionRecord shape and acyclic parent/render binding. Full G2 still requires production TypeScript parsers plus exhaustive parent-graph/cycle, fact graph, cohort, contribution reconciliation, template-output, render-manifest allowlist and artifact-byte verification suites.

## Non-authorizations

This contract is not an approval of a ranking formula, generated design, source, protected persistence path, report distribution status, merge or Production release.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
