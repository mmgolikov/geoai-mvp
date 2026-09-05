# Scenario Registry V1 Contract

Status: Candidate implementation contract; not runtime-active

Date: 2026-09-04

Owner: GeoAI Product Architecture

Authority: Contract design for the POINT_TO_OBJECT_001 V6 candidate. It does not approve any scenario for live ranking, client use or Production.

Successor: None. Schema identifier: `urn:geoai:scenario-registry:1.0.0`.

Machine contract: `SCENARIO_REGISTRY_V1.schema.json`.

## Purpose

The Scenario Registry is the versioned product-method authority that connects a user's role and business question to the exact Analyse/Find/Create behavior, required GeoContext, approved methods, ranking rules, dashboard/report templates and validation gates.

It replaces the current split across:

- `src/lib/explore/scenarios.ts` labels and demo filter definitions;
- `point-to-object-find-capabilities.ts` open-map capability rules;
- analysis prompt/goal switches;
- dashboard/report conditionals;
- Create templates and implicit method choices.

The registry is configuration, not evidence. A scenario marked `enabled` only allows an application path under its release environment; it does not prove data coverage, commercial validity, planning permission or official validation.

## Registry envelope

| Field | Purpose |
| --- | --- |
| `schemaId`, `schemaVersion` | Exact machine contract. |
| `registryId`, `registryVersion`, `registryHash` | Immutable registry identity/version/hash. |
| `status` | `draft`, `candidate` or `released`; only a separate release authority can set `released`. |
| `generatedAt` | Registry assembly timestamp. |
| `roles` | Canonical B2B/B2C preference roles; never authorization roles. |
| `contextProfiles` | Reusable GeoContext requirements. |
| `methods` | Versioned query/calculation/model/generation/evaluation methods. |
| `dashboardTemplates`, `reportTemplates` | Versioned view contracts that bind outputs without recomputation. |
| `scenarios` | Business-question entries linking all elements. |
| `governance` | Claim policy, validation boundary and caveat. |

## Scenario entry

Each entry must contain:

1. identity/version/lifecycle status and B2B/B2C audience;
2. allowed preference roles;
3. one business question with localized text, decision type, decision owner and horizon;
4. supported subject types, explicit `modeBindings` for Analyse, Find and Create, and one `operationPolicy` for every shared operation;
5. one context profile reference;
6. method references for acquisition, calculation, AI, ranking, comparison, generation and evaluation as applicable;
7. a ranking policy that is explicitly `enabled`, `blocked` or `not_applicable`;
8. dashboard and report template references;
9. validation requirements, required project capabilities and a claim cap;
10. localized limitations and change-control metadata.

## Role semantics

Registry roles are product preferences used to choose questions, terminology and templates. They never grant project or data access. Authorization remains an independently verified identity, project membership, capability and RLS decision.

The current role IDs may be migrated as stable preferences:

- B2C: `tourist`, `resident_expat`, `home_buyer`, `renter`, `investor_buyer`, `family_relocation`;
- B2B: `developer`, `real_estate_fund`, `bank_lender`, `insurer`, `government_urban_authority`, `infrastructure_operator`, `consultant_broker`, `family_office`, `asset_manager`.

## Mode binding semantics

Every scenario contains exactly one binding for each of `analyse`, `find` and `create`:

- `enabled`: the mode is implementable when its context/method gates pass;
- `partial`: a bounded subset is available and limitations are shown;
- `blocked`: the mode must not execute; the binding lists blocking requirements;
- `not_applicable`: the business question does not use that mode.

A mode binding declares subject types, method IDs, produced output keys, localized limitation and the operations it may invoke. UI availability is derived from this binding; it is not maintained as a second capability map.

## Shared operation and gate mapping

All GeoContext, Scenario Registry, DecisionRecord and DecisionRenderReceipt contracts use exactly this vocabulary:

