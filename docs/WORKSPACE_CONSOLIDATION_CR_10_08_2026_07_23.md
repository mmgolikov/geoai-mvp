# GeoAI — Workspace Consolidation and Explore Retirement

## Document control

| Field | Value |
| --- | --- |
| Change Request | CR-10.08 |
| Status | Implemented in Draft; exact-head release verification required |
| Date | 2026-07-23 |
| Owner | GeoAI Founder / GeoAI Delivery OS |
| Repository | `mmgolikov/geoai-mvp` |
| Branch | `recovery/runtime-design-migration-v1` |
| Draft PR | `#112` |
| Production impact | None without a separate release approval |
| Verification record | Exact-head CI, Preview and artifact receipt are recorded in Draft PR #112 and the linked Confluence authority after successful completion |

## Executive decision

GeoAI uses **Workspace** as the single canonical Product surface for both map-first and criteria-first spatial decision workflows.

The separate **Explore** Product destination is retired because it rendered the same `WorkspaceShell`, differed primarily by its initial interaction mode, and created avoidable duplication in the landing narrative, desktop navigation, mobile navigation, accessibility journeys, visual evidence and route governance.

Criteria-first candidate search, shortlist comparison and candidate dashboards remain fully available inside Workspace. The capability is not removed; only the duplicate Product destination and label are removed.

The legacy `/explore` path remains temporarily as a compatibility entry that performs a server-side redirect to `/workspace`. It must not appear in Product navigation, landing copy, current screen inventories or release claims as a separate Product module.

## Problem

Workspace and Explore previously exposed substantially the same system:

- both routes rendered `WorkspaceShell`;
- Explore only enabled a different initial interaction state;
- both contained map-first and criteria-first controls;
- both led to candidate search, comparison, decision dashboards and reports;
- the separate navigation label suggested two products where there was one decision workflow.

This duplication increased cognitive load, fragmented QA evidence, created redundant route and accessibility contracts and weakened the commercial narrative.

## Business reason

Enterprise and public-sector buyers need one clear operating model:

> Open Workspace → choose map-first or criteria-first → screen candidates → compare → inspect a decision dashboard → review sources → export a report.

A single Workspace reduces navigation ambiguity, improves onboarding and makes the product architecture easier to explain, test and govern.

## Users

- UAE real-estate and development teams;
- investment and portfolio analysts;
- government land and object monitoring teams;
- pilot sponsors and client reviewers;
- demo users on desktop, tablet and mobile.

## Scope

### Landing

- Replace the `Explore platform` CTA with `Open workspace`.
- Do not present Explore as a separate Product capability.
- Keep candidate search and comparison language as Workspace capabilities.

### Product navigation

- Desktop Product navigation contains `Workspace` and `Projects` only.
- Mobile Product navigation contains `Workspace` and `Projects` only.
- Workspace description explicitly covers screening, candidate search and comparison.

### Workspace

- `/workspace` is the canonical route.
- The screen heading remains `Workspace location screening`; Criteria-first is selected inside the same route.
- Map-first and Criteria-first remain first-class interaction modes inside Workspace.
- Candidate search, shortlist comparison, individual dashboards, evidence and reports remain unchanged.

### Legacy route

- `/explore` is not deleted abruptly.
- It is a compatibility-only server redirect to `/workspace`.
- It renders no separate Product shell, Workspace implementation, navigation or Product claim.
- Route removal may be considered only after telemetry/bookmark review and a separate Change Request.

## Data impact

None.

- no source ingestion change;
- no scoring change;
- no report schema change;
- no persistence change;
- no Supabase, Auth, RLS, Storage or secret change;
- no official/live integration claim.

## Design impact

- one canonical Product label: Workspace;
- two internal interaction modes: Map-first and Criteria-first;
- fewer navigation choices;
- clearer commercial and onboarding narrative;
- no loss of analytical functionality;
- compatibility route is non-promotional and invisible in Product navigation.

## Engineering impact

- update `ProductNavigation` route registry;
- normalize the Workspace heading for every interaction state;
- replace the `/explore` Product page with a server-side compatibility redirect;
- update landing CTA copy;
- update navigation, accessibility, Auth, spatial and mobile E2E contracts;
- update exact-head visual evidence policy for intentionally changed shared navigation;
- retain current internal `explore*` implementation identifiers temporarily to avoid a broad functional refactor. These identifiers are implementation details, not Product labels;
- add a permanent source guard that rejects visible `/explore` links, duplicate Product-shell rendering and retired public Explore labels while allowing internal technical identifiers.

