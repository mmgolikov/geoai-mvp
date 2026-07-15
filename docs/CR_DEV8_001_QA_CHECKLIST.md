# CR-DEV8-001 QA Checklist

## Scope invariants

- [x] Branch starts from exact `main` SHA `754a9c68cd1ee7af80731f1b779df023d54e901e`.
- [x] PR is separate from PR #84, issue #85 and issue #80.
- [x] No Supabase migration/write, Storage, Auth/RLS, secret, new environment variable or Figma change.
- [x] No live Product geometry, source-dependent score change or Production source activation.

## Deterministic local checks

```bash
npm ci
npm run lint
npm run test:runtime-source-pack
npm run test:data-honesty
npm run validate:external-data
npm run build
```

Expected source-pack contract coverage:

- NASA fill values are excluded and fixed aggregates are deterministic.
- Copernicus provider fields are allowlisted; geometry, bbox and assets are stripped.
- Overpass outputs exactly three non-negative count fields.
- malformed provider responses fail closed;
- missing/empty/out-of-range coordinates and oversized dates fail validation;
- timeout, response-size and Production guards remain present;
- Open-Meteo implementation contains no fetch path.
- generic `NODE_ENV=production` fails closed even without `VERCEL_ENV`;
- the legacy solar route contains no provider fetch;
- only connected climate context can enter evidence/AI payloads;
- NASA, Copernicus and OSM attribution notices match the provider-specific decision;
- identical same-instance provider requests are deduplicated and Overpass performs one upstream attempt.

## Built-app API checks

```bash
npm run start -- -H 127.0.0.1 -p 3000
GEOAI_TEST_BASE_URL=http://127.0.0.1:3000 npm run test:api-contract
```

Manual negative assertions:

```text
GET /api/context/climate                         -> 400
GET /api/context/climate?lat=91&lng=181          -> 400
GET /api/context/climate?lat=25.2048&lng=55.2708 -> 200, permission_required, null metrics
```

The local source-pack route may perform live public-provider calls. CI correctness must use frozen fixtures; mutable live values are never equality assertions.

## Vercel Preview checks

- [x] Deployment SHA equals final PR head SHA; evidence is recorded in GitHub/Confluence.
- [x] Deployment target is Preview and state is READY.
- [x] `/api/external-data/source-connection-pack` returns the declared top-level contract.
- [x] `demoId=dubai-downtown-public-demo`, `scoreImpact=none`, `persistence=none`.
- [x] Every source is independently `live`, `cached` or `unavailable` with a non-secret fallback reason.
- [x] NASA payload identifies UTC historical point context and provider-specific reference copy.
- [x] Copernicus payload contains only product ID, collection, datetime and cloud-cover metadata; no geometry/bbox/assets.
- [x] OSM payload declares `responseMode=count_only`, `geometryReturned=false` and visible ODbL attribution.
- [x] Mandatory caveat is present.
- [x] Deployment-scoped runtime logs show no error cluster or repeated upstream retry loop.

## Production fail-closed check

Against a Production-runtime build or deployment, before any upstream-network evidence:

```text
GET /api/external-data/source-connection-pack -> 503
effectiveMode=disabled
activationAllowed=false
sources=[]
```

Do not trigger or redeploy Production as part of this CR.

## External-state evidence

- [x] GitHub final exact-head quality run and artifact recorded externally.
- [x] Vercel Preview final exact-head deployment and logs recorded externally.
- [x] Supabase migration list and source-table counts are unchanged from the pre-change audit.
- [x] Confluence CR, implementation issue and PR cross-link one another.
- [x] Owner accepted G0–G4 for this bounded phase and intentionally waived independent reviewer approvals; no independent review is claimed.
- [x] PR may be marked Ready after final exact-head evidence; Production source activation remains disabled.

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