`resolve`, `acquire`, `normalize`, `calculate`, `analyse`, `find`, `shortlist`, `compare`, `rank`, `create`, `generate`, `evaluate`, `model_input`, `dashboard`, `report`, `project`, `export`, `persist`.

Every scenario has exactly one `operationPolicy` for each value with `enabled`, `partial`, `blocked` or `not_applicable` status. A blocked policy names at least one validation requirement. The UI-mode mapping is explicit rather than inferred:

| UI mode | Core operations | Optional gated downstream operations |
| --- | --- | --- |
| Analyse | `resolve`, `acquire`, `normalize`, `calculate`, `analyse` | `model_input`, `dashboard`, `report`, `project`, `export`, `persist` |
| Find | `acquire`, `normalize`, `find`, `shortlist` | `analyse`, `compare`, `rank`, `dashboard`, `report`, `project`, `export`, `persist` |
| Create | `create`, `generate`, `evaluate` | `model_input`, `dashboard`, `report`, `project`, `export`, `persist` |

The mode binding lists the subset used by that scenario. A method's `operation`, every fact/validation `blocks` entry, snapshot/record operation gates and the external render operation must use the same enum. Scenario status never overrides a blocked snapshot rights/coverage/freshness gate.

## Context profile

A context profile declares:

- required and optional canonical GeoContext sections;
- radius/extent rules and acquisition-window tolerance;
- required fact keys with necessity, allowed evidence classes, maximum age, minimum coverage and absence semantics;
- comparison cohort policy: same profile/version, compatible acquisition window and exact metric definitions;
- which missing facts block any named operation, including Analyse, comparison/ranking, Create/generation/evaluation, report, Project Hub, export or persistence.

`maximumAgeSeconds=null` means no approved freshness threshold exists; it is not infinite freshness. `minimumCoverage=unknown_allowed` may support display but cannot support absence claims or an enabled rank unless the method explicitly permits it.

## Method registry

Every method is separately versioned and identifies:

- operation and implementation kind;
- client/server/operator execution plane;
- deterministic versus model behavior;
- required input fact keys and produced output keys;
- timeout/output/cost caps where relevant;
- model policy or provider adapter reference where relevant;
- failure behavior: fail closed, return partial or mark unavailable;
- validation and explainability requirements.

Provider names and credentials are runtime configuration, not embedded secrets. A provider may be replaced only if the method version or provider receipt makes the change explicit.

## Ranking policy

Ranking is disabled by default. `ranking.status=enabled` requires:

- a versioned ranking method;
- at least two candidates with `GeoContextSnapshot`s under the same context profile/version and compatible acquisition window;
- named metrics with direction, weight, transform and required fact keys;
- weights summing to exactly `1.0` after decimal normalization;
- an explicit missing-data policy;
- metric-level contributions and excluded/blocked reasons in the DecisionRecord;
- no synthetic/demo fact, unsupported value, blocking gap or source lacking explicit operation/channel/delivery/territory rights contributing to the result;
- wording limited to a screening preference, never “approved”, “best use” or guaranteed investment result.

When these conditions are not met, factual comparison remains possible but ranking is `blocked` with reasons.

## Dashboard and report bindings

Templates define sections and required output/fact keys. They do not calculate values. Both dashboard and report read the same already-final DecisionRecord and GeoContext snapshot references. A missing required value renders as a named gap; it is never replaced with a demo default. Template IDs/versions are frozen in `DecisionRecord.renderPolicy`; render manifests and artifact hashes exist only in a later external `DecisionRenderReceipt`.

## Initial migration disposition for existing scenarios

This table defines only the migration posture; it does not populate or enable the registry.

