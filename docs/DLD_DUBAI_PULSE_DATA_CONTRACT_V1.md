# DLD / Dubai Pulse Data Contract v1

## Purpose

Define the source, custody, normalization, feature and Product projection contract for DLD / Dubai Pulse real-estate data. This contract is fail-closed: catalogue discovery does not authorize acquisition, and acquisition does not authorize scoring.

## Authority chain

```text
Dataset catalogue
→ rights and access receipt
→ approved private acquisition
→ immutable source release
→ schema and quality quarantine
→ restricted normalized facts
→ approved aggregate feature mart
→ scenario model version
→ bounded Product DTO
→ evidence and report lineage
```

Every output must retain the source release, method version, observation period, freshness, quality and caveat.

## Source-state vocabulary

| Dimension | Allowed states |
| --- | --- |
| Access | `permission_required`, `catalog_reconciliation_required`, `granted_or_public_download_verified` |
| Rights | `review_required`, `review_required_personal_information_flag_observed`, `commercial_use_prohibited_without_separate_written_permission`, `permitted`, `restricted` |
| Custody | `none`, `approved_private` |
| Quality | `not_acquired`, `quarantined`, `accepted`, `rejected` |
| Scoring | `blocked`, `blocked_*`, `approved_aggregate_only` |
| Release | `quarantined`, `sealed`, `revoked` |

`approved_aggregate_only` is valid only when rights, access, custody, quality and release gates are all satisfied.

## Dataset-family contract

| Family | Restricted normalized use | Eligible curated projection | Explicit exclusions |
| --- | --- | --- | --- |
| Transactions | typed transaction facts | area/month activity, liquidity, value-per-area, primary/secondary mix | person-level or title/ownership conclusions |
| Rent contracts | typed contract facts in private custody | area/month contracts, annual rent, renewal mix, rent-per-area | tenant identity, contract-level public exposure |
| Projects | project identity/status facts | project and area supply snapshots | guaranteed delivery/completion claims |
| Valuations | valuation-event context | area/month valuation context | certified GeoAI valuation |
| Land | restricted registry context | area/property-type/freehold aggregates | official parcel geometry or ownership verification |
| Buildings | restricted building facts | area building-stock and morphology aggregates | official building approval/status conclusions |
| Units | restricted unit facts | area unit-stock/type/usage aggregates | unit ownership or public row-level exposure |
| Brokers / developers / offices | registration facts | counts, concentration and license-status aggregates | phone, fax, email, webpage or personal contact fields |
| Indices | index observations only after dataset-specific rights approval | no commercial projection unless separately authorized in writing | pricing, investment decision-making, performance measurement or recommendation without separate DLD permission |
| Lookups | controlled dimensions | keys and bilingual labels | unsupported geometry joins |
| Licenses / permits | restricted licensing facts | area/time activity aggregates | legal compliance conclusion |

## Raw custody contract

Raw files must be stored as immutable private objects. Required metadata:

```text
source_id
dataset_id
source_release_id
source_uri_hash
file_name
media_type
byte_size
content_sha256
source_updated_at
retrieved_at
rights_receipt_ref
schema_fingerprint
record_count
storage_bucket
storage_object_path
release_status
```

The Product API must never return `storage_bucket`, `storage_object_path`, credentials or unrestricted raw rows.

## Rights receipt contract

```json
{
  "datasetId": "dld_transactions-open",
  "status": "approved",
  "approvedAt": "ISO-8601 timestamp",
  "approvedBy": "accountable reviewer",
  "termsReference": "document or ticket reference",
  "permittedUses": [
    "persist_private_raw",
    "transform",
    "internal_scoring_aggregate"
  ],
  "accessMethod": "official download or approved API",
  "attribution": "required attribution",
  "redistributionAllowed": false,
  "expiryAt": null
}
```

A rights receipt must not be self-approved by an ingestion script. The template remains `pending` until external/legal evidence exists.

## Restricted normalized model

The proposed schema is documented in `docs/sql/DLD_SCORING_FOUNDATION_V1_REVIEW_ONLY.sql`. It is review-only and intentionally contains a hard execution guard.

Design principles:

- every row references an immutable source release;
- source-native keys are preserved as text where semantics are uncertain;
- row hashes support deterministic replay and deduplication;
- dates, amounts and areas are typed;
- high-volume temporal facts are partitioned by year;
- no direct grants to `public`, `anon`, `authenticated` or `service_role`;
- RLS remains enabled with no Product policy until a separate security review;
- contact and person-identifying fields are excluded from curated projections.

## Curated feature marts

### `dld_area_market_monthly`

Minimum fields:

```text
area_id
observation_month
sale_count
mortgage_count
other_transaction_count
total_transaction_value_aed
median_value_per_sqm_aed
liquidity_index
primary_market_share
source_release_ids[]
method_version
freshness_status
quality_status
confidence
caveat
```

### `dld_area_rent_monthly`

```text
area_id
observation_month
contract_count
new_contract_count
renewal_contract_count
median_annual_rent_aed
median_rent_per_sqm_aed
rental_demand_index
source_release_ids[]
method_version
freshness_status
quality_status
confidence
caveat
```

### `dld_project_supply_snapshot`

```text
project_id
area_id
snapshot_date
project_status
completion_ratio_context
registered_unit_context
supply_pipeline_index
source_release_ids[]
method_version
quality_status
confidence
caveat
```

### `dld_area_property_stock_snapshot`

```text
area_id
snapshot_date
land_count
building_count
unit_count
freehold_share
property_type_mix
unit_type_mix
source_release_ids[]
method_version
quality_status
confidence
caveat
```

### `dld_residential_sale_index_series`

> **Permission-only design:** the official DLD RPPI disclaimer prohibits commercial use, including pricing, investment decision-making and performance measurement. This mart is a future schema placeholder and must remain empty and inaccessible unless DLD grants separate written permission covering the intended GeoAI use.

```text
observation_period
period_type
all_property_index
villa_index
unit_index
source_release_id
method_version
quality_status
confidence
caveat
```

## Confidence and freshness

Confidence is computed separately from opportunity/risk. A source quality modifier must consider:

- access and rights certainty;
- release age versus expected cadence;
- coverage and missingness;
- lookup integrity;
- duplicate and revision rates;
- agreement across transaction, rent, project and index signals;
- source schema drift;
- area-mapping confidence.

A stale or quarantined release cannot update current scoring.

## Product DTO boundary

A Product-safe DLD signal requires:

```text
signal_id
scenario_id
area_or_candidate_ref
label
value
unit
normalized_value
polarity
observation_period
source_release_refs[]
method_version
freshness
confidence
confidence_reason
caveat
validation_requirement_refs[]
```

No raw contract, contact, person, title or storage fields are permitted.

## Area reconciliation

DLD area identifiers and municipality numbers are dimensions, not geometry. Any spatial join to GeoAI AOIs must record:

- source area ID and bilingual name;
- municipality number when present;
- target geometry source and version;
- mapping method and reviewer;
- ambiguity status;
- confidence;
- effective period.

A name match alone cannot create an official parcel or administrative geometry claim.

## Scoring use

DLD features may support market and development context only. They cannot independently resolve:

- zoning or planning permission;
- ownership or title status;
- cadastral boundaries;
- utilities or engineering feasibility;
- flood/climate certification;
- approved best use;
- certified valuation.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
