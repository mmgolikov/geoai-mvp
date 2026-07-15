# GeoAI Current Architecture Baseline

Controlled package: CR-DEV7-003 v1.0

Artifact registry: `docs/artifacts/README.md`

Publication gate: Not passed

## Current bounded runtime

GeoAI is a single Next.js App Router application deployed on Vercel. It serves a public spatial-decision demo with React workspace state, client-side Mapbox when a usable public token is present, deterministic analysis, optional server-side OpenAI narrative generation, route-handler APIs, report flows and repository adapters.

Current Production remains synthetic/local fallback and soft access. Supabase/PostGIS, Storage, Auth, memberships, RLS and hard access have implementation/readiness foundations but are not configured and verified as the active Production backend. Vercel local JSON fallback writes to ephemeral `/tmp` and is not durable Production storage.

## Implemented logical boundaries

- App pages: `/`, `/workspace`, `/projects`, `/explore`, `/demo`, print/report routes.
- Workspace: `components/workspace-shell.tsx` owns target, role/scenario, criteria, candidate, analysis, comparison and report UI state.
- Map: `components/map-workspace-client.tsx` owns Mapbox/fallback-grid rendering, layers, AOI drawing, uploaded data, selection and map snapshot state.
- Analysis: deterministic domain libraries plus `/api/analyze`; OpenAI is optional and validated before merge, with a structured deterministic fallback.
- Spatial B2A: source request, controlled bundle, fail-closed activation, layer catalogue, adapter, selection lineage and visible attribution in `src/lib/spatial-b2/*`.
- Persistence: repository adapters select Supabase only when configured/ready; otherwise local/API or browser/demo fallback is labelled explicitly.
- Control plane: `/api/platform/activation-status`, `/api/pilot-backend/status`, DB/storage/RLS readiness and runtime-status contracts report bounded status without returning secrets.
- Evidence/reporting: analysis runs, comparisons, reports, report packages, validation evidence and source-lineage snapshots have API and schema foundations.

## Spatial and data honesty boundary

Production accepts `synthetic_fallback` only for the B2A source contract. Preview/development can switch to a controlled, invented, non-real fixture that validates integration behavior and attribution contracts without including provider geometry. Missing, invalid, checksum-mismatched or unapproved inputs fail closed to declared synthetic fallback layers.

OSM/Overture references in the controlled fixture test attribution shape; they do not establish that provider feature geometry is present. User-uploaded data stays separately labelled. Mapbox attribution is tied to the actual basemap mode and is absent from the fallback-grid payload.

## Persistence and deployment boundary

Supabase migration files define a pilot-persistence foundation including organizations, profiles, projects, memberships, AOIs, analysis runs, decision scores, reports, comparisons, uploaded datasets, data-room assets, validation/workflow records, source snapshots and audit events. Static schema and RLS foundations do not prove that Production is connected, writable, secure or pilot-ready.

GitHub Actions tests the exact pull-request head or push SHA and preserves evidence. Vercel Preview is a validation target, not Production. Neither CI success nor a READY Preview authorizes Product activation or Production promotion.

## Controlled diagrams

- C4-001 — system context
- C4-002 — logical container architecture
- C4-003 — Spatial B2A exact component map
- BPMN-001 — current core analysis activity flow
- STATE-001 — workspace and spatial source lifecycle
- SEQ-001 — analysis request sequence
- ERD-001 — declared pilot-persistence migration source model; fresh-chain and applied-schema verification remain separate
- DATA-LINEAGE-001 — spatial evidence identity/lineage/attribution
- ACT-001 — spatial package activation and rollback
- DEP-001 — current deployment/data boundary
- API-001 — runtime contract groups

Canonical sources, committed SVGs, hash provenance and implementation references live under `docs/artifacts/`. Independent review remains required before controlled publication.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
