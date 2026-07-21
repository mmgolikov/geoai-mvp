# GeoAI Data and Source Strategy

Status: Active baseline
Last verified: 2026-07-20
Owner: GeoAI Data / Engineering
Authority: Current source, custody and evidence policy
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Released baseline: merged PR #97 / `b915a831d5e5b28eab5fd26ac86059820e7e4a32` / Production `dpl_ERVqZPD5GAGDLjAVhMcPF2HT5Br7` at https://geoai-mvp.vercel.app / `public_demo_prototype`
Machine authority: [CURRENT_RELEASE_RECEIPT.json](CURRENT_RELEASE_RECEIPT.json)
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Architecture](architecture.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md)

## Operating principle

GeoAI is source-lineage-first and fail-closed. A registered connector, sample file, successful catalogue request or provider name is not evidence activation. A source can affect Product claims or scoring only after access rights, license/attribution, custody, schema, visibility, quality and fallback behavior are independently verified.

The isolated Free Auth rehearsal now proves the SOURCE-01 schema can coexist with the rebuilt and lifecycle-remediated tenant/Auth/Admin model: hosted SQL personas pass `183/183`, the Data API exposes only reviewed `api` RPCs, and direct `public` HTTP access is denied. No provider is connected and no trusted worker exists; therefore this evidence changes database readiness only and authorizes no source fetch, write, scoring or Product claim. [Receipt](SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json).

## Current source authority

| Source group | Current state | Allowed use | Prohibited interpretation |
| --- | --- | --- | --- |
| Synthetic/seed GeoJSON | Active public demo | Stable workflow and UI demonstration | Official parcel, planning, zoning, cadastral or risk geometry |
| User-uploaded CSV/GeoJSON | Project-tagged browser-local only in public demo; structural quotas; validation required | Non-confidential user-provided screening context | Personal/confidential/regulated data, server persistence, cross-user sharing, verified or official evidence |
| NASA POWER | Fixed historical point context in bounded Preview | Low-volume climate/energy screening context | Engineering/insurance-grade model or live SLA |
| Copernicus Sentinel-2 | Catalogue metadata only in bounded Preview | Availability/context metadata | Geometry, bbox, imagery asset acquisition or analysis |
| OSM Overpass | Bounded counts only in Preview | Count-level open context with ODbL attribution | Features, coordinates, geometry or official GIS |
| Open-Meteo | `permission_required` | Limitation/caveat only | Evidence, AI payload, scoring or live Product context |
| DLD/Dubai Pulse | Blocked pending stable approved access/snapshot and reusable rights | Readiness/manual import planning | Live/official integration or current transaction evidence |
| Overture/OSM geometry | Deferred | Contract/design work only | Activated Product geometry |
| WorldPop/OpenAQ/administrative samples | Sample/manual/readiness | Caveated source catalog context | Connected or decision-grade evidence |

Production source-pack API execution is disabled and returns HTTP 503 with zero active sources. PR #97 released the server-resolved `/explore` runtime-environment boundary. No current source influences deterministic scores, and no real source is activated.

Candidate local/Preview provider execution requires all of: explicit flag, server-only operator token of at least 32 characters and matching request authorization. Production remains disabled. Provider fetches are constrained to fixed HTTPS hosts, reject redirects and cancel non-success/oversized bodies. NASA pairs must align on valid in-period dates and parameter ranges; Copernicus requires the exact collection, strict UTC in-period datetime and 0–100 cloud cover; Overpass requires exactly three finite non-negative count values. This narrows SSRF, accidental activation, semantic corruption and single-response memory risk but is not distributed quota/circuit evidence.

The audit candidate's anonymous data-sources/readiness/manifest/sources/status/lineage routes are static `compact_public_v1` projections of the reviewed repository snapshot. Their API/source contract is `1.3`; manifest is `1.6`; `liveRegistryIncluded:false`. Deep snapshots remain excluded. Exact Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` on head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` measures 5,164/4,411/18,284/5,164/8,221/4,292 B for data-sources/readiness/manifest/sources/status/lineage. The source pack remains 503 with `activationAllowed:false` and zero sources; no provider or Supabase live-registry call was activated.

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

