# Architecture Rendering & Exact Implementation Mapping v1

Package: CR-DEV7-003

Status: Review packet; publication not passed

Baseline: `main` merge `754a9c68cd1ee7af80731f1b779df023d54e901e`

## Exact artifact-to-implementation map

| Artifact | Implemented truth represented | Primary code and contract owners | Explicit boundary |
|---|---|---|---|
| C4-001 | Browser user reaches one Next.js demo system with optional Mapbox/OpenAI/Supabase paths and active non-durable fallback | `app/workspace/page.tsx`; `app/api/analyze/route.ts`; `src/lib/supabase/runtime-readiness.ts`; `src/lib/repositories/local-json-store.ts` | External service presence is conditional; current Production is not Supabase-backed |
| C4-002 | Pages, React workspace, route handlers, domain libraries, spatial contract and repository adapters are one deployable Next.js application | `components/workspace-shell.tsx`; `components/map-workspace-client.tsx`; `app/api/*`; `src/lib/*` | Containers are logical code boundaries, not independently deployed services |
| C4-003 | Spatial B2A request → bundle → activation → map adapter → lineage/attribution flow | `app/workspace/page.tsx`; `src/lib/spatial-b2/*`; `components/map-workspace-client.tsx`; `components/spatial-*` | Production permits synthetic fallback only; controlled fixture is Preview/development only |
| BPMN-001 | Criteria-first/map-first selection, deterministic context, structured narrative fallback, score extension, persistence attempt and export | `components/workspace-shell.tsx`; `/api/analyze`; `/api/ai/decision-score`; `/api/analysis-runs`; `/api/report-packages` | Rendering is BPMN-aligned activity, not executable BPMN XML |
| STATE-001 | Candidate statuses, target selection, analysis, comparison, report and source-mode rollback | `WorkspaceShell` React state; `MapWorkspaceClient`; `resolveSpatialActivation` | UI state is not a durable workflow engine state |
| SEQ-001 | Exact client/API ordering for context, deterministic analysis, optional OpenAI, governed score and persistence | `runExpressAnalysis`; analyze/score/analysis-run handlers | OpenAI and persistence failures degrade safely; they are not availability guarantees |
| ERD-001 | Implemented Supabase migration foundation for organization/project/evidence entities | `supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql`; `src/lib/db/schema-readiness.ts` | Schema source exists but current Production runtime is not configured for durable Supabase |
| DATA-LINEAGE-001 | Source/dataset/feature/layer identity flows to activation, selection lineage, visible attribution and evidence | `src/types/spatial-data-v1.ts`; `selection-lineage.ts`; `attribution.ts`; `source-lineage-snapshot.ts` | Provider feature ID, source record ID and canonical feature key remain distinct |
| ACT-001 | Missing, invalid, unapproved, checksum-mismatched and Production requests fail closed to synthetic fallback | `source-mode.ts`; `bundle-loader.ts`; `activation-resolver.ts`; `spatial-b2-integration-check.mjs` | Real geometry stays inactive unless every applicable delivery approval passes |
| DEP-001 | Browser + Vercel Next.js + `/tmp` fallback + optional external services + GitHub exact-SHA quality evidence | `.github/workflows/geoai-quality-gate.yml`; runtime readiness and repository modules | Preview is not Production; CI evidence does not promote or activate Production |
| API-001 | Analysis, context/lineage, project/evidence and control-plane route groups | `app/api/**/route.ts`; `scripts/api-contract-check.mjs` | Route existence is not a data-source or backend activation claim |

The machine-verifiable symbol-level map is `architecture-artifact-manifest.json`. The quality gate fails when a mapped file or symbol disappears or a committed SVG no longer matches its source.

## Runtime, route, schema and payload mapping

| Concern | Entry point | Runtime owner | Payload/schema owner | Current persistence/result |
|---|---|---|---|---|
| Workspace source mode | `/workspace?spatialMode=` | `createSpatialSourceRequest` → `resolveSpatialActivation` | `SpatialSourceRequest`, `SpatialActivationResult` | Production synthetic; controlled non-real fixture in eligible Preview/dev |
| Map selection | `MapWorkspaceClient` callbacks | `WorkspaceShell` selected point/object/AOI state | `SelectedPoint`, `SelectedDemoObject`, `UserDrawnAoi`, `SpatialSelectionLineage` | React state; browser/local support for bounded demo continuity |
| Analysis | `POST /api/analyze` | route handler + optional OpenAI | `AnalyzeRequest`, `StructuredAnalysisResult` | Validated OpenAI JSON or deterministic fallback |
| Decision score | `POST /api/ai/decision-score` | decision-score route | decision-score contract and validation governance | Governed extension; nullable fallback in workspace |
| Analysis history | `GET/POST /api/analysis-runs` | repository adapter | persisted analysis-run payload | Supabase only when ready; otherwise local/API fallback |
| Source lineage | `GET /api/source-lineage` | external source registry readiness | source-group lineage response | Metadata/readiness; does not assert official/live integration |
| Reports | `/api/report-packages`; `/reports/[id]/print` | report-package repository and print UI | report package and map snapshot contracts | Current demo export plus repository fallback semantics |
| Activation control | `/api/platform/activation-status`; `/api/pilot-backend/status` | activation/readiness gates | `RuntimeExecutiveStatus`, Supabase runtime readiness | Current claim remains `not_production_ready_or_pilot_ready` |
| Persistence schema | Supabase migrations | Supabase/PostGIS foundation | migration SQL + schema readiness table list | Present as code; current Production connection absent |

## Review decision required

Independent reviewers must record: logical correctness, code/path accuracy, data boundary accuracy, security/access boundary accuracy, diagram readability, findings and disposition. Until that occurs all artifacts remain Draft/Review and `approved=false`.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
