# COMPLETE25 — optional NASA POWER regional climate

## Change request and boundary

Add useful source-backed seasonal context to the real point-to-object React product, not only the historical demo pack. This is a bounded enrichment, not site climate, heat comfort, planning permission, valuation, or Production acceptance. Existing saved results and their original hashes remain valid when climate is absent.

## Data and acquisition

- Sole endpoint: `https://power.larc.nasa.gov/api/temporal/monthly/point`; fixed parameters `T2M,T2M_MAX,RH2M`, community `SB`, JSON. No keys, retries, redirects, paid services or arbitrary URLs.
- Dynamic year = UTC current calendar year minus one, earliest 1981. No fallback to an older year when the latest completed calendar year is incomplete. Deterministic adapter clock injection supports tests.
- One request, maximum four seconds and 65,536 response bytes, within the existing 12-second public source deadline. Runs alongside OSM optional enrichments. Unknown, timeout, partial and malformed responses remain unavailable, never zero.
- Validate all twelve distinct months, finite temperature and humidity ranges, source units, period, MERRA2 identity, service/API metadata, rounded response coordinate association and missing-value sentinel. `YYYY13` is a separate annual source aggregate; it is deliberately excluded from the monthly display/AI facts.
- Persist acquisition time, observed period, original response SHA-256, byte count, API version, attribution and official reference. No provider diagnostics enter the public pack.
- Product acquisition always enables the internal climate flag at the single evidence-lease builder caller. Direct legacy builder callers without this server-only flag preserve the old output/hash. This flag is not a client request field.
- Overall evidence pack hash includes climate. OSM identity response hash remains unchanged. The lease and all analysis depths reuse the same immutable snapshot; local chart controls make no requests.

## Grounding and presentation

Separate optional `climate` namespace in evidence pack and response subject. Strict saved-session and lease parsers accept either historical absence or the exact new contract. Available data enters AI projection only when its unique NASA evidence record, requested coordinates and normalized values match. A deterministic source fact reports monthly mean temperature/humidity ranges with NASA provenance. This slice does not invent a new model-authored climate/legal/financial claim schema.

Chart contract: twelve calendar months, line comparison for T2M/T2M_MAX in °C; separate local humidity view with a fixed 0–100% scale. The default temperature scale is visibly labeled and not zero-baseline magnitude bars. Solid/dashed strokes distinguish series without relying on color. Brand teal `#087F8C`, pale control states, neutral grid. Exact twelve-row table and source disclosure are keyboard accessible. The completed saved result owns the chart, not draft controls. No map/basemap changes.

MERRA-2 resolution is 0.5° latitude × 0.625° longitude. These are regional gridded 2 m air estimates, not surface temperature or parcel measurements. T2M_MAX is the monthly maximum series, not a claim about an absolute extreme. No thermal comfort inference is made.

## Validation (2026-09-25, Node 24.19)

- Dedicated `scripts/point-to-object-climate-check.mjs`: 37 offline checks, including negative values/months/units/metadata, byte limits, HTTP/timeout, product acquisition enabled, absent-climate legacy hash, unavailable leased snapshot, NASA evidence tamper and Q/S/D reuse.
- Existing actual Next cache lease: 40 checks PASS. Existing shared exact-source: 15 checks PASS. Context retrieval: 13 checks PASS.
- `npm run test:point-to-object-geocontext`: PASS (classification, Wikidata, semantic grounding, V5/V6 saved sessions, dashboard and depth contracts).
- `npm run test:point-to-object`: PASS (strict contract and provenance).
- `npm run lint` (TypeScript): PASS.
- WebKit: 14/14 PASS (6 new climate + 8 adjacent dashboard). EN/RU at 390/834/1440; keyboard metric switch, exact twelve-row source view, no extra AI/context calls on local controls or reload. Explicit fixtures, not live acceptance.
- Actual adapter public checks: Dubai available in 1335 ms, Singapore available in 1186 ms; each returns all twelve months for 2025. These single samples are not a reliability/SLA or sustained latency claim. Receipts: `deliverables/complete25-nasa-public-receipts-20260925.json`.
- Screenshots: `output/playwright/complete25-climate-final/complete25-climate-NASA-climate-saved-fixture-{locale}-{width}/climate-{locale}-{width}.png`; mobile RU390, tablet RU834 and desktop EN1440 inspected. Output files are local evidence, not Git tracked.

## Integration notes and ownership extensions

Parent explicitly granted minimal climate-only edits to live-session, context/AI route serializers, and these shared checks: lease fixture adds `includeClimate` + assertion true; semantic/session/contract data-URL loaders resolve the real new climate modules; strict Candidate UI allowlist adds exactly `climate-context.tsx`. Existing assertions are retained. The pure Overpass lane loads the real climate adapter as an erasable module without the server-only marker; no climate logic is mocked away.

No paid AI, deployment, Auth, environment, database writes, package or CI changes. Integrator still needs combined production build/Preview and actual end-to-end paid analysis/cloud reopen acceptance. Optional provider outages remain possible. Old receipts legitimately have no climate; acquisition occurs only on an explicit new source snapshot, not when an old snapshot is analyzed at another depth.

Official references reviewed: [Monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/), [Meteorology methodology](https://power.larc.nasa.gov/docs/methodology/meteorology/), [Referencing](https://power.larc.nasa.gov/docs/referencing/).
