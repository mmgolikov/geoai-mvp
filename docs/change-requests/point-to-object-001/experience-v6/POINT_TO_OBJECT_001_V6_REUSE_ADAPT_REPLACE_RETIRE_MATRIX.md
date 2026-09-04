# POINT_TO_OBJECT_001 V6 Reuse / Adapt / Replace / Retire Matrix

Status: Candidate implementation architecture; not a release authority

Date: 2026-09-04

Owner: GeoAI Product Architecture

Authority: Read-only reconciliation of the PR #147 V5.1 baseline at `d85ef69624bc79c50af788c165c0760dcab01c8f`, the subsequent root-owned Find drawer correction at `5b6567afb5ef674bb3a170dbd44744005b8a02b3`, and relevant repository history. This document does not authorize merge, Production promotion, hosted data changes, source activation or external claims.

Successor: None. Any implementation must be governed by an approved Change Request and exact-head evidence.

## Executive decision

The V6 product line should not restore the previous Workspace wholesale and should not extend V5.1 as a separate demo island. The safe consolidation boundary is:

- use the V5.1 point-to-object implementation as the canonical live map, object identity, open-context and reversible Create foundation;
- reuse the earlier Workspace only for workflow patterns and components that do not embed demo facts or synthetic ranking;
- replace the fragmented data models with three versioned contracts: `GeoContextSnapshot`, `ScenarioRegistry` and `DecisionRecord`;
- retire synthetic candidate generation, mock weighted scoring and any dashboard/report path that recomputes a result independently of the stored decision lineage;
- keep Preview, Production, source-rights and protected-persistence gates separate.

The target flow is:

`Analyse / Find -> shortlist -> compare -> object dashboard -> Create alternatives -> evaluate -> report -> Project Hub`

Every consumer after context acquisition reads the same immutable `DecisionRecord` and referenced `GeoContextSnapshot` hashes.

## Audit baseline

| Evidence | Current finding |
| --- | --- |
| V5.1 map-first | `components/point-to-object/live-object-map.tsx` and `prototype-client-v5.tsx` provide real map interaction, mode-safe selection, 2D/3D, object/AOI handling and reversible building replacement. |
| V5.1 context | `point-to-object-live-evidence.ts`, `point-to-object-area-context*` and the strict point-to-object evidence contracts provide bounded OpenStreetMap-derived identity/context, geometry metrics, source receipts and claim controls. Runtime open-map results remain non-persistent and provider-dependent. |
| V5.1 Find | `point-to-object-find-contract.ts` returns a capped current-view sample ordered by source identity. `point-to-object-find-capabilities.ts` maps the ten existing scenario identifiers to supported/partial/unsupported open-map capability. Browser shortlist/comparison is limited to observed fields and three candidates. |
| V5.1 Analyse | `analysis-client.tsx`, `live-types.ts` and `point-to-object-ai*` provide bilingual evidence-bound decision briefs, telemetry and follow-up analysis. The result contract is specific to this prototype and does not yet bind Workspace reports/projects. |
| V5.1 Create | `point-to-object-create.ts`, `create-panel.tsx` and `point-to-object-map-replacement.ts` provide procedural massing, structured programme validation and exact visual rollback. Output is conceptual and not a CAD/BIM, planning or feasibility result. |
| Earlier criteria-first | `src/lib/explore/scenarios.ts`, `src/lib/explore/types.ts` and `workspace-shell.tsx` contain useful audience/role/scenario/input patterns, but candidates in `src/lib/explore/candidates.ts` are seeded and include synthetic scores. |
| Earlier comparison/ranking | `components/comparison-dashboard.tsx` contains reusable responsive presentation. `src/lib/mock-comparison.ts` computes demo weighted scores and a winner from synthetic/seed inputs; that computation is not an acceptable V6 decision method. |
| Earlier dashboard/reports | `express-dashboard.tsx`, `components/reports/*`, `report-package/*` and print routes contain useful layout/export primitives. Their current inputs include broad `unknown` payloads and demo-derived score semantics. |
| Earlier Project Hub/data | `project-dashboard/*`, `project-workspace-types.ts`, browser artifact stores and repository adapters provide project organization and fail-closed project-key patterns. Protected hosted operation remains gated; several payload fields are still `unknown`. |
| Auth/RLS | Existing request-scoped authorization, capability and RLS verification plans are reusable security foundations. Profile audience/role preferences are not authorization. Candidate migrations and hosted activation remain separately gated. |
| QA/release | V5.1 contract, browser, build, route, data-honesty and exact-Preview checks are strong reusable controls. They do not prove protected persistence, real-user personas, source completeness, official validation or Production readiness. |

