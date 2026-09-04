# GeoContextSnapshot V1 Contract

Status: Candidate implementation contract; not runtime-active

Date: 2026-09-04

Owner: GeoAI Data and Product Architecture

Authority: Contract design for the POINT_TO_OBJECT_001 V6 candidate. It does not activate a source, persistence, protected data handling or Production behavior.

Successor: None. Schema identifier: `urn:geoai:geo-context-snapshot:1.0.0`.

Machine contract: `GEO_CONTEXT_SNAPSHOT_V1.schema.json`.

## Purpose

`GeoContextSnapshot` is the immutable, content-addressed, locale-independent truth record for exactly one point, mapped object, site or AOI at a defined time and coverage. A rights-cleared projection of it is the only context input allowed for V6 Analyse, shortlist promotion, ranking, comparison, Create evaluation, dashboard and report generation.

It separates four classes that must never be collapsed:

| Class | Meaning | Minimum lineage |
| --- | --- | --- |
| `observed` | Value explicitly returned by a named source or supplied by a named client/user source | At least one source receipt; no inference presented as observation |
| `calculated` | Deterministic result calculated from immutable input facts | At least one input fact plus versioned deterministic method and calculation receipt |
| `modelled` | Output of a statistical, optimization, simulation or generative model | Input facts, versioned method and model receipt; confidence is capped unless independently validated |
| `hypothesis` | Decision proposition to test, not a fact | Input facts, assumptions, explicit validation requirement and proof limit |

V5 `derived` values migrate to `calculated` only when the transformation is deterministic and reproducible. LLM text, generated massing and inferred district/use implications are `modelled` or `hypothesis`, never `observed`.

## Required top-level fields

| Field | Contract |
| --- | --- |
| `schemaId`, `schemaVersion` | Exact schema identity and `1.0.0` version. |
| `snapshotId`, `snapshotHash` | Immutable identifier and SHA-256 content hash. |
| `status` | `complete`, `partial` or `blocked`; `complete` is a contract state, not an official-data claim. |
| `subject` | One point/object/site/AOI identity, geometry reference/hash, CRS and resolution status. |
| `scope` | Market, context profile ID/version, requested spatial window and time basis. Presentation locale is deliberately absent. |
| `capturedAt` | Time the normalized snapshot was assembled. It does not substitute for source-observed time. |
| `sourceReceipts` | Source, acquisition, versioned rights scope, authority, coverage, freshness and lineage receipts. |
| `facts` | Typed observed/calculated/modelled/hypothesis records. |
| `sections` | Exactly one status/index entry for each canonical context dimension. |
| `conflicts`, `gaps` | Explicit source conflicts and missing/insufficient context. |
| `quality` | Aggregate coverage/freshness/confidence/gap summary and snapshot gate. |
| `lineage` | Parent snapshots, assembler/canonicalization versions and input/graph hashes. |
| `governance` | Claim policy, privacy class, validation state and mandatory caveat. |

## Canonical context dimensions

Every snapshot carries exactly these eleven section keys, including `unavailable` or `not_requested` sections:

1. `identity_geometry`
2. `built_environment`
3. `land_use`
4. `mobility_accessibility`
5. `infrastructure_poi`
6. `open_space_public_realm`
7. `terrain_environment`
8. `climate`
9. `satellite_change`
10. `market_socioeconomic`
11. `risks_constraints`

This fixed index allows scenarios to request a subset without silently omitting the rest.

## Subject and geometry rules

- `subject.subjectType` is `point`, `object`, `site` or `aoi`.
- Geometry is referenced by `geometryId` and `geometryHash`; the snapshot does not need to duplicate a large geometry payload.
- CRS is `EPSG:4326` and coordinate order is `[longitude, latitude]` at this boundary.
- `resolutionStatus` is `resolved`, `ambiguous`, `coordinate_context_only`, `no_result` or `outside_coverage`.
- `object` and `site` with `resolved` status require a source identity. `ambiguous` identity cannot be silently promoted to resolved.
- `subject` has no presentation name. Source-observed names are facts such as `identity.name`, `identity.name.en` or `identity.name.ar`; changing a source fact changes the snapshot hash.
- Acquisition and normalization must not vary their truth projection by the UI locale: all allowlisted name variants returned by the source are retained as separately keyed observed facts, then the renderer chooses presentation language outside the snapshot.
- A source polygon is not called a parcel/cadastral boundary unless a separately validated source and claim policy permit that wording. V1's default authority boundary does not.

