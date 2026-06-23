# GeoAI Repository Mode & Fallback Consistency v2.0.2

Date: 2026-06-23

GeoAI v2.0.2 normalizes repository and fallback mode naming across repository helpers, API responses, UI labels and documentation. This is technical hardening only: it does not add product features, auth, full Supabase/PostGIS persistence, official validation connectors or new analysis logic.

GeoAI remains a demo/screening workflow. Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Canonical Repository Modes

The canonical type lives in `src/lib/repositories/repository-mode.ts`.

| Mode | User label | Meaning | Caveat |
| --- | --- | --- | --- |
| `supabase` | Supabase/PostGIS | Durable DB-backed repository mode only when Supabase/PostGIS is configured and a read/write succeeds. | Supabase/PostGIS is active only when configured and successfully used. |
| `local_fallback` | Local/API fallback | Server/API fallback for demo continuity. It may use local runtime files or `/tmp` in serverless runtime. | Local/API fallback is not durable production storage. |
| `browser_local` | Browser-local demo | Browser `localStorage` state used for demo continuity. | Browser-local storage is for demo continuity only. |
| `demo_seed` | Demo seed | Static or generated demo seed records. | Demo seed records are sample context and require validation. |
| `disabled` | Not configured | Feature or repository is unavailable/not configured. | Repository mode is not configured. |

## API Contract

Routes that expose repository state should use canonical mode strings and include a caveat when practical:

```json
{
  "ok": true,
  "mode": "local_fallback",
  "storageCaveat": "Local/API fallback is not durable production storage."
}
```

`/api/db/health` separates connection status from repository mode:

- `status`: `connected`, `configured_unavailable`, or `not_configured`
- `repositoryMode`: `supabase` or `local_fallback`
- `caveat`: repository caveat for the active mode

## Compatibility

`normalizeRepositoryMode(input)` accepts older internal labels for defensive compatibility, but active API responses and UI labels should use the canonical mode set above.

Legacy strings that should not be returned by active APIs:

- `local-fallback`
- `local_only`
- `local_demo`
- `local-only`

## Data Honesty

GeoAI must not describe local/API fallback, browser-local state, demo seed records or metadata-only assets as durable production storage, secure enterprise storage or official validation.

Allowed wording:

- Local/API fallback
- Browser-local demo
- Demo seed
- official validation required
- screening hypothesis

Forbidden as product claims:

- secure data room
- enterprise data room
- production-ready storage
- durable storage when only fallback is active
- official validation completed
- pilot-ready product

## QA Notes

Before merging repository-mode changes:

- Run `npm run lint`.
- Run `npm run build`.
- Check `/api/db/health`.
- Check project-scoped APIs for canonical mode and caveat fields.
- Verify UI labels show readable labels, not raw snake_case.
- Confirm no product behavior changed.
