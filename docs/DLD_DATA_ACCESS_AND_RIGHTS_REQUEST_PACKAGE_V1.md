# DLD / Data Dubai Access and Rights Request Package v1

## Purpose

Provide a ready-to-submit request for lawful, controlled access to Dubai Land Department datasets for GeoAI internal research, pilot development and privacy-minimized aggregate spatial decision intelligence.

This document is a request package only. It does not establish access or usage rights.

## Requesting initiative

**Initiative:** GeoAI  
**Product category:** B2B/B2G spatial decision intelligence for real estate, development, construction monitoring and spatial assets  
**Initial geography:** Dubai / Abu Dhabi, with Dubai real-estate and development intelligence as the first commercial focus  
**Requested environment:** controlled development and approved pilot environments; no public raw-data redistribution

## Intended use

GeoAI intends to use DLD / Data Dubai datasets to create source-backed, explainable and privacy-minimized market-context indicators for:

- development site screening;
- candidate area and project comparison;
- market activity and liquidity context;
- transaction-derived price context;
- Residential Sale Index context only if DLD grants separate written commercial-use permission;
- rental demand and rent trend context;
- project pipeline and supply context;
- property-stock mix and development context;
- portfolio and construction-monitoring dashboards;
- source lineage, confidence and freshness reporting.

GeoAI will not use the data to represent:

- ownership verification;
- title or cadastral validation;
- official parcel geometry;
- zoning or planning approval;
- certified valuation;
- approved best use;
- legal due diligence;
- guaranteed investment performance.

## Permissions requested

Please confirm whether GeoAI may:

1. download or query the approved datasets through an official CSV/API mechanism;
2. store immutable copies in private, access-controlled object storage;
3. normalize and transform source records in restricted database schemas;
4. create internal derived indicators and aggregate feature marts;
5. use privacy-minimized aggregates in B2B/B2G pilot dashboards and reports;
6. retain historical source snapshots for reproducibility, audit and model lineage;
7. cache API results according to an agreed retention period;
8. refresh data automatically according to the official update cadence;
9. display source attribution, snapshot date, freshness and caveats in GeoAI outputs;
10. use derived aggregate indicators commercially without redistributing raw source records.

## Proposed controls

GeoAI proposes the following controls:

- raw source files remain private and immutable;
- raw transaction, tenancy, contact and person-related records are not exposed through Product APIs;
- broker, developer, office, license and valuator contact fields are excluded from Product projections;
- only approved aggregates are used for scoring;
- every feature retains source release, method version, observation period, freshness and confidence;
- stale, rejected or revoked releases cannot update current scores;
- access is role-controlled and audited;
- credentials are stored only in an approved secret manager;
- no CAPTCHA, WAF or technical-control circumvention;
- no raw-data resale or public redistribution;
- deletion, retention and revocation requests are supported;
- all GeoAI outputs display the mandatory screening caveat.

## Requested datasets

### Separate permission-only request — Residential Sale Index

The official DLD RPPI page states that the index should not be used for commercial purposes, including pricing, investment decision-making or performance measurement. GeoAI will not acquire, transform, score from or display this index to commercial users unless DLD provides separate written permission that expressly covers the proposed use. The request below seeks that exception/authorization; absence of a written approval means the dataset remains excluded.

| Dataset | Requested access | Intended use |
| --- | --- | --- |
| Residential Sale Index | Written commercial-use permission first; CSV/API only after approval | versioned trend context with source lineage; no pricing, investment or performance use absent explicit approval |

### Wave 1 — low-volume lookup-only schema and governance rehearsal

| Dataset | Requested access | Intended use |
| --- | --- | --- |
| Area lookup | CSV and/or API | bilingual source-area dimension and controlled mapping |
| Market types lookup | CSV and/or API | primary/secondary market classification |
| Transaction groups lookup | CSV and/or API | sale/mortgage/gift/other classification |
| Transaction procedures lookup | CSV and/or API | procedure-level normalization |

### Wave 2 — market and supply context

| Dataset | Requested access | Intended use |
| --- | --- | --- |
| Projects | CSV and API | project pipeline, status and supply context |
| Valuation | CSV and API | aggregate valuation-event context only |
| Buildings | CSV and API | area-level building-stock context |
| Units | bulk snapshot and API | area-level unit-stock/type/usage aggregates |
| Land Registry | bulk snapshot and API | area/property-type/freehold aggregates; no ownership claim |

### Wave 3 — restricted high-value facts

