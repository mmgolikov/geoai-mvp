# CR-DEV8-001 QA Checklist

## Scope invariants

- [ ] Branch starts from exact `main` SHA `754a9c68cd1ee7af80731f1b779df023d54e901e`.
- [ ] Draft PR is separate from PR #84, issue #85 and issue #80.
- [ ] No Supabase migration/write, Storage, Auth/RLS, secret, new environment variable or Figma change.
- [ ] No live Product geometry, source-dependent score change or Production activation.

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

- [ ] Deployment SHA equals Draft PR head SHA.
- [ ] Deployment target is Preview and state is READY.
- [ ] `/api/external-data/source-connection-pack` returns the declared top-level contract.
- [ ] `demoId=dubai-downtown-public-demo`, `scoreImpact=none`, `persistence=none`.
- [ ] Every source is independently `live`, `cached` or `unavailable` with a non-secret fallback reason.
- [ ] NASA payload identifies UTC historical point context.
- [ ] Copernicus payload contains only product ID, collection, datetime and cloud-cover metadata; no geometry/bbox/assets.
- [ ] OSM payload declares `responseMode=count_only`, `geometryReturned=false` and visible ODbL attribution.
- [ ] Mandatory caveat is present.
- [ ] Deployment-scoped runtime logs show no error cluster or repeated upstream retry loop.

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

- [ ] GitHub exact-head quality run and artifact recorded.
- [ ] Vercel Preview exact-head deployment and logs recorded.
- [ ] Supabase migration list and source-table counts are unchanged from the pre-change audit.
- [ ] Confluence CR, implementation issue and Draft PR cross-link one another.
- [ ] PR remains Draft/HOLD until G0–G3 evidence is accepted.

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
