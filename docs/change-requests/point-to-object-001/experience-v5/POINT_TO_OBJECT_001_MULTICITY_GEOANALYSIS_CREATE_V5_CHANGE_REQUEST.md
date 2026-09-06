# POINT_TO_OBJECT_001 Multicity, Geoanalysis and Create V5 Change Request

Status: Founder-approved for autonomous implementation on the isolated protected Preview; Production and `main` excluded

Date: 2026-09-04

Owner: GeoAI product delivery team

Authority: Founder direction issued in Main on 2026-09-04. This record authorizes the bounded implementation described below on `codex/point-to-object-clickable-prototype-v1` and its protected Vercel Preview. It does not authorize merge to `main`, Production deployment, Production environment changes or presentation of open-map context as official data.

## Executive outcome

Deliver one coherent Preview experience with three connected product modes:

1. **Analyse** — select a real mapped object or point and receive a useful, bilingual, evidence-bound location brief.
2. **Find** — retain the criteria-first product direction and prove which useful filters can run on current open-map evidence without synthetic rankings.
3. **Create** — select an object or draw/upload an AOI, temporarily hide existing rendered buildings, generate a structured redevelopment concept and render deterministic conceptual 3D massing on the map.

The V5 target is an interactive screening prototype. Create output is procedural concept massing driven by an AI-authored structured programme; it is not text-to-BIM, an architectural design, an approved masterplan or a feasibility conclusion.

## Problem

The current Preview proves live 2D/3D object selection and bounded OpenAI execution, but the experience remains narrow and the generated analysis is not yet decision-useful. Navigation is limited to two cities, the UI is English-only, address search is absent, the right panel requires avoidable scrolling, analysis persistence is missing and surrounding context is presented as a list rather than a spatial interpretation. The earlier criteria-first direction and the new redevelopment-generation hypothesis are not connected to this live map foundation.

## Business reason

GeoAI must demonstrate a credible path from a map interaction to a client decision before UAE/Singapore pilot conversations. The value is not the OpenStreetMap record itself; it is a fast, transparent screening brief, the ability to find relevant places and the ability to test a redevelopment concept while retaining source lineage and uncertainty. The same architecture must remain extensible to controlled/official sources later.

## Users

- UAE, Qatar, Saudi Arabia, Singapore, Malaysia, Hong Kong and Moscow real-estate/development discovery participants.
- Developers, investors and asset owners performing early site or asset screening.
- Founder and internal product, design, engineering and data reviewers.
- Not authorized for legal, cadastral, zoning, planning, ownership, certified valuation, design approval or investment conclusions.

## Scope and affected surfaces

### A. Multicity and bilingual product shell

- Replace the Dubai/Singapore segmented control with a compact city dropdown for Dubai, Abu Dhabi, Doha, Riyadh, Jeddah, Kuala Lumpur, Singapore, Hong Kong and Moscow.
- Define explicit WGS84 centres/bounds and localized labels for every city. Selection, reverse context and analysis must use the selected city contract rather than a Dubai/Singapore allowlist.
- Add a compact address/place search beside the city selector using bounded Nominatim search. Selecting a result moves the map and creates a source-resolved location selection.
- Add English/Russian localization for the complete point-to-object flow, including loading/error/empty states, controls, analysis headings, server-rendered deterministic copy and requested AI output language.
- Add a language control immediately before the profile entry in the header. Reuse the existing profile/auth surface only where its trust semantics remain valid.

### B. Map task panel

- Preserve the accepted live 2D/3D MapLibre interaction and selected-footprint highlight.
- Use one green accent for primary actions and active states; keep neutral structural colours.
- Remove redundant instructional copy from the map canvas.
- Rename the primary action to `Analyze` / `Анализировать`, keep it visible at the bottom of the panel and align its baseline with the map view controls at desktop sizes.
- Remove avoidable internal scrolling from the selected-object card. Move source limitations and usage guidance into an accessible Info popover; retain the mandatory decision boundary in the result/evidence surface.

### C. Geoanalysis V2

