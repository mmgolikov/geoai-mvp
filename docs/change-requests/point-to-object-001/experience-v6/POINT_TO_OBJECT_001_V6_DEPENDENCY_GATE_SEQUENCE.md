# POINT_TO_OBJECT_001 V6 Dependency and Gate Sequence

Status: Candidate implementation sequence; no runtime or release authorization

Date: 2026-09-04

Owner: GeoAI Delivery Architecture

Authority: Dependency plan derived from the current PR #147 candidate and prior repository implementations. It does not authorize merge, Production, hosted Supabase changes, provider activation or protected-data use.

Successor: None. An approved umbrella Change Request must assign owners and authorize each implementation slice.

## Outcome

The next iteration should consolidate product capability in dependency order rather than porting old screens first. GeoContext and scenario/method truth are prerequisites for ranking, comparison, Generative Development, dashboard, report and persistence.

The critical path is:

`baseline -> strict contracts -> adapters -> locale-independent GeoContext + rights scopes -> Scenario Registry operation policies -> DecisionRecord operation gates -> shortlist/compare -> Create/evaluate -> finalize DecisionRecord -> dashboard/report/Project Summary artifact + external DecisionRenderReceipt -> Project Hub -> protected persistence -> exact-head Preview -> separate release decision`

## Hard dependency rules

1. No V6 UI may invent a fact, score or availability state absent from a snapshot/record.
2. No ranking before same-profile candidate snapshots and an approved ranking method.
3. No render before a finalized DecisionRecord and a non-blocked matching operation gate; a later artifact/receipt hash can never be written into that parent record.
4. No context-aware Create evaluation before source snapshot, scenario method and deterministic geometry metrics are bound.
5. No hosted persistence before typed contracts, exact project scope, retention and Auth/RLS gates.
6. No provider output reaches UI/ranking/model without normalization and a current versioned rights-scope receipt explicitly permitting the exact operation, channel, delivery mode and territory.
7. Missing, unknown, expired, due, restricted or prohibited rights scope blocks affected model input, ranking, report/project distribution and export; no scenario flag can override it.
8. No Production/main action is implied by a green Preview.

## Gate plan

