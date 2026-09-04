# POINT_TO_OBJECT_001 V5.1 Interaction, Find and Profile Change Request

Status: Founder-approved for autonomous implementation on the isolated protected Preview; Production and `main` excluded

Date: 2026-09-04

Owner: GeoAI product delivery team

Authority: Founder feedback issued in Main on 2026-09-04 against the protected V5 Preview. This record authorizes the bounded implementation below on `codex/point-to-object-clickable-prototype-v1`. It does not authorize merge to `main`, Production deployment, Production environment changes, hosted Supabase activation, or representation of open-map data as official evidence.

Successor: `RELEASE_POINT_TO_OBJECT_001_V5_1_PREVIEW_RECEIPT_20260904.md` for exact candidate evidence; current released-runtime truth remains `docs/CURRENT_RELEASE_STATE.md`.

## Source audit

| Surface | Audited state for this change | Required release treatment |
| --- | --- | --- |
| Repository / GitHub | Work is isolated on `codex/point-to-object-clickable-prototype-v1`; PR #147 is the existing delivery vehicle. The V5.1 delta is not merged to `main`. | Record the final candidate SHA, tree, PR state, CI run, jobs and artifact digests in a new V5.1 receipt. |
| Vercel | The predecessor V5 receipt records an access-controlled Preview. No exact-head V5.1 deployment is claimed by this Change Request. | Verify a new exact-head protected Preview, route/security smoke and error/fatal logs before changing status to Preview-verified. Production must remain unchanged. |
| Supabase | This slice requires no schema, migration, Auth-policy, Storage or hosted-data mutation. | Record `unchanged / not applied` rather than inferring readiness from the existing development foundation or rehearsal. |
| Figma / design | No Figma write or refreshed production-node authority is part of this slice. The bounded code-level interaction changes follow founder feedback and existing product tokens. | Treat rendered-browser QA as the design evidence for this candidate; do not claim Figma synchronization or design-system release. |
| Confluence | The Project Hub remains the operational dashboard; V5.1 has not been synchronized or read back as part of this implementation slice. | Synchronize only after exact release evidence exists, or record Confluence as pending/not changed. |
| Change Log and active repository docs | The prior entry describes V2.1 and the released source documentation describes only the count-only/disabled source pack. | Add a V5.1 Preview-candidate entry and explicitly separate its live open-map routes from released Production truth. |

## Executive outcome

Turn the V5 feature proof into a coherent product loop:

1. `Analyse` owns direct map-object selection.
2. `Find` combines role/scenario intent with live, bounded open-map criteria and produces a comparison-ready shortlist without synthetic scoring.
3. `Create` replaces existing 3D buildings with generated concept massing for the active AOI and restores the original map exactly on reset.
4. Search suggests real places while the user types, subject to the selected provider's usage policy and strict request controls.
5. Profile exposes B2B/B2C and a compatible default role without treating preferences as authorization; scenario and market remain workspace-local in this slice.

## Problem and business reason

- Existing source buildings remain visible underneath generated massing, making the redevelopment result visually incorrect and undermining trust.
- The drawing CTA says `Close area`, although the user decision is to select the completed polygon.
- Address search requires explicit submission and does not support fast place discovery.
- `Find` proves a live Overpass filter but has lost the earlier role, scenario, shortlist and comparison product logic.
- A profile implementation exists elsewhere in the product, but it is not coherently localized or connected to this prototype.
- In non-Analyse modes a normal map click can select a very large basemap polygon, producing a misleading highlight unrelated to the active task.
- A focused OpenAI answer can be useful but still fail the strict context-to-evidence wording gate, causing the entire otherwise valid analysis to return `AI_OUTPUT_INVALID`.

## Users and primary jobs

- B2B: developers, funds, lenders, urban authorities, consultants, asset managers and operators screening sites or assets.
- B2C: residents, renters, home buyers, investor buyers, tourists and relocation users exploring location context.
- The profile audience/role/scenario fields are working preferences only; they do not grant project, tenant or data access.

## Product and UX scope

### 1. Mode-safe map interaction

- Direct map selection is enabled only in `Analyse`.
- `Find` highlights only a result explicitly selected from the returned shortlist.
- `Create` accepts map clicks only while drawing an AOI; otherwise clicks must not select basemap objects.
- Switching away from `Analyse` clears stale object highlight without deleting the saved Analyse selection.
- Very large/background polygons are rejected defensively in Analyse when they are not a building or meaningful point/object feature.

