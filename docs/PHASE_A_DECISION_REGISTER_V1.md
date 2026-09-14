# Phase A Decision Register v1

## Purpose

Record the decisions required before GeoAI begins the Product implementation of realistic open-context demo geometry.

## Decisions established by research

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| SP-DEC-001 | Product components consume a normalized GeoAI spatial envelope, never raw provider schemas. | Recommended | Allows OSM, Overture, customer, licensed and official sources to use one Product contract. |
| SP-DEC-002 | Geometry and time-dependent metric observations are separate entities. | Recommended | Prevents current market/climate values from becoming timeless polygon properties. |
| SP-DEC-003 | Stable GeoAI feature keys survive controlled source refreshes; provider IDs are aliases. | Recommended | Preserves saved analyses, comparisons and reports across source replacement. |
| SP-DEC-004 | Every dataset is immutable and versioned with source release, snapshot/access dates, checksum, attribution and lineage. | Recommended | Enables reproducibility, rollback and honest freshness claims. |
| SP-DEC-005 | Synthetic geometry remains a per-layer fallback during migration. | Recommended | Provides rollback without reverting Product component architecture. |
| SP-DEC-006 | Open and derived geometry is never labelled official without provider/scope/date/review evidence. | Mandatory | Enforces GeoAI data-honesty rules. |
| SP-DEC-007 | Phase B uses two draft PRs: B1 foundation/snapshot, then B2 Product integration. | Founder approval required | Keeps source/contract risk separate from visual/runtime integration risk. |
| SP-DEC-008 | Environmental and development derived layers are excluded from Phase B. | Recommended | They need methodology, sensitivity and separate QA before Product activation. |
| SP-DEC-009 | DLD/Dubai Pulse remain manual/public validation paths until dataset-level rights are verified. | Mandatory | Public download availability is not sufficient proof of automated or redistribution rights. |
| SP-DEC-010 | Dubai Municipality/GeoDubai remains an inactive future official adapter. | Mandatory | No authorized Product endpoint, schema, scope and licence are currently verified. |

## Founder decisions required

### FD-01 — Delivery split

Approve one of:

- **Option A — recommended:** B1 contract/builder/snapshot, then B2 Product integration.
- Option B: one combined Product PR after a separate snapshot-only artifact review.
- Option C: continue research only.

Recommendation: Option A.

### FD-02 — Source combination

Approve Phase B candidate strategy:

- OSM/Geofabrik for transport, land-use, construction, water/coastline and selected POI context;
- Overture for complementary buildings, places, divisions and transportation;
- source precedence and duplicate resolution documented in the build.

Recommendation: approve subject to final ODbL/Overture attribution review.

### FD-03 — Spatial asset storage

Choose:

- Commit small normalized clipped GeoJSON snapshots to the public repository.
- Publish normalized snapshots as GitHub release artifacts.
- Store snapshots in approved object storage later, while committing only manifests and small fixtures.

Recommendation:

- B1 research fixtures and small selected-AOI outputs may be committed after licence/size review.
- Large building datasets should use release artifacts or approved storage/vector tiles, not one large repository JSON.

### FD-04 — Phase B visible layer set

Recommended initial visible migration:

1. Open transport context.
2. Open spatial anchors.
3. Sample AOIs on real-world geometry.
4. Focus-AOI building/land-use context, zoom-gated.
5. Open construction monitoring targets.

Do not activate community/context boundaries until reviewed for plausibility and naming.

### FD-05 — Focus AOIs

Recommended mandatory Phase B evidence areas:

- Dubai Marina/JBR/Palm;
- Downtown/Business Bay/Meydan;
- Dubai South/Jebel Ali.

Optional fourth area:

- Creek/DXB.

### FD-06 — Main baseline timing

Phase B1 should branch from the then-current approved `main`. PR #63 remains a separate release decision and must not be automatically included or bypassed.

## Implementation stop gate

No Phase B branch is created until FD-01 through FD-06 have explicit founder decisions or are carried as approved assumptions in a new implementation Change Request.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**