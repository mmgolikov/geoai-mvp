# GeoAI Responsive Implementation Contract v1

Status: draft / required before Codex implementation  
Date: 2026-07-05  
Owner: GeoAI Product Design / Engineering  
Source Confluence page: `06.11 Responsive Implementation Contract`

## Executive rule

GeoAI must never render a desktop cockpit squeezed into a phone or compact tablet. Responsive design must change the product composition, not just shrink text and panels.

## Required viewport QA matrix

| Class | CSS viewport target | Priority | Required behavior |
| --- | --- | --- | --- |
| 1080p desktop | 1920 × 1080 | Primary | Full desktop cockpit, spacious but not sparse |
| MacBook Pro 16 | 1728 × 1117 | Primary | Full cockpit, strong map and readable side panel |
| MacBook Air 15 | 1710 × 1107 | High | Full cockpit with balanced section rail and panel |
| MacBook Pro 14 | 1512 × 982 | Primary | Full cockpit, reduced horizontal waste |
| MacBook Air 13 | 1440 × 900 / 1470 × 956 | Primary | Main working demo target |
| Compact laptop | 1366 × 768 | High | Compact cockpit; no clipped actions |
| Small laptop | 1280 × 720 | High | Compact cockpit; density reduced |
| Legacy compact | 1024 × 768 | High | Switch to compact/tablet composition |
| Tablet | 768 × 1024 | Medium | Map first, cards below; no dense side panel |
| iPhone 17 Pro Max | 440 × 956 | Primary mobile | Large mobile stacked flow |
| iPhone 17 / 16 Pro | 402 × 874 | Primary mobile | Stacked flow with visible action |
| iPhone 15 Pro Max | 430 × 932 | High mobile | Large mobile stacked flow |
| iPhone 15 Pro | 393 × 852 | Primary mobile | Core mobile QA target |
| Older iPhone | 375 × 667 | Minimum mobile | Minimum supported stacked flow |

## Breakpoint policy

| Breakpoint | Composition |
| --- | --- |
| >= 1728 px | Spacious desktop shell |
| 1512–1727 px | Standard desktop shell |
| 1366–1511 px | Compact desktop shell |
| 1280–1365 px | Dense desktop shell with reduced rail/panel |
| 1024–1279 px | Compact/tablet shell; map first, section details below or in drawer |
| 768–1023 px | Tablet shell; stacked content, horizontal section tabs |
| 430–767 px | Large mobile shell |
| 393–429 px | Standard mobile shell |
| <= 375 px | Minimum mobile shell; shortest copy, sticky action |

## Desktop shell contract

Required zones:

| Zone | Purpose | Rules |
| --- | --- | --- |
| Top command bar | Project, scenario, current target, primary action | Height 56–72 px; always visible |
| Left section rail | Product sections | Full labels on large desktop; icon/short labels on compact |
| Main work area | Map or section content | Must use remaining width without horizontal overflow |
| Right section panel | Current section details/actions | Section-specific only; no unrelated controls |
| Output action area | Report/export/next action | Visible after analysis or comparison |

The right panel is not a permanent dumping ground. It changes by section.

## Compact desktop contract

At 1280–1366 px:

1. Section rail should become narrow.
2. Right panel should reduce to 320–360 px or become collapsible.
3. KPI cards must reduce count per row, not reduce text to unreadable sizes.
4. Map must remain useful but not force the panel to overflow.
5. Primary action must remain visible.
6. No fixed viewport layout should assume 900 px height.

## Tablet contract

At 768–1024 px:

1. Use top command bar and horizontal section tabs.
2. Map appears first only in Workspace and Analysis contexts.
3. Section details appear below map as full-width cards.
4. Right panel becomes a drawer or stacked section card.
5. Comparison and reports use vertical cards, not wide tables.
6. Evidence and readiness use grouped lists with expandable rows.

## Mobile contract

At 375–440 px, the product must follow this order:

1. Top bar.
2. Current section tabs.
3. Current target / context strip.
4. Map preview if relevant.
5. Main decision/evidence card.
6. Next action / report action.
7. Secondary details collapsed below.

Mobile must not show fixed 380 px panels, wide tables, hidden primary actions, business-critical text under 14 px, or horizontal scrolling as normal behavior.

## Component behavior by viewport

| Component | Desktop | Compact | Tablet | Mobile |
| --- | --- | --- | --- | --- |
| SectionRail | Full labels | Icon + short labels | Horizontal tabs | Top/bottom tabs |
| CommandBar | Full project/scenario/target | Shorter labels | Two-row if needed | Compact top bar |
| MapCanvas | Large central area | Reduced but useful | Full-width top block | Preview-sized block |
| SectionPanel | Right panel | Narrow/collapsible | Drawer or stacked card | Stacked card |
| EvidenceSummary | Inline + side panel | Inline + compact | Full-width section | Card with badges |
| AnalysisDashboard | Multi-column | 2-column / compact | Vertical sections | Stacked decision cards |
| CompareTable | Table/cards | Cards or scroll-free matrix | Vertical comparison cards | Candidate cards |
| ReportBuilder | Side panel + preview | Compact preview | Stacked sections | Report action card |

## Text and content rules

1. Meaningful business copy must wrap.
2. Ellipsis is allowed only for technical metadata like long IDs or filenames.
3. Long caveats must be rewritten or collapsed behind explicit disclosure, not silently clipped.
4. Primary button labels must remain stable and visible.
5. If a card cannot fit at a target viewport, reduce card count or move content to a section below.

## PR acceptance gates

| Gate | Pass condition |
| --- | --- |
| No horizontal mobile scroll | Mobile body width equals viewport; no overflow-x |
| No clipped meaningful text | Business text wraps or moves to explicit details |
| Section navigation visible | User can identify current section |
| Primary action visible | Each section has one clear action |
| Evidence visible | Decision outputs include evidence/confidence/caveat |
| Report visible | Report/export path is not hidden |
| Desktop not sparse | 1920 × 1080 uses space intentionally |
| Compact not broken | 1280 × 720 and 1366 × 768 do not clip primary UI |