### Repository-history anchors reviewed

| Historical increment | What it contributed | V6 interpretation |
| --- | --- | --- |
| `b7f7b5e` / `e5355e4` — Explore scenario shell and embedded command panel | Audience, role, scenario, map-first/criteria-first and filter vocabulary | Useful product taxonomy; candidate data/scoring is not evidence. |
| `0619acc` through `c61b50f` — Pilot UX v3.0–v3.6 | Dashboard hierarchy, criteria workflow and responsive BI presentation | Reuse presentation patterns only after DecisionRecord binding. |
| `a2e5f2b`, `8517688`, `232e51d` — project workspace, persistence and Project Hub alignment | Project-scoped histories, report/comparison organization and source snapshots | Adapt repository/project seams; replace broad payload contracts and retain fail-closed scope. |
| `60bcb9f`, `a0d702d`, `aef2b2e`, `f43b6af` — report/export packages and corrections | Print primitives, report composition, caveat/source presentation | Reuse render primitives; report truth must come from one DecisionRecord. |
| `02b2109`, `d423631`, `232fb53`, `77ac593` — access/profile/scoped-read foundations | Product profile, project access and route-gate patterns | Reuse security foundations; preference role remains non-authoritative. |
| `575cfbe`, `33b13f0`, `74d7e34` — accessibility/mobile QA | Keyboard, Axe, responsive and comparison coverage | Extend with contract/hash/no-recompute evidence. |
| `6e65f9b`, `2124379`, `358575e`, `789b197` — V5/V5.1 live map through exact interaction contract | Multicity Analyse/Find/Create, reversible replacement, focused AI recovery and localized/profile E2E | Canonical current interaction/context foundation for V6 adapters. |

## Decision matrix

`Reuse` means consume without changing product semantics. `Adapt` means retain the implementation asset but change its contract or binding. `Replace` means a new canonical implementation must supersede the existing behavior. `Retire` means the behavior must not be reachable from V6, although historical evidence remains immutable.

