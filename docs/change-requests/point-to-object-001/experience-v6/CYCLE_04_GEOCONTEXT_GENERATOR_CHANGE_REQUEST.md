# Cycle 04 — useful geocontext and site-responsive concepts

Status: Founder-approved implementation; local acceptance complete, external Preview acceptance pending
Date: 2026-09-05
Owner: GeoAI Main
Authority: Founder instruction in Main: Profile owns B2B/B2C; Find contains roles, role-specific scenarios and settings; develop geocontext/new sources and complex, area-responsive generation.
Successor: None

## Baseline and boundaries

Start from `d5091f2c62e14936fc0440f396b4cfedfd45f53c`, branch `codex/point-to-object-clickable-prototype-v1`, Draft PR #147. Previous-cycle receipt binds that baseline to protected Preview `dpl_DrnkECZpvDVGpEftjFoBswgZmFCE`. Reverify external state before publication. This is also the bounded rollback point, not a request to roll back now.

Scope is the isolated point-to-object prototype only. Do not merge, change `main` or Production, activate released source-pack routes, mutate hosted Supabase/Auth/RLS/Storage, change credentials/environment/access protection, buy services or use confidential AOIs. Existing approved OpenAI connection remains unchanged. Initial verification uses provider fixtures, real local geometry and public non-sensitive source probes; report these separately from live AI acceptance. No new key or paid test is part of this implementation slice.

## Problem and outcome

1. Find duplicates audience configuration already owned by Profile. It must retain substantial role/scenario controls and comparison without offering a competing audience switch.
2. Geocontext has bounded map-derived observations, but useful information can be lost in normalization, evidence projection and generic deterministic copy. Adding a model or provider name is not an improvement by itself. The answer should explain the selected object, surrounding uses and services, access evidence, and scenario implications with traceable support.
3. Cycle 03 improved rectangular envelopes and multi-podium placement. Complex site shapes still need genuinely non-rectangular footprints, placement responsive to usable land, and clear distinction between requested and achieved metrics. Heuristic non-fit is not proof of physical or legal impossibility.

Users: developers/asset analysts and the supported B2C roles, according to Profile. Dubai/UAE and Singapore are benchmark markets; the other seven city entries must continue to work without pretending equal data coverage.

## Work packages and ownership

### UX-04 — dev_1

- Profile is the only editable B2B/B2C selector; preference is not an authorization claim. Find reads it, then shows Role, Scenario and the applicable settings, followed by results/comparison. Remove duplicated audience tabs without hiding roles or replacing the scenario controls with a generic task picker.
- Restore session state only when compatible with the current profile audience. Profile changes win over stale Find audience; preserve valid role/scenario/filter selections within the same audience. Cancel/ignore stale search responses and clear incompatible shortlist/comparison state. Do not silently mislabel results from the previous audience/scenario.
- Preserve Create programme, numeric controls and custom draft across EN/RU changes. Localized output may be invalidated/re-rendered separately; language is not a new geometry/programme identity. Do not show stale model prose as the newly selected language.
- Fit the map to a newly uploaded AOI with padding accounting for the drawer; do not refit on every render, draft edit, locale change or style event. Preserve 2D/3D and sensible camera behavior.
- Preserve 430 px desktop drawer, visible primary actions, green accent, responsive layout, comparison, replacement/restore and delete. No Data sources/Data & methodology buttons, fixed methodology banners or repeated caveat paragraphs.

Owned: point-to-object UI, profile preference/session integration, Create editor and focused UX tests. Do not edit geometry solver, geocontext adapters or AI evidence core without coordination.

### GEO-04 — data_geo_1 audit and implementation, Main integration

- Audit exact baseline source-to-answer code; choose at most two new source adapters by incremental decision value, verified current usage rights, identity quality, no-key access and bounded request cost.
- Prioritize useful named-object enrichment and surroundings rather than unrelated global metrics. No provider activation before documented primary-source policy/access check and explicit Main integration decision within this approved Preview scope.
- Keep object identity strict. Do not join a nearby geocoder result or a name-only match as the selected building. Separate observed facts, deterministic calculations and conditional interpretation.
- Report source and acquisition dates separately, retain internal provenance and coverage, normalize units and language, and handle contradictory/missing/stale/failed source data without fabricating completeness.
- Distances must state their computation basis; straight-line distance is not walking time or routable access. POI counts are counts in the returned bounded sample, not complete inventories or footfall. Footprint area is not parcel/site/GFA unless the data actually supports it.
- Produce compact natural-language identity, surroundings, access and scenario-specific implications. Specific facts and their meaning take precedence over resolver narration. Unknown ownership, rents, land rights and investment outcomes remain unknown.
- New adapters need fixed hosts, no arbitrary URL fetching/redirects, byte/time/request caps, allowlisted facts, injection-resistant model projection, positive/negative fixtures and independent identity checks. Model and cost routing unchanged unless separately justified.

### GEN-04 — gen_ai_1