| Existing scenario | Initial V6 status | Reason |
| --- | --- | --- |
| `b2c_point_context` | Candidate / Analyse enabled, Find partial, Create not applicable | Open-map context can support bounded factual exploration; price, quality and personal suitability remain unsupported. |
| `b2c_tourist_objects_route` | Candidate / Analyse partial, Find partial, Create not applicable | Places can be discovered; route feasibility, opening hours and ticket/access state need additional sources/methods. |
| `b2c_residential_context` | Candidate / Analyse partial, Find partial, Create not applicable | Nearby mapped amenities are useful; listings, prices, commute, school quality and safety require other evidence. |
| `b2c_new_residential_projects` | Candidate / Find partial | OSM construction/residential tags do not prove a new, permitted, active or available project. |
| `b2c_interest_routes` | Candidate / Find partial | Discovery only until routing, hours, demand and journey methods exist. |
| `b2b_redevelopment_selected_aoi` | Candidate / Analyse partial, Find partial, Create partial | Best first end-to-end V6 example. Ownership, condition, planning, demolition and economics remain blocking validation gaps. |
| `b2b_redevelopment_100ha` | Blocked for live Find/ranking | Requires land parcels, planning controls, infrastructure capacity and a scalable search method beyond OSM tags. |
| `b2b_lowrise_luxury_residential` | Candidate / Find partial | Mapped residential form cannot establish luxury, price, plot rights or suitability. |
| `b2b_hotel_development` | Candidate / Analyse/Find partial | Hospitality context is observable; demand, competition quality, rights and feasibility are absent. |
| `b2b_commercial_real_estate` | Candidate / Analyse/Find partial | Mapped use context is available; vacancy, rent, transactions, tenants and planning compliance are absent. |

No migrated scenario receives an enabled ranking until a separate method/data approval passes.

## Example binding shape

The first recommended registry fixture is `b2b_redevelopment_selected_aoi@1.0.0`:

- roles: developer, real-estate fund, urban authority, consultant/broker;
- question: “Which redevelopment hypotheses should be tested for this selected site, and what evidence could invalidate them?”;
- subjects: object/site/AOI;
- Analyse: bounded identity and GeoContext decision brief;
- Find: observed construction/industrial/residential/commercial discovery only;
- Create: procedural alternative generation and reversible visualization;
- context: identity/geometry, built environment, land use, mobility, infrastructure, public realm, environmental context, market context and risks;
- ranking: blocked until planning, rights, market/economics and comparable coverage requirements are met;
- dashboard/report: factual context, alternatives, assumptions, gaps and validation plan;
- claim cap: open-context screening.

## Hash and change control

Each scenario first receives `entryHash = sha256(JCS-compatible canonical JSON of that scenario entry with only entryHash omitted)`. The registry is then finalized as `registryHash = sha256(JCS-compatible canonical JSON of the complete registry with only registryHash omitted)`. Recomputing the outer registry hash cannot repair or conceal a stale/mutated scenario-entry hash; both hashes must validate independently.

Any change to roles, business question, required context, method version, ranking metrics/weights, template version, validation or claim policy creates a new registry version. Existing DecisionRecords continue to reference the prior exact registry/scenario versions.

## Semantic validation beyond JSON Schema

The registry validator must prove:

1. globally unique IDs and versions;
2. every reference resolves exactly once;
3. each scenario has exactly three unique mode bindings and exactly eighteen unique operation policies;
4. role audience matches scenario audience;
5. mode methods have compatible operations and subject types, and mode-to-operation mappings agree with operation policies;
6. required fact keys exist in the referenced context profile;
7. dashboard/report output refs are produced by scenario methods or snapshot facts;
8. ranking weights equal 1.0 and ranking method/metrics exist when enabled;
9. blocked modes, operation policies and ranking list at least one blocking requirement;
10. model methods contain caps and validation policy;
11. product roles cannot appear as authorization capabilities;
12. no retired method/template is referenced by a candidate/released scenario;
13. registry hash and scenario-entry hashes reconcile;
14. every required source operation is separately rights-cleared for the actual channel, delivery mode and territory before execution.

## Non-authorizations

The schema does not approve any source, ranking formula, commercial hypothesis, protected data path, hosted migration, merge or Production release. Existing open-map capability remains bounded and non-official.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
