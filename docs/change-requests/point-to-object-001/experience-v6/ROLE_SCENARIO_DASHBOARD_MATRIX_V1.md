# GeoAI — Role, Scenario and Decision Dashboard Contract v1

Status: Approved sprint design contract; first two presentation presets implemented as a candidate; not commercial or physical-device acceptance.
Date: 2026-09-10
Authority: [Sprint07 CR](SPRINT07_USER_JOURNEY_RECOVERY_CR.md)

## 1. Product decision

GeoAI should return a decision workspace, not a long generic AI essay. A role determines which decision matters; a scenario determines the question, evidence requirements, card order and next action. Neither a professional role nor a B2B/B2C choice grants access rights.

The shared journey is: selected point / mapped object / AOI → confirmed selection identity → available context → scenario cards → compare alternatives → saved result → explicit refresh or export. A general map overview must not silently open the previous object's Analyse form. Every successful operation has its own immutable payload and owner-scoped project membership.

The model may interpret a bounded evidence pack. It does not invent dashboard layouts, numerical scores, source availability, legal conclusions or access privileges. Dashboard structures are versioned deterministic configuration.

## 2. Segments and implementation boundary

| Segment | Primary product job | Near-term status |
|---|---|---|
| B2B | Reduce the time and uncertainty of a site shortlist or early redevelopment review | Priority for commercial discovery; development-screening presentation preset implemented |
| B2C | Explain neighbourhood trade-offs for living, moving or visiting | Living/relocation presentation preset implemented on the same evidence; no separate acquisition or monetisation programme yet |
| B2G / B2B2G | Support territorial monitoring and evidence exchange with authorities | Extension specification only; official datasets, procurement and access controls are separate gates |

Version `ROLE_DECISION_CARDS_V1` implements two views of an existing report: `development` and `living`. Changing the viewing profile reorders cards, changes the decision question and chooses relevant infrastructure groups without calling AI. It does not change the stored report, claim that all roles are fully supported, or translate saved prose automatically. A language-specific report update is an explicit AI action.

The implemented `development` view is labelled **Development context**: it is a point-centred context pre-check, not the complete commercial site-comparison pack. The UI names the original report perspective below the viewing profile so a Living view cannot silently relabel developer-oriented reasoning. A paid comparison pack additionally needs agreed criteria, comparable sites, constraints evidence, review and explicit customer acceptance.

## 3. Role-to-scenario matrix

Each row defines supported *design* combinations; all other combinations are unavailable rather than silently mapped to a misleading template. “Candidate” means the evidence contract can support a limited version, not a validated customer offer. Future source-dependent cards must show missing evidence, not synthetic data.