| Dataset | Requested access | Intended use |
| --- | --- | --- |
| Transactions | bulk snapshot and incremental API | area/month activity, liquidity, value-per-area and market mix |
| Rent Contracts | bulk snapshot and incremental API | area/month contract, renewal, rent and demand aggregates |
| Real Estate Licenses | CSV/API | area/time licensing activity aggregates |
| Real Estate Permits | CSV/API | area/time permit activity context |
| Brokers | CSV/API | active-count and concentration aggregates without contacts |
| Developers | CSV/API | developer/project concentration context without contacts |
| Real Estate Offices | CSV/API | ecosystem-density aggregates without contacts |
| Valuator Licensing | CSV/API | aggregate market-capacity context without contacts |
| Licensed Owner Associations | CSV/API | aggregate managed-building context |
| Map Requests | schema/access clarification first | no use until geometry, privacy and licensing scope is clarified |

## Questions requiring written confirmation

### Rights and licensing

1. Which license applies to each requested dataset where the portal displays `License not specified`?
2. Is commercial internal use permitted for a B2B/B2G analytics product?
3. Are transformation, derived indicators and aggregate scoring permitted?
4. May approved aggregates be displayed to paying pilot clients?
5. Is raw-data redistribution prohibited, and what qualifies as redistribution?
6. What attribution statement and source link are required?
7. Are there restrictions on model training, feature engineering or AI-assisted analysis?
8. Are there jurisdiction or data-residency requirements?

### Privacy and restricted fields

1. Which fields are classified as personal, confidential or restricted?
2. Must those fields be excluded at source, masked, tokenized or deleted after aggregation?
3. Are small-cell suppression or minimum aggregation thresholds required?
4. What retention/deletion rules apply to tenancy, transaction and registered-entity datasets?
5. Is a data-processing agreement required?

### Technical access

1. Can bulk historical CSV snapshots be provided through a stable authenticated endpoint?
2. Can daily incremental API access be granted after the initial snapshot?
3. What API authentication, rate limits, pagination limits and token lifetime apply?
4. Are change-data-capture, modified-since or release/version identifiers available?
5. Is schema-change notification available?
6. Are sandbox/sample datasets available before production access?
7. What is the expected permission-review lead time?
8. Is a service-level or support channel available for pilot integrations?

### Data semantics and quality

1. What fields form stable source-native keys?
2. How are corrections, cancellations and revised records represented?
3. How should duplicate tenancy lines and transaction procedures be reconciled?
4. What are the authoritative units for area and currency fields?
5. How should off-plan/existing and primary/secondary classifications be interpreted?
6. How should project completion/status fields be used and caveated?
7. Are DLD area identifiers stable over time, and is a geometry layer available under separate terms?

## Suggested request text

**Subject:** Request for controlled DLD / Data Dubai dataset access for GeoAI aggregate spatial decision intelligence

Dear Dubai Land Department / Data Dubai Team,

GeoAI is developing a B2B/B2G spatial decision intelligence platform for real-estate development, site screening, asset monitoring and source-backed analytics. We would like to request controlled access to the DLD datasets listed in the attached access package.

Our intended use is to store approved source snapshots privately, normalize them in restricted systems and generate privacy-minimized aggregate indicators such as area-level transaction activity, rental trends and project/supply context. Residential index trends would be used only if DLD separately authorizes the intended commercial use in writing. Raw source records, personal/contact fields, credentials and storage paths would not be exposed through public Product interfaces or redistributed.

We request written clarification of the applicable dataset licenses and permission to use the approved datasets for private persistence, transformation, derived aggregate indicators and internal/commercial pilot scoring. We also request confirmation of attribution, retention, privacy, API-rate, schema-change and data-residency requirements.

GeoAI will display source lineage, snapshot date, freshness, confidence and the following caveat in relevant outputs:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

We propose beginning with the four low-volume lookup datasets as a technical and governance rehearsal before requesting the large Transactions and Rent Contracts datasets. We separately request written clarification/authorization for the Residential Sale Index because the official DLD page restricts commercial use, including pricing and investment decision-making.

Please advise on the appropriate account, permission, API package, agreement and technical onboarding process.

Kind regards,

GeoAI Data / Product Team

## Internal approval record

| Gate | Owner | Status |
| --- | --- | --- |
| Dataset catalogue reconciled | GeoAI Data | In progress |
| DLD/Data Dubai response received | Founder / Partnerships | Pending |
| Reusable rights approved | Founder / Legal / Data Governance | Pending |
| Privacy fields and retention approved | Security / Data Governance | Pending |
| Account/API credentials approved | Founder / Engineering | Pending |
| Private custody and trusted worker approved | Founder / Engineering | Pending |
| Development migration approved | Founder | Pending |
| Feature/scoring activation approved | Founder / Product / Data | Pending |
| Production activation approved | Founder | Pending |

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
