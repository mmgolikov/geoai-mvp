# Design-to-Engineering Brief — Pre-Handoff v0.1

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add current app design audit v1`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder accepted the corrected design direction:

- `Workspace UX Reference Fidelity v1.2 / current`
- `Brand Foundation v1.2 / current`
- `Design System Components v1.2 / current`

This document prepares the design-to-engineering scope, but it is **not** a Codex implementation prompt and does **not** approve implementation.

Current decision:

**Engineering brief preparation is allowed. Implementation remains blocked until explicit founder handoff approval.**

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.

## Change Request

### Problem

The current live product UX direction is functionally strong but visually needs a premium, enterprise-grade spatial intelligence layer that remains fully faithful to the existing product reference.

Earlier Figma iterations drifted into abstract dashboard/cockpit concepts and green/teal styling. Founder QA rejected that direction.

### Business reason

GeoAI is positioning for UAE / Dubai / Abu Dhabi real estate, development intelligence, construction monitoring and source-backed site screening. The product must look like a premium spatial decision intelligence platform, not agriculture software, not generic GIS and not a decorative BI dashboard.

### Users

Primary users for the current UX scope:

- Developer analyst
- Real estate / investment analyst
- Portfolio / asset manager
- Public-sector land / object monitoring stakeholder
- Founder / investor / pilot reviewer

### Affected screens

Initial implementation scope, if later approved:

1. `/workspace` shell / product geometry.
2. `TopNavigation` visual treatment.
3. `MapWorkspace` map controls and overlays.
4. `AnalysisPanel` right command panel.
5. `ExpressDashboard` first viewport / decision overview.
6. Data honesty / caveat / source-lineage UI atoms.

Out of scope unless separately approved:

- `/projects` full redesign.
- `ReportPreview` full redesign.
- `ComparisonDashboard` full redesign.
- Mobile/tablet responsive redesign.
- API, Supabase, data model or source ingestion changes.

### Data impact

No data model changes are required for the visual pass.

Do not add claims or wording that imply official validation or live official integration.

Mandatory caveat remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

### Design impact

Apply the accepted spatial blue direction and product-reference fidelity rules:

- Deep spatial blue primary accent.
- Blue-tinted evidence/selection states.
- Validation gold for caveats / conditional decisions.
- Green/teal removed from primary UI accents.
- Existing `/workspace` geometry preserved.
- Existing interaction model preserved.
- Primary CTA remains in right panel footer.

### Engineering impact

Likely affected files, pending final implementation approval:

- `tailwind.config.ts`
- `components/top-navigation.tsx`
- `components/map-workspace-client.tsx`
- `components/analysis-panel.tsx`
- `components/express-dashboard.tsx`
- shared dashboard components under `components/dashboard/*`
- possibly `components/map-context-card.tsx`

No API or backend changes expected.

### Risks

| Risk | Mitigation |
|---|---|
| Visual change drifts from reference again | Use Figma v1.2 as reference; compare screen-by-screen to current product. |
| Right panel overflows on desktop | Keep dense compact sections; preserve pinned footer. |
| Map controls become untappable / overlap | Preserve current map-layer control positions and z-index logic. |
| Dashboard becomes generic BI | Preserve ExpressDashboard anatomy and decision-first hierarchy. |
| Blue direction becomes generic SaaS | Use deep spatial blue + map blue-gray + validation gold, not bright generic SaaS palette. |
| Data honesty weakened | Keep caveat near decision outputs and source-lineage modules. |
| Implementation changes too much | No layout architecture replacement; visual layer only. |

## Design Source of Truth

Figma current frames:

- `Workspace UX Reference Fidelity v1.2 / current` — node `94:26`
- `Brand Foundation v1.2 / current` — node `98:2`
- `Design System Components v1.2 / current` — node `98:47`
- `Design QA & Handoff v1.3 / current` — node `98:124`

GitHub design docs:

- `docs/design/WORKSPACE_UX_REFERENCE_FIDELITY_V12.md`
- `docs/design/SPATIAL_BLUE_DESIGN_SYSTEM_V12.md`
- `docs/design/DESIGN_TO_ENGINEERING_BRIEF_PRE_HANDOFF_V01.md`

Confluence pages:

- `06.42 Workspace UX Reference Fidelity v1.2`
- Next page to add: `06.43 Spatial Blue Design System v1.2`
- Next page to add: `06.44 Design-to-Engineering Brief — Pre-Handoff v0.1`

## Screen-by-Screen Acceptance Criteria

### 1. `/workspace` shell

Must keep:

- 64px `TopNavigation`.
- Main canvas + 380px right panel.
- Height below nav: `calc(100vh - 4rem)`.
- No additional decorative outer shell.
- No new navigation rail.
- No new admin-console layout.

Acceptance:

- Main canvas and right panel align exactly with product grid.
- No horizontal overflow at desktop width.
- Right panel remains 380px on desktop.
- Main canvas states still switch as before.

### 2. `TopNavigation`

Must keep:

- Logo mark.
- `GeoAI` wordmark.
- `Spatial decision intelligence` subtitle.
- `Workspace` and `Projects` nav links.

Visual change allowed:

- Deep spatial blue logo mark / active states.
- Cleaner active/hover state.
- Better typography / spacing.

Do not add extra nav items without separate approval.

### 3. `MapWorkspace`

Must preserve:

- Full map canvas as main workspace state.
- Click-to-select point/object behavior.
- AOI drawing behavior.
- Layer visibility control.
- Basemap switcher.
- Selected AOI/object overlays.

Visual acceptance:

- `Spatial layers` stays top-right.
- Polygon button stays near top-right controls.
- Basemap switcher stays bottom-right.
- Start overlay stays in map layer.
- Selected AOI/object overlay stays inside map layer.
- Map visual system uses blue-gray map base and deep spatial blue selected geometry.

### 4. `AnalysisPanel`

Must preserve order:

1. B2B/B2C audience segment.
2. Project selector / `Projects` link / `Create` button.
3. Role / Scenario controls.
4. Scenario summary.
5. Interaction mode.
6. Scenario setup.
7. Custom query.
8. Candidate search.
9. Selected point/object/AOI.
10. AOI tools.
11. Active workflow.
12. Footer CTA.

Footer must keep:

- `Add to compare` secondary action.
- Primary CTA as the final action.
- Pinned footer behavior.

Visual acceptance:

- No clipped labels.
- No hidden primary CTA.
- No panel content pushing footer out of viewport.
- No large empty cards.
- All sections remain dense and product-like.

### 5. `ExpressDashboard`

Must preserve:

- Header card.
- Scenario/target badges.
- Export and Back to setup actions.
- `Map Context` card.
- Decision posture card.
- Suitability / score gauge.
- KPI cards.
- Top drivers.
- Top risks.
- Recommended next action.
- Drill-down modules below first viewport.

Visual acceptance:

- Dashboard is decision-first, not generic BI.
- One clear primary conclusion.
- Map Context remains visible in first viewport.
- Recommended next action remains close to decision posture / risks.
- Caveat / validation language remains visible.

### 6. Data honesty UI

Required:

- Caveat visible near decision output.
- Source-lineage / evidence remains visible and connected to decision output.
- Validation state uses gold/red semantics, not green success semantics.

Forbidden claims:

- production-ready
- pilot-ready
- live official integration
- official parcel
- official zoning
- cadastral validation
- ownership verification
- certified valuation
- approved site
- guaranteed best use

Use:

- screening hypothesis
- public/open context
- sample/open context
- user-provided data
- official/client validation required

## Token Mapping Proposal

Pending engineering approval:

```ts
colors: {
  ink: "#172033",
  muted: "#5F6B7A",
  line: "#DDE3EA",
  surface: "#F6F8FB",
  brand: "#183B5B",
  brandHover: "#102F49",
  spatialBlue: "#235D8C",
  signalBlue: "#2F6DB5",
  validationGold: "#C5A76A",
  validationSoft: "#FFF9E8",
  critical: "#9F3412",
  criticalSoft: "#FFF4ED",
  mapBlueGray: "#DFE8EC"
}
```

Important:

This mapping is a proposal for engineering review. It is not a migration instruction yet.

## QA Checklist Before Implementation Approval

Before any Codex prompt is prepared:

- [ ] Founder confirms Figma `Workspace UX Reference Fidelity v1.2 / current` remains approved after Design System v1.2.
- [ ] Founder confirms spatial blue palette is approved for implementation.
- [ ] Design QA compares Figma v1.2 with live `/workspace` browser reference.
- [ ] Native Figma prototype links are verified or explicitly waived.
- [ ] Engineering brief is approved.
- [ ] Implementation scope is limited to visual layer and existing components.
- [ ] Data honesty labels are preserved.
- [ ] No backend/API/Supabase changes are included.
- [ ] Rollback point is defined before implementation PR.

## Handoff Status

Allowed now:

- Design-to-engineering brief preparation.
- Acceptance criteria refinement.
- Component-to-code mapping analysis.

Still blocked:

- Codex implementation prompt.
- Implementation PR.
- Merge to `main`.
- Production deployment.
- Supabase migrations.
- Secrets/env changes.

## Next Step

After founder explicitly approves this pre-handoff engineering brief, prepare a separate Codex implementation prompt with:

- exact files allowed to change,
- implementation scope,
- acceptance criteria,
- QA checklist,
- forbidden changes,
- rollback notes,
- data honesty requirements.
