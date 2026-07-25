# CR 10.10 — Product-Primary Teal and Cockpit Label Correction

Status: Approved bounded implementation candidate · Draft PR / Preview only  
Date opened: 2026-07-23  
Last reconciled: 2026-07-25  
Owner: GeoAI Founder / GeoAI Delivery OS  
Repository: `mmgolikov/geoai-mvp`  
Branch: `fix/product-primary-teal-v322`  
Draft PR: `#113`

## Executive summary

The released public-demo runtime uses the intended spatial-teal primary state in the initial Workspace setup, but several authenticated Product surfaces revert to brand blue after analysis or in Projects and Profile. The commercial Landing cockpit also contains candidate-label collisions that reduce first-view legibility.

CR 10.10 introduces one bounded Product-primary correction for authenticated Product actions and selected controls, applies it across Workspace setup, decision dashboards, Projects, Profile and Product report actions, and adds a repository-owned vector correction layer over the approved responsive `commercial-v1.8` cockpit raster.

Product System v3.2 and the v3.2.1 accessibility correction remain immutable foundation authorities. Product System v3.2.2 is implemented as a separate correction adapter linked to Figma receipt `1825:11`; it does not expand or rewrite the approved 16-token foundation manifest or the 56-state primitive contract.

Brand blue remains reserved for GeoAI identity, commercial structure, informational hierarchy, links and focus boundaries. Validation amber and critical red retain their existing meanings.

## Problem

1. Initial Workspace selected controls render spatial teal, while analysis-result controls and Product actions can revert to brand blue.
2. Projects and Profile primary actions and selected segmented controls can render blue or purple, creating inconsistent interaction semantics.
3. The commercial cockpit candidate eyebrow, title and score lines collide in the released raster, especially for candidates 01 and 02.
4. The Figma correction authority and runtime need an explicit, source-backed semantic mapping without mutating the approved foundation contract.

## Business reason

A premium enterprise Product needs a stable interaction grammar. Users should not infer a change in meaning merely because they moved from setup to analysis, Projects or Profile. The Landing cockpit must also remain legible because it is the first representation of the Product workflow.

## Users

- Public-demo prospects evaluating GeoAI.
- B2B/B2G Product users working in Workspace, analysis, Projects and Profile.
- Founder, design, engineering and release-governance reviewers.

## Affected surfaces

- Commercial Landing hero cockpit.
- Workspace setup and result states.
- Express Analysis and Comparison dashboards.
- Projects / Project Hub.
- Profile.
- Product report actions and relevant authenticated action states.
- Product System correction authority and semantic-color documentation.

## Data impact

None. No database, Auth, RLS, Storage, source, secret or environment mutation is included.

## Design impact

Figma file: `TAzDqOvRCw1mQGMU3Y4S9H`.

| Authority | Node |
| --- | --- |
| Product System v3.2.2 correction candidate | `1797:2` |
| Product System v3.2.2 correction receipt | `1825:11` |
| Product Button component set | `202:68` |
| Segment Switch component set | `204:73` |
| Commercial cockpit desktop | `1495:53` |
| Commercial cockpit tablet | `1495:725` |
| Commercial cockpit mobile | `1495:1144` |

Required policy:

| Semantic role | Correct use |
| --- | --- |
| Brand blue | Identity, commercial structure, links, informational hierarchy and focus boundary |
| Product primary teal `#087F8C` | Authenticated Product primary actions and selected controls |
| Product primary hover `#006C78` | Hover state within the same teal family |
| Product primary soft `#E5FAFA` | Supporting analytical emphasis and selected soft surfaces |
| Validation amber | Official/client validation gaps and caution |
| Critical red | True blocking, failure or material risk |

## Engineering impact

- Preserve `productSystemV32Tokens` and `productSystemV32ComponentTokens` as immutable v3.2/v3.2.1 authorities.
- Add `productSystemV322CorrectionTokens` as a separate bounded source adapter for CR 10.10.
- Apply Product-primary styles only to authenticated Product actions, selected controls and Product report actions.
- Preserve brand-blue commercial CTAs and structural brand usage.
- Keep the approved `commercial-v1.8` responsive raster as the runtime base and apply a pointer-inert vector correction layer for collision-prone labels and selected-state accents.
- Add permanent source and browser regression contracts for semantic continuity, responsive overflow and cockpit line separation.

