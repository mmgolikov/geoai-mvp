# GeoAI Pilot UX v3.3 - Text-Safe BI Dashboard and Supabase Activation Readiness

GeoAI v3.3 hardens the pilot BI surfaces for longer decision text and adds an explicit Supabase pilot activation readiness path. It does not merge to main, activate production, apply live migrations, or enable hard access enforcement.

## UX Changes

- Added text-safe dashboard primitives for KPI values, score gauges, ranked bars and drill-down modules.
- Rebuilt the Express dashboard first screen around a map plus BI cockpit:
  - decision posture with full rationale disclosure
  - suitability gauge
  - short KPI row
  - top drivers and risks
  - recommended action with secondary actions and details
- Replaced mid-phrase generated driver/risk labels with complete short labels such as `Development fit`, `Evidence quality`, `Risk level`, `Official planning gap` and `AI fallback`.
- Kept evidence/source details collapsed as the last appendix module.
- Updated criteria-first search state labels:
  - `No search run yet`
  - `Results updated`
  - `Criteria changed — update search`
- Updated candidate comparison text handling so names, rationale, trade-offs and summary rows wrap instead of truncating.

## Supabase Activation Readiness

- Added a safe Supabase activation readiness helper for project `geoai-dev` (`pphdqkurxneyagvnnjdt`, `eu-west-1`, Postgres `17.6`).
- Added activation readiness output to:
  - `GET /api/db/health`
  - `GET /api/platform/activation-status`
  - `GET /api/pilot-backend/status`
- Added `npm run supabase:activation-status`.
- Added `docs/SUPABASE_PILOT_ACTIVATION.md`.
- Tightened guarded migration target language to `preview` or `pilot`.

## Verification

- `npm run lint` passed.
- `npm run build` passed.
- `npm run supabase:activation-status` passed with expected local blockers because this runtime has no Supabase env configured.
- Local route smoke checks passed for:
  - `/`
  - `/workspace`
  - `/projects`
  - `/explore`
  - `/demo`
  - `/api/health`
  - `/api/db/health`
  - `/api/platform/activation-status`
  - `/api/pilot-backend/status`
- Browser visual checks passed for:
  - criteria-first empty, searched and candidate-selected states
  - Express BI dashboard cockpit
  - comparison dashboard

## Known Limitations

- Supabase env is not configured in the local runtime used for this release check, so activation readiness correctly reports local fallback blockers.
- No live migration was applied.
- No production deployment is claimed by this release note.