| Gate | Scope and owner | Entry criteria | Required work | Exit evidence | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| **G0 — factual baseline and rollback** | Control / Release | Current branch, PR, working tree, CI and Preview can be inspected | Record exact branch head/tree, open Draft PR, current Preview/CI tuple, `main`/Production tuple and rollback point. Reconcile stale PR/receipt text in root-owned files. | Exact immutable baseline and clean/known working tree; no external mutation beyond authorized Preview/docs actions. | Stop integration; do not build on ambiguous head or overwrite history. |
| **G1 — contract acceptance** | Product + Architecture + Data + QA | G0 complete; this package reviewed | Approve field semantics, single-field JCS/hash profiles, subject/snapshot granularity, evidence classes, context sections, rights-scope policy, shared operation vocabulary, registry lifecycle, DecisionRecord lineage, external DecisionRenderReceipt and non-authorizations. | Approved versioned schemas/docs; named open decisions resolved or explicitly deferred. | No V6 runtime implementation; V5.1 remains isolated candidate. |
| **G2 — executable contract kernel** | Engineering + QA | G1 approved | Implement TypeScript DTOs, strict parsers, strict Ajv2020 schema compilation, JCS/hash utilities, semantic reference/graph/rights/operation validators, positive/negative fixtures and adapter interfaces. Do not change UI behavior yet. | Permanent V6 checker plus schema parity, canonical hash/tamper, graph/cycle, locale-exclusion, rights fail-closed, operation mapping and acyclic-render tests pass. | Fail closed; do not persist or render invalid records. |
| **G3 — V5.1 to GeoContext adapter** | Data + Engineering | G2 green | Normalize `LiveMapSelection`, live object evidence, Find coverage and AOI context into locale-independent GeoContextSnapshot V1. Preserve observed/calculated distinction, coverage/freshness gaps, conflicts, attribution, proof limits and complete rights scopes. | Dubai/Singapore object and AOI fixtures show byte-stable truth hashes and parity with existing source facts; source unavailable/partial/capped/ambiguous/unknown-rights adversarial cases pass. | Return partial/blocked snapshot with operation gaps; do not fall back to demo facts. |
| **G4 — Scenario Registry candidate** | Product + Research + Data + Engineering | G2 green; G3 fact-key catalogue available | Migrate ten current scenario IDs and product roles. Define business questions, mode bindings, all eighteen operation policies, context profiles, methods, templates and validation requirements. Preserve current supported/partial/unsupported honesty. | Registry hash/reference/role/mode/operation/method/template validators pass. First end-to-end fixture: `b2b_redevelopment_selected_aoi@1.0.0`. Ranking remains blocked unless separately approved. | Unsupported/under-evidenced operation is disabled with named requirements. |
| **G5 — DecisionRecord and no-recompute path** | Engineering + QA | G3 and G4 green | Implement immutable records, all eighteen operation gates and successor lineage. Adapt Analyse/focused analysis to reuse exact snapshot; add browser-local store adapter; freeze only dashboard/report/Project Summary template refs. | Find/Analyse/follow-up fixture chain resolves all hashes; refresh creates new snapshot/record; unknown rights, tampered/cross-scope/cyclic references and any parent render-artifact hash fail. | No record, no downstream decision UI/export. |
| **G6 — Find discovery, shortlist and factual comparison** | Product + Engineering + QA | G5 green | Keep bounded live discovery. Promote shortlisted candidates to same-profile snapshots. Adapt current shortlist and earlier comparison presentation to DecisionRecord. Do not use mock ranking. | Find -> shortlist -> factual compare -> open Analyse -> return flow passes desktop/mobile/keyboard; missing context blocks only affected comparison fields and displays gaps. | Factual discovery may remain available; ranking/winner stays absent. |
| **G7 — first explainable ranking, optional** | Product + Research + Data + Engineering + QA | G6 green; founder approves one scenario, metrics, formulae, weights, source rights/freshness/coverage | Implement only one scenario-specific ranking method. Record contributions, exclusions, sensitivity and the `rank` gate. Explicitly retire V6 routing to `mock-comparison.ts`. | Same-cohort, weight reconciliation, monotonicity, missing-data, stale/unknown-rights, channel/delivery/territory, tie, sensitivity and counterexample tests pass; independent product review accepts semantics. | Set ranking `null`, keep factual comparison and list blocking gaps. |
| **G8 — context-aware Create and evaluation** | Product + Engineering + Design + QA | G3–G5 green; generation method/provider contract approved; ranking not required | Bind current procedural massing and reversible replacement to snapshot/scenario/DecisionRecord. Add distinct alternatives, assumptions, deterministic area/GFA/coverage metrics, violations and optional provider adapter. Evaluate alternatives only with named methods. | Same input/version repeatability for deterministic layer; geometry validity; no original/new overlap; full rollback; metric reconciliation; provider failure keeps source map and produces no false concept. | Restore source map exactly; mark generation/evaluation blocked or partial. |
| **G9 — unified dashboard/report/Project Hub** | Product + Design + Engineering + Documentation + QA | G5 complete; G6 and/or G8 provide real records | Adapt V5.1/earlier dashboard and print primitives. Finalize the DecisionRecord before rendering; bind templates, source/time/coverage/confidence/gaps and validation tasks; create artifact then external DecisionRenderReceipt. Project Hub indexes immutable refs. | Parent/artifact/receipt acyclic hashes; dashboard/report reference parity; no truth-producing method calls during render; RU/EN preserve parent hashes while producing presentation receipts; print, accessibility, responsive, rights and unknown-project fail-closed tests. | Do not render/share/export if the matching operation/rights gate fails; dashboard may show named gaps only when its own gate permits. |
| **G10 — protected persistence/Auth/RLS, optional and separate** | Security + Data + Engineering + Release | G2/G5 contracts stable; owner approves exact target/migration; retention/deletion/audit/Storage policy defined | Add typed repository and minimal API/RPC projections. Enforce permanent non-anonymous identity, exact project membership/capabilities, RLS and audit. Apply first only to an approved rehearsal target. | Clean/upgrade replay; no-session, wrong-org, no-membership, insufficient-role and positive personas; idempotency/concurrency; Storage/retention/audit receipts; exact target confirmed. | Remain browser-local. No hosted write or partial activation. |
| **G11 — exact-head Preview verification** | QA + Release | Authorized implementation gates green | Run lint/build/contracts/security/data-honesty, focused E2E, route/security smoke, logs, responsive/keyboard/Axe, exact deployment tracing and artifact digests. Validate external-provider degradation. | Exact Git SHA/tree/CI/jobs/artifacts/deployment/URL; manual founder test list; explicit unresolved boundaries. | Keep PR Draft; roll back Preview if needed; never promote partial evidence. |
| **G12 — founder acceptance and release decision** | Founder + Control + Release | G11 exact evidence complete | Decide correction, continuation, merge and/or Production promotion separately. Synchronize repository/Confluence/Figma only within granted authority. | Named approval and new release evidence if actioned. | No merge/Production by inference. |

