# POINT_TO_OBJECT_001 Live Map Prototype V2 Change Request

Status: Founder-approved for access-controlled Preview activation; Production and `main` excluded

Date: 2026-09-03

Owner: GeoAI product delivery team

Authority: Founder correction issued in Main on 2026-09-03. This authority applies only to the existing point-to-object prototype branch and its Vercel Preview; it does not authorize merge to `main` or Production deployment.

## Problem

The first clickable prototype exposes internal release and source-state language, constrains the workspace inside large grey gutters, places the map and task controls below the first viewport at common desktop sizes, requires a redundant consent checkbox, renders a static geographic SVG, and presents AI output inline. The result demonstrates internal evidence controls rather than the intended customer workflow.

## Business reason

The next prototype must demonstrate the core product hypothesis directly: select a real mapped object, inspect a concise object card, run a source-bounded OpenAI analysis, and continue the analysis on a dedicated result page. This is the minimum credible experience for founder review and early UAE/Singapore conversations.

## Users

- Founder and internal product reviewers.
- Founder and invited UAE and Singapore discovery participants using an access-controlled isolated Preview.
- Not authorized for legal, cadastral, zoning, planning, ownership, valuation, or operational conclusions.

## Affected surfaces

- `/prototype/point-to-object`: full-width live-map workspace and task panel.
- `/prototype/point-to-object/analysis`: new dedicated analysis and follow-up page.
- `/api/prototype/point-to-object/ai`: accepts a bounded live-map selection and rebuilds the minimized evidence projection on the server.
- Point-to-object contract checks, CSP, documentation lifecycle, and focused browser coverage.
- No released navigation, Auth, Workspace, Projects, Explore, Production route, or `main` branch change.

## Product and UX changes

1. Remove user-visible `Preview`, `Not Released`, `Candidate`, warning-code, refresh-state, conflict-state, snapshot-ID, and internal resolver language from the prototype UI.
2. Preserve only information a user needs: selected object, coordinates, open-map source, short limitation copy, action, and required attribution.
3. Use a full-bleed desktop shell. The live map and task panel must both fit in the initial 1440 x 900 viewport; the task panel scrolls independently when necessary.
4. Replace the SVG canvas with MapLibre GL JS and a live OpenFreeMap vector basemap. A clicked rendered building/object is visibly highlighted.
5. Keep Dubai and Singapore as navigation shortcuts, not frozen data modes.
6. Treat clicking `Analyze with OpenAI` as the explicit user action. Remove the checkbox and retain a short processing notice beside the action.
7. Navigate immediately to a dedicated analysis page. Preserve the selection in browser session state, provide `Back to map`, and support bounded custom follow-up questions without placing them in the URL.
8. Present source-backed facts, AI interpretation, decision observations, and missing information in plain customer language. Do not display provider telemetry or internal error codes by default.

## Source and data decision

- Client renderer: MapLibre GL JS, pinned in the lockfile.
- Live basemap and rendered object footprints: OpenFreeMap vector styles/tiles, loaded directly in the browser for interactive display only.
- Server enrichment: a single user-triggered coordinate-based Nominatim reverse request, with an identifiable application User-Agent, Dubai/Singapore coordinate bounds, caching, bounded response size, timeout, safe-field allowlist, and a conservative application request gate.
- An OpenFreeMap rendered feature is a visual selection aid. It is not an authoritative object register and its tile geometry may be simplified or clipped.
- A Nominatim reverse result is checked against the returned Polygon/MultiPolygon. Only a true server-side point-in-polygon result may be described as containing the clicked point; every other result is labelled as the nearest indexed OSM record.
- Public Overpass is not a runtime dependency in V2 because current endpoints did not meet the bounded response-time threshold during source audit.
- Supabase is intentionally not placed in the anonymous Preview critical path. The current `geoai-dev` data foundation is not approved as a public runtime cache. Durable authenticated result history and a controlled PostGIS object cache remain subsequent work.
- Frozen Dubai/Singapore case packs remain repository evidence and regression fixtures, but they are not the default user experience or represented as live data.

