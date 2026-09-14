# Phase A Spatial Risk Register v1

## Risk register

| ID | Severity | Risk | Current control | Required Phase B treatment |
| --- | --- | --- | --- | --- |
| SP-R01 | P0 | Open geometry is described as official parcel, zoning, community or hazard evidence | Canonical validation labels and prohibited-claim scan | Block release on unsupported official wording |
| SP-R02 | P0 | Source licence or attribution does not permit intended public/demo distribution | Source matrix and manifest licence section | Legal/compliance disposition before dataset eligibility |
| SP-R03 | P0 | Source refresh silently changes saved analysis/report geometry | Immutable versions, stable keys and geometry checksum | Pin dataset/version in every saved result |
| SP-R04 | P1 | OSM/Overture duplicate objects create conflicting or overlapping geometry | Source aliases and deterministic match policy | Layer-specific duplicate tests and manual review |
| SP-R05 | P1 | Large building GeoJSON causes map performance regression | Focus AOIs and feature-density limits | Zoom gating, tiling or release-artifact strategy |
| SP-R06 | P1 | Hand-authored synthetic polygons remain mixed with approved open layers without disclosure | Per-layer resolver and synthetic fallback label | Explicit source mode in legend and selection |
| SP-R07 | P1 | Derived coastal/heat/development zones look authoritative without validated methodology | Derived methodology document and later phase split | Separate CR, sensitivity test and derived label |
| SP-R08 | P1 | Market metrics and geometry dates are mixed, creating false freshness | Geometry/metric separation | Display separate observation and geometry dates |
| SP-R09 | P1 | DLD/Dubai Pulse public files are redistributed without confirmed rights | Manual-validation-path status | Capture dataset terms before storage or distribution |
| SP-R10 | P1 | Customer/licensed data leaks into public repository or demo bundle | Adapter and security scope separation | Private storage/Auth approval before use |
| SP-R11 | P1 | Topology repair materially changes source shape | Source and normalized checksums plus repair lineage | Geometry-change thresholds and visual review |
| SP-R12 | P2 | Stable-key mapping incorrectly merges two distinct real-world entities | Split/merge governance and alias collision checks | Founder/data review for provisional mappings |
| SP-R13 | P2 | Processing AOI is mistaken for an official Dubai boundary | `processing_aoi` role and explicit non-official flag | Never display it as a Product boundary |
| SP-R14 | P2 | Source date is unknown but layer is called current | Freshness contract | Reject `current` without date/release and policy pass |
| SP-R15 | P2 | Browser evidence uses local exact-head build but is described as Vercel capture | Evidence provenance rules | Record exact execution target in artifacts |
| SP-R16 | P2 | Product UI becomes cluttered by source disclosures | Compact label + details/lineage disclosure | Design/UX QA at all controlled viewports |

## Release posture

Phase A reduces architectural uncertainty but does not close these risks. B1 may begin only after founder decisions in `PHASE_A_DECISION_REGISTER_V1.md`. B2 may begin only after source snapshots and B1 quality evidence are accepted.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**