| Capability | Current / prior asset | Decision | V6 target and migration action | Acceptance gate |
| --- | --- | --- | --- | --- |
| Map-first object selection | V5.1 `live-object-map.tsx`, trusted source identity, oversized/background feature rejection | **Reuse** | Keep Analyse as the only idle object-selection owner. Emit a `subjectRef` and geometry hash suitable for a `GeoContextSnapshot`; do not change selection truth in UI components. | Existing interaction tests plus subject/hash parity test; Find/idle Create clicks cannot select background geometry. |
| Point, object and AOI identity | V5.1 resolver/evidence contracts and AOI validation | **Adapt** | Normalize point/object/site/AOI into the V1 subject contract. Preserve ambiguity, containment, coordinate-association and proof-limit receipts. | JSON Schema + semantic cross-reference validation; ambiguous identity cannot become a selected object without an explicit assertion. |
| AOI draw/upload | V5.1 Create and earlier AOI library/GeoJSON validation | **Adapt** | Use one AOI validator and geometry canonicalization profile. Keep raw geometry local until protected Storage/persistence is authorized. | Existing 11-persona AOI adversarial gate plus canonical geometry-hash fixtures. |
| Criteria-first intent | Earlier `explore/scenarios.ts` role/scenario/filter definitions | **Adapt** | Migrate the ten scenario IDs into a versioned Scenario Registry. Replace free labels such as `scoringModelLabel` with method, context, ranking, dashboard, report and validation references. | Registry schema and semantic validator; every enabled mode references existing method/context/template IDs. |
| Criteria-first execution | V5.1 bounded Overpass Find and capability map | **Adapt** | Separate discovery from decision evaluation. Discovery may return shallow observed candidates; shortlist/rank promotion requires a frozen context snapshot per candidate under one profile/version. | Bounded request limits, rights/attribution, acquisition receipt and same-profile cohort tests. Unsupported scenarios fail closed. |
| Dynamic place search | V5.1 server-side Photon suggestions and explicit Nominatim fallback | **Reuse** | Keep it as navigation/subject-discovery assistance, not evidence of suitability or source completeness. Selected identity still passes the canonical resolver. | Rate/cache/abort/localization tests; no browser-direct provider call; selected identity is re-resolved and hash-bound. |
| Shortlist | V5.1 browser shortlist (maximum three) and earlier Explore compare-list interaction | **Adapt** | Retain interaction patterns, but persist only references to immutable candidate subjects/snapshots. Add explicit states `discovered`, `shortlisted`, `excluded`, and `blocked_for_comparison`. | No candidate can enter comparison without required snapshot/profile/hash; session restoration preserves exact refs, not copied claims. |
| Ranking | Earlier `mock-comparison.ts`, seeded candidates and deterministic demo weights | **Retire + Replace** | Remove synthetic score/winner computation from the V6 route. New ranking is scenario-versioned, metric-level explainable and permitted only when the Scenario Registry declares an enabled method and the evidence cohort passes. | No `demo_seed`, `sample` or missing required metric contributes to an enabled rank; weights, direction, transforms, missing-data policy and contributions reconcile exactly. |
| Comparison | V5.1 observed-field comparison and earlier `comparison-dashboard.tsx` | **Adapt** | Reuse accessible responsive presentation, replace scorecard inputs with `DecisionRecord.candidateSet` and method outputs. Allow factual comparison without ranking when the rank gate is blocked. | Dashboard values equal DecisionRecord bytes/refs; gaps remain visible; no independent scoring or winner text. |
| Individual dashboard | V5.1 `analysis-client.tsx` and earlier `express-dashboard.tsx`/BI primitives | **Adapt** | Compose one dashboard template from snapshot facts, method outputs, claims, gaps and validation tasks. Keep useful V5 decision brief; remove prototype-specific duplication and demo score assumptions. | Every displayed claim/metric resolves to a fact or method output; locale changes presentation only, never underlying values/hashes. |
| GeoContext and evidence | V5.1 live evidence pack, deterministic point-to-object contract, source-lineage utilities | **Adapt** | Make `GeoContextSnapshot V1` the canonical immutable context envelope across Analyse, Find, Create, compare and report. Map V5 `derived` to V1 `calculated`; distinguish modelled output from screening hypothesis. | Schema, semantic graph, hash, coverage/freshness/confidence/gap and tamper fixtures pass. No negative observation becomes absence without measured coverage. |
| Follow-up analysis | V5.1 focused AI flow and evidence validator | **Adapt** | Use the same snapshot hash and DecisionRecord lineage unless the user explicitly refreshes context. Model output creates modelled facts/claims; it cannot rewrite observed/calculated facts. | Prompt projection hash, model receipt, evidence refs and claim-policy validation; refresh creates successor records. |
| Create / Generative Development | V5.1 programme validation, procedural massing and reversible map replacement | **Adapt** | Retain deterministic visualization and rollback. Bind generation inputs to one snapshot/scenario/method version; store alternatives, assumptions, calculated geometry metrics, violations and provider receipt as DecisionRecord artifacts. | Existing replacement rollback gate plus repeatability, geometry validity, metric reconciliation and alternative-difference tests. Concept remains a modelled screening output. |
| Reports/export | `components/reports/*`, print primitives/routes and `report-package/*` | **Adapt** | Reuse rendering/print/accessibility primitives. Replace generic `unknown` report payloads with a DecisionRecord reference and a frozen render manifest. Report generation cannot call analysis/ranking again. | Report values/hashes match the source DecisionRecord; caveat, source/time/coverage/gaps and validation requirements are present; deterministic re-render test. |
| Project Hub / data room | Project dashboard, browser artifact index, repository adapters and project-key fail-closed behavior | **Adapt** | Use Project Hub as an index of DecisionRecords, snapshots, reports, validation tasks and source artifacts. Preserve local/public-demo mode until protected persistence is explicitly activated. | Unknown/wrong project fails closed; cross-project references rejected; browser/local and hosted modes are visibly distinct. |
| Shared shell, profile and localization | V5.1 prototype header/locale provider; earlier product navigation/profile/shared shell | **Adapt** | Converge on one product shell and one localization source. Keep audience/role preferences separate from project access and RLS roles. Do not port historical page-body redesigns by assumption. | Desktop/tablet/mobile/200% zoom, keyboard and Axe checks; profile preference cannot grant a capability. |
| Data types and persistence | `project-workspace-types.ts` (`unknown` payloads), browser stores, repository adapters, staged point-object persistence migration | **Replace contract; adapt adapters** | Introduce typed snapshot/registry/decision DTOs first. Add storage adapters only after immutable IDs/hashes, tenant/project scope and retention are defined. No hosted write is part of this package. | Compile-time DTO parity, JSON Schema validation, idempotency/tamper tests, then separate migration/RLS approval and replay. |
| Integrations | V5.1 Photon/Nominatim/Overpass/OpenAI; source registry and connector foundations | **Adapt** | Put every provider behind a source/method adapter that emits receipts. Provider output is never directly rendered or sent to a model. Add sources only after rights, allowed use, coverage, custody, freshness and rollback are approved. | Allowlist, timeout, size/rate limit, response minimization, rights and provenance tests; source failure produces partial/blocked context without fabrication. |
| Auth and RLS | Request-scoped access kernel, capability map, RLS plans/rehearsal | **Reuse foundation; activation gated** | Keep public-demo records browser-local. For protected persistence, require permanent non-anonymous identity, exact project membership/capability, minimal RPC surface and RLS personas. Profile role is not an auth role. | Separate approved migration; exact-target replay; no-session/wrong-org/no-membership/insufficient-role/positive persona tests; audit receipt. |
| QA and release governance | Existing V5.1 source checks, E2E, build, data-honesty, exact-head Preview receipts | **Adapt** | Add schema compilation, semantic cross-reference, canonical hash, same-cohort, no-recompute, model-claim, report parity and successor-lineage gates. Keep release evidence distinct from product acceptance. | All local gates plus exact-head CI/Preview; founder acceptance recorded separately; `main`/Production remain unchanged without explicit authority. |

