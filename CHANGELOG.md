# Changelog

## Unreleased — Full system audit and pre-Auth containment

### Security and reliability

- Classified all 83 API handlers in an explicit public-demo/project access manifest.
- Enforced access denial before mutation across the known bypassed routes and added object-first scope checks for affected ID routes.
- Removed service-role selection from user-facing repository clients.
- Prevented boolean environment flags from promoting Auth/membership/RLS readiness.
- Added bounded AI request parsing, timeouts/token caps and an explicit hard/Auth upstream gate.
- Removed private filesystem/storage paths from public source-lineage projections.
- Added CSP, HSTS, frame, MIME, referrer and permissions headers.
- Prepared (not applied) pre-Auth RLS/Storage/function-ACL containment SQL.
- Updated patch dependencies and forced PostCSS 8.5.19; `npm audit` reports zero known vulnerabilities.

### Documentation and governance

- Reconciled active repository documentation to PR #87 / `2999e7e857989baf53ce58ecfed63550b5896be0` and Production `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`.
- Replaced stale architecture, source strategy and roadmap baselines.
- Added canonical current-release, documentation-index, audit and Codex-backlog documents.
- Recorded that independent reviewer approvals are not required in the current phase while objective technical/evidence gates remain.

### Scope boundary

- No Production deployment or promotion.
- No Supabase migration/data write or Auth/hard-mode activation.
- No real provider, geometry, imagery, persistence or source-dependent scoring activation.

## Released — CR-DEV7-002 permanent Quality Gate

### Changed

- Run the permanent GeoAI Quality Gate on pull requests, manual dispatch and pushes to `main`.
- Preserve the exact tested commit, Node/npm versions, TypeScript output and build output in short-lived CI evidence.
- Add permanent Spatial B1 contract and Spatial B2A fail-closed regression checks to the Quality Gate.
- Extend built-application route smoke to current Product and readiness-control routes.
- Reconciled repository governance to the then-current PR #81 inactive release baseline. This is historical; current authority is PR #87.

### Scope boundary

- No Product UI/API, real geometry, Supabase, Auth/RLS, Storage, environment, secret, Figma or deployment change.
- Source-contract CI is not rendered-browser, physical-device, security, official-data, production-ready or pilot-ready certification.

## v0.1 — Public Demo Prototype

Initial public demo baseline for GeoAI MVP.

### Added

- Next.js App Router application structure.
- TypeScript and Tailwind CSS setup.
- Vercel-ready deployment configuration.
- Homepage and `/workspace` route.
- GeoAI top navigation and enterprise-style workspace layout.
- Mapbox GL JS workspace centered on Dubai.
- Safe browser-only Mapbox initialization.
- Point selection with marker and coordinate display.
- Synthetic demo geospatial layers:
  - Development Zones
  - Premium Real Estate Areas
  - Infrastructure Nodes
  - Construction Sites
  - Coastal / Flood Risk Zones
  - Heat Risk Zones
  - Transport Corridors
- Collapsed spatial layer controls with active layer count.
- Demo object selection and visual highlighting.
- Scenario-based Express Analysis using deterministic mock data.
- Scenario types for real estate, investment, construction monitoring, infrastructure planning, climate risk, and custom query.
- Full dashboard-style Express Analysis results.
- Comparison mode for 2-3 selected points or demo objects.
- Comparison dashboard with score table, score cards, winner recommendation, risks, and next actions.
- Print-friendly report preview for Express Analysis.
- Print-friendly report preview for Comparison.
- Static map-window cards in report previews.
- API routes for health and demo objects.
- Documentation baseline for architecture, data strategy, roadmap, and manual QA.

### Current Limitations

- Synthetic/demo data only.
- OpenAI analysis is optional and falls back to deterministic demo content.
- Supabase/PostGIS and persistence foundations are optional prototype paths, not production-grade storage yet.
- No authentication.
- No real GIS, planning, real estate, satellite, or market data adapters.
- Print-preview export only; no server-side PDF generation yet.
