# DecisionRecord V1 Contract

Status: Candidate implementation contract; not runtime-active

Date: 2026-09-04

Owner: GeoAI Product and Decision Architecture

Authority: Contract design for the POINT_TO_OBJECT_001 V6 candidate. It does not authorize persistence, protected data use, ranking, client distribution, merge or Production.

Successor: None. Schema identifier: `urn:geoai:decision-record:1.0.0`.

Machine contract: `DECISION_RECORD_V1.schema.json`.

## Purpose

`DecisionRecord` is the immutable, versioned result of one decision-stage execution. It binds the exact scenario, business question, subjects, criteria, GeoContext snapshots, method executions, outputs, model/provider receipts, validation state and render bindings.

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
7. Dashboard renders the selected DecisionRecord.
8. Report creates a frozen render artifact that references that same record; it does not execute methods.

Refreshing source context creates new GeoContextSnapshot(s) and a successor DecisionRecord with `refreshReason`. Prior records/reports remain reproducible.

## Required envelope

| Field | Contract |
| --- | --- |
| `schemaId`, `schemaVersion` | Exact machine contract and version. |
| `decisionRecordId`, `recordHash`, `status` | Immutable record identity/hash and lifecycle state. |
| `projectRef` | Optional project/tenant reference; `null` for bounded public-demo/browser-local flow. |
| `preferenceContext` | B2B/B2C and product role used to frame the question; explicitly not authorization. |
| `scenarioRef` | Exact registry ID/version/hash, scenario ID/version/hash and business-question ID. |
| `operation` | `analyse`, `find`, `compare`, `create`, `evaluate` or `report`. |
| `createdAt`, `decisionAsOf` | Execution and decision time; source times remain on snapshots. |
| `parentRecordRefs` | Immutable predecessor chain. |
| `inputs` | Subjects, criteria hash, snapshot refs and acquisition/refresh posture. |
| `methodExecutions` | Versioned methods, input/output hashes, status and model/provider receipts. |
| `outputs` | Claims, metrics, candidate set/ranking, alternatives, recommendation and validation tasks. |
| `renderBindings` | Dashboard/report templates and frozen render artifact refs. |
| `lineage` | Canonicalization, input/output graph and artifact hashes. |
| `governance` | Claim cap, validation/privacy/release states and caveat. |

## Input and snapshot rules

- Every subject reference includes subject ID, geometry hash and role (`primary`, `candidate`, `comparison` or `alternative_site`).
- Every context reference includes snapshot ID/hash, subject ID, context profile ID/version and acquisition window.
- Snapshot bytes are not copied into the record. Consumers resolve by exact ID/hash.
- A comparison cohort requires the same context profile/version, metric definitions and compatible acquisition window declared by the Scenario Registry.
- Discovery candidates may exist without full context snapshots, but they cannot be ranked or compared beyond shallow observed attributes.
- `acquisitionPosture=reuse_exact_snapshot` is the default for follow-up/dashboard/report. `refresh_context` requires a reason and successor lineage.

## Method execution rules

Each execution records method ID/version, operation, status, deterministic flag, input fact/snapshot hashes, output hash, start/end time, failure reasons and optional model/provider receipt.

- deterministic methods must reproduce the same output hash from the same canonical inputs and version;
- model methods require provider/model/config or prompt hash, request status, token/cost fields when available, and structured-output validation status;
- model failure cannot overwrite or downgrade source facts; it produces a failed/partial method receipt and explicit gaps;
- dashboard/report renderers are methods only for traceability; `recomputationAllowed=false`.

## Claims and metrics

Decision claims use the same evidence classes as GeoContext:

- `observed` claims quote/normalize snapshot facts;
- `calculated` claims reference deterministic method output and input facts;
- `modelled` claims reference method/model receipts;
- `hypothesis` claims include assumptions and validation tasks.

Every claim and metric references exact snapshot/fact/method IDs. A recommendation references claim/metric/validation IDs and states `continue_screening`, `hold`, `compare_more` or `insufficient_evidence`. It cannot be represented as approval, verified best use or a guaranteed outcome.

## Candidate set and ranking

`outputs.candidateSet` supports factual shortlist/comparison without ranking:

- candidate states: `discovered`, `shortlisted`, `excluded`, `blocked_for_comparison`;
- ordering: `source_identity`, `manual`, `ranked_by_method` or `not_ordered`;
- exclusions and blocked states require reason/gap IDs;
- ranking is nullable.

An included ranking records method/version, cohort hash, ordered items, metric contributions, missing-data treatment, tie handling, sensitivity summary and gate receipt. The gate must be `pass`; otherwise ranking is `null` and a blocking gap is rendered.

No old mock score, seed candidate or UI-calculated value may populate V1.

## Create alternatives

Alternatives contain:

- alternative ID/name and state;
- source subject/snapshot refs;
- programme and geometry artifact hashes;
- `modelled` design/programme facts;
- deterministic calculated area/GFA/coverage/height/open-space metrics;
- assumptions, violations, claim refs and validation task refs;
- generation provider/method receipt.

The original map replacement is a reversible visualization state, not a mutation of observed source geometry. “Show existing”, “Show concept”, reset and mode exit operate on UI state; the source snapshot remains immutable.

## Dashboard, report and Project Hub

- Dashboard consumers bind to one DecisionRecord ID/hash and the record's template ID/version; the hash is carried by the consumer reference, not repeated inside the hashed record.
- Report consumers bind to the same record plus a render manifest/artifact hash; the external report artifact carries the DecisionRecord ID/hash.
- Neither may run acquisition, analysis, ranking or generation.
- Project Hub indexes record/snapshot/report refs and their status; it does not flatten or rewrite their payloads.
- Localization changes labels and narrative presentation only. Numeric values, units, claims, source references and hashes remain invariant.

## Hash and canonicalization

`recordHash = sha256(JCS-compatible canonical JSON with recordHash omitted)`.

Method input/output, criteria, candidate cohort, model projection, report render manifest and artifacts have separate hashes. `lineage.inputGraphHash` and `lineage.outputGraphHash` bind the complete reference graph. A semantic validator must reject missing, duplicate, cyclic, hash-mismatched or cross-project references.

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
8. dashboard/report bindings have `recomputationAllowed=false` and read the same record hash;
9. `report` operations contain no acquisition/ranking/generation execution;
10. refreshed context uses new snapshots and a successor record;
11. locale does not change truth/hash-bearing values;
12. mandatory caveat and validation state are present.

## Non-authorizations

This contract is not an approval of a ranking formula, generated design, source, protected persistence path, report distribution status, merge or Production release.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
