# Cycle 05 — Projects, precise replacement and bilingual product entry

Status: Founder-approved scope; shared source audit complete; spatial slice locally verified; other implementation lanes blocked; no Production activation
Date: 2026-09-06
Owner: GeoAI Main
Baseline: `833b575561853942530bb4766d04c2ad8ae06b31`
Preview baseline: `dpl_GazGmmiDkznQwuM2GwWK2RDGZNMu`
Branch: `codex/point-to-object-clickable-prototype-v1`, draft PR #147
Main/Production boundary: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`, unchanged

## Problem and business outcome

The founder accepts the current map-led direction as the successor product to prepare for eventual Production. Selection controls look inconsistent and sometimes focus without opening. Analyse, Find and Create lack one reliable project workflow for retaining and reopening work. Create can apparently hide distant unselected buildings; exact map identity and spatial scope must be verified, not inferred from one tile/layer ID. A new bilingual selling landing and a navigable product/development roadmap are required.

The outcome is a coherent saved-work prototype: enter through a credible landing, choose a role/scenario, analyse/find/create, retain the completed work in a project, and reopen it without unwanted source/AI calls. Reports are explicitly deferred. This is preparation for Production, not authorization to merge, promote, enable Production sources or claim readiness.

This new founder-approved CR supersedes older candidate-only design exclusions only for its named screens and Preview scope. Production and historical release documentation remain separate. Prior Cycle 05 draft was not dispatched and is superseded by this wider scoped CR.

## Source audit before implementation

- Confirm branch/main/PR/Preview tuple; preserve user edits and previous clean baseline.
- Compare current and main Projects/auth/repository modules; classify reuse/adapt/retire. Distinguish browser-local history from actual caller-scoped Supabase persistence.
- Inspect current migrations/API facade, current Preview connection target without printing credentials, ownership/membership/RLS and storage quotas. Do not activate a dormant global repository gate by assumption.
- Check map source-layer/filter/feature identity and replacement code against actual renderer semantics. Reproduce duplicate IDs, shared properties, multipart geometry and tile/zoom boundaries before a fix.
- Read the current Confluence Hub and design registry before documenting final states. Do not claim Figma/Confluence parity from local files or screenshots alone.

## A. Selection control polish

Use the existing approved light/teal product system. Align chevrons with consistent inset and a reserved hit area. City, role, scenario and settings controls should open reliably on the first mouse/touch/keyboard activation, support Escape, arrows/Enter and focus restoration, and work within the scrollable drawer without clipping. Reuse an existing accessible primitive if available; do not add a framework for cosmetic changes. Preserve meaningful focus indication and labels. Find audience remains Profile-only; retain roles, role-specific scenarios, settings and comparisons. No global drawer expansion or redesign of the approved map.

## B. Projects and saved work

Execution refinement after the shared audit: the first implementation slice is versioned browser-local Saved Projects and zero-call reopening. The cloud contract is documentation only in this slice. Hosted schema/API activation, Auth/enforcement and environment changes are not part of DEV-05. Device saving does not satisfy cross-device/cloud acceptance. As of this checkpoint, dev_1 has not applied its patch because its execution policy still requires direct in-task user authorization to supersede the previous DEV-G2A read-only scope; a confirmation relayed by Main was not accepted. Do not bypass this denial from another lane.

Default product assumption: a new independent work session creates a project at its first successful Analyse/Find/Create operation; subsequent deliberate runs within that project become distinct saved artifacts/revisions, not duplicate projects on retries. Provide a clear project name, mode, city/location and last-updated time. The user can select an existing project or start a new one. Save only completed outcomes; preserve draft edits separately from last completed results. Save failure must remain visible and retryable without another model call. Never show Saved before durable acknowledgement.

Restore the useful existing Projects flow with adaptation, not a second incompatible project universe. A project holds selected identity/AOI, role/scenario/settings and language, Find results/shortlist/comparison, analysis result/source snapshot references, and Create parameters, alternative geometries and active selection. Reopening restores actual geometry and intent, not a screenshot, and must not automatically regenerate paid output or refetch sources. Preserve original provenance/model/cost/version metadata; do not relabel historic reports as new analysis. Reports/exports are future work, not dead buttons.

Use versioned, bounded, JSON-safe contracts and server-owned identities/idempotency with tenant/user authorization. Do not store provider secrets, access tokens or arbitrary remote URLs. Never use service-role access as user authorization or user-editable profile audience as a privilege. Signed-in cross-device persistence requires real verified caller-scoped storage; local-only fallback must be explicit and cannot count as completion of cloud saving. Avoid mandatory login for viewing the already public/protected Preview workflow where not required, but never grant private projects to anonymous/demo identities.

Existing-user authentication is preserved. Hosted migration, auth/enforcement and environment activation changes require an exact reviewed target and explicit approval under current project operating instructions. Prepare/validate needed changes, ask only for the material activation choice if required, and continue independent UI/map/landing work. Do not modify managed PostGIS tables or copy unknown historical migrations wholesale.

## C. Exact source-building replacement — priority correctness fix

Only buildings spatially belonging to the selected AOI may be hidden; other streets/quarters and distant components must remain unchanged even if IDs, properties or source-layer membership collide. A layer is not an object identity. A source feature ID alone is not sufficient across tiles or disjoint geometries.

Resolve and document boundary policy: fully inside components may be hidden; if a component crosses the boundary, preserve its outside portion by safe clipping or conservatively retain that boundary component rather than hiding outside the AOI. Never expand selection to a bbox/whole source layer. Do not hide whole MultiPolygons because one component intersects. Preserve baseline layer filters and restore exactly on Show existing/Delete/Reset/unmount/style reload; reject late results for an obsolete AOI. Preserve generation's explicit A/B and draft semantics.

Required counterexamples: two distant buildings sharing an ID; missing IDs; one multipart feature with one inside and one distant component; adjacent tile boundaries; zoom/load refresh; AOI holes/concavity; boundary crossing; successive selections; style switching; 2D/3D; clear and restore repeated five times. Browser verification must assert an outside landmark remains while the target is hidden. No provider data is actually deleted.

## D. New bilingual selling landing

Execution checkpoint: design_1's previous Figma-only authorization still blocks code changes in its task. A direct in-task authorization is required before implementation can resume. The captured product screenshot and staged concept do not constitute an implemented landing. Do not reproduce the denied patch from another lane.

Use the current approved visual system as the grounding reference: light, premium, restrained teal accent, readable dark type, real map/product imagery and generous but purposeful spacing. This is an existing-product design/build, not permission for an unrelated theme. The new entry describes Analyse, Find, Create and Projects through role-specific jobs/outcomes and clear paths into the prototype. Primary audiences: developers, real-estate/asset owners, funds, advisors and urban/public teams; support consumer users as a secondary path without misrepresenting available scenarios.

English/Russian parity, working CTA/navigation/profile/project links, responsive desktop/tablet/mobile, keyboard access and no invisible overlays. Do not invent customer logos, testimonials, traction, accuracy, official integrations, investment returns or operational capabilities. Distinguish current capabilities from a compact future roadmap where needed. No new paid assets, marketing tracking, contact submissions, external sales messages or pricing commitments. Preserve existing routes or redirect intentionally with tests. Preview only.

## E. Full-version roadmap and design/documentation

Prepare one staged roadmap with dependencies, acceptance evidence, owners and exit criteria rather than dates without estimates. Geocontext track: user-selectable radius/distance, point vs AOI aggregation, residential access to schools/clinics/childcare/grocery/transit, retail/office logistics and transport/catchment, source coverage/deduplication, straight-line vs network distance and scenario-conditioned AI synthesis. Never infer demand from POI counts alone.

Generation track: precise object identity/replacement first, complex site-aware massing, road/entrance/orientation constraints, setbacks/holes, usable open space/circulation, distinct programmes and eventually evidenced economic scenarios. Separate screen-space prototype massing from architecture/BIM and legally approved planning.

Platform track: durable projects/versioning, auth/ownership/security, source quotas/cache/observability, model evaluation/costs, report pipeline, accessibility/performance, design system/Figma handoff, deployment/rollback and due-diligence documentation. Define explicit Preview → internal release candidate → founder acceptance → approved Production gates. No automatic promotion.

Update the active repository index/backlog/architecture/QA where affected. Confluence remains the operational entry point; use current-page read/merge/readback and preserve history. Figma uses existing exact file/page targets and clearly named current sections; do not create duplicates or move/delete pages by assumption. At minimum document the implemented components/screens and handoff; report any synchronization limitation honestly.

## Ownership and resource control

Main is sole integrator/publisher. Existing tasks: dev_1 owns select/project integration after audit; gen_ai_1 owns spatial replacement internals; design_1 owns landing/design direction and scoped implementation after source grounding; wiki_1 receives final accepted materials for canonical documentation. Temporary bounded read-only persistence/geometry reviewers may assist. Do not keep every research/commercial task active. Start no more than three implementation lanes, use Sol xhigh for bounded work and max for genuine spatial ambiguity. Every task receives this complete CR, exact baseline, exclusive files, checks and boundaries. Return commits/evidence/issues to Main; do not send recursive continuation prompts back to Main.

## Acceptance and release

Combined lint/build, focused contracts and failure/permission/idempotency tests; signed-in save/reopen/isolation if cloud activation is authorized; zero automatic model calls on restore; repeated selection controls and replacement browser tests; EN/RU and 390/768/1280/1440 desktop/mobile visual checks. Preserve 430 px desktop drawer and full-height map unless a documented smaller breakpoint needs adaptation. Freeze one combined commit, publish only protected Preview, verify exact-head CI and rendered Preview, retain rollback and confirm unchanged main/Production. Report implemented versus deferred/blocked work without readiness inflation.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
