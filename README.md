# GeoAI MVP

GeoAI is an early Next.js MVP skeleton for a spatial decision intelligence platform. This milestone creates the deployable application foundation only: homepage, workspace shell, Mapbox-ready map area, analysis panel placeholder, API routes, and mock demo objects.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Mapbox GL JS
- Next.js API routes
- Mock JSON data

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`NEXT_PUBLIC_MAPBOX_TOKEN` is optional for the skeleton. Without it, the workspace shows a polished placeholder. Add a real Mapbox token later to render the live basemap.

If port `3000` is already occupied, Next.js may start on the next available port. Use the URL printed in the terminal and open `/workspace` on that same port. If an old browser tab shows `404` or `Internal Server Error`, close the old dev server/tab and reopen the current printed URL.

The default development command uses stable Webpack mode with polling enabled, which is more reliable for this Mapbox workspace in the local Codex/macOS environment.

## Environment Variables

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=
OPENAI_API_KEY=
```

Do not commit real tokens. This milestone does not call OpenAI yet; `OPENAI_API_KEY` is reserved for a future task.

## Useful Commands

```bash
npm run dev
npm run dev:turbo
npm run build
npm run start
```

## API Routes

- `GET /api/health` returns app status.
- `GET /api/demo-objects` returns mock spatial objects for future demos.

## Deploy To Vercel

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Create a new project in Vercel and import the repository.
3. Keep the default Next.js build settings.
4. Add `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel project environment variables when ready.
5. Add `OPENAI_API_KEY` later, only when the OpenAI integration is implemented.
6. Deploy.

## Current Scope

Implemented:

- Homepage
- Workspace page
- Top navigation with GeoAI branding
- Full-screen map workspace placeholder with Mapbox GL JS integration hook
- Right-side analysis panel placeholder
- API route skeleton
- Mock data structure
- Vercel-ready project files

Not implemented yet:

- OpenAI API calls
- Database or persistence
- Full scenario engine
- Drawing tools, scoring, comparison, or report export
- Authentication

## Recommended Next Task

Implement the first interactive workspace flow: load mock objects from `/api/demo-objects`, render them as Mapbox markers when a Mapbox token is present, and show a selected object summary in the right-side panel.
