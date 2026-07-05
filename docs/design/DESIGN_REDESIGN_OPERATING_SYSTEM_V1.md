# GeoAI Design Redesign Operating System v1

Status: documentation-first redesign baseline  
Date: 2026-07-05  
Owner: GeoAI Product Design / Product Strategy / Engineering  
Source Confluence page: `06.07 Product Design Redesign Operating System`

## Executive decision

The current visual direction is not approved for implementation. The next iteration must not continue by drawing more speculative Figma screens. GeoAI must move to a documentation-first product design workflow:

1. Analyze current GitHub product state.
2. Define product sections, screen inventory and content contracts in Confluence.
3. Define data/source contracts and evidence status rules.
4. Define a strict design system with a small color palette and reusable components.
5. Produce Figma screens from approved documents only.
6. Run visual and responsive QA against the approved documents.
7. Only then create a Codex implementation prompt and PR.
8. Feed implementation results, QA issues and Vercel screenshots back into Confluence for the next iteration.

## Current GitHub product audit

| Area | Current state | Design implication |
| --- | --- | --- |
| Product status | README defines the app as an investor demo prototype using synthetic/demo layers, deterministic mock scoring and optional OpenAI narrative fallback | UI must clearly distinguish demo logic from validated data and must not look like a production GIS |
| Landing | `app/page.tsx` contains a simple hero, product strip, decision layers, workflow, scenarios and outputs | Landing is structurally useful but visually primitive; it needs a real narrative and product sections |
| Workspace | `WorkspaceShell` coordinates map, scenario setup, analysis, comparison, projects, uploads, AOIs and backend status | Product needs sectioned information architecture; current responsibilities are overloaded |
| Right panel | `AnalysisPanel` uses a fixed 380 px desktop panel with many nested sections, controls and data states | Density and collisions must be solved by grouped sections/tabs rather than more shrinking |
| Dashboard | `ExpressDashboard` uses map context + decision posture + KPI grid + score bars + modules | Useful content, but it should be decomposed into decision sections, not one dense cockpit |
| Styling | Tailwind has a small but ad-hoc palette; global CSS includes hardcoded colors and line clamps | Create formal tokens; reduce colors; avoid line-clamp for meaningful business copy |
| Data | The repo has demo/open/sample data, optional OpenAI, Supabase/PostGIS foundations and evidence workflows | UI must display source mode, validation status and confidence consistently |
| Responsive | PR #27 notes visual QA at several desktop widths, but current human review still finds overlaps and spacing issues | Responsive QA must be document-driven, screenshot-based and expanded to target devices |

## Root-cause diagnosis

The design failed because the process was inverted:

1. Figma was created before the product IA was fully specified.
2. Screens were treated as visual boards, not product states with content contracts.
3. The product UI was not split into clear sections.
4. Components were not derived from actual GitHub data structures.
5. Responsive targets were added visually but not fully converted into implementation behavior.
6. Color use became uncontrolled because status, evidence, action and brand accents were not separated.
7. Text overflow was treated mechanically rather than solved through content density and card responsibility.

## New design principles

| Principle | Rule |
| --- | --- |
| Documentation before design | No new Figma screen without approved source documentation |
| Data before decoration | Every screen block must map to a real data object, source status, action or report output |
| Sectioned product | Product must be organized by sections: Start, Workspace, Evidence, Analysis, Compare, Report, Projects, Admin/Readiness |
| Small color system | Use one primary accent, one trust/evidence accent and one land/regional accent; status colors only for status |
| No visual fixes without cause | Overlap/blank space must be fixed by content model and layout rules, not random resizing |
| Responsive by composition | Mobile/tablet are separate compositions, not squeezed desktop dashboards |
| Every iteration closes the loop | GitHub PR, Vercel preview and QA findings update Confluence before the next design iteration |

## Product section architecture

| Section | User question | Required content | Primary output |
| --- | --- | --- | --- |
| 1. Start / Scenario | What am I trying to decide? | Audience, role, scenario, map-first/criteria-first mode | Analysis intent |
| 2. Map Workspace | What location or asset is selected? | Map, AOI/object, layers, context, selection summary | Selected target |
| 3. Evidence / Data | What does the system know and how reliable is it? | Source registry, source status, uploaded data, official/demo labels | Evidence confidence |
| 4. Analysis | What does GeoAI recommend and why? | Scores, drivers, risks, AI summary, validation gaps | Decision recommendation |
| 5. Compare / Shortlist | Which options are better? | Candidate list, comparison matrix, trade-offs | Ranked shortlist |
| 6. Report / Export | What can I send to decision makers? | Report sections, caveats, source appendix, export | Board-ready memo |
| 7. Projects / Portfolio | What has already been analyzed? | Projects, saved AOIs, reports, priorities, history | Portfolio action view |
| 8. Admin / Readiness | What is ready for pilot or enterprise use? | Supabase, storage, audit, source connectors, limitations | Readiness status |

## Screen-level content contract

Every screen must contain these layers in this order:

1. Context — what object, AOI, project, role and scenario are active.
2. Evidence — what data/source status supports the view.
3. Decision — score, recommendation, risk, opportunity or ranking.
4. Action — what user should do next.
5. Output — report, shortlist, saved analysis, exported package or validation task.

No card should exist if it does not serve one of these five layers.

## Color system rule

Use fewer colors:

| Role | Color | Use |
| --- | --- | --- |
| Primary accent | Blue | Primary actions, selected state, navigation highlight |
| Trust/evidence accent | Teal | Evidence, official/validated, source confidence |
| Land/regional accent | Sand | Land, UAE, planning, context accents |
| Success | Green | Completed / ready only |
| Warning | Amber | Review / validation required only |
| Danger | Red | Risk / blocker only |
| Neutral | White / light gray / ink / muted / line | Main product surfaces |

Do not use a new accent color unless it maps to one of these semantic roles.

## Documentation-first operating model

1. Current product source scan: GitHub, current PRs, Vercel, Confluence, user feedback.
2. Product requirements and IA: product sections, screen inventory, user journeys and content contract.
3. Data and evidence contract: source statuses, evidence model, validation caveats and UI claim rules.
4. Design system: tokens, components, layout grid, card rules, color rules and typography rules.
5. Figma design: current-first pages based on approved docs only.
6. QA: visual QA, responsive QA, defects and required changes.
7. Codex implementation: single prompt, branch/PR, Vercel preview and build/lint status.
8. Feedback loop: PR diff, preview, screenshots and human review update Confluence before next iteration.

## Required design documents before next Figma redesign

| Document | Status | Purpose |
| --- | --- | --- |
| 06.07 Product Design Redesign Operating System | Created | Defines workflow and redesign rules |
| 06.08 Information Architecture & Product Sections | Next | Defines screen sections and content per section |
| 06.09 Data & Evidence UI Contract | Next | Defines source statuses, confidence and claim rules |
| 06.10 Visual System Rules | Next | Defines tokens, typography, grid, spacing and card system |
| 06.11 Responsive Implementation Contract | Next | Converts viewport targets into component behavior |
| 06.12 Codex Implementation Brief | Later | Final implementation prompt after approval |

## Implementation gate

Do not continue pushing visual Figma screens until 06.08, 06.09 and 06.10 are complete. The next work package should be documentation and content architecture, not drawing.
