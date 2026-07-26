# CR-DATA-01 — DLD / Dubai Pulse Controlled Ingestion and Scoring Foundation v1

## Document control

| Field | Value |
| --- | --- |
| Status | Draft implementation package / no source activation |
| Owner | GeoAI Data / Engineering / Product Governance |
| Requested | 2026-07-26 |
| Target environment | `geoai-dev` only |
| Production | No change authorized |
| Confluence authority | [CR-DATA-01](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/18841936/CR-DATA-01+DLD+Dubai+Pulse+Controlled+Ingestion+and+Scoring+Foundation+v1) |

## Executive decision

DLD data is a priority source family for the UAE real-estate and development intelligence wedge, but the current public surfaces do not authorize an uncontrolled bulk scrape.

The DLD website provides current-period form-based downloads and uses CAPTCHA. Historical and larger extracts are directed to Dubai Pulse / Data Dubai, where observed resources require permission or API credentials and commonly state `License not specified`. Several high-value files also carry personal-information flags or contact fields.

GeoAI will therefore use a **controlled, fail-closed acquisition path**:

1. catalogue and classify every source family;
2. document reusable persistence, transformation and internal-scoring rights;
3. acquire only through an approved official download or API grant;
4. keep immutable raw files in private custody;
5. normalize restricted facts with release lineage;
6. expose only privacy-minimized aggregates to scoring;
7. activate source-dependent scoring only after independent quality, security and data-honesty approval.

No CAPTCHA bypass, WAF bypass or website-result scraping is permitted.

## Problem

The development database previously described DLD as `manual_import_ready`, but it held zero DLD records and no approved raw custody, normalized tables or scoring features. That status could be misunderstood as an executable or score-ready source.

## Business reason

Rights-cleared DLD snapshots can support:

- area-level transaction activity and liquidity;
- price and index momentum;
- rental demand and rent momentum;
- project pipeline and supply context;
- property-stock and development context;
- valuation context with explicit uncertainty;
- market freshness and evidence confidence.

They cannot, by themselves, establish ownership, cadastral validity, zoning, approved use, legal due diligence or certified valuation.

## Users and affected surfaces

The change supports developers, investors, lenders, asset managers, consultants and government teams using:

- candidate search and comparison;
- AOI / object dashboards;
- Market Context and Development Context;
- source lineage and evidence;
- reports and project data rooms;
- future portfolio and construction-monitoring workflows.

## Source families

The controlled catalogue covers the nine DLD Real Estate Data families and priority supporting datasets:

- transactions;
- rent contracts;
- projects;
- valuations;
- land;
- buildings;
- units;
- brokers;
- developers;
- real-estate offices;
- residential sale index;
- area, market-type, transaction-group and transaction-procedure lookups;
- licenses, permits and valuator licensing;
- selected association and map-request datasets pending authenticated catalogue reconciliation.

The machine-readable authority is `data/external/catalog/dld_dubai_pulse_dataset_catalog.v1.json`.

## Data architecture

### Operator-only raw zone

Approved source files are immutable private objects. Every file requires a source release, SHA-256 checksum, byte size, source timestamp, retrieval timestamp, schema fingerprint, rights receipt and ingestion receipt.

### Restricted normalized zone

Typed facts and dimensions remain unavailable to public Product routes. High-PII/contact fields are not projected to scoring tables.

### Curated feature zone

Only approved area/time/project aggregates are eligible for scoring, for example:

- transaction counts, value-per-area and liquidity;
- rent counts, annual rent and renewal mix;
- project/supply snapshots;
- property-stock mix;
- valuation context;
- residential sale index series;
- source freshness and quality penalties.

### Product projection

Product APIs receive bounded aggregate DTOs with source release IDs, method version, observation period, freshness, confidence, caveat and validation requirements.

## Initial scoring posture

| Signal family | Proposed model contribution | Current status |
| --- | ---: | --- |
| Market activity / liquidity | 8–15% | blocked |
| Price momentum / index context | 5–12% | blocked |
| Rental demand / rent momentum | 5–12% | blocked |
| Project / supply context | 5–10% | blocked |
| Valuation context | 0–8% | context-only after method review |
| Source freshness / confidence | modifier, not opportunity factor | metadata only |

Weights are scenario-level configuration, not a source property. DLD-derived signals must not displace planning, zoning, engineering, climate, access or client/authority validation.

## Implementation package in this branch

- controlled dataset catalogue;
- fail-closed catalogue validator;
- local streaming snapshot profiler and aggregate preparer;
- rights-receipt template;
- automated control test;
- data contract, runbook and QA checklist;
- review-only SQL design with a hard execution guard.

The preparation script deliberately does **not** download data, bypass access controls, persist raw rows to PostgreSQL or enable scoring.

## Current development metadata correction

The existing `geoai-dev` DLD metadata record was corrected to:

- `permission_required`;
- `metadata_only`;
- `rights-review-required`;
- zero records and no imported snapshot;
- source-dependent scoring disabled;
- no evidence-used claim;
- no live DLD claim.

This was a metadata correction only. No schema migration, credential, Production change or source activation was applied.

## Risks

1. dataset-specific commercial reuse rights are not yet documented;
2. downloads and APIs may require account approval and credentials;
3. transaction, rent and unit files are large and require streaming/bulk loading;
4. some datasets expose personal, contract or contact-related fields;
5. source schemas and lookup values may change;
6. DLD areas do not create official GeoAI parcel geometry;
7. scoring may overstate evidence unless confidence penalties are enforced;
8. SOURCE-01 custody and the trusted worker plane are not active in the target environment.

## Acceptance gates

### Gate A — rights and access

- dataset catalogue reconciled with the authenticated Data Dubai catalogue;
- persistence, transformation and internal aggregate-scoring rights recorded;
- attribution and redistribution treatment approved;
- approved official download/API method recorded.

### Gate B — custody and execution

- SOURCE-01 authority approved and applied separately;
- private object storage approved;
- trusted worker identity and secret path approved;
- immutable release/artifact/receipt lifecycle verified;
- no raw source exposed through the public Data API.

### Gate C — normalization and quality

- typed mappings approved;
- clean replay and checksum reconciliation pass;
- row counts, dates, amounts, nulls, duplicates and lookups reconcile;
- PII/contact exclusion is verified;
- rejected or stale releases cannot reach feature marts.

### Gate D — scoring

- aggregate features are reproducible;
- source/method lineage and confidence are complete;
- model weights and regression tests are approved;
- UI/report data-honesty QA passes;
- source-dependent scoring is explicitly enabled in a separate approved change.

### Gate E — release

- Preview verified first;
- Project Hub, Change Log and release note synchronized;
- Production migration, credentials, source activation and deployment receive separate founder approval.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