## Data minimization and AI boundary

- The browser sends only bounded WGS84 coordinates, a question of at most 500 normalized characters, and the one-time same-origin challenge. Vector-tile feature identifiers and object labels are not sent as source identity.
- The server does not trust browser-provided object facts. It resolves from the coordinate only, verifies any returned polygon containment, and creates a new minimized evidence pack.
- Arbitrary OSM tags, raw vector tiles, raw provider responses, full geometry, customer data, credentials, and hidden application context are not sent to OpenAI.
- OpenAI receives a deliberately minimized projection: bounded coordinates, allowlisted taxonomy tokens, geometry type/hash, evidence IDs, fixed limitations, and the user question. Names, addresses, source prose, raw tags and geometry are withheld. Requests remain `store:false` with no tools and strict structured output.
- Source facts, overview, location context, and missing-information text are rebuilt deterministically on the server. Model-generated interpretation is low/medium confidence, must require validation, and is rejected clause-by-clause for unsupported high-impact claims.

## Risks and controls

| Risk | Control |
| --- | --- |
| Free map provider outage or policy change | Provider URL is isolated, map load has a clear retry state, and no readiness claim is made. |
| Reverse result differs from clicked footprint | Verify returned Polygon/MultiPolygon containment server-side; otherwise separate the highlighted visual footprint from a result titled `Nearest indexed OpenStreetMap record`. |
| Public Nominatim/OpenAI capacity abuse | Keep upstream disabled by default. Activation requires a dedicated operator flag and Vercel Authentication for Preview. Process-local IP/global caps, one-request-per-second pacing, cache and body/time bounds are defense in depth, not a distributed quota. |
| Browser feature tampering | Server validation and source rebinding; browser name/class is never elevated to a confirmed fact without provider support. |
| Source or personal data leakage | Strict field allowlist excludes contact, contributor and free-form arbitrary tags; raw bodies and geometries are not sent to OpenAI. |
| Open-map geometry mistaken for official boundary | Persistent concise caveat and visible attribution; no cadastral, ownership, zoning, planning or valuation language. |
| Mobile or first-viewport regression | Focused desktop and mobile layout assertions plus visual review at 1440 x 900 and 390 x 844. |
| Supabase security debt enters public path | No Supabase client or service-role dependency in this V2 flow. |

## Acceptance criteria

- No `Preview`, `Not Released`, `Candidate`, `Source Conflict`, `Source Refresh Unknown`, internal warning codes, consent checkbox, or frozen-SVG copy is visible on the two prototype pages.
- The desktop page is edge-to-edge and both map and action panel are visible without vertical scrolling at 1440 x 900.
- The map loads a real OpenFreeMap style and vector objects without a paid key; attribution remains visible and linked.
- Clicking a rendered building highlights its actual tile polygon; clicking another mapped location still captures an exact WGS84 point and never invents an object.
- `Analyze with OpenAI` moves to `/prototype/point-to-object/analysis`; the selected location survives navigation and `Back to map` restores the working context.
- The analysis page records a real OpenAI structured-output success on the exact access-controlled Vercel Preview and supports at least one custom focused analysis while preserving the prior result on failure.
- Source/provider failure is understandable, recoverable, and never replaced by fake AI output.
- Required source and decision limitations remain readable without exposing internal governance UI.
- TypeScript, build, secret hygiene, security headers, API access/inventory, point-to-object contract, documentation lifecycle, and focused browser checks pass.
- Vercel Preview is green, protected with Vercel Authentication, and visually verified on desktop and mobile. Production domains and `main` remain unchanged.

## Rollback

Revert the V2 commits or discard the isolated branch/worktree. No database migration, data mutation, Supabase runtime dependency, Production deployment, or `main` merge is part of this change. Founder authorization dated 2026-09-03 is limited to Vercel Authentication for Preview and the dedicated non-secret Preview AI activation flag.

Mandatory decision boundary:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
