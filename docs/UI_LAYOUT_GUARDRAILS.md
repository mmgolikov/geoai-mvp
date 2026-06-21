# GeoAI UI Layout Guardrails

Date: 2026-06-21

These rules protect GeoAI MVP screens from recurring UI regressions: overflow, overlapping text, accidental empty holes, uneven cards and broken printable report actions.

## 1. No Overflow Outside Cards

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

## 2. No Overlapping Text

- Avoid absolute-positioned text unless the parent has fixed bounds and QA at target widths.
- Map labels must sit above polygon/overlay strokes with a higher z-index and solid/blurred background.
- Decorative overlays must never cross text labels.
- Small map previews should use at most 2-3 short chips.

Pattern:

```tsx
<div className="relative overflow-hidden">
  <div className="absolute left-3 top-3 z-30 rounded-md bg-white/95 px-3 py-2">
    <p className="truncate text-sm font-semibold">Selected site</p>
  </div>
  <div className="absolute z-10 ...">polygon overlay</div>
</div>
```

## 3. No Visual Holes

- Grid/flex layouts should distribute available space intentionally.
- If one column has less content, add a meaningful summary, metadata, status or validation block.
- Avoid large empty lower areas in dashboard cards.
- Use `content-start` only when the remaining space is deliberately neutral; otherwise use `flex-1`, `grid-rows-*` or `mt-auto`.

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

## 5. Printable Route Reliability

- Printable report actions must pass a valid saved report id or a local session fallback payload.
- If the report is not saved yet, save before navigation.
- Do not open `/reports/[id]/print` before preparing either server persistence or session fallback.
- If persistence genuinely fails, stay on the current page or show a recoverable message.

Pattern:

```tsx
sessionStorage.setItem(`geoai-print-report:${reportId}`, JSON.stringify(reportRecord));
window.open(`/reports/${reportId}/print`, "_blank", "noopener,noreferrer");
```

Server route behavior:

1. Try saved report repository.
2. If missing, load local session fallback on the client.
3. If both are missing, show a clear recovery path.

## 6. Data Honesty

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

## QA Checklist

- Check 1728px, 1440px and 1280px desktop widths.
- Check mobile stacking for changed sections.
- Inspect badges at narrow card widths.
- Inspect long source names and uploaded file names.
- Open comparison dashboard and confirm no dead top-row holes.
- Open printable analysis and comparison reports from the current session.
- Confirm `npm run build` passes before commit/push.
