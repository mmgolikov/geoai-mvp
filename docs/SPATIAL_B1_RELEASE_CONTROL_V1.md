# Spatial B1 Release Control v1

## Current state

B1 is an implementation and evidence workstream on a separate clean branch from current `main`.

- New open geometry is not active in Product.
- Current synthetic geometry remains the default and rollback source.
- PR #69 remains an unmerged research record.
- Production remains unchanged.
- Machine geometry evidence and independent source-alignment review are separate gates. A successful machine build remains `releaseReady: false` until the visual/source evidence is reviewed.

## Blocking corrective gate

The B1 evidence build must use the seeded Marina, Business Bay and Dubai South coordinates as explicit anchors. It must resolve three distinct canonical GeoAI AOI keys, keep provider IDs in versioned crosswalks, apply target-specific candidate profiles in EPSG:32640, preserve exact OSM object identities, preserve source-level freshness, populate every mandatory geometry-quality field, and fail on identity, geometry, alias, semantic or parity violations.

Machine geometry validity, completed collision audit, business-semantic acceptance, independent source-alignment review and release readiness are separate states. The three selected AOIs were independently reviewed with conditions in Confluence page `8388618`; that status applies only when exact provider IDs and geometry hashes match artifact `8291680044`. Other source features remain pending review. A repaired source geometry is `source_repaired`, not `source_exact`; `releaseReady` remains `false` in B1.

Real geometry remains confined to the short-lived GitHub Actions artifact. `publicRepositoryGeometryApproved` remains `false`; the open bundle is not activated in Product and synthetic fallback remains the default.

## Required gates before B1 merge review

1. Exact source asset and release verification.
2. Licence, attribution and public-distribution disposition.
3. Deterministic snapshot build and checksum evidence.
4. Stable feature identity and alias audit.
5. Topology and geometry-quality audit.
6. Fixture size and browser/performance risk review.
7. No-default-activation proof.
8. Product regression smoke.
9. Permanent Quality Gate.
10. Vercel Preview and runtime log review.
11. Founder approval.

Canonical AOI source precedence is `synthetic_fallback` -> `open_snapshot` -> `licensed` -> client-validated `user_provided` -> `official_validated`. Adding `licensed` to the contract does not activate or configure a licensed source.

## Prohibited claims

B1 must not claim or imply:

- official parcel;
- official zoning;
- cadastral validation;
- ownership verification;
- approved development site;
- certified hazard boundary;
- live DLD, Dubai Pulse, GeoDubai or Municipality integration;
- production-ready or pilot-ready status.

## Rollback

Because B1 does not activate the open bundle by default, the current synthetic fallback remains the immediate Product rollback path.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
