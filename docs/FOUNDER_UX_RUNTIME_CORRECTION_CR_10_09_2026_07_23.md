# GeoAI — Founder UX Runtime Authority Correction

## Document control

| Field | Value |
| --- | --- |
| Change Request | CR-10.09 |
| Status | Founder-rejected Preview; approved for correction on Draft branch and Vercel Preview only |
| Date | 2026-07-23 |
| Owner | GeoAI Founder / GeoAI Delivery OS |
| Repository | `mmgolikov/geoai-mvp` |
| Branch | `recovery/runtime-design-migration-v1` |
| Draft PR | `#112` |
| Production impact | None without separate merge and Production approvals |

## Executive decision

The current PR #112 Preview is a **NO-GO** and is withdrawn from founder acceptance. Runtime implementation must use the canonical Figma landing and Workspace authorities rather than approximate visuals or CSS-only masking.

The correction is limited to the Draft branch and non-Production Preview. It does not authorize merge, Production promotion, Figma writes, Supabase mutations, Auth/RLS/Storage changes, source ingestion, secrets or environment changes.

## Problem

Founder review identified five material runtime defects:

1. the landing renders an alternate hand-built mark instead of the repository-owned founder-approved GeoAI identity symbol;
2. the landing cockpit uses an ad hoc live satellite composition instead of the canonical commercial cockpit visual;
3. primary Workspace controls use different blue and teal color families in one task flow;
4. the Scenario selector and scenario meaning remain clipped in the command panel;
5. the expandable `Validation caveat` remains inside the primary Workspace setup card despite its approved removal.

The founder screenshot also shows a third-party floating character overlapping the primary CTA. Repository source must be audited to confirm whether this is application-owned. No application overlay may cover primary controls.

## Business reason

The landing and Workspace are the principal commercial and product-proof surfaces for UAE real-estate and development intelligence. Visible divergence from approved identity, Figma composition and core workflow hierarchy damages trust and makes the redesign appear less complete than the previous runtime.

## Users

- UAE developers and development directors;
- investment and portfolio analysts;
- government and enterprise buyers;
- pilot sponsors and client reviewers;
- investors and founder reviewers;
- mobile, tablet and desktop demo users.

## Source audit

### Figma

Canonical authorities:

- file: `TAzDqOvRCw1mQGMU3Y4S9H`;
- Product System registry: `1797:2`;
- commercial landing section: `1495:2`;
- desktop landing: `1495:3`;
- commercial hero: `1495:23`;
- desktop GeoAI cockpit: `1495:53`;
- tablet cockpit: `1495:725`;
- mobile cockpit: `1495:1144`;
- criteria-first desktop Workspace: `1540:499`;
- criteria-first mobile Workspace: `1540:964`.

### Runtime

Rejected Preview:

- deployment: `dpl_55Q8ujJ6DfH1aqA1jNbLjgpDsMZC`;
- branch head reviewed before correction: `397468db8c070348498c9ea0e26ab4d3291d7b77`;
- target: Vercel Preview, not Production.

### Repository findings

- `app/page.tsx` contains a hand-built `BrandMark` and an ad hoc `LandingHeroMap` composition;
- `components/analysis-panel.tsx` uses a two-column Role/Scenario row, `truncate`, `line-clamp-1` and an expandable `Validation caveat` inside the primary setup card;
- `app/runtime-design-recovery.css` applies teal only to the active interaction-mode control, leaving other primary Workspace controls blue;
- repository-owned approved identity asset already exists at `public/brand/geoai-identity-symbol-32.svg` and is exposed through `IdentitySymbol`;
- no application-owned mascot or floating character was found in the inspected layout and component source. The correction must still prove that no repository-owned overlay covers primary controls.

## Scope

### Landing identity

- remove the alternate hand-built mark;
- use `IdentitySymbol` and the repository-owned approved SVG in the landing header and footer;
- preserve accessible home-link behavior and focus states.

### Landing cockpit

- replace the ad hoc live landing map composition with repository-owned exports of the canonical Figma cockpit for desktop, tablet and mobile;
- keep the visual explicitly illustrative and non-official;
- do not present it as parcel, zoning, cadastral or ownership evidence.