### 2. Correct Create replacement and rollback

- Generating a concept atomically activates replacement state: existing building extrusions that intersect the active AOI are hidden and generated massing becomes visible.
- Replacement is applied to every rendered building fill and extrusion by a geometry-aware MapLibre filter; buildings outside the AOI remain visible.
- If the geometry-aware mask cannot be validated or applied, restore every original building filter and keep the generated concept hidden. Never hide the whole city layer or display overlapping old/new volumes.
- Reset, Show existing, AOI cancel, city change, mode change, basemap change, 2D/3D change and component unmount restore the original source layer filter and visibility exactly.
- Rename `Close area` / `Замкнуть зону` to `Select` / `Выбрать`.

### 3. Dynamic place suggestions

- Start suggestions after at least two normalized CJK characters or three other normalized characters and a 500–700 ms debounce.
- Abort superseded requests; cache repeated query/market/locale combinations for the session; cap results and keyboard-operable listbox behavior.
- Apply selected-city bounds/bias and requested locale. Selecting a suggestion moves the map, closes the list and resolves the selected location through the existing evidence path.
- Use Photon only for server-side search-as-you-type. Photon returns OpenStreetMap-derived open context with `© OpenStreetMap contributors` / ODbL 1.0 attribution; its public demo endpoint has no product SLA and coverage may be incomplete or uneven.
- Do not implement search-as-you-type against public Nominatim. Preserve the existing explicit-submit Nominatim search as a resilient, separately rate-limited fallback.
- No browser-direct third-party requests, API keys or raw upstream payloads.

### 4. Find V2

- Add B2B/B2C, role and scenario selectors by reusing the released Explore definitions, corrected where current evidence shows defects.
- Map each supported scenario to a transparent set of live OSM filters. Unsupported criteria remain visibly unavailable rather than fabricated.
- Preserve current-view bounded execution, coverage disclosure and source lineage.
- Build a shortlist selection state and side-by-side comparison using observed attributes only. No composite rank, suitability score, availability, zoning, ownership, valuation or financial claim without source evidence.
- Opening a result switches to Analyse with the expected OSM source identity; server re-resolution fails closed if the identity changes. Find state remains browser-session preserved and is available after `Back to map` and selecting `Find`; this slice does not promise a dedicated `Back to Find results` CTA on the analysis page.

### 5. Profile

- Reuse and adapt the existing `/profile` implementation rather than creating a competing profile store.
- Localize the profile in English and Russian and align it to the point-to-object green product theme.
- Surface default audience B2B/B2C and its compatible role in this slice. Language remains the existing global product preference; scenario and city are selected in the active Find/map workspace until the versioned preference migration is separately approved.
- Keep preferences separate from permissions and source claims.
- Browser-local demo profile data must be scoped to the active demo identity and cleared on sign-out; no cross-user inheritance.
- Do not store or display shared demo credentials in the profile UI.

## Data and engineering impact

- MapLibre: mode-specific click policy, bounded selectable-feature policy, reversible source-layer replacement state and style reload restoration.
- Search: server-only Photon autocomplete adapter with selected-market bounds/country/bias, allowlisted response parser, same-origin and Preview gates, rate limiting, timeouts, body limits and caching. Existing explicit-submit Nominatim search remains separate.
- Find: extend the request/response contract with product intent only where it affects transparent query predicates; retain raw observed candidate evidence and source lineage.
- Profile: reuse the existing normalized audience/role preference contract without a schema or hosted Supabase mutation.
- AI analysis: keep the strict validator unchanged; for the two known context-binding mismatches only, replace the invalid focused sentence with server-rendered copy derived from canonically bound evidence and revalidate the whole plan before returning it. Do not salvage malformed JSON, unknown codes, forbidden claims, unbound evidence or an absent nearby-context receipt.
- No hosted Supabase mutation is required for the first coherent Preview slice.

## Affected screens, routes and files

