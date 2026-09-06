# CYCLE-05 Landing Design Handoff

Status: Candidate implementation · Local commit created · Not Released

Owner: `design_1`

Handoff target: `main_1`

Date: 2026-09-06

## Authority and scope

- Source baseline: `833b575561853942530bb4766d04c2ad8ae06b31` from the protected PR #147 Candidate checkout.
- Isolated worktree: `/private/tmp/geoai-cycle05-landing.n2aXkq/worktree`.
- Branch: `codex/cycle05-landing-design-20260906`.
- Owned surface: `/`, `app/page.tsx`, `components/landing/*`, `public/landing/*`, this handoff and `tests/landing-cycle05-contract.test.mjs`.
- Excluded: shared Product System, Point-to-Object workspace implementation, Auth, APIs, Supabase, environment configuration, Git main/release, Vercel and Production.

## Experience contract

The landing page is a bilingual EN/RU product entry for the currently available workflow. It leads with one outcome and routes into real application surfaces:

| Entry | Route | Current behavior represented |
| --- | --- | --- |
| Open map / Analyse / Find / Create | `/prototype/point-to-object` | Current map-first Candidate workflow using open-map and sample context |
| Projects | `/projects?view=spatial` | Saved spatial work in the current browser-local project flow; cloud collaboration is explicitly not active |
| Profile | `/profile` | Existing profile route |

The product narrative uses four task-oriented paths—Analyse, Find, Create and Projects—and a role selector for Developer, Owner / manager, Fund / advisor and Urban / public users. The role selector changes bounded benefit copy only; it does not change product state or infer buyer validation.

## Content and claim boundary

- The page separates “Current product” from “Validation required”.
- It does not publish prices, ROI, ARR, gross margin, customer results, official integration or maturity claims.
- Project persistence is described as browser-local only.
- The captured interface and copy identify open-map context and preserve visible map attribution.
- Mandatory disclosure appears once in the operating-boundary section:

  > Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Component and data contract

- `app/page.tsx`: server entry and route metadata.
- `components/landing/geoai-landing-page.tsx`: interactive composition, language switch and accessible role tabs.
- `components/landing/content.ts`: typed EN/RU content source, workflow paths, role outcomes and operating boundaries.
- `components/landing/landing.module.css`: landing-scoped layout and visual treatment.
- Locale source: the existing `PointObjectLocaleProvider`; the landing does not create a second locale store.
- Initial role: `developer`; available keys are `developer`, `owner`, `advisor`, `public`.
- Role keyboard behavior: Arrow Left/Right/Up/Down wraps across tabs; Home and End select the first and last tab.
- All route destinations are existing application routes. Projects entries use `/projects?view=spatial`, the accepted CYCLE-05 saved-spatial-work view. No placeholder links or contact form were added.

## Responsive and accessibility contract

- Acceptance viewports: 1440, 1280, 768 and 390 CSS pixels.
- Layout breakpoints: 1180, 820 and 620 CSS pixels.
- At 1180 and below, the hero becomes a single-column sequence with the decision copy and actions before the product preview.
- At 820 and below, the role panel, evidence boundary and final CTA reflow vertically.
- At 620 and below, navigation is reduced, the role selector becomes two columns and the task outcomes become a single list.
- Interactive targets are at least 44 px; the primary mobile action is 48 px.
- Focus is visible; role tabs expose `tablist`, `tab`, `tabpanel`, `aria-selected` and roving `tabIndex` semantics.
- Reduced-motion preference disables transitions and transforms.
- Checked contrast ratios: white/accent 4.82:1, ink/white 17.71:1, muted/white 6.32:1, accent/surface 5.90:1.
- The document has no horizontal overflow at the four acceptance widths. The mobile product image uses an intentional clipped crop inside an `overflow: hidden` figure; page scroll width remains 390 px.

## Product image provenance

Both images are screenshots of the current protected Preview Point-to-Object route, not a fabricated dashboard:

| Asset | Locale | Size | SHA-256 |
| --- | --- | --- | --- |
| `public/landing/geoai-map-workspace-preview.png` | EN | 1280×720 | `9b608a26b12ac973ed4c788cb1e8e373942bc11f5538045cf7ccb79bd838092f` |
| `public/landing/geoai-map-workspace-preview-ru.png` | RU | 1280×720 | `a3c739f67cfab2106c024c85bd2d1fc8980b6be7ce6f1786f7b46ab18e7d461a` |

OpenFreeMap / OpenMapTiles / OpenStreetMap attribution remains visible in the captured UI. The images are product evidence for this Candidate landing, not proof of official or live source integration.

## Figma parity and registry

Read-only inspection on 2026-09-06 confirmed file `TAzDqOvRCw1mQGMU3Y4S9H` is available and remains a Figma Design file. Current canonical structure includes:

- Project Hub: `1975:11`, under page `1972:11` “00 Project Hub”.
- Design System Candidate: `1976:11`, under page `1972:12` “01 Design System”.
- Active implementation handoff: `1976:17`, named “Section / dev_1 Handoff Contract”.
- Responsive workspace: `1977:11`.
- State system: `1979:11`.
- Scenario system: `2022:11`.
- Core Candidate lifecycle frames: `2034:102`, `2034:111`, `2034:120`, `2034:129`.
- Cross-system registry: `2058:123`.
- Landing page `1972:13` “02 Landing” currently has zero children.
- Historic landing directions remain under pages `1138:2`, `1158:2` and `1464:2` and are explicitly Historical, Superseded or Do Not Implement.

No Figma node was created or mutated in CYCLE-05. The required later registry action is a bounded Candidate placement or link under `02 Landing`, only after `main_1` accepts this local implementation as the current landing candidate. Existing DESIGN13-002 components, states and workspace flows are context, not code or release authority for this landing.

## Verification receipt

- Contract test: 6/6 passed, including the saved-spatial-work Projects route and 44 px target contract.
- TypeScript lint: passed.
- Repository data-honesty scan: passed; the gated parcel/zoning/ownership/planning/valuation requirement remains explicit without triggering an unsupported affirmative claim.
- Next.js production build: passed on Next.js 15.5.21; 79 static pages generated.
- Browser review: 1440 RU, 1280 EN, 768 EN and 390 EN; hero, workflow, role chooser, evidence boundary and responsive ordering inspected.
- Interaction review: EN/RU switch, role pointer selection, role keyboard navigation and the map, Projects and Profile routes passed.
- Landing console errors: zero during landing review.
- Production and main changed: false.

## Corrective verification — 2026-09-06

- The landing Projects CTA was reconciled read-only against accepted DEV commit `3d7540f44e2f338c1965027aa7f3109e5775335e` and now targets `/projects?view=spatial`.
- Brand/home and EN/RU controls were measured at 44 px minimum hit height; language controls are 44×44 px at 390 CSS pixels.
- EN and RU were rendered at 390 CSS pixels and EN was rendered at 1280 CSS pixels after the correction; the header remains compact and no horizontal overflow was observed.
- No Auth, API, map runtime, environment, database, Vercel or Production files were changed.

## Integration note

`main_1` should cherry-pick the resulting local commit into the designated integration branch, rerun the repository-wide checks and decide whether a separate bounded Figma Candidate registry update is warranted. This receipt does not authorize push, Preview, Production or release promotion.