- Expand server-derived context from a sparse nearby list into deterministic spatial metrics: selected geometry area when calculable, mapped building/form attributes, category counts, land-use/activity mix, named nearby features, distance bands, road/transit/amenity/open-space signals and bounded density indicators.
- Derive district-character labels through transparent rules over those metrics. Every label must be framed as an open-map screening interpretation and include the metric basis.
- Produce natural-language English or Russian output through the existing server-controlled Responses API router. Models may synthesize and explain only evidence included in the canonical request pack.
- Keep observed facts, derived metrics and hypotheses distinct. Do not infer absence from a bounded sample, route/travel time from straight-line distance, official use, condition, ownership, zoning, approvals, value or guaranteed best use.
- Improve the result hierarchy around: object/site profile, area context, accessibility/activity signals, implications, opportunity hypotheses, risks, and prioritized validation actions. Evidence details remain secondary but inspectable.

### D. Preview persistence and identity

- Persist successful analysis receipts and user-visible results in the development Supabase project when a valid request-scoped user identity and RLS policy are available.
- Reuse the current canonical `analysis_runs`/project membership data model if it can represent this flow without weakening tenant isolation; otherwise introduce the smallest reversible migration with owner-bound RLS.
- Never expose the service-role key or database URL to the browser. Browser writes require the caller JWT and RLS; server writes require validated request identity and must preserve user/project ownership.
- Do not hardcode a shared universal password in client or server code. Existing password authentication may be reused for an explicitly provisioned Preview account, but credentials remain outside source control and user-facing explanatory copy.
- If hosted Auth/RLS evidence cannot be completed safely in this cycle, persistence must fail open for the interactive analysis experience but visibly report only to diagnostics; it must not fabricate a saved state.

### E. Polygon aggregate and Create

- Add a draw-polygon interaction and retain the existing GeoJSON upload path only if its current parser and geometry guardrails pass review.
- Identify rendered/map-source features intersecting the AOI for visual interaction, and use only server-retrieved/canonically bound records for analytical claims.
- Provide an aggregate AOI brief using bounded counts/mix/density/context; do not label the AOI as an official parcel.
- Let the user temporarily hide selected building render features within the local map session. No source record is deleted or mutated.
- Provide redevelopment templates and bounded parameters such as programme, height band, density, public/open-space share and massing style, plus a custom prompt.
- Ask the server-controlled AI route for a strict structured concept programme. Validate numerical ranges, footprint containment, scenario labels and prohibited claims.
- Convert the validated programme into deterministic conceptual GeoJSON footprints/extrusions placed within the selected AOI. The output is labelled `Concept massing` / `Концептуальная объемная модель` and can be reset without affecting source data.

### F. Criteria-first compatibility

- Audit the released/current criteria-first components before reuse.
- Reuse navigation, accessible controls and comparison concepts only when they do not depend on synthetic source claims or stale auth/persistence assumptions.
- For this V5 cycle, expose only filters supported by current real open-map evidence. Unsupported ranking, score, financial, zoning or availability criteria remain disabled or outside the surfaced prototype.

## Data and source impact

- Interactive basemap/rendered objects: current MapLibre/OpenFreeMap path, visual-selection use only.
- Object/place resolution: bounded Nominatim reverse and search requests with localized response preference, caching, identifiable User-Agent, response caps, timeouts and city bounds.
- Nearby context: bounded Overpass requests. Upstream elements are normalized, deduplicated, allowlisted and converted to canonical evidence receipts before analysis.
- Development Supabase: analysis persistence and identity only after exact schema/RLS/hosted-state audit. No Production Supabase configuration or data mutation.
- OpenAI: existing Responses API, `store:false`, no tools, strict JSON schemas and server-selected model/reasoning routes. User language/depth/scenario are inputs; raw model IDs and provider credentials remain server-only.

## Design impact

- Preserve the accepted light enterprise visual language and current 3D map behaviour.
- Prioritize a first-viewport task: choose city or search, select/draw, inspect concise card, analyze.
- All controls require keyboard operation, visible focus, labels and minimum target sizes. Info content must work by click/focus, not hover only.
- RU copy must wrap without clipping at 390 px, 834 px and 1440 px reference viewports.
- Create mode must use clear staged states: select AOI → review/hide → configure → generate → compare/reset.

## Engineering impact

- Extend city/location contracts and session schema with backward-compatible parsing.
- Add localized string dictionaries and carry locale explicitly through context, analysis and persistence requests.
- Add a bounded search route; do not call Nominatim directly from the browser.
- Version the Geoanalysis response schema and prompt; preserve strict receipt validation and complete per-attempt cost telemetry.
- Add deterministic GIS helpers for area, distance bands, aggregate counts and procedural massing. AI must not emit raw executable code or unvalidated geometry.
- Prefer independent parallel requests and cached source context; avoid serial source waterfalls.
- Keep new heavy map/drawing modules dynamically loaded where practical.

