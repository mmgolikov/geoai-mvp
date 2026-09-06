# GeoAI — Product-to-Production Roadmap

Status: Founder-directed plan, not an implementation or release receipt
Date: 2026-09-06
Owner: Main / Product; execution: dev_1, gen_ai_1, design_1, data_geo_1, wiki_1
Scope authority: [Cycle 05 Change Request](CYCLE_05_PROJECTS_SPATIAL_REPLACEMENT_LANDING_CR.md)
Starting candidate: `833b575561853942530bb4766d04c2ad8ae06b31`, Draft PR #147
Protected Preview: `dpl_GazGmmiDkznQwuM2GwWK2RDGZNMu`
Released main / Production: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` / `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`; unchanged

## Product outcome

Make one coherent place-decision workspace: select a point, real object or area; understand its surroundings; find and compare alternatives; create a site concept; retain the work in a project. UAE and Singapore are the first validation markets. Other existing cities remain navigable, but city availability must not imply equal data coverage or locally validated analysis.

The next full version is this product branch, not a parallel redesign of the older demo. Production promotion remains a separate founder decision after the exit gates below. Reports are intentionally later than correct saving and reopening.

## Current truth and gaps

- The candidate supports a live map, observed open-map objects, bounded nearby context, identity-bound Wikidata enrichment, role/scenario Find, comparison, and AI programme plus deterministic site massing. It is not a legal, cadastral, investment or architectural conclusion.
- The founder reports occasional out-of-area building disappearance. A successful geometry test does not disprove that renderer defect; exact replacement is the immediate correctness priority.
- Old Projects and profile UI exist, but generic product mutations remain demo/blocked. The candidate analysis persistence route is not wired to the UI. Cross-device saved projects have not been demonstrated.
- Old root landing and Confluence delivery summaries lag the accepted candidate. Design and documentation must identify the actual candidate, while preserving Released history.
- Source availability, identity quality, map coverage, useful AI answers and commercial demand are separate questions. None is established by adding a model or a provider logo.

## Delivery order and exit criteria

| Increment | Expected user result | Dependencies | Exit evidence |
| --- | --- | --- | --- |
| 05A — correctness and controls | Reliable city/role/scenario selects; hiding a selected site does not remove distant buildings | Existing candidate only | Mouse/keyboard/touch checks; duplicate/multipart/tile/concave counterexamples; visible outside landmark preserved; five clear/restore cycles |
| 05B — saved work | A project collects Analyse, Find and Create results and reopens the actual state | Versioned operation contract; storage acknowledgement; caller identity for cloud mode | Save/reload/open for all modes; no source/model call on reopen; retry idempotency; wrong-project/user denial; explicit local versus cloud status |
| 05C — product entry and documentation | Modern EN/RU landing with working paths; navigable current design and delivery hub | Accepted product language and actual implemented capabilities | Responsive/keyboard/CTA/language QA; exact Figma/Confluence readback or explicitly open sync gate |
| 06 — spatial context by scenario | User changes analysis radius; the answer explains relevant nearby infrastructure with distances | Canonical spatial identity, cached provider adapter, source and semantic contract | Golden cases in Dubai and Singapore; radius/geometry/units/dedup tests; cited useful answer evaluation |
| 07 — contextual generation | Distinct feasible concepts respond to the actual site and surroundings | Exact replacement; usable buildable geometry; source-backed context | Complex AOI suite, circulation/entrance checks, true differences between A/B, deterministic replay and parameter responsiveness |
| 08 — pilot workspace | Authenticated project history, controlled shared review and useful reports | Reviewed cloud activation, ownership, immutable results and rights | Real cross-user/tenant checks; backup/restore; report-to-saved-result consistency; support and cost budget |
| 09 — release candidate | Stable reviewed product entry and core decision loop fit for controlled launch | All blocking engineering/data/privacy/product tests | Frozen SHA, exact CI and Preview proof, founder walkthrough, deployment/rollback plan, explicit Production approval |

These are dependency-ordered increments, not promised dates. Estimate each slice after its inputs are known; do not run all tracks at once. Review task cost, elapsed time, defects and rework after each increment. Prefer two or three implementation lanes plus a bounded reviewer over a permanent full-team fanout.

## Geospatial analysis — proposed product and system contract

### Selection and study area

Keep selected asset geometry distinct from its study area. Store WGS84 identity, geometry version, source ID, acquisition time and geometry quality. Point, building footprint and AOI are different inputs. Use a local metric projection or geodesic methods for distance and area; never treat longitude/latitude degrees as metres.

Proposed initial control: 250 m / 500 m / 1 km / 2 km, with 500 m default. These are proposed UI defaults, not new deployed functionality. Larger radii should enter a bounded asynchronous path only after cost, density and provider limits are measured. Set explicit feature/response/time budgets; do not silently shrink the radius or describe a capped subset as a complete inventory.

For an AOI, distinguish features inside the area from the surrounding buffer. Measure external distances from the nearest valid boundary or known entrance, not blindly from the centroid. Respect holes, MultiPolygons and entrances. Display straight-line metres as straight-line distance. Walking/driving minutes require an actual network route, transport mode, restrictions and timestamp; a guessed speed is not routed accessibility.

### Scenario-specific output

| Scenario | Relevant observations | Useful synthesis | Must not infer |
| --- | --- | --- | --- |
| Residential / home selection | Schools, childcare, health facilities, grocery, parks, transit, major roads; names, type and measured distances | Which daily needs have mapped nearby options; exposure to arterial roads; gaps worth checking | School quality/capacity, admission zone, safety or walkability from POI counts alone |
| Retail / mixed-use development | Road and transit access, entrances, surrounding land uses, retail/hospitality clusters, parking/loading where mapped | Access opportunities, adjacent activity and potentially complementary/competing uses | Footfall, customer demand, revenue or market share without separate evidence |
| Office / hospitality | Transit, road connections, nearby business/visitor amenities, surrounding building uses, airports only with appropriate broader context | Accessibility and likely service context; complementary uses and factual constraints | Occupancy, rents, hotel class or commercial feasibility without reliable inputs |
| Redevelopment / urban area | Existing footprints/heights when present, roads/entrances, land use, water/green features, amenities and mapped restrictions | Current spatial pattern, observed assets and candidate development questions | Ownership, demolition permission, legal buildable area, approved FAR or highest-and-best-use conclusion |

Keep the answer structure compact: object identity and attributes → character of surroundings → relevant access/infrastructure → implications for the user's scenario. Only add a next action that follows from actual findings. No repeated boilerplate source IDs or generic empty prose in every panel. Preserve source lineage and uncertainty behind the result; an absent tagged facility means not observed in this query, not proven absent in reality.

### Data pipeline

1. Resolve identity and study area; reuse the selected source identity rather than matching only by a nearby name.
2. Fetch bounded source records through replaceable adapters with cache, timeout, attribution and quota controls. Keep raw source evidence separate from derived facts.
3. Normalize categories and geometry; deduplicate the same facility represented as a node, building and relation. Retain conflicting facts and source dates.
4. Compute distances, containment, counts, nearest-category results and urban-fabric observations deterministically.
5. Pass only versioned evidence and computed facts to the model. Each material claim references an evidence fact; unsupported conclusions cannot be repaired by inventing citations.
6. Render scenario-aware sections, save the immutable analysis with radius, inputs, source versions, model settings, usage and cost metadata.

Start with current OSM/Wikidata adapters and measure actual coverage before adding more sources. Next evaluate Overture building/places/transport layers for specific gaps, not merely for larger record counts. Overture offers release-based data and scoped retrieval; its themes have different licensing and source lineage. A dataset download is not a live service with an SLA. [Official data access](https://docs.overturemaps.org/getting-data/), [buildings](https://docs.overturemaps.org/guides/buildings/), [places](https://docs.overturemaps.org/guides/places/), [transportation](https://docs.overturemaps.org/guides/transportation/).

Keep autocomplete separate from public Nominatim, whose service policy prohibits that usage. Preserve the current Photon suggestion versus explicit Nominatim lookup split until a reviewed replacement exists. [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

Official UAE/Singapore planning, property and local facility sources require an exact access/license/coverage review before activation. A broad city portal is not evidence of an accessible parcel or valuation API. The founder's forthcoming source access can be integrated adapter-by-adapter without replacing the UI contract.

### Quality and economics

Create a small, versioned evaluation set spanning a dense residential block, hotel, commercial building, redevelopment AOI, missing-data location and conflicting identity in each priority market. Record source snapshots and expected deterministic facts. Judge answers on identity correctness, distance correctness, relevance, non-repetition, missing-data honesty and actionable synthesis. Compare before/after blinded where practical.

Log provider time, model time, input/output/reasoning tokens when available, retry count and actual request cost. Separate saved-result open (no AI charge) from new analysis and explicit source refresh. Cache keys include AOI/point identity, radius, locale, scenario and source version. Escalate model strength only for synthesis complexity after verifying data retrieval; a stronger model cannot supply missing licensed facts.

## Generation — contextual, geometric and reversible

### Stage 1: exact replacement

Renderer layer IDs, tile-local feature IDs and source object identity are not interchangeable. A component selected inside an AOI must not suppress another component far away. Capture original layer filters; derive a spatially safe hide expression; conservatively retain a boundary-crossing feature unless its outside portion can be preserved. Validate the real renderer, not only the helper function. Showing existing, reset, area deletion, mode change and style reload must restore the original scene exactly.

### Stage 2: site-aware geometry

Derive a buildable design domain from user area, setbacks, holes and known physical exclusions. Keep optional planning assumptions separate from authoritative restrictions. Subdivide non-convex areas into usable zones, orient buildings to site edges and observed road access, reserve connected circulation/open space, and use distinct courtyard/L/U/perimeter/podium-tower/campus typologies. Buildings must not overlap, bridge water/roads by accident, block an intended access corridor or leave unexplained uniform grids irrespective of input.

Treat target coverage as a constraint with a feasibility result. If impossible under locked controls, preserve the previous valid concept and offer explicit adjustments: reduce coverage/count/setback, change typology or expand area. Do not silently relax user-locked values. Area/floor estimates must avoid podium double-counting; report requested versus achieved values with units.

### Stage 3: environment and alternatives

Feed nearby road/entrance orientation, observed adjacent heights, public/green/water areas and scenario into a structured programme. The model proposes programme/trade-offs; deterministic geometry and independent checks enforce containment, distances, heights and overlaps. A/B alternatives should differ in programme, layout or useful spatial trade-offs, not labels alone. Selection does not regenerate; editing changes a draft; Generate/Update explicitly commits a new validated result.

### Stage 4: economic scenarios, later

Add acquisition/construction/operating/revenue assumptions only with user or licensed source inputs, currency, dates and sensitivity ranges. Separate model suggestions from supplied figures. No investment return, zoning compliance or optimal-use label without evidence. BIM export, photorealism and architectural engineering are separate later capabilities, not implied by map massing.

## Projects, platform and security

One project contains versioned operation records for Analyse / Find / Create. Record stable operation ID, owner/project membership, mode, locale, input envelope, completed result, source/model provenance, timestamps, parent revision and content hash. Save by a stable idempotency key; identical retries replay, conflicting payloads fail. List summaries separately from bounded single-result reads. Reopen restores state without network or AI execution until the user explicitly requests refresh/update.

Cloud saving requires authenticated caller-scoped access and tested isolation. A demo profile is not an authenticated tenant. Reuse reviewed request-scoped APIs and existing tables where appropriate; do not enable a dormant global repository switch. UI local persistence remains useful but must say that it is on this device and must survive quota/failure without false success.

Main's 2026-09-06 read-only audit confirmed 12 migrations in geoai-dev and GeoAI domain-table RLS, but found inherited anon mutation grants on managed `public.spatial_ref_sys`. That is a specific ACL risk; HTTP mutation reachability was not tested. Do not blindly change a managed extension relation. Resolve the exposed-schema/least-privilege owner path before cloud activation, and verify it with a non-mutating negative request. Rehearsal is separate from development; old replay receipts are not current development readiness.

Prepare exact migration dependencies, rollback/recovery point, target ref, caller personas and Preview-only activation flag before seeking approval. No Production/Auth/enforcement/environment activation follows automatically from this roadmap. Do not create new credentials or read personal user data for tests. Existing-authorized test identities or separately approved test accounts are required for cross-user acceptance.

## Design and documentation operating model

Use one current Figma file with 00 Hub, 01 Design System and clearly named current product sections. Maintain historical pages rather than destructively rewriting them. Current screens: landing, map workspace, Analyse result, Find/filter/comparison, Create draft/result/replacement, Projects/list/detail/reopen, profile and sign-in. Each has EN/RU, loading/empty/error/success, keyboard and responsive states. Actual node IDs and exports belong in the handoff; a screenshot receipt alone is not editable Figma parity.

Repository docs record executable contracts and tests. Confluence Hub links current product, architecture/data, design registry, delivery/roadmap and evidence. Keep the historical release snapshot intact and put the latest candidate at the top of operational navigation. A single current status per scope replaces contradictory append-only instructions. Record remaining gaps explicitly rather than calling every intermediate deliverable investor-ready.

## Release gates

- No P0/P1 regressions in map, selection, replacement, saving/reopen or language/CTA routes.
- Exact combined commit passes lint/build and focused geometry/identity/project permission tests.
- Actual browser verification at 390/768/1280/1440; preserved 430 px desktop drawer, no clipped lists or hidden action buttons.
- Source rights/attribution, per-provider quotas, request budgets and model cost telemetry reviewed for the intended audience.
- Cloud claims only after real caller/isolation/save/reopen checks and recovery evidence; no service-role bypass.
- New landing matches implemented capabilities; reports and planned capabilities are not presented as available.
- Current Figma/Confluence/repo references either read back consistently or remain explicitly open gates.
- Freeze candidate SHA and rollback point; confirm current main/Production; obtain explicit founder approval before merge/promotion.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
