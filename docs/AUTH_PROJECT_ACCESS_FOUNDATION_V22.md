# GeoAI Auth & Project Access Foundation v2.2

> **Superseded — do not use operationally.** This historical scaffold contains a legacy anon-key and demo-fallback Auth model that the current candidate rejects. Missing or invalid protected Auth now fails closed; no environment flag activates Auth by itself. Use the [Implemented Architecture](architecture.md), [AUTH-01 backlog](CODEX_BACKLOG_2026_07_16.md#auth-01--request-scoped-auth-and-rbac-kernel) and [Current Release State](CURRENT_RELEASE_STATE.md).

Date: 2026-06-24

## Scope

GeoAI v2.2 adds a lightweight authentication and project-access foundation while preserving the public investor demo. It introduces auth mode detection, a client auth provider, demo project membership, project access helper types, a sign-in foundation page and a safe session API route.

This is not production-grade security. It is a product and architecture baseline for a future Supabase Auth, RLS and governance sprint.

## Current Auth Modes

- `demo_public` is the default. GeoAI creates a demo user, demo organization and owner-style demo membership so all current public demo workflows remain accessible.
- `supabase_auth` enables the Supabase Auth foundation when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured. If those public values are missing, GeoAI falls back to `demo_public`.
- `disabled` hides authentication intent and leaves public demo workflows available.

Set the mode with:

```bash
NEXT_PUBLIC_AUTH_MODE=demo_public
```

Valid values:

```text
demo_public
supabase_auth
disabled
```

## What Was Added

- Shared auth/session/project membership TypeScript types.
- Auth mode helpers that use only public-safe environment variables.
- Demo user, organization and project membership fixtures.
- Client-side `AuthProvider` and `useAuth` hook.
- Compact access status indicators in navigation, workspace and project dashboard.
- `/login` access foundation page.
- `/api/auth/session` safe session endpoint.
- Server-safe project access helpers for future API enforcement.

## v2.4 Soft Enforcement Update

`requireProjectAccess({ projectKey, action, mode })` now supports:

- `soft`: preserves the public demo and returns safe access metadata in project-scoped API responses.
- `hard`: blocks demo access unless explicitly allowed for a controlled test environment.

Core project-scoped APIs now include:

```json
{
  "access": {
    "allowed": true,
    "role": "owner",
    "mode": "soft",
    "reason": "Demo project access allowed in soft mode."
  }
}
```

This is groundwork for hard enforcement only. Demo access is not production authentication.

## Data And Secrets Guardrails

- `OPENAI_API_KEY` remains server-only.
- `SUPABASE_SERVICE_ROLE_KEY` is not imported or exposed in client components.
- The client provider uses only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_AUTH_MODE`.
- No route guard blocks the public demo in this version.

## Limitations

- No production hard route enforcement yet.
- Supabase/PostGIS v2.3 adds an RLS policy draft, but full enforcement still requires configured Supabase Auth, project memberships and deployment governance.
- Supabase/PostGIS v2.3 adds durable user/organization/project membership table foundations, but production user access workflows are not complete.
- No enterprise RBAC UI yet.
- No audit trail, billing, tenant administration or secure file-storage governance yet.

Required caveat:

> Authentication foundation only; production access control requires configured Supabase Auth, RLS and deployment governance.

## QA Checklist

- `/` loads without login in default mode.
- `/workspace` loads without login in default mode.
- `/projects` loads without login in default mode.
- `/login` shows the current auth mode and caveat.
- `/api/auth/session` returns safe JSON with no secrets.
- Setting `NEXT_PUBLIC_AUTH_MODE=supabase_auth` without Supabase public env values falls back to demo access.
- Build passes with no TypeScript errors.

## Next Sprint

Recommended next sprint: Validation Governance & Official Connector Readiness v2.5.

See also: [Supabase/PostGIS Durable Persistence Foundation v2.3](SUPABASE_POSTGIS_DURABLE_PERSISTENCE_V23.md).
