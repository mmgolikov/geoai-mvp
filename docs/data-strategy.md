# GeoAI Data and Source Strategy

Status: Active baseline
Last verified: 2026-07-16
Owner: GeoAI Data / Engineering
Authority: Current source, custody and evidence policy
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Released baseline: PR #87 / `2999e7e857989baf53ce58ecfed63550b5896be0`
Unreleased implementation scope: audit worktree / Draft PR #97 candidate; candidate controls do not describe Production until merge and deploy
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Architecture](architecture.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md)

## Operating principle

GeoAI is source-lineage-first and fail-closed. A registered connector, sample file, successful catalogue request or provider name is not evidence activation. A source can affect Product claims or scoring only after access rights, license/attribution, custody, schema, visibility, quality and fallback behavior are independently verified.

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

Production source-pack API execution is disabled and returns HTTP 503 with zero active sources. The released `/explore` route nevertheless has a known UI/runtime-environment wiring defect that can present Preview/open-context source semantics; the audit candidate fixes it by resolving the runtime server-side. Treat the API as fail-closed but the released source UI boundary as unverified until Draft PR #97 is merged and deployed. No current source influences deterministic scores.

Candidate local/Preview provider execution requires all of: explicit flag, server-only operator token of at least 32 characters and matching request authorization. Production remains disabled. Provider fetches are constrained to fixed HTTPS hosts, reject redirects and cancel non-success/oversized bodies. NASA pairs must align on valid in-period dates and parameter ranges; Copernicus requires the exact collection, strict UTC in-period datetime and 0–100 cloud cover; Overpass requires exactly three finite non-negative count values. This narrows SSRF, accidental activation, semantic corruption and single-response memory risk but is not distributed quota/circuit evidence.

The audit candidate's anonymous data-sources/readiness/manifest/sources/status/lineage routes are static `compact_public_v1` projections of the reviewed repository snapshot. Their API/source contract is `1.3`; the bundled data manifest `version`/`manifestVersion` is `1.6`. They set `liveRegistryIncluded:false`, expose zero live counts, withhold diagnostics and perform no Supabase probe. The serverless functions statically import only the reviewed manifest plus three compact aggregate-quality records; deep source snapshots are excluded by an output-trace gate. DLD/OSM/Overture per-source count/status/`usedInAnalysis` values are contract-tested independently of group totals. The old Preview repeated roughly 133–158 KB per route; exact Preview `dpl_Gh5btUKs8yzySxvpxGnwXjMkYayK` on documentation/evidence head `f39dcee18c2601b88ae51e061627925037d1aa77` measures 5,164/4,411/18,284/5,164/8,221/4,292 B for data-sources/readiness/manifest/sources/status/lineage. The source pack remains 503 with `activationAllowed:false` and `sources: []`; no provider or Supabase live-registry call was activated.

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

Pending SOURCE-01 migration `20260716113000_geoai_source_custody_foundation_v1.sql` stages the acquired-source authority as five RLS-enabled/direct-grant-closed tables: catalog, releases, artifacts, release-status events and ingestion receipts. Releases, artifacts, status events and receipts are immutable; composite tenant/release and actor organization/project-membership FKs prevent cross-scope custody. Legacy registry rows backfill as `restricted`/`registered_unverified`. Bounded `api.current_source_releases()` exposes only an explicit `approved` release projection for the verified owner/admin/analyst/viewer project context and omits arbitrary quality/lineage summary JSON, Storage paths, source URIs, secrets and `client_viewer`. This is an unapplied schema contract: it connects no provider, grants no write API and does not satisfy rights, retention, trusted-worker, replay or real-persona acceptance.

SOURCE-02 stages the provider-neutral contract between reviewed acquisition intent and a future executor. The default registry is empty and immutable; the current module has no DNS/provider request, environment/secret read, credential value or custody persistence and denies Production. It can deterministically validate exact connector/endpoint/query/body bounds, bind tenant/project/actor scope and create a non-persisted success candidate or stable quarantine/failure/duplicate receipt. Planning is allowed only when connector lifecycle and rights evidence are approved and canonical replay, SOURCE-01 custody/personas, trusted-worker authentication, owner-bound approval, exact deployment SHA, distributed rate budget, cross-instance circuit breaker and any credential broker are ready. Public distribution, geometry and imagery each require an additional gate. A future executor must revalidate DNS/connect-time IP, inject broker-held credentials and write SOURCE-01 records transactionally; SOURCE-02 itself authorizes none of those actions.

## Persistence and authorization boundary

Real source ingestion must use a separate operator/worker plane. User-facing API repositories must never inherit service-role credentials. Project data access must be based on a validated caller JWT through a request-scoped Supabase client plus minimum grants and RLS. Public-demo mutations and Vercel server-local fallback are disabled; AOIs/uploads remain project-scoped browser-local. SSR cookie/user/profile transport plus an AUTH-01B read facade are staged: the facade requires an exact project key, resolves caller-bound `api.current_project_access()`, applies the shared role kernel and maps only approved source-release DTO fields. It rejects bearer/public-demo fallback and has no base-table, service-role or public-cache path. All readiness flags remain false, no route consumes it and real personas are absent, so real-source persistence and protected files remain blocked.

Review-only Storage authorization delegates one exact organization/project/role predicate to hardened `SECURITY DEFINER geoai_private.has_storage_project_role()` because authenticated callers have no direct protected identity/tenant table `SELECT`. Object read remains operation-aware for authenticated fetch/signing only, denying bucket listing; `client_viewer` is excluded from raw evidence objects. This draft is outside the migration chain and remains unapplied pending full Storage personas.

The separate development Supabase ref `pphdqkurxneyagvnnjdt` still exposes `public` through the Data API; all three review-only containment, identity and source-custody migrations are unapplied. Fresh 2026-07-16 11:31 UTC read-only evidence found `ACTIVE_HEALTHY`, 20 public tables/19 RLS, ten applied migrations/zero candidate migrations, zero Auth users, four buckets/zero object policies, and 22 public-table `TRUNCATE` grants for each of `anon` and `authenticated`; no live write was performed. Documentation/evidence head `f39dcee18c2601b88ae51e061627925037d1aa77`, over functional content SHA `631d72e0ec1323554fae7274f4328f92e2445289`, passed Quality Gate run `29497314994`; DB job `87617248275` completed clean start/reset and the 71-assertion pgTAP plan. The 14 red-team additions cover exact source-release projection with ordered multi-event latest-status selection, explicit `revoked` and default-`sealed` projections, pagination bounds, inactive organization/project denial, exact-project creator membership and append-only artifact/status-event/ingestion-receipt writes; the policy sweep covers every custody/audit table for `public` or authenticated-applicable policies. Local Docker remains unavailable and this is not live execution evidence. Before any source registry/release is written, the owner must disable the Data API or expose the selected minimal `api` schema, complete upgrade replay and prove anon/authenticated/Storage/source negative personas. Provider writes remain blocked until a trusted operator/worker write path, rights gates, receipts, rollback and real personas pass. See the [containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md); it authorizes no live change.

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
