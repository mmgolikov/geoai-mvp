# GeoContextSnapshot V1 Contract

Status: Candidate implementation contract; not runtime-active

Date: 2026-09-04

Owner: GeoAI Data and Product Architecture

Authority: Contract design for the POINT_TO_OBJECT_001 V6 candidate. It does not activate a source, persistence, protected data handling or Production behavior.

Successor: None. Schema identifier: `urn:geoai:geo-context-snapshot:1.0.0`.

Machine contract: `GEO_CONTEXT_SNAPSHOT_V1.schema.json`.

## Purpose

`GeoContextSnapshot` is the immutable, content-addressed context record for exactly one point, mapped object, site or AOI at a defined time and coverage. It is the only context input allowed for V6 Analyse, shortlist promotion, ranking, comparison, Create evaluation, dashboard and report generation.

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
| `scope` | Market/locale, context profile ID/version, requested spatial window and time basis. |
| `capturedAt` | Time the normalized snapshot was assembled. It does not substitute for source-observed time. |
| `sourceReceipts` | Source, acquisition, rights, authority, coverage, freshness and lineage receipts. |
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
- A source polygon is not called a parcel/cadastral boundary unless a separately validated source and claim policy permit that wording. V1's default authority boundary does not.

## Source receipt rules

Each source receipt records:

- stable `sourceReceiptId`, `sourceId`, provider and source kind;
- `authorityStatus`: open context, named-authority publication not validated by GeoAI, client assertion, commercial-provider output not validated by GeoAI, or synthetic non-evidence;
- `rightsStatus`: `cleared_for_scope`, `restricted`, `unknown` or `blocked`;
- requested/retrieved/source-observed timestamps separately;
- acquisition method/version and minimized payload hash;
- coverage receipt with query/extent geometry, spatial and temporal status, counts, caps and proof limit;
- freshness receipt with policy, age and `current`/`aging`/`stale`/`unknown`/`not_applicable` state;
- lineage hash and limitations.

`rightsStatus=unknown|blocked` cannot support a rendered, ranked, model-input or exported fact. Presence of a source receipt does not prove completeness, authority or reusable rights.

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
- affected modes/methods;
- remediation action and requested validation source;
- whether the gap blocks ranking, generation/evaluation, report sharing or another gated operation.

An operation is blocked if any `blocking` gap targets it. The UI may still present factual context that passed its own gate.

## Hash and immutability profile

1. Serialize JSON using RFC 8785 JSON Canonicalization Scheme-compatible ordering and number/string encoding.
2. Calculate `snapshotHash = sha256(canonicalJSON(snapshot with snapshotHash omitted))`.
3. `snapshotId` is stable and opaque; it is not the hash and must not be reused for changed content.
4. Geometry and minimized provider payloads are separately hash-addressed.
5. A refresh or corrected fact creates a new snapshot with `parentSnapshotRefs`; the prior snapshot is not mutated.
6. `sourceObservedAt=null` and freshness `unknown` remain explicit; do not substitute retrieval time.
7. Locale changes presentation only and cannot alter facts, methods or hashes. Localized labels belong in templates/registry, not duplicated fact truth.

## Minimum construction pipeline

`resolve subject -> acquire/minimize -> normalize source receipts -> build observed facts -> calculate deterministic facts -> run optional models -> index sections -> detect conflicts/gaps -> apply quality/claim gates -> canonicalize/hash -> persist or return`

Provider responses must not flow directly to UI, ranking or model prompts. Prompts receive only an allowlisted projection of facts, gaps and proof limits plus the snapshot hash.

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
- rights, coverage, freshness and confidence cap tests;
- zero-result/absence adversarial tests;
- conflict preservation tests;
- unknown/stale source and blocked-operation tests;
- locale-invariance test;
- current V5.1 evidence-pack adapter parity fixtures.

## Non-authorizations

This contract does not make current OpenStreetMap, Photon, Nominatim, Overpass, market, climate or imagery data complete or authoritative. It does not authorize hosted persistence, source activation, protected information, Supabase changes, merge or Production deployment.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
