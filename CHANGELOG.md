# Changelog

## v0.1 — Public Demo Prototype

Initial public demo baseline for GeoAI MVP.

### Added

- Next.js App Router application structure.
- TypeScript and Tailwind CSS setup.
- Vercel-ready deployment configuration.
- Homepage and `/workspace` route.
- GeoAI top navigation and enterprise-style workspace layout.
- Mapbox GL JS workspace centered on Dubai.
- Safe browser-only Mapbox initialization.
- Point selection with marker and coordinate display.
- Synthetic demo geospatial layers:
  - Development Zones
  - Premium Real Estate Areas
  - Infrastructure Nodes
  - Construction Sites
  - Coastal / Flood Risk Zones
  - Heat Risk Zones
  - Transport Corridors
- Collapsed spatial layer controls with active layer count.
- Demo object selection and visual highlighting.
- Scenario-based Express Analysis using deterministic mock data.
- Scenario types for real estate, investment, construction monitoring, infrastructure planning, climate risk, and custom query.
- Full dashboard-style Express Analysis results.
- Comparison mode for 2-3 selected points or demo objects.
- Comparison dashboard with score table, score cards, winner recommendation, risks, and next actions.
- Print-friendly report preview for Express Analysis.
- Print-friendly report preview for Comparison.
- Static map-window cards in report previews.
- API routes for health and demo objects.
- Documentation baseline for architecture, data strategy, roadmap, and manual QA.

### Current Limitations

- Synthetic/demo data only.
- OpenAI analysis is optional and falls back to deterministic demo content.
- Supabase/PostGIS and persistence foundations are optional prototype paths, not production-grade storage yet.
- No authentication.
- No real GIS, planning, real estate, satellite, or market data adapters.
- Print-preview export only; no server-side PDF generation yet.