## Parallel work after G1

The team may parallelize without breaking dependencies:

| Lane | Can start | Must not outrun |
| --- | --- | --- |
| Contract kernel and validators | After G1 | Cannot persist/render until G2 green |
| Existing-code adapter mapping | After G1 | Cannot declare parity until G2/G3 |
| Scenario/JTBD content design | After G1 | Cannot mark modes/ranking enabled before G3 fact catalogue and method evidence |
| Dashboard/report component inventory | After G1 | Cannot port data bindings before G5 |
| Generative provider/build-vs-buy research | Immediately, read-only | Cannot activate provider or assert rights/fit; G8 needs approved method/provider contract |
| UX correction independent of data semantics | Under approved root Change Request | Cannot introduce synthetic values or competing contracts |

## Recommended first implementation slice

The smallest end-to-end slice that de-risks the architecture is:

1. implement all four V1 parsers/hash/semantic validators, using strict Ajv2020 without union-type relaxation;
2. adapt one V5.1 Dubai mapped object into a GeoContextSnapshot;
3. create one candidate registry entry for `b2b_redevelopment_selected_aoi` with Analyse partial, Find partial, Create partial and ranking blocked;
4. create one Analyse DecisionRecord and render the existing V5.1 dashboard from it;
5. finalize that DecisionRecord, issue a report artifact from the same record, and then create an external DecisionRenderReceipt without exporting protected data or calling analysis again;
6. prove a follow-up question reuses the exact snapshot hash and an explicit refresh creates a successor.

This slice validates the shared lineage before migrating the full Workspace or adding sources.

## Gate evidence checklist

Every gate receipt must state:

- exact repository SHA/tree and changed files;
- contract/schema/method/template versions and hashes;
- commands/tests with pass/fail counts;
- fixtures and adversarial cases used;
- runtime environment and whether network/persistence/model/provider execution occurred;
- versioned rights-scope evidence and exact operation/channel/delivery/territory decision, plus coverage, freshness and known gaps;
- whether Supabase/Auth/RLS/Storage, Figma, Confluence, `main` or Production changed;
- rollback point and residual risks;
- status phrased as local candidate, Preview evidence or released truth without conflation.

## Founder decisions required before their dependent gate

| Decision | Latest gate |
| --- | --- |
| Canonicalization/hash profile and snapshot granularity | Before G2 |
| Rights-scope vocabulary, review cadence and first permitted operation/channel/delivery/territory tuples | Before G3/G7/G9 activation |
| First scenario business question and context requirements | Before G4 fixture acceptance |
| Whether any ranking is needed in the next Preview | Before G7; G6 works without it |
| Ranking metrics/formula/weights and evidence sufficiency | Before G7 implementation |
| Generation provider versus current procedural-only spike | Before provider work in G8 |
| Browser-local versus protected hosted persistence | Before G10 |
| Client-shareable report templates | Before G9 share/export status |
| Merge/Production | Only after G11, as G12 |

## Open architecture questions

1. Should object and site remain distinct subject types, or should site be an object role? V1 keeps both to preserve business meaning while sharing geometry rules.
2. Which context radii/profiles are necessary per scenario and city? The current fixed 400 m object context is not a universal default.
3. What acquisition-window tolerance is acceptable for candidate comparison by source class?
4. Which source/method can support the first honest ranking? Current open-map tags alone do not support the major B2B rankings.
5. Which outputs require human validation/sign-off before client sharing?
6. What retention/deletion policy applies to protected geometries, prompts, model outputs and reports?

## Non-authorizations

No gate in this plan self-authorizes the next one. This plan does not approve source activation, Figma mutation, hosted Supabase writes/migrations, Auth/RLS/Storage activation, merge, Production promotion or pilot-ready/official claims.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