## Source receipt rules

Each source receipt records:

- stable `sourceReceiptId`, `sourceId`, provider and source kind;
- `authorityStatus`: open context, named-authority publication not validated by GeoAI, client assertion, commercial-provider output not validated by GeoAI, or synthetic non-evidence;
- a required `rightsScope` receipt with its own stable ID and semantic version;
- licence ID/URL and exact attribution text;
- usage-policy ID/URL, capture time and evidence hash;
- a complete, mutually exclusive partition of every operation, channel and delivery mode into `permitted`, `unknown` or `prohibited`;
- territory (`global`, named ISO alpha-2 countries or `unknown`), commercial-use, redistribution, derivative-work and share-alike terms;
- expiry, next-review and review status plus immutable evidence references;
- requested/retrieved/source-observed timestamps separately;
- acquisition method/version and minimized payload hash;
- coverage receipt with query/extent geometry, spatial and temporal status, counts, caps and proof limit;
- freshness receipt with policy, age and `current`/`aging`/`stale`/`unknown`/`not_applicable` state;
- lineage hash and limitations.

The exact operation vocabulary is:

`resolve`, `acquire`, `normalize`, `calculate`, `analyse`, `find`, `shortlist`, `compare`, `rank`, `create`, `generate`, `evaluate`, `model_input`, `dashboard`, `report`, `project`, `export`, `persist`.

Channels are `internal_operator`, `authenticated_user`, `public_preview`, `client_shared`, `third_party_model`, `machine_api`, `mcp_tool`. Delivery modes are `interactive_display`, `server_to_server`, `download`, `email`, `embedded_report`, `project_storage`, `model_prompt`.

The rights validator must reject duplicate or omitted vocabulary entries across the three permission buckets. An operation proceeds only when the named operation, actual channel, actual delivery mode and territory are all explicitly `permitted`, the review is current, and licence/policy evidence is complete and was captured no later than the evaluation time. Future-dated evidence cannot authorize an earlier evaluation. `unknown`, omitted, expired, due, restricted or prohibited scope fails closed. `permitted_with_conditions` also fails closed until a later contract explicitly represents each obligation and carries validated satisfaction evidence; V1 intentionally has no such receipt. In particular, affected `model_input`, `rank` and `export` operations are blocked; downstream facts and gaps remain visible only through independently permitted channels. `export` additionally requires unconditionally permitted redistribution, while `model_input` and `generate` require unconditionally permitted derivative use and no unsatisfied share-alike obligation. Presence of a receipt does not prove completeness, authority or reusable rights.

## Fact graph rules

Every fact has a stable ID/key, section, class, value state, value/unit, lineage references, confidence, proof limit and validation flag.

Normative semantic rules beyond JSON Schema:

1. `observed` requires at least one `sourceReceiptId`, zero `inputFactIds`, `method=null` and `modelReceipt=null`.
2. `calculated` requires input facts, a deterministic method and no model receipt.
3. `modelled` requires input facts, a non-deterministic/model method and a model receipt.
4. `hypothesis` requires input facts, assumptions, `validationRequired=true` and an explicit proof limit. An LLM-authored hypothesis also requires a model receipt.
5. Every referenced source/fact/method/model ID exists in the same snapshot or its declared parent lineage; cycles are rejected.
6. A fact with `valueState != known` has `value=null` and cannot contribute to a score.
7. `not_observed` means only “not returned inside the measured snapshot/query.” It is not evidence of real-world absence unless coverage explicitly supports that conclusion.
8. `high` confidence is prohibited for unvalidated `modelled` and `hypothesis` facts. Confidence is a bounded reasoning label, not a probability.
9. Conflicting source values remain separate facts connected by a `conflict` receipt; the assembler cannot silently choose one.
10. Facts from stale, unknown-coverage or capped sources inherit a confidence/claim cap set by the scenario policy.

## Coverage, freshness and confidence

These dimensions are independent:

- coverage answers what geography/time/population the query actually measured;
- freshness answers when the source represents and when it was retrieved;
- confidence answers how strongly a specific normalized value is supported within those limits.

A recent response with incomplete mapped coverage is not complete. A complete historical snapshot is not current. A deterministic calculation cannot exceed the weakest material input's evidence boundary merely because its formula is exact.

## Conflicts and gaps

