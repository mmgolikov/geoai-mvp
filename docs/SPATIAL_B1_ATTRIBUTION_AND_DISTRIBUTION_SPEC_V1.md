# Spatial B1 Attribution and Distribution Specification v1

## Control

This specification governs attribution and distribution evidence for the read-only Spatial B1 open-context bundle. It is a technical control, not legal advice, and it does not approve public repository publication.

`publicRepositoryGeometryApproved = false`

The open bundle remains inactive in Product. Synthetic fallback remains the default.

## Source notices

- **OpenStreetMap / Geofabrik:** show `© OpenStreetMap contributors`, identify the Geofabrik extract, and include the Open Database License 1.0 notice or link in the accompanying attribution record.
- **Overture Maps:** identify Overture Maps Foundation, the release, and the applicable theme licence. Preserve and expose the source-level provider datasets declared in each Overture feature's metadata.
- **Derived outputs:** state that geometry is derived, name the operation and working CRS, and retain every member provider ID, source alias, input geometry hash, and output geometry hash.
- **No official implication:** open or derived geometry must never be presented as official parcel, zoning, cadastral, ownership, planning, valuation, title, or approval evidence.

## Surface requirements

| Surface | Required behavior |
| --- | --- |
| Interactive map | Keep a persistent compact attribution control. Identify OSM contributors and Overture when their layers are visible. Link or disclose the source-lineage record. |
| Source-lineage drawer | Show canonical GeoAI key, provider ID, all aliases/crosswalks, dataset release and snapshot dates, source update time, access time, freshness state, licence ID, attribution, geometry role, accuracy, and caveat. |
| Dashboard | Show an `Open-context` label and a direct path to lineage. Do not compress open-context evidence into an official-data claim. |
| Printable report / PDF | Print source names, release/snapshot context, OSM/ODbL notice, Overture and source-provider attribution, derived-lineage note when applicable, and the required caveat on every relevant evidence section. |
| GeoJSON export | Include attribution, licence, canonical key, provider ID, source aliases/crosswalks, freshness, geometry role/accuracy, lineage and caveat in properties or an adjacent machine-readable manifest. |
| JSON export | Preserve the complete dataset, provenance, crosswalk, freshness, quality and lineage contracts without replacing source update time with dataset release time. |
| Downloadable data package | Include source manifest, checksums, licence/attribution manifest, build version, tested commit, quality reports, derived lineage, and this specification. Do not include geometry when distribution approval is absent. |
| GitHub Actions artifact metadata | Record exact commit, workflow run and job, artifact name/ID, retention period, source checksums, tool versions, `publicRepositoryGeometryApproved=false`, and `openGeometryActivated=false`. |

## Distribution controls

1. Real normalized geometry remains in a short-lived evidence artifact only.
2. No real normalized geometry is committed by Spatial B1.
3. OSM adapted-database and public distribution treatment requires separate approval.
4. Overture source-level attribution must remain available with each selected object.
5. A future client or official geometry version may share the same canonical GeoAI key, but its source mode, validation status, crosswalk, and evidence must remain distinct.
6. Any export or artifact that omits required attribution or lineage must fail its release gate.
7. Product activation and Production deployment require explicit later approval and are outside this PR.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
