# GeoAI MVP UI Freeze v1.0

Date: 2026-06-22

GeoAI MVP UI Freeze v1.0 freezes the current investor-demo UI baseline before external data source integration work continues.

## Scope Frozen

- Landing page and SaaS-style hero dashboard
- Workspace map and right command panel
- Analysis report dashboard
- Comparison dashboard
- Printable analysis and comparison reports
- Projects dashboard and recent activity cards

## Mandatory Content Budgets

Decision Posture:

- Title: 1 line
- Explanation: 2 lines

Executive Summary:

- Dashboard view: 4 lines maximum
- Detailed memo content belongs below the first-screen dashboard or in printable report sections

Screening Signals:

- 4 cards maximum in the first-screen dashboard
- Label: 1 line
- Value: 2 lines

Source / Run Metadata:

- 4 cards maximum
- Label: 1 line
- Value: 2 lines
- Detail: 2 lines
- Must remain visible in the first-screen report card

Custom Query:

- Must act as an analysis lens, not a dominant dashboard block
- Dashboard summary must be compact
- Detailed reasoning may appear below the first-screen dashboard in a controlled `Custom Query Details` section
- Printable reports may include fuller memo content with page-break-safe layout

Comparison:

- Top recommendation text: 4 lines maximum
- Alternative interpretation: 3 lines maximum
- Option cards: names and values clamped to 1-3 lines depending on field importance

## No-Overflow Rules

- Dynamic AI/custom-query/source text must use `safe-line-*`, `line-clamp-*`, `truncate`, `break-words`, or equivalent budgeted display.
- Dashboard view is not the full memo view.
- Long generated content must be summarized in first-screen cards.
- Full text belongs in lower detail sections, report preview, or printable reports.
- Cards must use `min-w-0`, `overflow-hidden`, stable grids/flex columns and controlled min-heights.
- Badges must be short, bounded and non-overlapping.

## Known Limitations

- The MVP uses demo-normalized, sample/offline, uploaded/local and open snapshot context.
- Official parcel, zoning, cadastral, title, ownership and certified valuation validation are not connected.
- External data source integration is planned but must not start if no-overflow QA fails.
- Browser visual QA remains required for target widths: 1728px, 1440px and 1280px.

## Do Not Change Before External Data Integration

- Do not move the Scenario selector below secondary sections.
- Do not make dashboard cards expand to fit full AI/custom-query text.
- Do not add external data connectors before UI no-overflow QA passes.
- Do not claim live official integrations, cadastral validation, ownership verification or certified valuation.
- Do not push critical CTAs below the first visible command panel area.

## Freeze Result

This release is a stable UI baseline for the current GeoAI MVP investor-demo flow. It is not production-ready or pilot-ready, but it is the approved layout foundation for the next external data integration iteration.
