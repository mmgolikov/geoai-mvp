# GeoAI Auth & Project Access Foundation v2.2 Release Note

Release date: 2026-06-24

Production URL: https://geoai-mvp.vercel.app

Deployment URL: https://geoai-aotct8efe-geoaidev.vercel.app

Deployment ID: `dpl_HcqdTHPREniRudrigebqo4EkemnJ`

Production commit SHA: `84722436c72c3dd5c6ff6718ffcac91b442d5d06`

## Scope

GeoAI Auth & Project Access Foundation v2.2 adds the first project-access baseline while keeping the public investor demo open by default. It introduces a demo-public auth mode, session plumbing, access status indicators and server-safe project access helper placeholders for later enforcement.

This release does not implement production route enforcement, RLS, secure file storage, billing, audit trails or enterprise RBAC.

## What Changed

- Added auth mode support with `demo_public` as the default.
- Added `AuthProvider` and `useAuth` for client session context.
- Added a demo user, demo organization and demo owner-style project membership.
- Added `/login` as an access foundation page.
- Added `/api/auth/session` as a safe session endpoint.
- Added project access/session types and server-safe access helper placeholders.
- Added compact access status indicators to the navigation, workspace and project dashboard.
- Preserved public-demo access for `/`, `/demo`, `/workspace`, `/projects` and seeded report routes.

## Current Auth Modes

| Mode | Status | Notes |
| --- | --- | --- |
| `demo_public` | Default | Public demo access remains available without forcing sign-in. |
| `supabase_auth` | Foundation only | Uses public Supabase config when provided, but full enforcement is not implemented in this release. |
| `disabled` | Available | Hides auth intent while preserving public demo workflows. |

## Data And Secret Guardrails

- `SUPABASE_SERVICE_ROLE_KEY` remains server-only and is not imported by client components.
- `OPENAI_API_KEY` remains server-only.
- Client code uses only public-safe environment variables such as `NEXT_PUBLIC_AUTH_MODE`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No service role key or private secret is exposed in the frontend.

## Verified Routes

- `/`
- `/login`
- `/demo`
- `/workspace`
- `/projects`
- `/api/auth/session`
- `/api/db/health`
- `/api/pilot-workflow?projectKey=dubai-investment-screening-demo`
- `/api/data-room?projectKey=dubai-investment-screening-demo`
- `/api/ai/decision-score`
- `/reports/seeded-analysis-dubai-marina-report/print`
- `/reports/seeded-comparison-dubai-shortlist-report/print`

## Security Caveats

Demo access is not production authentication.

Production access control requires configured authentication, RLS and deployment governance.

Local/API fallback is not durable production storage.

## Limitations

- No production route enforcement yet.
- No Supabase RLS policy enforcement yet.
- No durable user, organization or membership table workflow yet.
- No full RBAC UI.
- No audit trail.
- No secure file storage.
- No billing or tenant administration.
- No production-grade auth or security claim.

## Recommended Next Sprint

Supabase/PostGIS Durable Persistence Foundation v2.3.
