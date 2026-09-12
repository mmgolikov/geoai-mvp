# Sprint07 — User Journey Recovery and Role-Based Decision Cards

Status: Owner-approved implementation candidate; local verification passed; external candidate handoff pending; not released
Last verified: 2026-09-10
Owner: GeoAI Main
Authority: Founder approval of the five-hour sprint proposal in the active task
Successor: None
Navigation: [Documentation Index](../../../DOCUMENTATION_INDEX.md) · [Previous correction](SEPT10_REGRESSION_PROJECT_HUB_CHANGE_REQUEST.md)

## Problem and business reason

Founder testing of the September 10 Preview on iPhone 15 Pro / iOS 27 RC Safari and macOS reported broken context recovery, unclear saved-result navigation, missing Find/map correspondence, incomplete source-building replacement, complex-footprint 3D artifacts, inefficient mobile space and a blurred/disproportionate landing. Text-heavy analytics do not support role-specific decisions. The screenshots additionally expose possible selected-building/nearby-POI identity confusion and mixed-radius narration. These findings reopen the affected earlier acceptance; a prior green test does not close them.

## Scope and authority

The founder approved the detailed sprint proposal with “поехали”. Work is limited to the existing `codex/sprint06-mobile-decision-v1` Preview branch and Draft PR #148. Baseline and rollback reference: `46f6f658c8742fc50b8c9d1548a1a80d33872390`. No merge, main modification, Production promotion, hosted Auth/RBAC/database/Storage change, secret/environment/plan change, new provider subscription, outreach, registration or financial commitment is authorized. Existing Preview access protection remains unchanged. The contact form is a design proposal only and must not transmit or persist new leads. Local saved-work isolation and existing source attribution remain mandatory.

This CR supersedes prior UX wording only where explicitly changed below. It does not supersede source rights or released-runtime authority. Internal business/jurisdiction research is a separate Research lane, not commercial validation or public product claims.

## Source audit at intake

- Local branch and tracked files match the baseline; existing untracked `.playwright-cli/` and `output/` are preserved.
- Live GitHub read confirms open Draft PR #148, exact head above, base `main`.
- Live Vercel read confirms READY non-Production deployment `dpl_ADdDLt9g6udvpJFMnzXbHEVnu6S2`, same SHA and stable Preview alias.
- Live Confluence Project Hub #98425 version 257 preserves the previous bounded correction and physical-device gap. New founder screenshots are current input evidence, not a new runtime pass.
- Documentation Index and September 10 correction govern this branch. Older embedded release tuples remain historical; they do not authorize Production changes. Relevant architecture/data/roadmap/QA authorities remain intact.
- Source failures, identity binding and rendering need causal reproduction. Supabase and Figma are not mutation targets; no new hosted-state or design-file acceptance is claimed.
- API spend is private operational evidence. Until the weekly ledger is reconciled, all lanes use zero paid API calls and offline fixtures.

## Users and affected surfaces

Anonymous/device-local prototype users, current mock-profile users and future B2B/B2C personas. Surfaces: landing, point-to-object workspace, analysis dashboard, Find results/comparison, Create panel, Project Hub, header/profile navigation. Professional persona selects content; it never grants access rights.

## Acceptance backlog