SOURCE-01 migration `20260716113000_geoai_source_custody_foundation_v1.sql` stages the acquired-source authority as five RLS-enabled/direct-grant-closed tables: catalog, releases, artifacts, release-status events and ingestion receipts. Releases, artifacts, status events and receipts are immutable; composite tenant/release and actor organization/project-membership FKs prevent cross-scope custody. Legacy registry rows backfill as `restricted`/`registered_unverified`. Bounded `api.current_source_releases()` exposes only an explicit `approved` release projection for the verified owner/admin/analyst/viewer project context and omits arbitrary quality/lineage summary JSON, Storage paths, source URIs, secrets and `client_viewer`. It is applied and SQL-tested only on isolated rehearsal, remains unapplied to development/Production, connects no provider, grants no write API and does not satisfy rights, retention, trusted-worker or real-persona acceptance.

SOURCE-02 stages pure `reserve_or_replay` claim v1 between reviewed acquisition intent and a future executor. Execution/idempotency hashes bind exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body and window; actor is omitted only from the shared acquisition key. The unsigned digest is correlation-only and grants authorization `none`. External registry/plan/hash revalidation, trusted execution and transactional SOURCE-01 writing remain required. The default registry is empty; there is no fetch/env/secrets/persistence or atomic pre-fetch reservation writer; Production is denied.

## Persistence and authorization boundary

Real source ingestion must use a separate operator/worker plane. Before profile RPC, the AUTH boundary requires UUID `claims.sub === auth.getUser().id` and explicit claims/user `is_anonymous === false`; mismatch is 401, anonymous identity 403 and ambiguity fails closed. Exact-target Auth/MFA/Admin/Onboarding routes now consume that identity boundary locally. AUTH-01B separately resolves caller Product project scope and approved source DTOs only. Its Product repository/persona readiness flags remain false and hosted real-user personas are absent, so real-source persistence and protected files remain blocked.

Review-only Storage authorization delegates one exact organization/project/role predicate to hardened `SECURITY DEFINER geoai_private.has_storage_project_role()` because authenticated callers have no direct protected identity/tenant table `SELECT`. Object read remains operation-aware for authenticated fetch/signing only, denying bucket listing; `client_viewer` is excluded from raw evidence objects. This draft is outside the migration chain and remains unapplied pending full Storage personas.

The separate development Supabase ref `pphdqkurxneyagvnnjdt` still exposes `public` through the Data API; all six current candidate migrations are unapplied there. Fresh migration-ledger read-back remains exactly ten historical entries/zero candidates; the broader snapshot was 20 public tables/19 RLS, zero Auth users, four buckets/zero object policies and 22 public-table `TRUNCATE` grants for each public role. Head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`, passed run `29500488408`; DB job `87627894968` passed clean 71/71, a synthetic ledger-prefix rehearsal and a second 71/71. The separate Free rehearsal adds hosted 183/183 and API-only evidence, but neither receipt is a current-development clone, live-derived upgrade replay, drift, live apply or DB-01 certification. Before any source write, the owner must contain the target Data API and prove live personas. Provider writes remain blocked. See the [containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md); it authorizes no development change.

## Data quality gates

- Schema validation and deterministic normalization.
- Coordinate, geometry and topology validation where geometry is permitted.
- Duplicate/outlier/null and temporal-coverage checks.
- Quality tier and limitations visible in lineage.
- Sample/permission-required inputs cannot be promoted to acquired evidence.
- Zero-record, manual-import, planned or permission-required sources cannot appear in report `evidenceUsed`; they remain candidate/validation-required lineage until a selected report/analysis or acquired authorized asset identifies actual use.
- Missing or failed providers must produce a truthful unavailable/fallback state, not stale positive evidence.
- AI prompts receive only approved, project-authorized, privacy-classified projections.

## Current implementation references

- `src/lib/external-data/runtime-source-pack.ts`
- `src/lib/external-data/source-registry.ts`
- `src/lib/external-data/supabase-source-registry.ts`
- `src/lib/external-data/public-source-readiness.ts`
- `src/lib/external-data/public-source-projection.ts`
- `src/lib/auth/request-project-read-access.ts`
- `src/lib/repositories/request-scoped-project-read.ts`
- `src/lib/sources/source-connector.ts`
- `src/lib/sources/contracts.ts`
- `security/api-route-access.json`
- `data/external/normalized/external_data_manifest.json`
- `docs/CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md`
- `docs/CR_DEV8_001_QA_CHECKLIST.md`

Historical connector/release documents describe the capability available at their release date. They are not current source authority unless linked from [Documentation Index](DOCUMENTATION_INDEX.md).

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
