# GeoAI Figma Redesign Brief V6

Status: draft / Figma redesign input  
Date: 2026-07-05  
Owner: GeoAI Product Design / Product Strategy  
Source Confluence page: `06.12 Figma Redesign Brief V6`

## Executive brief

The next Figma work must be a full redesign, not a patch of the current primitive design. The goal is to produce a product-ready visual system and screen set that can drive Codex implementation.

Do not start by moving boxes. Start by translating the approved documentation into a sectioned product interface.

## Redesign thesis

GeoAI is a spatial decision intelligence platform. The map is the context layer. The product is the decision layer: evidence, scoring, risk, comparison, report and action.

## Required Figma page structure

| Page | Required action |
| --- | --- |
| 0 — HQ | Update dashboard to reference docs 06.07–06.12 and show redesign gate |
| 1 — Concept | Replace generic concept boards with decision-intelligence concept and section model |
| 2 — Design system | Rebuild V6 from 06.10 visual rules and 06.09 evidence contract |
| 3 — Landing page | Build Landing V6 with product narrative and fewer but stronger sections |
| 4 — Main product | Build Main Product V6 with sectioned app shell and screen states |
| 5 — Presentation System | Align to GeoAI Light visual rules; keep as support system |
| 6 — Responsive QA | Update to section-specific responsive states |
| 7 — Figma Redesign QA | Add visual QA log, issue list and approval checklist |

## Landing V6 requirements

Landing must stop being a generic SaaS layout. It must show GeoAI as a real product.

Required sections:

| Section | Purpose | Visual requirement |
| --- | --- | --- |
| Hero | Explain GeoAI in 10 seconds | Strong headline, short body, product preview, evidence badge, CTA |
| Product preview | Show real product structure | Sectioned UI mock: Start / Workspace / Evidence / Analysis / Report |
| Decision pipeline | Explain flow | Start → Select → Evidence → Analyze → Compare → Report |
| UAE use cases | Commercial wedge | 6 cards max, each with output and buyer |
| Evidence trust | Prevent overclaiming | Demo/open/uploaded/official/review status model |
| Pilot CTA | Convert to pilot/fundraising | $500k, 2–4 pilots, Dubai/Abu Dhabi, deliverables |
| Footer | Make product credible | Links, stage, contact/action, caveat |

Landing design rules:

1. No more than 6 main sections.
2. No dense paragraphs.
3. Product preview must look like the real product shell, not a random dashboard image.
4. Use only GeoAI Light palette.
5. Every section needs a clear output: decision, evidence, report or pilot action.

## Main Product V6 requirements

Main Product V6 must show a sectioned application, not one endless map/panel cockpit.

Required product shell:

| Zone | Content |
| --- | --- |
| Top Command Bar | GeoAI brand, active project, scenario, target, primary action |
| Section Rail | Start, Workspace, Evidence, Analysis, Compare, Report, Projects, Readiness |
| Main Canvas | Changes by section; map/workspace/analysis/report content |
| Section Panel | Current section controls and details only |
| Output Action | Report/export/next action, visible when relevant |

Required screens / frames:

| Frame | Required content |
| --- | --- |
| Product Shell / Start | Audience, role, scenario cards, map-first/criteria-first mode, expected output |
| Product Shell / Workspace | Map, selected target card, layer/source context, analyze action |
| Product Shell / Evidence | Source confidence, evidence list, validation gaps, uploaded data status |
| Product Shell / Analysis | Decision posture, score, drivers, risks, AI summary, evidence caveat, next action |
| Product Shell / Compare | Candidate shortlist, score/risk comparison, recommendation, export comparison |
| Product Shell / Report | Report builder, evidence appendix, caveats, export/print actions |
| Product Shell / Projects | Project list, saved AOIs, analyses, reports, priorities |
| Product Shell / Readiness | Supabase, storage, audit, connectors, limitations |
| Product Shell / Empty states | No target, no evidence, no report, no project data |
| Product Shell / Error states | Source unavailable, OpenAI fallback, backend not configured |

## Design System V6 requirements

Design system must be rebuilt around actual product components.

Required tokens:

- neutrals: background, surface, ink, muted, line, soft;
- accents: blue, teal, sand;
- status: green, amber, risk red.

Required components:

| Component | Purpose |
| --- | --- |
| AppShell | Main product layout |
| CommandBar | Project, scenario, target, primary action |
| SectionRail | Product sections |
| SectionTabs | Tablet/mobile section navigation |
| SectionPanel | Current-section details |
| EvidenceBadge | Source/status label |
| SourceConfidenceBar | Evidence mix |
| DecisionCard | Recommendation and score |
| ScoreCard | Numeric score and caveat |
| RiskCard | Risk + implication + mitigation |
| ValidationGapCard | What must be validated |
| MapContextCard | Spatial context and selected object |
| CompareCandidateCard | Candidate comparison item |
| ReportActionCard | Report/export action |
| EmptyStateCard | Professional empty state |
| ErrorStateCard | Professional error state |

## Responsive redesign requirements

For each of the following frames, create desktop, tablet and mobile variants:

1. Start.
2. Workspace with selected target.
3. Evidence.
4. Analysis.
5. Compare.
6. Report.

Use `06.11 Responsive Implementation Contract` as the implementation contract. Do not create decorative responsive samples only.

## Visual quality requirements

| Issue from current review | Required correction |
| --- | --- |
| Primitive design | Use premium card system, clear hierarchy, real section structure |
| Text overlap | Design cards around content contracts; no overflow fixes by clipping |
| Empty space | Every area must have purpose or be removed |
| Too many colors | Use semantic palette only |
| Product not sectioned | Section rail + current section model |
| Content missing by section | Use 06.08 content model |
| Data trust unclear | Use 06.09 evidence contract |
| Responsive uncertain | Use 06.11 behavior contract |

## Figma QA checklist before Codex

1. Page 0 shows documentation-first status and links to 06.07–06.12.
2. Page 2 has V6 tokens/components based on real product content.
3. Page 3 has Landing V6 with clear product narrative.
4. Page 4 has Main Product V6 sectioned app shell.
5. Page 6 has responsive states for product sections, not just generic viewport examples.
6. No visible text overlap.
7. No clipped meaningful business copy.
8. No uncontrolled colors.
9. No large empty dead cards.
10. Every screen has context, evidence, decision, action and output.

## Output of the Figma redesign phase

The Figma redesign phase must produce:

1. Approved Landing V6.
2. Approved Main Product V6.
3. Approved Design System V6.
4. Approved Responsive QA V6.
5. QA issue log.
6. Final Codex implementation brief.