| ID | Priority | Required outcome |
| --- | --- | --- |
| S07-01 | P0 | Selected map geometry remains distinct from a nearby resolved POI. Exact identity labels require matching evidence. Radius-bound observations and nearest-outside observations are not conflated. |
| S07-02 | P0 | Context failure ends loading, preserves selected geometry/question/last successful result, supports explicit retry and rejects stale responses. No automatic paid rerun on reopen. |
| S07-03 | P0 | Hub open → map/dashboard → back → reload restores the exact saved operation, AOI, parameters and output without duplication or upstream AI calls. Refresh is explicit and preserves prior result history. |
| S07-04 | P0 | Generation A/B/new result/clear/style reload/zoom correctly replace generated layers; hide existing affects all verified interior source buildings while retaining outside and boundary-crossing/multipart geometry safely. No false claim of arbitrary partial-building clipping. |
| S07-05 | P1 | Complex selected buildings render without copied overlapping extrusions or invented heights. Missed hit-test cases get an honest selection path. |
| S07-06 | P1 | Find has synchronized numbered map/list results, focused selection, bounded fit and an understandable comparison selection for 2–4 candidates; empty, limited and unavailable states remain distinct. |
| S07-07 | P1 | Mobile collapsed task sheet has no gratuitous empty padding; drawing controls and camera do not reserve duplicated gaps; outside-camera pointer interaction dismisses camera controls. Preserve safe-area, attribution and accessible targets. |
| S07-08 | P1 | Drawing has clear finish/ready/edit states; completed generation has a primary Show result on map action. |
| S07-09 | P1 | New product navigation never unintentionally opens the legacy workspace. Projects/Profile show immediate navigation feedback; same-row controls align, profile uses rounded square, New becomes a bare bold plus with an accessible hit target, storage location is truthful and explained. |
| S07-10 | P1 | One Project Hub with three horizontal Analyse/Find/Create widgets on desktop and responsive mobile layout; real saved reports/projects with query/type/sort. Distinguish all-project map overview, saved dashboard and exact-result map. No Data readiness split or fake cloud collaboration. |
| S07-11 | P1 | Desktop/mobile landing uses a genuine crisp source map frame sized for its viewport, centered selection and adjacent three-action menu. No oversized top gap, stretched low-resolution frame, overflow or attribution loss. Open map and Leave a request remain clear. |
| S07-12 | P1/target | Versioned role/scenario/card contract for B2B/B2C plus separately scoped B2G extension. Two dashboard specifications; first B2B card dashboard implementation after P0 data gates. No invented score, routing time, finance or zero-for-missing data. |
| S07-13 | P2/target | One bounded polygon-responsive concept typology and meaningful A/B metrics if core acceptance is closed. Arbitrary organic planning/generation and new providers remain deferred. |

## Data and engineering contract

Map selection, provider-resolved identity, geographic context, derived metrics and model interpretation are distinct records. Preserve provenance, source timestamp, radius/distance method, missing-data state, immutable saved-result receipts and owner scope. Failed enrichment must not replace a selected building with a nearby POI or destroy a valid result. Dashboard configuration defines cards and their evidence requirements; the model supplies bounded interpretations rather than arbitrary UI. Existing local storage must migrate non-destructively if a change is required. Unverified or corrupted receipt bytes remain fail-closed, not silently repaired into trusted data.

## File ownership and execution

- Main: source/identity/analysis correctness, analysis-client, new dashboard registry/components, documentation, integration and exact-head acceptance.
- MAP: live-object-map, map-replacement, find-viewport, new map helpers and focused tests. Callback changes agreed with UX.
- UX: prototype-client-v5, live-session, projects-page-client, project-control, prototype-header, create-panel, mobile CSS, point-object-projects and find-session helpers; scoped landing/navigation files after explicit coordination.
- Research: private local reports/source matrices; no product claims, external messages or program applications. After research review, Main assigned one additional bounded P2 campus-boundary orientation implementation in `point-to-object-create.ts` and its pure geometry checks; no shared component ownership or provider change.

Shared i18n, global styles, package scripts and server process each have one designated owner. No parallel edits to shared files. One root-owned integration server. Agents do not push/deploy; Main integrates the approved branch after verification.

## Verification and delivery

Protect the final hour for integration and regression checks. Run focused offline contracts, lint/build, required integrity/security checks, then reproducible Chrome/WebKit user journeys and screenshot comparison at equivalent viewports. Physical iOS 27 RC remains a separate founder retest. Do not weaken tests to accommodate known bugs or call a dev-server failure a product failure without evidence. Publish only the tested Preview candidate with exact SHA/CI/deployment, before/after screenshots, deferred items and rollback reference. Any unresolved P0 stays explicitly unaccepted. Update affected current docs/change log and the operational Hub without overwriting historical receipts.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
