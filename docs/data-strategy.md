# GeoAI Data and Source Strategy

Status: Active baseline
Last verified: 2026-07-16
Release authority: PR #87 / `2999e7e857989baf53ce58ecfed63550b5896be0`

## Operating principle

GeoAI is source-lineage-first and fail-closed. A registered connector, sample file, successful catalogue request or provider name is not evidence activation. A source can affect Product claims or scoring only after access rights, license/attribution, custody, schema, visibility, quality and fallback behavior are independently verified.

## Current source authority

| Source group | Current state | Allowed use | Prohibited interpretation |
| --- | --- | --- | --- |
| Synthetic/seed GeoJSON | Active public demo | Stable workflow and UI demonstration | Official parcel, planning, zoning, cadastral or risk geometry |
| User-uploaded CSV/GeoJSON | Browser/local, validation required | User-provided screening context | Verified or official evidence |
| NASA POWER | Fixed historical point context in bounded Preview | Low-volume climate/energy screening context | Engineering/insurance-grade model or live SLA |
| Copernicus Sentinel-2 | Catalogue metadata only in bounded Preview | Availability/context metadata | Geometry, bbox, imagery asset acquisition or analysis |
| OSM Overpass | Bounded counts only in Preview | Count-level open context with ODbL attribution | Features, coordinates, geometry or official GIS |
| Open-Meteo | `permission_required` | Limitation/caveat only | Evidence, AI payload, scoring or live Product context |
| DLD/Dubai Pulse | Blocked pending stable approved access/snapshot and reusable rights | Readiness/manual import planning | Live/official integration or current transaction evidence |
| Overture/OSM geometry | Deferred | Contract/design work only | Activated Product geometry |
| WorldPop/OpenAQ/administrative samples | Sample/manual/readiness | Caveated source catalog context | Connected or decision-grade evidence |

Production source-pack execution is disabled and returns HTTP 503 with zero active sources. No current source influences deterministic scores.

## Source lifecycle

```text
registered
  -> rights reviewed
  -> access acquired
  -> quarantined snapshot
  -> checksum/schema/quality validated
  -> tenant/visibility assigned
  -> public or project projection approved
  -> Product evidence integration
  -> monitored refresh / rollback / retirement
```

Skipping a stage is not allowed. `project_key IS NULL` must not be used as a synonym for public when real snapshots are introduced.

## Required custody metadata

Every acquired snapshot must record:

- provider and canonical source URL;
- license, attribution and permitted use;
- retrieval timestamp, geography and temporal coverage;
- checksum, byte size, record count and schema version;
- raw/normalized object identifiers stored only in private/operator surfaces;
- validation/quarantine state and quality findings;
- tenant/project scope and explicit visibility (`public_demo`, `project_private`, or operator-only);
- transformation lineage and code version;
- retention, refresh, rollback and deletion rules.

Public APIs may expose only approved DTO fields. Raw filenames, normalized paths, bucket/object paths and private file manifests are not public lineage.

## Persistence and authorization boundary

Real source ingestion must use a separate operator/worker plane. User-facing API repositories must never inherit service-role credentials. Project data access must be based on a request-scoped user session and RLS. The current code does not yet implement that user-context kernel, so real-source persistence and protected files remain blocked.

## Data quality gates

- Schema validation and deterministic normalization.
- Coordinate, geometry and topology validation where geometry is permitted.
- Duplicate/outlier/null and temporal-coverage checks.
- Quality tier and limitations visible in lineage.
- Sample/permission-required inputs cannot be promoted to acquired evidence.
- Missing or failed providers must produce a truthful unavailable/fallback state, not stale positive evidence.
- AI prompts receive only approved, project-authorized, privacy-classified projections.

## Current implementation references

- `src/lib/external-data/runtime-source-pack.ts`
- `src/lib/external-data/source-registry.ts`
- `src/lib/external-data/supabase-source-registry.ts`
- `src/lib/external-data/public-source-projection.ts`
- `security/api-route-access.json`
- `data/external/manifest.json`
- `docs/CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md`
- `docs/CR_DEV8_001_QA_CHECKLIST.md`

Historical connector/release documents describe the capability available at their release date. They are not current source authority unless linked from [Documentation Index](DOCUMENTATION_INDEX.md).

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