### Workspace color semantics

- use one spatial-teal primary family for selected audience, selected interaction mode and primary task CTA inside Workspace;
- keep hover and pressed states inside the same hue family;
- retain brand blue for shell, navigation and information structure.

### Workspace scenario readability

- stack Role and Scenario as full-width controls in the primary setup card;
- provide sufficient width and right padding for native select indicators;
- remove `truncate` and `line-clamp-1` from primary scenario meaning;
- allow title and subtitle to wrap without clipping.

### Validation placement

- remove the expandable `Validation caveat` from the primary Workspace setup card in JSX;
- do not rely on CSS masking;
- preserve data-honesty caveats in source lineage, decision, evidence and report contexts.

### Overlay safety

- verify that application source contains no mascot, assistant or floating widget covering primary controls;
- primary sticky actions must remain unobstructed at declared viewports.

## Data impact

None.

- no scoring change;
- no source ingestion;
- no persistence change;
- no Supabase/Auth/RLS/Storage change;
- no official/live integration claim;
- no client or confidential data.

## Engineering impact

- `app/page.tsx` landing identity and cockpit implementation;
- repository-owned Figma cockpit PNG assets;
- `components/analysis-panel.tsx` setup-card structure;
- route-scoped Workspace color semantics;
- source contract and responsive Playwright acceptance;
- Next.js security patch from `15.5.20` to `15.5.21` because the current exact-head production dependency audit is blocked by the July 2026 security advisory set.

## Risks and controls

| Risk | Control |
| --- | --- |
| A screenshot is mistaken for live analytical data | Explicit illustrative/non-official boundary and no live-data claim |
| Figma asset expires | Export is copied into repository-owned static assets |
| Scenario text regresses | Source contract plus 390/768/1440 browser assertions |
| Mixed primary colors return | Computed-style equality assertion across audience, interaction mode and primary CTA |
| Caveat is only hidden by CSS | Source contract requires the JSX disclosure to be absent |
| Third-party browser overlay is mistaken for app UI | Repository source audit and clean automated screenshots |
| Security patch changes runtime behavior | Patch-only Next.js upgrade, full Quality Gate, build and route smoke |

## Acceptance criteria

1. Landing source contains no hand-built `BrandMark`; header and footer use `IdentitySymbol`.
2. Landing uses repository-owned exports of Figma nodes `1495:53`, `1495:725` and `1495:1144`.
3. `LandingHeroMap` is not used by the commercial landing.
4. The commercial decision-flow card contains no amber validation overlay.
5. Role and Scenario are full-width controls; the selected Scenario is readable at 390, 430, 768, 834 and 1440 widths.
6. Primary scenario title and subtitle have no truncation, ellipsis or line clamp.
7. The primary Workspace setup card contains no visible or hidden `Validation caveat` disclosure.
8. Selected B2B/B2C audience, selected interaction mode and the primary candidate-search CTA resolve to one spatial-teal color family.
9. No application-owned floating overlay covers `Add to compare` or the primary candidate-search CTA.
10. Explore remains retired as a visible Product destination; `/explore` remains compatibility-only.
11. Next.js resolves to patched version `15.5.21`; `npm audit --omit=dev --audit-level=moderate` passes.
12. TypeScript, build, route smoke, accessibility, data-honesty, reports and responsive browser journeys pass on the same exact head.
13. Exact-head Vercel Preview is READY and clean.
14. PR #112 remains Draft, open and unmerged until a separate founder decision.
15. Production and `main` remain unchanged.

## Founder acceptance instruction

Only after engineering, CI, Preview and visual QA are complete, founder review must be requested with one exact task: compare the corrected landing and Workspace against the five rejected defects and answer either `UX APPROVED FOR PR #112` or a numbered change list.

## Non-authorizations

This Change Request does not authorize:

- merge to `main`;
- Production promotion;
- Figma writes or authority promotion;
- Supabase migrations or DDL/DML;
- Auth, RLS, Storage, source, environment or secret changes;
- official parcel, zoning, cadastral, ownership or valuation claims.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning, engineering, insurance or valuation conclusion.
