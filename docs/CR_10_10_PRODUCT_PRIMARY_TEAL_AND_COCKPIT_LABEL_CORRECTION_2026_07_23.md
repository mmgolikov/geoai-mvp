# CR 10.10 — Product-Primary Teal and Cockpit Label Correction

Status: Approved for implementation on a bounded branch and Vercel Preview; merge and Production release are not authorized by this document  
Date: 2026-07-23  
Owner: GeoAI Founder / GeoAI Delivery OS  
Repository: `mmgolikov/geoai-mvp`  
Branch: `fix/product-primary-teal-v322`

## Executive summary

The released public-demo runtime uses the intended spatial-teal primary state in the initial Workspace setup, but several authenticated Product surfaces revert to brand blue after analysis or on Projects and Profile. The commercial cockpit export also contains candidate-label collisions that reduce legibility.

This change establishes one explicit `product-primary` semantic token for authenticated Product actions and selected controls, applies it consistently across Workspace setup, decision dashboards, Projects, Profile and Product report actions, and corrects the commercial cockpit labels in both Figma and repository-owned runtime assets.

Brand blue remains reserved for GeoAI identity, commercial brand structure, informational hierarchy, links and focus boundaries. Validation amber and critical red retain their existing meanings.

## Problem

1. Initial Workspace selected controls render spatial teal, while analysis-result side-panel controls and Product actions render brand blue.
2. Projects and Profile primary actions and selected segmented controls render brand blue or purple, creating inconsistent interaction semantics.
3. The commercial cockpit candidate-card eyebrow and title lines collide in the exported visual, especially for candidates 01 and 02.
4. The Figma authority and runtime are not fully aligned on the Product primary-action semantic role.

## Business reason

A premium enterprise Product needs a stable interaction grammar. Users should not infer a change in meaning merely because they moved from setup to analysis, Projects or Profile. The commercial hero visual must also remain legible because it is the first representation of the Product workflow.

## Users

- Public-demo prospects evaluating GeoAI.
- B2B/B2G Product users working in Workspace, analysis, Projects and Profile.
- Founder, design and engineering reviewers.

## Affected surfaces

- Commercial Landing hero cockpit.
- Workspace setup and result states.
- Express Analysis and Comparison dashboards.
- Projects / Project Hub.
- Profile.
- Product report actions and relevant authenticated action states.
- Product System design authority and semantic-color documentation.

## Data impact

None. No database, Auth, RLS, Storage, source, secret or environment mutation is included.

## Design impact

Figma file: `TAzDqOvRCw1mQGMU3Y4S9H`.

Primary nodes:

- Product System authority: `1797:2`.
- Product Button component set: `202:68`.
- Segment Switch component set: `204:73`.
- Commercial cockpit desktop: `1495:53`.
- Commercial cockpit tablet: `1495:725`.
- Commercial cockpit mobile: `1495:1144`.

Required policy:

| Semantic role | Correct use |
| --- | --- |
| Brand blue | Identity, commercial brand structure, links, informational hierarchy and focus boundary |
| Product primary teal `#087F8C` | Authenticated Product primary actions and selected controls |
| Product primary hover `#006C78` | Hover/pressed state within the same teal family |
| Product primary soft `#E5FAFA` | Supporting analytical emphasis and selected soft surfaces |
| Validation amber | Official/client validation gaps and caution |
| Critical red | True blocking, failure or material risk |

## Engineering impact

- Introduce explicit Product-primary semantic tokens instead of relying on route-specific `brand` overrides.
- Apply Product-primary styles to authenticated Product buttons and selected segmented controls.
- Preserve brand-blue commercial CTAs unless they are inside an authenticated Product surface.
- Replace the collision-prone cockpit export with corrected repository-owned responsive assets.
- Add source and browser regression contracts for color continuity and cockpit legibility.

## Risks and controls

| Risk | Control |
| --- | --- |
| Recoloring brand identity or public commercial navigation | Scope Product-primary overrides to authenticated Product surfaces and Product report actions |
| Recoloring warning or destructive actions | Exclude validation amber and critical red states from Product-primary rules |
| CSS-only behavior drifting by route state | Add explicit semantic tokens and permanent source/browser checks |
| Cockpit labels becoming unreadable at responsive sizes | Correct layout in Figma and verify exported assets at desktop, tablet and mobile widths |
| Treating a visual correction as pilot readiness | Preserve public-demo and sample/open/offline boundaries |

## Acceptance criteria

- [ ] Cockpit candidate eyebrow, title and score lines do not overlap on desktop, tablet or mobile assets.
- [ ] Workspace selected audience, selected interaction mode and primary action use `#087F8C` before and after analysis.
- [ ] Express Analysis and Comparison primary actions use `#087F8C` and hover within the teal family.
- [ ] Projects selected segment and primary actions use `#087F8C`.
- [ ] Profile selected segment and primary save/open actions use `#087F8C`.
- [ ] Product report primary actions use `#087F8C` where rendered as interactive Product controls.
- [ ] Brand identity, commercial structure, links and focus boundaries remain blue where appropriate.
- [ ] Validation and critical states retain amber/red semantics.
- [ ] Figma authority records the same semantic policy and corrected cockpit layout.
- [ ] TypeScript, source contracts, browser tests, accessibility checks, build and route smoke pass on the exact branch head.
- [ ] Exact-head Vercel Preview is READY and visually verified.
- [ ] PR remains Draft until explicit founder merge and Production approval.

## Source audit at opening

### GitHub

- Released `main`: `b22608889ebbbe4ebd781150c013d837f41c1a7e`.
- Merged release source: PR #112.
- New bounded branch: `fix/product-primary-teal-v322`.

### Vercel

- Current Production: `dpl_5JeKmSRVNTuHsLTRjfVdwTvH9Jbi`, READY.
- Production remains unchanged during this correction until explicit approval.

### Figma

- Current Product System authority: `1797:2`.
- Existing component tokens already specify Product Button primary `#087F8C` and Segment Switch active `#087F8C`, but runtime and cockpit usage are inconsistent.
- Cockpit candidate cards 01 and 02 contain visible text collisions in the current export.

### Supabase

No Supabase operation is required or authorized.

## Release boundary

This CR authorizes bounded repository and Figma corrections plus Preview verification. It does not by itself authorize merge, Production promotion, Supabase/Auth/RLS/Storage/source/env/secret mutation or protected-pilot claims.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning, ownership, engineering, insurance or valuation conclusion.