| Segment / role ID | Allowed scenario families | Decision and valuable question | Mandatory dashboard cards | Additional input / source gate | MVP status and next action |
|---|---|---|---|---|---|
| B2B / developer | Site screening; selected-AOI redevelopment; low-rise residential; hotel; commercial | Is this site worth detailed feasibility, and what should be checked first? | Identity, district mix, transport, existing buildings, programme assumptions, constraints/checklist; A/B massing only for Create | User brief + boundary; official planning/parcel controls and engineering capacity for feasibility | Candidate development preset. Select 2–4 sites → evidence comparison → request a site review |
| B2B / real_estate_fund | Acquisition screening; portfolio comparison; redevelopment | Which assets merit diligence, and which evidence could reverse the decision? | Identity, access, context, comparable-data coverage, income/capex/risk gaps, sensitivity inputs | Client rent roll, operating history, transaction rights and comparable definitions | Spec only beyond context. Do not show yield or valuation without inputs |
| B2B / family_office | Long-horizon acquisition; multi-asset allocation | What concentration, location and liquidity risks need specialist diligence? | Portfolio exposure map, location comparison, evidence quality, holding-cost and exit assumptions | Portfolio holdings, mandate, verified transactions and currency/date basis | Spec; same source-backed site comparison, no investment advice automation |
| B2B / bank_lender | Collateral screening; construction exposure | Which exposures require a site visit or valuation review? | Identity, asset status, change evidence, hazard coverage, collateral-document gaps | Authorised loan/asset records, certified valuations, dated imagery, regulatory policy | Spec; no credit score or lending recommendation from OSM |
| B2B / insurer | Exposure screening; accumulation; event triage | Where do verified hazards or damage observations justify inspection? | Exposure map, hazard layer coverage, observation date, accumulation, inspection queue | Licensed hazard models, insured values, policy terms and claims evidence | Spec; not a risk premium or damage certification |
| B2B / asset_manager | Asset context; maintenance prioritisation; repositioning | Which assets need action and what is the operating consequence? | Access, services, condition records, maintenance/change timeline, action ownership | Owner asset register, work orders, inspections, occupancy | Context candidate; condition/operations remain missing until provided |
| B2B / consultant_broker | Client shortlist; location evidence pack; proposal support | Can I explain why these sites were selected and where evidence is weak? | Numbered candidates, comparable context, source lineage, constraints, client-ready report | Client criteria, permissions for redistribution and factual client data | Near-term channel hypothesis; buyer and end-client must be distinguished |
| B2B / infrastructure_operator | Corridor/object context; access and intervention planning | Where are access constraints and what nearby assets are affected? | Route/object identity, network connectivity, surrounding assets, intervention zones | Network graph, capacities, engineering drawings and rights-of-way | Spec; point proximity is not connectivity or network capacity |
| B2G / government_urban_authority | Land/object monitoring; redevelopment district; change triage | Which cases require official inspection or coordinated review? | Dated change map, authorised object register, constraint overlays, case queue, audit trail | Official record access, licensed imagery, mandate and permissions | Separate B2G extension. Do not imply existing authority integration |
| B2C / resident_expat | Residential context; local orientation | What is nearby and what must I verify for everyday life? | Daily infrastructure, transport proximity, district mix, named places, visit checklist | User destinations, route provider and current operating details | Limited living preset; no live commute or safety score |
| B2C / family_relocation | Neighbourhood shortlist; family amenities | Which neighbourhoods fit our essential needs and which facts are missing? | Schools/health/daily-needs mix, access, parks/culture, housing-cost gaps, school-admission checklist | Family priorities without sensitive profiles; schools' current admissions, travel routes, housing quotes | Living preset implemented; school count is not school quality or admission availability |
| B2C / home_buyer | Residential/new-project comparison; pre-visit diligence | Which homes deserve a visit and what will determine suitability? | Object/context identity, amenities, commute evidence, price/fees gaps, purchase-document checklist | Listing rights, verified asking prices/fees, legal review | Context only; no ownership validation, mortgage eligibility or price forecast |
| B2C / renter | Residential comparison; commute and monthly-cost screening | Which options fit my routine and budget? | Daily needs, routes when available, monthly-cost inputs, building-services checklist | Rent/utility/fee quotes, actual destinations, listing freshness | Spec on living base; no invented rent or available listing inventory |
| B2C / investor_buyer | Small-asset investment context; alternatives | Which properties merit professional review rather than a marketing promise? | Context, access, price/income evidence gaps, costs, scenario sensitivity | Verified transactions, leases, fees, taxes and management assumptions | Spec; no guaranteed returns or valuation claims |
| B2C / tourist | Point context; interest route; attractions shortlist | What is interesting nearby and is the visit practical now? | Named attractions, source description, opening/access evidence, route and visit plan | Current attraction/operator information and licensed routing | Spec; map labels alone do not establish an attraction's status or hours |

Adjacent priority use cases remain separate: construction monitoring needs repeated dated observations; agriculture needs crop/field/weather evidence; digital heritage needs licensed 3D capture and historical sources. They must not reuse a generic real-estate dashboard with renamed headings.

## 4. Scenario schema

Every scenario entry must contain:

```text
scenarioId, version, audience, allowedRoleIds, decisionQuestion,
selectionKinds, requiredInputs, optionalInputs, cardIdsInOrder,
comparisonFields, sourceRequirements, calculations, missingState,
freshnessPolicy, permittedClaims, prohibitedClaims, nextActions,
exportSections, implementedStatus, acceptanceTests
```

Object, point and AOI are different grains. A nearby POI ID must never replace the selected building's identity. A returned geometry containing the point remains community context; it does not establish official parcel identity or correspondence to the rendered feature. Old reports are not silently rewritten to make their identity labels look current.

## 5. Card catalogue, metrics and visual grammar