- Evolve deterministic geometry in a bounded first slice: genuine L/U/chamfered or articulated footprints where appropriate, not a cosmetic change of rectangle colours; combine suitable massing families with site orientation and concavity.
- Improve spatial distribution across elongated/concave sites instead of clustering every option in one inscribed rectangle. Do not fill protected setbacks/holes or silently drop buildings to meet a coverage percentage.
- Preserve exact numeric locks, independent A/B alternatives, support lineage, no-overlap and full containment/setback validation; prevent tiny slivers and implausibly thin high-rise footprints. Existing visual minimums remain a floor, not architecture certification.
- Calculate achieved unique ground area/coverage, feature/building counts and floor-area estimates from returned geometry, including holes/stacking semantics. Do not count repeated polygon segments, overlapping pods or tower support twice.
- Keep bounded runtime and fail with actionable, accurate no-fit states. Any relaxed coverage remains an explicit user-applied proposal. Draft edits and A/B cannot generate paid calls or overwrite committed results.

Owned: deterministic generator and geometry/preflight contracts/tests. No UI, Create AI route, model or source changes without Main coordination.

## GEO-04 integration decision — Main review, 2026-09-05

Main accepts a narrowed successor to the data_geo_1 source audit, SHA-256 `8e88beba3f3e06c6727aadbbbcac44213a3de7b954d29bff196e1dcaa721bea1`. Current primary Wikidata licensing/data-access/API-etiquette pages were independently read by Main. Structured entity data is CC0; this is not a service SLA or a guarantee of factual correctness. Approved implementation is one known-QID Wikidata adapter and no-new-request repairs to the existing OSM context. Other providers, Wikipedia prose, arbitrary browsing, paid access and model-routing changes remain outside this slice.

Owner for this complete GEO-04 implementation is data_geo_1, in an isolated baseline worktree. Reserve `point-to-object-live-evidence.ts`, new Wikidata contract/adapter files, `point-to-object-ai-core.ts`, the point-object context/AI route projection, `analysis-client.tsx`, related analysis-session types/versioning, and dedicated source/semantic tests. Coordinate shared session/type files with dev_1 before editing. Main owns final integration and docs. The 2026-09-06 acceptance review additionally reserves `point-to-object-area-context-contract.ts` and `point-to-object-area-context.ts` for shared normalization only; Create state and geometry remain outside GEO ownership. Any unimplemented point/AOI parity must be explicitly deferred rather than reported as accepted.

Mandatory amendments to the audit proposal:

- Exact OSM QID plus a nearby coordinate supports a *linked community entity*, not certified identity of a building footprint. Reject name-only joins. For polygon subjects use genuine point-in-polygon plus a small documented boundary tolerance, not bbox-only acceptance across a concave notch. The 250 m ceiling is allowed only for node/complex linked-entity context; it does not certify that a specific tower or selected polygon has all complex-level attributes.
- Never overwrite OSM height/floors/area or feed linked-complex metrics into Create geometry. Keep Wikidata facts explicitly entity-scoped and attributed. Do not advertise high certainty merely because a QID and coordinate agree. A cluster/country/type mismatch fails soft for enrichment without damaging valid OSM facts.
- Preserve statement ranks, qualifiers, time precision/calendar and conflict. Skip deprecated, no-value, unknown-unit and unsupported-qualified statements rather than stripping qualifiers into an unqualified number. Prefer a conservative current-property allowlist to speculative conversions. Cross-source conflicts remain separate, not averaged or silently preferred. An entity modification timestamp is not a building observation date.
- Bound the fixed-host request to 3 seconds/256 KiB/one entity, no redirect or retry, informative User-Agent, `maxlag` handling, bounded cache and in-flight coalescing. The existing request deadline wins if less time remains. No-QID paths make zero new requests; failure keeps OSM-only analysis usable. Fixed EN/RU label acquisition is preferred so switching UI locale does not create conflicting source truth or another cold request.
- Correct radius claims conservatively: only returned centres actually inside the declared radius contribute to within-radius counts/nearest-centre metrics. Edge-intersecting geometry can remain a separately described observation or be omitted; never claim routable distance. Do not add wider queries. Avoid name-only deduplication of separate branches, and do not relabel QID clusters as proven facilities.
- Accept an evidence-bound initial semantic contract with a documented public V6 transition and V5-session fallback. The 2026-09-06 implementation review found that forcing the model to echo four already computed codes and an exact reference set adds no reasoning value and introduces another avoidable validation failure. Main authorizes deriving this deterministic brief on the server and removing that redundant echo from the internal model JSON, while preserving the existing decision/focused-answer model behavior and public V6 brief contract. No extra model call or uncited free-form initial claim is authorized. Each visible implication must use specific available context facts, name/distance/category where appropriate, and explain a conditional scenario consequence. A hotel near mapped business/transport signals should not receive the same copy as a sparse residential site except for genuinely shared limitations.
- Do not invent a B2C perspective merely because the audit lists a B2C semantic code: the current analysis request supports developer/investor/asset_owner only. Bind only actual request fields; expanding analysis roles is a separate coordinated contract change. Preserve focused-question behavior and server-only model routing.
- Render useful facts currently omitted from `sourceFacts`, rank non-zero context groups and preserve named nearby diversity. Consolidate repeated address/mix/proximity paragraphs; no permanent source/methodology controls or boilerplate panels. Truthful material uncertainty stays in the relevant value or evidence disclosure, not repeated in every sentence.
- User-facing copy must start with the actual selected name and readable object classification, then concrete surroundings and access facts, then a fact-dependent consequence for the selected goal. Do not narrate resolvers, receipts, entity machinery or governance gates in the primary brief. Keep linked-complex facts separate from selected-building facts through a concise scope label and inspectable evidence. The Main review rejected jargon-heavy intermediate copy and requires three short Russian benchmark outputs before acceptance. Deterministic prose must never be described as model-authored insight.

