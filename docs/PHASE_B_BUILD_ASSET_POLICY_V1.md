# Phase B Build Asset Policy v1

## Purpose

Control which source and normalized spatial files may be downloaded, committed, stored or distributed during B1/B2.

## Asset classes

| Class | Examples | Public repository policy |
| --- | --- | --- |
| Source metadata | URLs, releases, timestamps, checksums, attribution | Commit |
| Build manifests and quality reports | JSON/Markdown manifests, counts, QA | Commit |
| Small normalized fixtures | Selected AOIs, small transport/anchor/land-use subsets | Commit only after licence and size review |
| Large normalized geometry | Building footprints, broad city extracts | Prefer release artifact, approved object storage or vector tile; do not commit by default |
| Raw OSM/Overture extracts | PBF, GeoParquet, large GeoJSON | Do not commit by default; store/retrieve according to source licence and build instructions |
| Copernicus/WorldCover raster assets | COGs, imagery, DEM tiles | Do not commit; store product IDs, manifests and approved derived outputs |
| DLD/Dubai Pulse CSV | Market/property snapshots | Do not commit until dataset-level usage and redistribution are approved |
| Customer/licensed/official files | Confidential or contract-controlled data | Never commit to public repository |
| Secrets/tokens | API keys, credentials | Never commit or store in evidence artifacts |

## Size guidance

- Individual committed normalized file: target below 5 MB.
- Combined Phase B public snapshot: target below 25 MB unless repository policy is explicitly approved.
- Large building context should be tiled, focus-AOI subsetted or distributed separately.
- Browser runtime must not fetch unnecessary raw geometry for hidden layers.

These are engineering guidance limits, not source licence limits.

## Rebuildability

A non-committed source or normalized asset is acceptable only when the repository contains enough information to reproduce it:

- exact source/release;
- source checksum or immutable identity;
- extraction AOI;
- tool/version;
- filters and parameters;
- output manifest/checksum;
- storage/retrieval runbook.

## Public distribution gate

Before a normalized open spatial database is made public:

1. OSM/Overture licence and adapted-database treatment is approved.
2. Required source attributions are generated.
3. No prohibited raw/licensed/customer data is included.
4. Output is clipped/minimized to Product need.
5. Manifest and caveat are packaged with the data.
6. Repository/release artifact does not reveal credentials or internal paths.

## Product runtime

Phase B runtime should consume normalized static assets or approved vector tiles, not live provider queries. This makes the demo deterministic and prevents unreviewed source changes.

## Storage future path

A future approved object-storage implementation may store:

- versioned normalized bundles;
- manifests;
- quality reports;
- report map snapshots;
- source evidence metadata.

It does not change source licence or validation requirements.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**