## Explicit retirement list

The following may remain in history but must not power V6 decisions:

1. `src/lib/mock-comparison.ts` weighted scores, winner and generated rationale.
2. `src/lib/explore/candidates.ts` seeded candidate scores as live-market or decision evidence.
3. `createMockExpressAnalysis` or any equivalent fallback presented without an explicit synthetic/demo state.
4. Report/dashboard values recomputed from map state instead of read from a frozen DecisionRecord.
5. Broad `unknown` payload persistence for new V6 analysis, comparison or report records.
6. UI role/audience preferences interpreted as authorization.
7. Provider response objects passed directly to UI, ranking or LLM without normalization and a source receipt.

Retirement is a routing and contract decision, not permission to delete historical code or evidence in this change.

## Migration seams

| Existing seam | V6 adapter responsibility |
| --- | --- |
| `LiveMapSelection` | Produce canonical subject/geometry/identity references; preserve association and resolution limits. |
| `LivePointObjectEvidencePack` / point-to-object evidence bundle | Normalize source receipts, facts, context sections, conflicts and gaps into `GeoContextSnapshot V1`. |
| `PointObjectFindResult` | Produce discovery candidates and acquisition coverage; do not create a rank. |
| `PointObjectAiResponse` | Produce model receipts and evidence-bound modelled claims that reference immutable snapshot facts. |
| `ConceptMassingResult` | Produce generation artifact refs, deterministic calculated metrics and modelled alternative claims. |
| `ExploreScenario` | Migrate to Scenario Registry entry; labels and filters alone are insufficient. |
| `ComparisonResult` | Replace with DecisionRecord candidate set/ranking output. |
| `WorkspaceAnalysisRun`, `WorkspaceComparisonSet`, `WorkspaceReport` | Store typed DecisionRecord/snapshot/report refs; remove new `unknown` payload writes. |

## Risks and unresolved decisions

| Question | Required decision before implementation |
| --- | --- |
| Canonical JSON | Approve the specified JCS-compatible canonicalization and exact excluded hash field for all three contracts. |
| Snapshot granularity | Confirm one snapshot per candidate/subject and one shared acquisition window for comparison; do not use a single mutable city-wide blob. |
| Freshness policy | Define scenario/source-specific maximum age; V1 supports `unknown` and fail-closed gates rather than inventing one global TTL. |
| Ranking | Approve the first scenario with sufficient evidence, metric formulae and weights. Existing ten scenarios do not receive ranking merely by registry migration. |
| Project persistence | Decide browser-only continuation versus a separately approved protected Supabase activation. This package authorizes neither. |
| Report status | Decide which report templates are internal screening outputs versus client-shareable artifacts; both retain the mandatory caveat. |

## Non-authorizations and mandatory caveat

This matrix does not authorize Figma changes, provider activation, hosted Supabase writes/migrations, Auth/RLS activation, merge, Production deployment or official/commercial claims.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