- Product screens: `/prototype/point-to-object`, its analysis result surface and `/profile`.
- Prototype APIs: `/api/prototype/point-to-object/suggest`, `/find`, `/context`, `/ai`, `/create` and `/area-context`; no Production source-pack activation is included.
- Primary UI modules: `components/point-to-object/prototype-client-v5.tsx`, `live-object-map.tsx`, `analysis-client.tsx`, `create-panel.tsx`, `prototype-header.tsx` and the existing profile panel.
- Primary source contracts: `src/lib/prototype/point-to-object-autocomplete.ts`, `point-to-object-find-capabilities.ts`, `point-to-object-find-session.ts`, `point-to-object-map-replacement.ts`, `point-to-object-live-evidence.ts`, `point-to-object-create.ts`, market/i18n definitions, API access manifests and focused test scripts.
- Active documentation affected by the new candidate source boundary: `README.md`, `CHANGELOG.md`, `docs/architecture.md`, `docs/data-strategy.md`, `docs/qa-checklist.md` and `docs/DOCUMENTATION_INDEX.md`.

## Design impact

- Retain the V5 light enterprise layout and green interaction accent; add no competing design system.
- Keep mode ownership visually explicit: Analyse selects map objects, Find owns criteria/results/comparison, and Create owns AOI/replacement/concept state.
- Autocomplete must expose localized loading, empty and error states, keyboard focus/selection and a non-blocking explicit-search fallback without layout overflow.
- Find comparison must show observed values and visible gaps without scores or unsupported confidence styling.
- This Change Request does not claim a Figma update. Desktop, tablet and 390 px rendered-browser evidence is required before Preview verification.

## Risks and controls

| Risk | Control |
| --- | --- |
| Old and new 3D volumes overlap | Atomic replacement state, geometry-aware mask, original-filter restoration with concept-hidden fail-safe, explicit rollback tests |
| Basemap polygons appear as selected sites | Mode-gated click handling plus oversized/background geometry rejection |
| Autocomplete violates public geocoder policy or becomes unavailable | Photon-only server adapter with ODbL attribution, selected-market bounds, timeout/body/rate/cache controls and no SLA claim; no Nominatim autocomplete; explicit Nominatim submit remains available |
| Find recreates mock rankings | Observed-only shortlist/comparison; unsupported criteria excluded; no composite score |
| Profile preferences are mistaken for access | Explicit preference semantics; existing Auth/RLS remains the only authorization source |
| Demo profile leaks between users | Identity-scoped storage and sign-out cleanup tests |
| A safe model plan is discarded because only its focused sentence misses a context binding | Strict validator remains authoritative; allowlisted context-binding failures receive deterministic server recovery, full revalidation and an audit log, while all other failures remain fail-closed |

## Acceptance criteria

- No ordinary click in `Find` or idle `Create` creates or changes an object highlight.
- Analyse does not highlight a giant background polygon when the click does not target a meaningful object.
- After concept generation, no original building extrusion remains visible inside the AOI; reset restores the exact prior 3D layer state.
- `Select` / `Выбрать` replaces `Close area` in all visible states and tests.
- Typing two normalized CJK characters or three other normalized characters produces policy-compliant real suggestions with debounce, abort, keyboard navigation and explicit-submit fallback.
- Find exposes audience, role and scenario, returns a live bounded shortlist, supports selecting comparison items and compares only observed fields with visible gaps.
- Opening a Find candidate preserves its expected OSM source identity through Analyse; an identity change fails closed. After `Back to map`, the preserved shortlist is available by selecting `Find`; a direct analysis-to-Find CTA is outside this slice.
- Profile can be opened from the prototype header and saves the existing B2B/B2C plus compatible default-role contract; it does not change authorization.
- A focused request that hits either known context-binding mismatch returns a fully revalidated analysis without a second paid model call; missing or unbound nearby evidence remains unsupported rather than inferred.
- English/Russian copy, 390 px responsive layout, keyboard focus, build, lint, contract tests, source/data-honesty checks and focused browser journeys pass.
- Exact-head protected Vercel Preview is READY; `main`, Production and hosted Supabase remain unchanged.

## Delivery order

1. P0 interaction and Create replacement/rollback.
2. Dynamic search suggestions.
3. Profile reuse/localization and preference contract.
4. Find V2 role/scenario/shortlist/comparison slice.
5. Integrated browser QA and protected Preview deployment.

## Rollback

- Revert or discard the bounded V5.1 candidate commit on its isolated branch, then redeploy the previously verified protected Preview if a hosted rollback is required.
- Resetting Create or leaving its state restores the original rendered building filters; provider failure must retain explicit search and fail without fabricated results.
- No database rollback, Supabase migration reversal, Production rollback or data repair is required because this slice changes none of those surfaces.
- Preserve the predecessor V5 receipt as immutable historical evidence; do not overwrite its SHAs or deployment tuple with V5.1 facts.

Mandatory decision boundary:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
