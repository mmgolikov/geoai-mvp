# GeoAI MVP

GeoAI is a Next.js spatial decision intelligence MVP for evaluating Dubai real estate, infrastructure, construction, and climate-risk scenarios. The current version is a public demo prototype: it uses Mapbox for the workspace, synthetic/demo geospatial layers, deterministic mock analysis, comparison dashboards, and print-friendly report previews.

No OpenAI API, database, or real external data adapters are connected yet.

## Implemented Features

- Homepage and `/workspace` application shell
- Dubai-centered Mapbox workspace
- Point selection with marker and coordinates
- Synthetic demo geospatial layers:
  - Development Zones
  - Premium Real Estate Areas
  - Infrastructure Nodes
  - Construction Sites
  - Coastal / Flood Risk Zones
  - Heat Risk Zones
  - Transport Corridors
- Collapsed spatial layer controls with toggles and legend
- Demo object selection from map layers
- Scenario selector:
  - Real Estate Development
  - Investment Site Selection
  - Construction Monitoring
  - Infrastructure / Urban Planning
  - Climate & Risk
  - Custom Query
- Deterministic mock Express Analysis dashboard
- Comparison mode for 2-3 selected points or demo objects
- Comparison dashboard with scores, recommendation, risks, and next actions
- Print-friendly report preview for single-site analysis and comparison
- API route skeletons for health and demo objects
- Vercel-ready Next.js deployment structure

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Mapbox GL JS
- Next.js API routes
- Synthetic GeoJSON-style demo data
- Deterministic local mock scoring logic

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js, then go to `/workspace`.

Example:

```text
http://localhost:3000/workspace
```

If port `3000` is occupied, Next.js may start on another port. Use the exact URL printed in the terminal.

## Environment Variables

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=
OPENAI_API_KEY=
```

`NEXT_PUBLIC_MAPBOX_TOKEN` is required for the live Mapbox basemap.

`OPENAI_API_KEY` is reserved for a future AI engine milestone. The current MVP does not call OpenAI.

Do not commit real tokens. `.env`, `.env.local`, and `.env*.local` are ignored.

## Useful Commands

```bash
npm run dev
npm run dev:turbo
npm run build
npm run start
```

The default `npm run dev` command uses stable Webpack mode with polling enabled for local reliability.

## API Routes

- `GET /api/health` returns app status.
- `GET /api/demo-objects` returns mock spatial objects for demo use.

## Deploy To Vercel

1. Push the repository to GitHub.
2. Create a Vercel project from the repository.
3. Keep the default Next.js build settings.
4. Add `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel environment variables.
5. Add `OPENAI_API_KEY` later only when OpenAI integration is implemented.
6. Deploy.

## Current Limitations

- Uses synthetic/demo geospatial data only.
- Uses deterministic mock scoring only.
- No OpenAI API integration yet.
- No database or persistence yet.
- No authentication or user accounts.
- No real parcel, zoning, transaction, satellite, or regulatory data adapters.
- Report export is print-preview based, not a generated server-side PDF.
- Comparison mode is local state only and is not saved.

## Documentation

- [Architecture](docs/architecture.md)
- [Data Strategy](docs/data-strategy.md)
- [Roadmap](docs/roadmap.md)
- [QA Checklist](docs/qa-checklist.md)
- [Changelog](CHANGELOG.md)

## Next Roadmap

- v0.2: AI analysis engine with OpenAI API route integration and structured prompts
- v0.3: Data Source Registry and real data adapters
- v0.4: Pilot-ready workflows for saved studies, evidence, and client reports
- v0.5: Enterprise readiness with auth, governance, auditability, and deployment controls