## Risks and controls

| Risk | Control |
| --- | --- |
| Mutating the approved Product System foundation | Separate v3.2.2 adapter; permanent foundation-contract gate remains authoritative |
| Recoloring brand identity or public commercial navigation | Scope Product-primary overrides to authenticated Product surfaces and Product report actions |
| Recoloring warning or destructive actions | Preserve amber/red classes and verify declared semantic boundaries |
| Route-state drift | Permanent computed-style browser checks before and after analysis |
| Cockpit correction drifting from the underlying raster | Explicit `commercial-v1.8` base-authority label plus responsive screenshot evidence |
| CSS correction layer becoming long-term asset debt | Regenerated canonical raster/vector export remains a follow-up design asset task, not a hidden claim in this CR |
| Treating a visual correction as pilot readiness | Preserve public-demo and sample/open/offline boundaries |

## Acceptance criteria

- [ ] Product System v3.2/v3.2.1 foundation contracts remain unchanged and pass on the exact PR head.
- [ ] Cockpit candidate eyebrow, title and score lines do not overlap in the desktop correction layer.
- [ ] Landing cockpit remains legible and free of horizontal overflow at 1440, 834 and 430 px widths.
- [ ] Workspace selected audience, interaction mode and primary actions use `#087F8C` before and after analysis.
- [ ] Express Analysis and Comparison primary actions use `#087F8C` and hover within the teal family.
- [ ] Projects selected segment and primary actions use `#087F8C`.
- [ ] Profile selected segment and primary save/open actions use `#087F8C`.
- [ ] Product report primary actions use `#087F8C` where rendered as interactive Product controls.
- [ ] Brand identity, commercial structure, links and focus boundaries remain blue where appropriate.
- [ ] Validation and critical states retain amber/red semantics.
- [ ] Figma authority records the same semantic policy and correction boundary.
- [ ] TypeScript, source contracts, browser tests, accessibility checks, build and route smoke pass on the exact PR head.
- [ ] Exact-head Vercel Preview is READY and visually verified.
- [ ] PR remains Draft until explicit founder merge and Production approval.

## Source audit

### GitHub

- Released `main`: `b22608889ebbbe4ebd781150c013d837f41c1a7e`.
- Released source: merged PR `#112`.
- Bounded correction: Draft PR `#113`, branch `fix/product-primary-teal-v322`.
- The initial PR head failed the Product System foundation contract because it rewrote the canonical v3.2/v3.2.1 token objects; the implementation has been corrected to a separate v3.2.2 adapter and must be accepted only on a later exact head with passing evidence.

### Vercel

- Current Production: `dpl_5JeKmSRVNTuHsLTRjfVdwTvH9Jbi`, READY.
- Production remains unchanged during CR 10.10.
- Every accepted candidate must be traced to an exact commit SHA and READY Preview deployment.

### Figma

- Product System v3.2.2 correction candidate: `1797:2`.
- Correction receipt: `1825:11`.
- Figma specifies Product primary `#087F8C`, hover `#006C78`, soft `#E5FAFA`, with brand blue retained for identity, links, information and focus.
- Engineering/Codex acceptance and repository release remain separate gates from the founder-authorized correction baseline.

### Supabase

- Project `geoai-dev` / `pphdqkurxneyagvnnjdt` remains outside this CR.
- No Supabase operation is required or authorized.

### Confluence

- Project Hub, Current Candidate, Change Log and Exact-Head Receipt must be reconciled only after the final PR head, Quality Gate and Preview are verified.
- Earlier projected receipts that cite a different branch, color values or a passed run without exact evidence are superseded and must not be treated as release authority.

## Release boundary

This CR authorizes bounded repository and Figma correction work plus Preview verification. It does not authorize merge, Production promotion, Supabase/Auth/RLS/Storage/source/environment/secret mutation, official-data claims or protected-pilot claims.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning, ownership, engineering, insurance or valuation conclusion.