## Risks and controls

| Risk | Control |
| --- | --- |
| Existing bookmarks to `/explore` break | Server-side compatibility redirect to `/workspace` |
| Candidate-search functionality is accidentally removed | Acceptance tests exercise Criteria-first, candidate search and comparison inside Workspace |
| Navigation change invalidates visual baselines | Changed shell/menu states use deterministic candidate evidence and SHA-256 receipts |
| Current route inventory treats `/explore` as a Product route | Current documentation and source guard label it compatibility-only; a later route-removal CR can delete it |
| Redirect bypasses authentication governance | The server redirect lands on canonical `/workspace`, where the existing resolved-session route gate remains authoritative |
| Internal identifiers cause confusion | Public UI and current documentation use Workspace terminology; internal names are recorded as temporary technical debt |

## UX acceptance criteria

1. No visible `Explore` Product navigation item exists on desktop, tablet or mobile.
2. Landing contains no `Explore platform` CTA.
3. Workspace is the only visible operating surface for map-first and criteria-first workflows.
4. Criteria-first candidate search, shortlist comparison, candidate dashboard and export still work from `/workspace`.
5. Criteria-first can be selected directly inside `/workspace`, with the heading `Workspace location screening`.
6. `/explore` redirects to canonical `/workspace` without exposing a duplicate Product screen.
7. Product navigation retains accessible names, focus states, minimum target sizes and no horizontal overflow.
8. No data-honesty language or source-lineage behavior is weakened.

## Engineering acceptance criteria

1. `productRoutes` contains exactly Workspace and Projects.
2. `/explore` no longer imports or renders `WorkspaceShell`, `AuthenticatedRouteGate` or Product navigation as a separate screen.
3. The compatibility entry performs a server-side redirect to `/workspace`.
4. Workspace receives one consistent public heading regardless of interaction mode.
5. E2E journeys use `/workspace` for criteria-first comparison.
6. Shared-shell evidence expects two Product destinations.
7. Route smoke expects `/explore` to return `307` with Location `/workspace`.
8. A permanent source guard rejects visible Explore navigation/landing regressions and duplicate route rendering.
9. TypeScript, build, accessibility, data-honesty, route smoke and report checks remain green.

## QA checklist

- [ ] Desktop navigation: Workspace and Projects only.
- [ ] Mobile menu: Workspace and Projects only.
- [ ] No visible Explore label on landing or authenticated Product shell.
- [ ] Landing CTA reads `Open workspace` and targets the demo Workspace entry.
- [ ] `/workspace` map-first flow passes.
- [ ] `/workspace` criteria-first flow passes.
- [ ] Candidate search and comparison pass.
- [ ] Analysis and comparison export pass.
- [ ] `/explore` compatibility redirect resolves to `/workspace` in a browser.
- [ ] Route smoke records `/explore` as `307` with Location `/workspace`.
- [ ] Keyboard navigation and Escape/outside-close behavior pass.
- [ ] Axe serious/critical findings remain zero on critical screens.
- [ ] No horizontal overflow at 390, 430, 768, 834 and 1440 widths.
- [ ] Permanent Workspace-consolidation source guard passes.
- [ ] Exact-head Vercel Preview is READY.
- [ ] Exact-head GitHub Quality Gate is successful.
- [ ] Production remains unchanged unless separately approved.

## Current screen inventory after implementation

| Route / entry | Status | Purpose |
| --- | --- | --- |
| `/workspace` | Canonical Product screen | Map-first and criteria-first spatial decision workflow |
| `/projects` | Canonical Product screen | Project Hub and saved decision work |
| `/explore` | Compatibility-only | Server-side redirect of legacy links to `/workspace` |

## Release note draft

**Workspace consolidation:** GeoAI now presents one canonical Workspace for map-first and criteria-first screening. Candidate search and comparison remain available inside Workspace. The duplicate Explore navigation destination has been retired. Existing `/explore` links are preserved through a compatibility redirect.

## Rollback

Revert the CR-10.08 commits on the Draft branch. No database or environment rollback is required.

## Non-authorizations

This Change Request does not authorize:

- merge to `main`;
- Production promotion;
- Figma writes;
- Supabase/Auth/RLS/Storage/source mutations;
- environment or secret changes;
- official parcel, zoning, cadastral, ownership or valuation claims.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning, engineering, insurance or valuation conclusion.
