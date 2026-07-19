# CR-DEV8-001 — Controlled Open-Context Source Connection Pack v1

## Document control

| Field | Value |
|---|---|
| Status | Merged and post-merge verified for fixed-geography Preview scope; Production source activation remains disabled |
| User authority | Critical review, autonomous Preview implementation and removal of current-stage HOLDs requested on 2026-07-15 |
| Development baseline | `main` at `754a9c68cd1ee7af80731f1b779df023d54e901e` |
| Released authority | PR [#87](https://github.com/mmgolikov/geoai-mvp/pull/87), merge SHA `2999e7e857989baf53ce58ecfed63550b5896be0` |
| Release evidence | GitHub Actions run `29456624801` (18/18); Vercel Production `dpl_EAXREH31JKznnGbQYEU8bNqTqagN` READY on the exact merge SHA |
| Delivery mode | Stateless local/Vercel Preview only; Production fails closed |
| Product score impact | None |
| Supabase impact | None; no migration, write or external-payload persistence |
| Geometry impact | None; no source geometry is returned or activated |
| Related controls | CR-DEV6-012, GitHub #80, #85 and Draft PR #84 |

## Executive decision

The first connection package is deliberately narrow:

1. NASA POWER historical climate/solar context for one fixed public demo point.
2. Copernicus Data Space STAC catalogue metadata for one fixed public demo AOI.
3. OpenStreetMap Overpass element counts for the same bounded public demo AOI.

Open-Meteo live access is blocked. Its free endpoint is non-commercial and is not cleared for a public, promotional or commercial GeoAI Preview. DLD/Dubai Pulse live access is blocked because a stable public API and reusable licence were not verified. Overture is deferred because its useful delivery paths are geometry-bearing release files with theme-specific attribution obligations.

The owner accepted this bounded package on 2026-07-15 without an independent-reviewer prerequisite; no independent review is claimed. PR #87 is merged and the exact merge SHA passed the main quality run and is deployed in Vercel Production. Production still fails closed before any source-provider request: the source-pack endpoint returns HTTP 503 with activation disabled and zero sources. Imagery download, source geometry, Supabase persistence, Auth/RLS/Storage changes, secrets and source-dependent scoring remain outside this released scope.

## Owner decision and residual disposition

| Disposition | Items | Effect on this CR |
|---|---|---|
| Accepted for fixed low-volume Preview | Best-effort provider availability; instance-local cache/circuit; transient API receipts with no acquired snapshot; frozen-contract fixtures plus point-in-time smoke; Vercel-specific environment gate; combined S0+S1 diff | Not merge blockers for the bounded Preview scope |
| Deferred to a separate CR | Shared/durable cache and request budgets; Product/UI/report integration; source-dependent scoring; non-Vercel hosting policy; Production provider SLA; broader ODbL distribution; #80 geometry and #85 migration-chain reconciliation | Must not be inferred from this package |
| Prohibited / fail closed | Production upstream execution; Open-Meteo or DLD/Dubai Pulse live access; OSM/Overture geometry; imagery/assets; external-payload persistence | Requires separate explicit authority and controls |

The current Preview is low-volume and best-effort. Unrestricted public Overpass activation remains a separate operational gate: use access protection, a shared request budget/cache or an off-by-default control before treating it as an application backend.

## Critical findings addressed

| Finding | Severity | Control in this change |
|---|---:|---|
| `connected` was converted to `real_snapshot` | High | API context and acquired snapshots are now distinct |
| A non-null Supabase `normalized_path` could promote a zero-record row to snapshot | High | Snapshot state now requires both a path and `record_count > 0` |
| Unknown Supabase modes silently became `demo_seed` | High | Known metadata modes map to `planned_validation`; unknown modes fail closed |
| Open-Meteo free API was called by public runtime code | High | Upstream call removed; response is `permission_required` with null metrics |
| Missing query coordinates became `(0, 0)` because `Number(null) === 0` | High | Shared strict coordinate parser rejects missing, empty and out-of-range values |
| Static registry `usedInAnalysis` was saved as actual lineage | High | Saved lineage now requires actual evidence or a runtime observation receipt |
| External calls had no timeout, size budget or circuit control | High | Fixed allowlist, timeouts, 2 MB response cap, one retry, cache, stale fallback and circuit breaker |
| Copernicus route implied credentials were required for catalogue metadata | Medium | Registry/status now distinguishes public STAC metadata from gated download/processing |
| Generic `NODE_ENV=production` without `VERCEL_ENV` enabled the pack | High | Preview is allowed explicitly; Vercel Production and generic production runtimes fail closed |
| A legacy solar route bypassed the controlled source pack | High | Legacy route now returns labelled fallback and performs no provider fetch |
| Permission-gated Open-Meteo context entered evidence/AI payloads | High | Only `connected` climate context can become evidence or enter analysis/decision-score payloads |
| Provider attribution copy was incomplete | High | NASA service/access reference, prescribed Copernicus notices and OSM/ODbL notice are explicit |

## Source matrix

| Source | v1 decision | Runtime scope | Production state | Rights/quality control |
|---|---|---|---|---|
| NASA POWER | GO Preview | Fixed 2024-01-01…2024-01-07 point query; `T2M` and `ALLSKY_SFC_SW_DWN` | Disabled as part of this pack | POWER Daily API/access-date reference; model/reanalysis grid context, not site measurement or yield certification |
| Copernicus Data Space STAC | GO Preview, Sentinel-only | Sentinel-2 L2A metadata, maximum 3 items, rolling 14-day period | Disabled | Prescribed modified Sentinel/Service notice; no portal content, geometry, bbox, assets, imagery download, rendering or analysis |
| OSM Overpass | GO low-volume Preview | `out count` for amenity, public transport and highway elements | Disabled | Visible `Data © OpenStreetMap contributors, available under ODbL 1.0.`; counts are mutable and non-official |
| Open-Meteo | BLOCK | No upstream request | Permission required | Commercial customer endpoint, approved self-hosting or written permission required |
| DLD / Dubai Pulse | BLOCK live | Existing declared sample/manual snapshot only | Unchanged | Exact-file rights and custody decision required |
| Overture Maps | DEFER | Registry/release review only | Unchanged | Theme/provider-specific licence and geometry delivery gate |

## Official references

- [NASA POWER API](https://power.larc.nasa.gov/docs/services/api/) and [Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)
- [Copernicus Data Space STAC](https://documentation.dataspace.copernicus.eu/APIs/STAC.html), [terms](https://dataspace.copernicus.eu/terms-and-conditions) and [quotas](https://documentation.dataspace.copernicus.eu/Quotas.html)
- [OpenStreetMap copyright/licence](https://www.openstreetmap.org/copyright) and [Overpass API guidance](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Open-Meteo terms](https://open-meteo.com/en/terms), [licence](https://open-meteo.com/en/licence) and [pricing](https://open-meteo.com/en/pricing)
- [DLD Real Estate Data](https://dubailand.gov.ae/en/open-data/real-estate-data/)
- [Overture access](https://docs.overturemaps.org/getting-data/cloud-sources/) and [attribution](https://docs.overturemaps.org/attribution/)

## Runtime contract

Endpoint:

```text
GET /api/external-data/source-connection-pack
```

The endpoint accepts no coordinates, bbox, dates, upstream URLs, provider mode or activation flag from the client. It resolves only the committed public demo point/AOI. Vercel Production returns `503` before any upstream request.

Each source observation contains:

```text
sourceId
mode: live | cached | unavailable | disabled
retrievedAt
servedAt
sourceObservedAt
queryFingerprint
coverage
licenseName
licenseUrl
attribution
caveat
fallbackReason
payload
```

Top-level controls declare `scoreImpact: none` and `persistence: none`. An API observation is never an acquired snapshot.

## Provider controls

| Provider | Timeout | Fresh cache | Stale fallback | Payload restriction |
|---|---:|---:|---:|---|
| NASA POWER | 10 s/attempt | 30 d | 37 d | Two allowlisted parameters and aggregate screening metrics |
| Copernicus STAC | 8 s/attempt | 1 h | 24 h | Allowlisted item ID, collection, datetime and scene cloud-cover metadata |
| Overpass | One 10 s HTTP attempt / 8 s query timeout | 30 min | 24 h | Three non-negative counts; no immediate 429/5xx retry; no nodes, ways, coordinates or geometry |

Common controls:

- fixed upstream allowlist and fixed public demo geography;
- at most one retry for NASA/Copernicus timeout, HTTP 429 or 5xx; bounded `Retry-After` wait; Overpass has no immediate retry;
- 2 MB maximum response body;
- provider circuit opens for five minutes after three consecutive failures;
- identical same-instance in-flight requests are deduplicated;
- malformed responses fail closed;
- expired last-good values can be served only within the declared stale window and are labelled `cached` with a fallback reason;
- no upstream exception body, credential or provider asset link is exposed.

## Acceptance criteria

### Truth model

- [x] API context is never labelled `real_snapshot`.
- [x] A zero/null-record metadata row cannot become `snapshot_available`.
- [x] Unknown source modes fail to `planned_validation`.
- [x] Open-Meteo returns `permission_required`, null metrics and performs no fetch.
- [x] Permission-gated context does not become Product evidence or enter AI/scoring payloads.
- [x] Saved external lineage includes only actual evidence or runtime observations.

### Runtime and data minimisation

- [x] Vercel and generic production runtimes return disabled before provider execution.
- [x] No client input controls the provider or queried geography.
- [x] NASA, Copernicus and OSM failures are independent.
- [x] Copernicus output contains no `geometry`, `bbox` or `assets`.
- [x] OSM request and response remain count-only.
- [x] The pack does not modify suitability/risk scores or persist payloads.

### Verification

- [x] Frozen provider-contract fixtures pass.
- [x] Missing/empty/out-of-range coordinates return HTTP 400 on legacy point routes.
- [x] TypeScript, data-honesty, API contract and production build pass.
- [x] GitHub quality evidence is recorded externally against the final published PR head.
- [x] Vercel Preview evidence is recorded externally against the final published PR head.
- [x] Live Preview smoke records schema/freshness only, never mutable value equality.
- [x] Deployment-scoped warning/error/4xx/5xx logs are reviewed.
- [x] Production source execution and Supabase migration/table state remained unchanged by the release.

## Rollback

Revert the source-pack commit or remove its route and runtime modules. No database cleanup, Storage cleanup, secret rotation or Production cache invalidation is required. Open-Meteo remains permission-gated. Existing sample/local source paths remain available.

## Approval gates

| Gate | Required decision |
|---|---|
| G0 | Accepted by owner for the bounded Preview scope |
| G1 | Truth/safety controls verified; accepted by owner |
| G2 | Provider rights/attribution controls verified for Preview; accepted by owner |
| G3 | Final exact-head Preview and quality evidence recorded in PR/issue; accepted by owner |
| G4 | Completed: owner removed the merge HOLD; PR #87 is merged; no independent reviewer approval is required or claimed for this phase; Production live mode remains off |
| G5 | Still required separately for any Production source activation, secret, persistence, geometry, imagery or source-dependent scoring |

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