Additional acceptance cases from Main's independent review (2026-09-06): deterministic evidence prioritization above 32 receipts must not erase the whole support index; cached QID payloads must be bound separately to each OSM subject; actual V5 sessions must restore without automatic network/AI regeneration or false current-version telemetry; multiple conflicting coordinates/countries cannot pass by selecting any matching statement. Every visible fact/reference must resolve to a bounded sanitized receipt. Test qualified/temporal and cross-source conflicts, not only malformed units. Scenario utility must respond to the actual goal, perspective and horizon, with concrete context when available. These are targeted correctness checks, not authorization for unrelated architecture expansion.

Independent adversarial review additionally requires meaningful coordinate precision for the spatial identity tolerance, rank-aware identity classification, equivalent-unit numeric conflict comparison, and a bounded serial source queue with each coalesced caller's remaining deadline respected. Process-local serialization is not a deployment-wide rate-limit guarantee. A compatible normal-rank class cannot rescue an incompatible preferred identity class. Existing V5 analyses may remain truthful historical read-only content with original telemetry and manual refresh; they must not be silently relabelled as V6 or automatically trigger AI. Locale/content on these historical results remains unchanged until refresh.

Deadline clarification: a caller's remaining deadline controls its response wait, not the lifetime of a shared acquisition. The latter may finish under its independent hard 3-second cap and cache only a fully validated successful payload with the actual acquisition time. The expired caller must still receive an unavailable/deadline outcome. Timeout/error bodies are never successful cache entries. Reference-counted cancellation of a shared acquisition when all callers expire is deferred; this is a bounded no-paid-call provider trade-off, not permission for unbounded background work or a global serverless limiter claim.

The decision authorizes local implementation/testing and eventual bounded use on the existing protected Preview after integrated acceptance; it is not a claim that the source is already active. Live AI tests remain outside this slice. Public structured-data checks, if needed, must remain a few non-sensitive exact entities, not batch acquisition.

## Acceptance and release gates

1. Profile B2B/B2C → Find valid roles → role-specific scenarios/settings → search → up to three-object comparison → selected identity analysis works in EN and RU. No inline audience switch remains.
2. Switching profile audience invalidates stale incompatible Find state; same-audience return restores valid state. Request races cannot put old results into new controls.
3. Create EN→RU→EN preserves programme/custom/numeric draft; no unintended generation. Uploaded off-screen AOI is visible once, without camera jumps during later edits.
4. Source tests cover exact identity, mismatch, malicious text/URLs, malformed units, missing fields, cache timestamps, timeout/429, partial coverage and successful enrichment. Public endpoint observations are not labeled a live AI test.
5. Three geocontext benchmarks: named Dubai hotel/building, named Singapore building, unnamed/sparse AOI. Demonstrate additional decision-relevant facts or better evidence-linked conclusions, not merely longer prose. Keep genuine unknowns explicit only where they affect the answer.
6. Geometry matrix: square, rotated rectangle, long narrow, L/U/concave and genuinely constrained AOIs; opposite winding; A/B; boundary/setback contact; varied tower counts/heights. At least one valid non-rectangular footprint and visible site-responsive distribution are required. Record containment, overlap, achieved coverage/counts/areas and bounded runtime independently of the solver's own metrics.
7. Regression: source-building replacement, Show existing, A/B, style switch, 2D/3D, delete/reset, upstream failure and stale request cancellation. No source feature is actually deleted.
8. Focused contracts, lint, build, independent geometry/semantic review and rendered browser check precede branch publication. Exact final-head CI and protected Preview must be verified; worker completion or an earlier SHA's screenshot is not final acceptance. Main/Production read-back and rollback receipt are mandatory.

## Delivery and documentation

Workers use isolated successor worktrees from the exact baseline and return commits, file lists, tests, limitations and short Main summaries. Main owns integration and documentation; no competing pushes to the shared Preview branch. Maximum three active workers for this slice. Sol xhigh for bounded UI/source work, Sol max for geometry; escalate only a concrete unresolved quality issue. Avoid mass fan-out, duplicate research and repeated full-suite runs on each worker.

Update the active backlog and concise implementation/source contracts with actual results, not promises. Regenerate lifecycle navigation once at final integration. Confluence parity remains unverified until separately read back; this CR is not a publication receipt.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