| Card / question | Visual and unit | Calculation / grain | Evidence path and missing behaviour | Freshness / interpretation |
|---|---|---|---|---|
| Identity — what is selected? | Compact name, type, identity relation and source detail | Original selected ID compared to resolved ID; containment and nearest are separate states | Selection + context response. Never promote reverse-nearest to trusted lookup | Identity refers to this receipt, not official ownership or parcel status |
| District — what surrounds the point? | One derived district label and primary driver groups | Existing `POINT_OBJECT_DISTRICT_RULE_V1`; point-centred 400 m returned sample | `geoContext.districtCharacter`; low signal remains low signal | Explicitly derived, not an official district classification |
| Access — what mapped transport is nearby? | Distance KPI and second line for major road; metres | Existing centre-to-point / haversine straight-line distance; no conversion to walking minutes | `nearestTransitM`, `nearestMajorRoadM`; null shown as unavailable | Stop/road proximity is not route service, travel time, accessibility or capacity |
| Infrastructure — what uses are represented? | Horizontal percentage bars plus counts | `count / returned sampleSize × 100`; groups must share denominator | `geoContext.groups`; positive groups only; absent category says not returned, not absent in reality | Shares are mapped-feature mix, never land-area, population or demand shares |
| Existing buildings — what is known about built context? | Count KPI, median levels, known/total denominator | Returned building count; median only over records with valid known levels | `mappedBuildingCount`, `mappedLevelsKnownCount`, `medianMappedLevels`; null is not zero | Surrounding sample statistics are not the selected building's dimensions |
| Places / local context — what nearby facts can be explained? | At most two concise evidence-backed context items; expandable references | Deduplicated supported context claims; each distance retains its actual scope | Grounded claims joined to `EVD-CONTEXT-n`; no map-label scraping substitute. Current UI says Local context because a supported claim need not identify a named landmark | A dedicated named-landmark feed, attractions/hours/school quality require their own current source |
| Geometry — what can be measured? | Area/perimeter values, units and geometry scope | Existing local WGS84 approximation; distinguish selected-record versus context-record geometry | Hashed geometry receipt and method; no area if association unknown | Not cadastral area, plot ratio entitlement or certified GFA |
| Constraints — what could stop the scenario? | Prioritised checklist, evidence status, required owner/source | Rules attached to scenario; observed constraint versus missing proof distinct | Official/client records needed; missing data is visible | No default “all clear” or legal conclusion |
| Comparison — how do 2–4 candidates differ? | Small aligned table with the same units, field definitions and source dates | Only commensurable metrics; explicit unknown and incomplete coverage | Exact saved Find candidates/Analyse receipts; missing one metric does not invent a score | No ranking until criteria/weights and data coverage are defined and tested |
| Concept — what option fits the AOI? | Map plus A/B metrics and assumptions | Deterministic bounded geometry, coverage/open-space/levels/GFA estimates | User polygon + programme parameters + generation receipt | Conceptual massing, not an approved design, structural model or feasibility conclusion |
| Change/monitoring — what changed? | Timeline and before/after observation map | Comparable dated observations of the same asset/AOI | Licensed imagery + co-registration + uncertainty; unavailable now | No change assertion from a single screenshot |
| Financial scenario — what could it cost/return? | Input table and sensitivity range, not decorative gauge | Explicit price/date/currency/area/cost assumptions; no implied net/gross equivalence | Client/official/licensed sources and traceable formulas; unavailable now | Not valuation or investment advice; unknown is not zero |
| Evidence — how trustworthy is this? | Source list, sample cap, missing fields, report timestamp | Receipt hash, acquisition time where recorded, source publication time separately | Existing evidence pack ID/hash, provider source metadata | Report creation time must not be labelled source freshness |
| Next action — what should the user do? | One clear task plus source/person needed | Role/scenario policy with factual conditions | Deterministic guidance; grounded AI text remains in detailed reasoning | Suggested validation action, not a certified recommendation |

No decorative radar charts, arbitrary 0–100 attractiveness scores, traffic-light safety claims or ungrounded trend arrows. Use map emphasis for location, bars for comparable magnitudes, tables for alternatives and timelines only when multiple dates exist. Colour never carries the only meaning. All numbers retain units and a missing-state convention.

## 6. First two dashboard specifications

### A. Development screening

