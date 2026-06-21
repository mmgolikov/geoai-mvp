# GeoAI UI Layout Guardrails

Date: 2026-06-21

These rules protect GeoAI MVP screens from recurring UI regressions: overflow, overlapping text, accidental empty holes, uneven cards and broken printable report actions.

## 1. Container-First Layout

- Every card, badge, label and text block must fit inside its parent.
- Components must adapt to available width and height.
- Content must be shortened before layout breaks.
- If text is not essential, remove it from the primary surface or move it to a tooltip/detail state.
- Do not let copy density drive component dimensions in dashboards, maps or report headers.

## 2. No Overflow Outside Cards

- Cards that contain flex/grid children must use `min-w-0`.
- Long names, source labels, uploaded dataset names and report titles must use `truncate`, `line-clamp-*` or `break-words`.
- Badges must use `shrink-0`, a `max-w-*`, and `truncate` unless wrapping is intentional.
- Badge copy should be short: prefer `Demo`, `Uploaded`, `Planned`, `Ready`, `Local`, `Validation`.

Pattern:

```tsx
<div className="flex min-w-0 items-start justify-between gap-3">
  <div className="min-w-0">
    <h3 className="truncate text-sm font-semibold">Long source name</h3>
  </div>
  <span className="max-w-[92px] shrink-0 truncate rounded-full px-2 py-1 text-xs">
    Planned
  </span>
</div>
```

## 3. No Overlapping Text

- Avoid absolute-positioned text unless the parent has fixed bounds and QA at target widths.
- Map labels must sit above polygon/overlay strokes with a higher z-index and solid/blurred background.
- Decorative overlays must never cross text labels.
- Polygon strokes must never cross selected-site labels.
- Decorative chips must not overlap card text.
- Small map previews should use at most 2-3 short chips.
- Hero dashboard mockups must not duplicate signal cards and chips in the same map area.
- Small mockups should use one visual signal pattern only: either compact chips or compact cards, not both.
- Absolute labels must be bounded, layered above decorative geometry and checked at 1728px, 1440px and 1280px.

Pattern:

```tsx
<div className="relative overflow-hidden">
  <div className="absolute left-3 top-3 z-30 rounded-md bg-white/95 px-3 py-2">
    <p className="truncate text-sm font-semibold">Selected site</p>
  </div>
  <div className="absolute z-10 ...">polygon overlay</div>
</div>
```

## 4. Equal-Height Card Rows

- Parent grids should use `items-stretch`.
- Cards in the same row should use `h-full flex flex-col`.
- Footer/status lines should use `mt-auto`.
- Metric cards should use stable min-heights and controlled typography.

Pattern:

```tsx
<div className="grid items-stretch gap-4 lg:grid-cols-2">
  <section className="flex h-full min-w-0 flex-col rounded-lg border bg-white p-5">
    <div>Header</div>
    <div className="mt-4 flex-1">Body</div>
    <div className="mt-auto pt-4">Footer</div>
  </section>
</div>
```

## 5. Information Priority

Within every major block, order content from decision value to supporting context:

1. Decision / recommendation
2. Score or key status
3. Evidence / source confidence
4. Risks / validation need
5. Next action
6. Secondary metadata

Generated time, mode labels and internal diagnostics should not create large visual weight unless they are part of the user's immediate decision.

## 5.1 Workspace Primary CTA

- The bottom primary CTA in the Workspace command panel must always represent the current next best action.
- Do not leave a stale export CTA visible after the user changes Custom Query, scenario, target or comparison set.
- Export should appear only when the current analysis or comparison is up to date with the selected target, scenario, comparison set and trimmed Custom Query.
- If the current result is stale, the primary CTA should switch to `Continue Analysis` or `Continue Comparison`.
- The footer CTA is the dominant action; dashboard/header export buttons should remain secondary when present.

## 6. No Visual Holes

- Grid/flex layouts should distribute available space intentionally.
- If one column has less content, add a meaningful summary, metadata, status or validation block.
- Avoid large empty lower areas in dashboard cards.
- Use `content-start` only when the remaining space is deliberately neutral; otherwise use `flex-1`, `grid-rows-*` or `mt-auto`.
- If a layout has empty space, either redistribute cards, add a summary/decision block, reduce container height, or collapse secondary content.

## 7. Report Map Rule

- Every report map must show the selected point, polygon, multipolygon or line clearly.
- If Mapbox cannot render reliably in report/print, use a static SVG/HTML fallback.
- A grey blank map is not acceptable.
- A report map without selected geometry is not acceptable.
- Map blocks need stable height and `overflow-hidden`.

Pattern:

```tsx
<div className="relative min-h-[280px] overflow-hidden rounded-lg border">
  <MapOrFallback selectedGeometry={geometry} selectedPoint={point} />
</div>
```

## 8. Printable Route Reliability

- Printable report actions must pass a valid saved report id or a local session fallback payload.
- If the report is not saved yet, save before navigation.
- Do not open `/reports/[id]/print` before preparing either server persistence or session fallback.
- If persistence genuinely fails, stay on the current page or show a recoverable message.
- Printable reports must be dedicated deliverable routes/templates, not raw workspace UI.
- Browser header/footer may appear if the user prints manually; the report itself must not depend on workspace layout.

Pattern:

```tsx
sessionStorage.setItem(`geoai-print-report:${reportId}`, JSON.stringify(reportRecord));
window.location.assign(`/reports/${reportId}/print`);
```

Server route behavior:

1. Try saved report repository.
2. If missing, load local session fallback on the client.
3. If both are missing, show a clear recovery path.

## Implementation Patterns

### SafeBadge

Use for all pills/badges in constrained cards.

```tsx
<SafeBadge variant="planned">Planned</SafeBadge>
```

### SafeCard

Use for cards in equal-height rows.

```tsx
<SafeCard>
  <div className="min-w-0">Content</div>
</SafeCard>
```

### EqualHeightGrid

Use for card rows that should visually align.

```tsx
<EqualHeightGrid className="lg:grid-cols-2">
  <SafeCard>One</SafeCard>
  <SafeCard>Two</SafeCard>
</EqualHeightGrid>
```

### PrintMapFallback

Use for print/report surfaces when Mapbox may fail or be unavailable.

```tsx
<ReportPrintMap title="Selected site" subtitle="Print-safe context" coordinates={coordinates} />
```

### DecisionSummaryBox

Use when a dashboard has empty decision space or needs a stronger hierarchy.

```tsx
<DecisionSummaryBox
  decision="Proceed with conditions."
  reason="Strongest demo-screened option."
  validationNeed="Official validation required."
  nextAction="Prepare due diligence memo."
/>
```

## 9. Data Honesty

Keep all source states explicit:

- demo prototype
- demo-normalized
- sample/offline metrics
- uploaded CSV/GeoJSON
- local demo data
- external open-data snapshot
- planned official validation
- official validation required
- live official integration not connected

Do not claim live/official parcel, zoning, cadastral, ownership, title or certified valuation coverage unless it is actually implemented and validated.

## Mandatory No-Overflow QA Before Merge

- Check 1728px, 1440px and 1280px desktop widths.
- Check mobile stacking for changed sections.
- Inspect badges at narrow card widths.
- Inspect long source names and uploaded file names.
- Open comparison dashboard and confirm no dead top-row holes.
- Open printable analysis and comparison reports from the current session.
- Confirm report maps show selected geometry or a static fallback.
- Confirm no visible badge escapes a card boundary.
- Confirm no decorative map element crosses an important label.
- Confirm `npm run build` passes before commit/push.
