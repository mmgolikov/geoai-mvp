# POINT_TO_OBJECT_001 Live Source Decision

Status: Approved for isolated Vercel Preview only

Date: 2026-09-03

## Decision

Use MapLibre GL JS with OpenFreeMap for live interactive cartography, 2D/3D rendering, basemap switching and rendered object selection. After a direct user click, use the public Nominatim service only for a cached, bounded coordinate reverse request in an access-controlled low-traffic evaluation. Show the safe result immediately in the selected-location card and reuse the same server-side resolver for the AI evidence pack. Do not use public Overpass or Supabase in the V2 runtime critical path.

## Why this path

- OpenFreeMap provides a keyless MapLibre-compatible vector basemap and current OSM-derived building geometry suitable for a real clickable map.
- Vector tiles are sufficient for visual selection but do not guarantee object names, addresses, complete tags, or stable object identifiers.
- Nominatim can return the nearest indexed object for a coordinate. The application checks returned Polygon/MultiPolygon geometry itself and otherwise labels the result as nearest rather than contained.
- The click-enrichment route returns only safe name, address hierarchy, OSM identity, classification, association and allowlisted attributes. A newer click cancels and supersedes any older unresolved browser request. Before AI execution, the server resolves the coordinate again and rejects the request if that identity no longer matches the selected OSM record.
- Street, Light and Contrast choices use separate OpenFreeMap styles. Controlled GeoAI 3D-building and selection layers are recreated on `style.load`, so switching a basemap does not silently remove the current footprint highlight.
- Bounded Overpass endpoints were not reliable enough during the 2026-09-03 source audit to become a live demonstration dependency without a durable controlled cache.
- The existing Supabase foundation is metadata-oriented and has unresolved database/Auth/RLS readiness findings; attaching an anonymous Preview would increase risk without improving the immediate map experience.

## Usage controls

- No API key or secret is required for map rendering or Nominatim.
- OpenFreeMap is used only for normal interactive tile rendering, not automated extraction, bulk download, or server-side tile scraping.
- Nominatim requests are direct user actions, never autocomplete, grid scanning, bulk lookup, or POI harvesting. Coordinates are constrained to the Dubai and Singapore evaluation windows.
- The application uses a specific User-Agent, caches successful responses, permits at most one outbound request per second per running process, enforces a short timeout and maximum response size, and keeps the endpoint configurable. These controls do not constitute a distributed quota.
- Nominatim/OpenAI upstream remains disabled unless the dedicated operator gate is active; external evaluation additionally requires Vercel Authentication on Preview.
- The result passes through a field allowlist. Contributor metadata, contact fields, arbitrary tags, and raw response bodies are discarded.
- Visible map attribution remains enabled. The product caveat remains present in normal prose.

## Evidence and rights boundary

OpenFreeMap and Nominatim expose OpenStreetMap-derived open context under ODbL-related attribution obligations. This source is not a government cadastre, title register, planning authority, certified valuation source, or proof of current real-world condition. The public services are provided without product SLA and may change or withdraw access.

## Next-stage replacement

Before a paid pilot or scaled public use, replace public enrichment dependencies with a controlled ingestion and query layer: licensed/approved OSM or Overture extracts, PostGIS object storage and point-in-polygon resolution, governed refresh receipts, authenticated access, durable distributed rate limiting, and monitored provider fallbacks.

## Primary source register

- OpenFreeMap quick start and styles: https://openfreemap.org/quick_start/
- OpenFreeMap terms: https://openfreemap.org/tos/
- MapLibre GL JS documentation: https://maplibre.org/maplibre-gl-js/docs/
- Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
- Nominatim reverse API and its nearest-object limitation: https://nominatim.org/release-docs/latest/api/Reverse/
- Nominatim address lookup API: https://nominatim.org/release-docs/latest/api/Lookup/
- OpenStreetMap copyright and attribution: https://www.openstreetmap.org/copyright