Input: selected point/object plus a validated saved analysis receipt. Primary question: “Does this location merit a detailed site review?”

Top row: district character → transport nearby → building context. Second row: surrounding uses → evidence-backed local context → next check. Below: concise decision brief; expandable reasoning; expandable sample details; source-specific findings; opportunities/risks; official/client validation checklist. Report language can differ from interface language and is labelled. Updating it requires an explicit action and budget control.

Success: user can identify the location's observed context, see what is not measured and choose a next validation action in under one minute in a moderated test. This is a target, not a measured result yet.

### B. Living and family relocation

Same evidence, different priority. Primary question: “Which everyday needs should I check before visiting?”

Top row: education/health/daily services/open space → transport proximity → district character. Second row: evidence-backed local context → building context → visit/admissions/commute checklist. A dedicated named-places feed, housing prices, crime/safety, school quality and actual route time remain unavailable unless an approved source is connected. No new personal/family data collection is introduced.

Success: user can distinguish nearby mapped features from actual service availability and compile a short visit checklist. B2C willingness to pay is unproven; this view is not a separate commercial launch.

## 7. Data acquisition roadmap and commercial gates

1. **Existing:** OSM-backed identity/context/Find, selected geometry, receipt-based saved operations and conceptual generation. Public service availability and usage limits remain external constraints. Cache and deduplicate; explicit retries; no provider-bypass failover.
2. **Candidate:** rights-reviewed Overture/Geofabrik snapshots to reduce dependence on public serving APIs; licence, serving policy and permitted redistribution reviewed separately. No integration claim yet.
3. **Scenario-specific:** local real-estate transactions, official planning/land records, licensed routing, operator/opening-hours information and client operating records. Establish coverage, permitted use and identity joins before UI/API exposure.
4. **Later:** dated remote-sensing change, hazards, portfolio analytics and 3D assets. Every source has owner, jurisdiction, licence, commercial/API redistribution rights, grain, acquisition/update timestamps, spatial coverage, retention and uncertainty fields.

An NC-only source accepted for the noncommercial prototype is not automatically usable for paid pilots or headless resale. OSM data licensing is distinct from Nominatim/Overpass/tiles serving rules. Commercial source clearance precedes paid delivery.

## 8. Project, permissions and agent-ready architecture

Current Project Hub has one local report store with three operation widgets, query/type/sort and explicit result opening. Local/cloud status is an icon with a truthful tooltip; no cloud sync is implied. Future collaborative projects add owner/editor/commenter/viewer permissions independently of personas. Private source documents, artefacts and exports inherit project access. Merely selecting “fund” or “government” never grants access to another project's data.

Headless delivery should reuse the same `SelectionRef → EvidencePack → ScenarioSpec → DecisionResult → ProjectArtifact` contracts as the UI. Proposed read tools: `resolve_context`, `describe_scenario`, `compare_saved_results`, `read_report`. Proposed draft tool: `propose_concept`. Explicitly authorised write tools: save a new version or export; generation/refresh has a cost estimate, idempotency key and per-project budget. MCP is an adapter, not an alternative evidence or access-control path.

Before any MCP pilot: authenticated tenant/project scope, read-only default, data-rights registry, sensitive-field redaction, versioned schemas, source references, rate limits, cancellation, budget reservations, idempotency, structured unavailable states and an audit log. External text is evidence, never executable instructions. No general agent endpoint or production MCP service is delivered by Sprint07.

## 9. Acceptance and instrumentation

- Same underlying report + different view: appropriate card order/groups/question; zero source/AI calls and unchanged saved bytes.
- Null, sparse, capped, malformed and stale data: honest states; no fabricated score or default zero.
- Mixed 400 m and wider nearby samples: out-of-radius items never appear under the inner-radius clause.
- Legacy neighbour incorrectly marked exact: visible qualification, unchanged receipt and no automatic paid repair.
- Desktop 1440×900 and mobile 393×852: no horizontal overflow, accessible controls, meaningful first screen, expandable sources and stable header.
- Compare uses exact saved candidates; map numbers match list numbers; actual result opens rather than a blank analysis form.
- Record future usability events only after privacy/telemetry approval: report viewed, card expanded, compare completed, explicit refresh, validation task chosen. Do not add analytics transmission in this sprint.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