`conflicts` records competing facts and their decision impact. `gaps` records missing, unknown-coverage, unavailable, stale, conflicting, rights-blocked, not-calculable or not-requested requirements. Each gap states:

- affected section and optional required fact key;
- decision impact (`informational`, `material`, `blocking`);
- affected operations/methods;
- remediation action and requested validation source;
- whether the gap blocks ranking, generation/evaluation, report sharing or another gated operation.

An operation is blocked if any `blocking` gap targets it or any contributing source lacks explicit rights for that operation/channel/delivery/territory tuple. `quality.operationGates` contains exactly one gate for every operation in the shared vocabulary. Every non-blocked data-bearing gate persists an immutable positive `rightsEvaluation` with operation, channel, delivery mode, ISO territory, evaluation time, rights receipt ID, exact rights-scope hash, evaluator ID/version and its own hash. The evaluation must occur no later than `capturedAt`; later decisions require a successor snapshot. Altering the tuple, scope or evaluation invalidates that receipt; the set of gate rights IDs must equal the set evidenced by evaluations. The UI may still present factual context that passed its own independent gate.

## Hash and immutability profile

1. The hash-bearing truth payload is the complete schema-valid `GeoContextSnapshot`; it contains neither presentation locale nor a localized subject display label.
2. Serialize that payload using RFC 8785 JSON Canonicalization Scheme-compatible ordering and number/string encoding.
3. Calculate `snapshotHash = sha256(canonicalJSON(snapshot with only the top-level snapshotHash field omitted))`. No other field or envelope is excluded.
4. `snapshotId` is stable and opaque; it is not the hash and must not be reused for changed content.
5. Geometry and minimized provider payloads are separately hash-addressed.
6. A refresh or corrected fact creates a new snapshot with `parentSnapshotRefs`; the prior snapshot is not mutated.
7. `sourceObservedAt=null` and freshness `unknown` remain explicit; do not substitute retrieval time.
8. A consumer passes presentation locale outside the snapshot to a template/renderer. Switching that locale may create a different `DecisionRenderReceipt`, but it reuses the exact same snapshot and DecisionRecord hashes. A genuinely different source-observed name is truth and therefore changes the snapshot hash.

## Minimum construction pipeline

`resolve subject -> acquire/minimize -> normalize source and rights-scope receipts -> build observed facts -> calculate deterministic facts -> apply operation/rights gate before any model input -> run optional models -> index sections -> detect conflicts/gaps -> apply quality/claim gates -> canonicalize/hash -> apply persist/delivery gate -> persist or return`

Provider responses must not flow directly to UI, ranking or model prompts. Prompts receive only an allowlisted, rights-cleared projection of facts, gaps and proof limits plus the snapshot hash.

## Mapping from the current candidate

| Current asset | V1 mapping |
| --- | --- |
| `LiveMapSelection` / resolved object | `subject` plus observed identity/geometry facts |
| `PointObjectGeoContext` | calculated/observed facts indexed across built environment, mobility, POI and land-use sections |
| Find source/coverage block | source receipt plus shallow discovery facts; not a ranking snapshot by itself |
| `GroundedClaim` / AI signals | modelled facts or hypotheses referencing snapshot facts; not replacements for source facts |
| Area context summary | AOI subject plus observed object facts and calculated aggregate facts |
| Create programme/massing | modelled alternative facts plus calculated geometry metrics, stored through DecisionRecord artifacts |
| Existing evidence bundle anchors | source, geometry, fact and parent lineage hashes |

## Validation suite required before runtime use

- JSON Schema compilation and positive/negative fixtures;
- canonical hash determinism and one-byte tamper rejection;
- source/fact/section cross-reference and acyclic graph validation;
- exactly eleven unique section keys;
- evidence-class conditional rules;
- rights-scope partition, licence/policy evidence, operation/channel/delivery/territory and fail-closed tests;
- zero-result/absence adversarial tests;
- conflict preservation tests;
- unknown/stale source and blocked-operation tests;
- locale and display-label rejection from truth payload plus external-presentation locale-invariance test;
- current V5.1 evidence-pack adapter parity fixtures.

## Non-authorizations

This contract does not make current OpenStreetMap, Photon, Nominatim, Overpass, market, climate or imagery data complete or authoritative. It does not authorize hosted persistence, source activation, protected information, Supabase changes, merge or Production deployment.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
