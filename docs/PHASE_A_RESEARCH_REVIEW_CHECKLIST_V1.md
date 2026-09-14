# Phase A Research Review Checklist v1

## Review objective

Determine whether GeoAI may proceed from research to the B1 spatial foundation implementation without creating uncontrolled source, licence, geometry, identity, Product or release risk.

## Source and licensing

- [ ] OSM/Geofabrik source file and intended use are approved.
- [ ] ODbL attribution and adapted-database handling have an owner and release rule.
- [ ] Overture themes and exact release are selected.
- [ ] Overture source-level attribution generation is part of B1.
- [ ] Open-Meteo is excluded from commercial runtime until commercial-use status is approved.
- [ ] NASA POWER remains metric research until exact citation/terms are approved.
- [ ] DLD/Dubai Pulse are not included in B1.
- [ ] Municipality/GeoDubai remains inactive.
- [ ] No protected commercial map geometry is used.

## AOI and geometry

- [ ] Master processing envelope is accepted as non-official.
- [ ] Marina/JBR, Business Bay and Dubai South focus AOIs are approved.
- [ ] EPSG:32640 metric operations and EPSG:4326 output are accepted.
- [ ] Topology repair and simplification thresholds are accepted.
- [ ] Selected AOIs are based on real footprints/blocks and use AOI terminology.
- [ ] Large building-layer performance/storage strategy is decided.

## Data architecture

- [ ] Spatial Dataset Envelope v1 is accepted.
- [ ] Snapshot Manifest v1 is accepted.
- [ ] Stable feature-key format and governance are accepted.
- [ ] Provider IDs remain aliases.
- [ ] Geometry/metric separation is accepted.
- [ ] Dataset precedence and eligibility resolver are accepted.
- [ ] Saved reports pin dataset version and geometry checksum.

## Product and design

- [ ] Required open/derived/user/client/official labels are accepted.
- [ ] Map attribution and lineage disclosure are accepted.
- [ ] Synthetic fallback remains visible and honest.
- [ ] Initial migrated layer set is approved.
- [ ] Environmental derived layers remain out of B1/B2.
- [ ] No redesign or Figma dependency is required for B1.
- [ ] B2 source/freshness labels fit the existing light enterprise UI.

## Engineering and release

- [ ] Two-PR B1/B2 delivery is approved.
- [ ] B1 starts from the then-current approved `main`.
- [ ] PR #63 has a separate decision and is not silently bundled.
- [ ] Static/release-artifact/object-storage policy is decided.
- [ ] B1 is read-only and does not configure Production data sources.
- [ ] B2 remains draft until browser/performance/report evidence passes.
- [ ] Permanent Quality Gate remains mandatory.
- [ ] No Production deployment occurs without separate approval.

## Approval result

| Outcome | Meaning |
| --- | --- |
| Approved | B1 implementation prompt may be issued from the then-current approved `main`. |
| Approved with conditions | Listed conditions become hard acceptance criteria in the B1 Change Request. |
| Research revision required | Phase A documents are corrected before implementation. |
| Rejected | No Product implementation begins. |

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**