## Risks and controls

| Risk | Control |
| --- | --- |
| Public OSM/Nominatim/Overpass rate or coverage limits | Server cache, request coalescing, strict bounds/caps/timeouts, graceful partial context and future controlled extracts |
| District description sounds authoritative | Explicit derived class, metric basis, bounded-sample language and mandatory caveat |
| Russian output breaks evidence validation | Locale-neutral structured fields and receipt IDs; localized deterministic rendering; bilingual negative tests |
| Shared Preview password becomes an authorization bypass | No hardcoded password; provisioned Auth identity only; request-scoped JWT, RLS and no authorization from UI metadata |
| Persistence weakens tenant isolation | Existing membership contract or owner-bound RLS; negative cross-user tests; no browser service role |
| Generated massing is mistaken for design/feasibility | `Concept massing` label, deterministic constraints, resettable local overlay and no planning/valuation claim |
| AI invents geometry or economics | Strict structured programme, server range checks, deterministic geometry, no financial output without an evidence source |
| Criteria-first repeats synthetic ranking problems | Surface only real-supported filters and separate data gaps from unavailable candidates |
| Scope size causes an incoherent demo | Ship in gates: shell/search → Geoanalysis V2 → persistence → AOI/Create → criteria compatibility, with exact-head Preview at each coherent checkpoint |

## Acceptance criteria

### Core experience

- All nine cities can be selected; each loads its configured viewport and can resolve a clicked point/object or a clear recoverable no-context state.
- Address/place search returns bounded results inside the selected city and selecting a result moves/selects the map.
- Switching English/Russian updates every point-to-object UI state and controls the requested analysis language.
- Profile and language controls are present in the header without introducing an authorization claim.
- The selected-object card has no avoidable nested scroll at 1440×900; `Analyze` remains visible and uses the single green accent.

### Analysis

- A supported polygon reports calculated open-map geometry area and its method/precision class.
- Context contains quantitative category/mix/distance-band signals and at least one readable district-character interpretation when sufficient evidence exists.
- Dubai, Singapore and at least one additional GCC city produce useful English and Russian structured briefs on exact Preview.
- Every observed/derived claim validates against a canonical receipt; hypotheses are explicitly labelled.
- Focused questions continue to work with Quick/Standard/Deep routing, one bounded repair and complete cost telemetry.

### Persistence and security

- Successful authenticated analysis can be reloaded from development Supabase with correct user/project ownership.
- Anonymous or different-user access cannot read or mutate another user's analysis.
- No shared password, OpenAI key, Supabase service role or DB URL exists in client bundles, logs, committed files or receipts.
- Production and `main` remain unchanged.

### Create

- A polygon can be drawn, edited/reset and used for an aggregate open-map screening brief.
- Existing buildings in the AOI can be hidden only in the current map session and restored exactly.
- At least three bounded redevelopment templates plus a custom prompt produce validated conceptual programmes.
- Generated massing stays within the AOI, renders in 3D, carries a bilingual concept description and can be reset/regenerated.

### Quality gates

- TypeScript, build, point-to-object contract, auth/access guards, secret hygiene, source/data-honesty, API inventory, Supabase migration/RLS tests when affected, and focused browser tests pass.
- Desktop 1440×900, tablet 834×1112 and mobile 390×844 complete the main Analyse journey; desktop completes draw/hide/generate/reset.
- Exact-head protected Vercel Preview is READY and visually verified. No Production deployment or `main` merge occurs.

## Delivery gates for the autonomous cycle

1. **V5.1 Foundation:** city contract, RU/EN shell, search, compact panel and updated CR/tests.
2. **V5.2 Intelligence:** deterministic spatial metrics, bilingual structured analysis and result hierarchy.
3. **V5.3 Persistence:** authenticated development persistence only if schema/RLS audit passes.
4. **V5.4 Create:** polygon draw, aggregate context, temporary hide and procedural concept massing.
5. **V5.5 Compatibility:** evidence-backed criteria filters and connection points to comparison.

Each gate must be independently revertible. Later gates may be deferred from the first coherent Preview if they would weaken source honesty, security or overall reliability.

## Rollback

Revert the V5 gate commits or discard the isolated branch. Revert any development-only Supabase migration using its reviewed rollback plan; do not modify Production. Map hiding and generated massing are session overlays and have no source-data mutation.

Mandatory decision boundary:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
