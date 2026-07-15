# Post-release Quality and Spatial Regression Gate v1 — QA Checklist

## Scope and branch control

- [ ] Branch is `dev7-main-quality-spatial-b2a-regressions-v1`.
- [ ] Base SHA is `cd5f9efe791ff7d5ac46597925bbf17eb60d2754`.
- [ ] Only CI, package-script registration and release-governance documentation changed.
- [ ] No Product, data-plane, environment, secret or deployment change is present.
- [ ] Pull request remains draft and merge requires separate founder approval.

## Workflow contract

- [ ] Existing workflow and job names are unchanged.
- [ ] Pull requests to `main` trigger the workflow.
- [ ] Pushes to `main` trigger exact merge-commit evidence.
- [ ] Manual dispatch remains available.
- [ ] Pull-request runs check out the exact PR head instead of the synthetic merge ref.
- [ ] Push/manual runs check out the exact event SHA.
- [ ] Permissions remain `contents: read`.
- [ ] Timeout and concurrency cancellation remain bounded.
- [ ] No deploy, promotion, migration, seed or external-write command exists.

## Permanent checks

- [ ] `npm ci` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test:access-decision` passes.
- [ ] `npm run test:rls-plan` passes.
- [ ] `npm run test:workspace-panel` passes.
- [ ] `npm run test:spatial-b1` passes.
- [ ] `npm run test:spatial-b2a` passes.
- [ ] `npm run test:data-honesty` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:api-contract` passes against the built server.

## Workspace regression boundary

- [ ] Criteria-first remains the first interaction-mode control in canonical DOM order.
- [ ] Map-first remains the second interaction-mode control.
- [ ] Developer redevelopment keeps its Map-first default.
- [ ] Fund redevelopment search keeps its Criteria-first default.
- [ ] The removed selected-target summary card is absent.
- [ ] The duplicate action is absent and one sticky primary action remains.
- [ ] Results are described as source-contract evidence, not browser-responsive certification.

## Spatial regression boundary

- [ ] Production accepts synthetic fallback and rejects open-context requests.
- [ ] Controlled fixture contains zero real geometry.
- [ ] Unapproved release, distribution and repository delivery states fail closed.
- [ ] Every catalogue layer has a deterministic fallback.
- [ ] Visible overlay attribution coverage is exact.
- [ ] Mapbox attribution is present only in Mapbox basemap mode.
- [ ] Source, provider feature and source record identities remain distinct.
- [ ] Required caveat and no-live-source claims remain enforced.

## Route smoke

- [ ] `/` returns HTTP 200.
- [ ] `/workspace` returns HTTP 200.
- [ ] `/projects` returns HTTP 200.
- [ ] `/explore` returns HTTP 200.
- [ ] `/demo` returns HTTP 200.
- [ ] `/api/health` returns HTTP 200.
- [ ] `/api/db/health` returns HTTP 200.
- [ ] `/api/platform/activation-status` returns HTTP 200.
- [ ] `/api/pilot-backend/status` returns HTTP 200.
- [ ] Both seeded print routes return HTTP 200.

## Evidence and governance

- [ ] Evidence contains Node, npm and exact tested commit metadata.
- [ ] `tested-commit-sha.txt` equals the PR head for pull-request evidence.
- [ ] TypeScript, build, static, spatial, API, route and runtime logs are preserved.
- [ ] Artifact retention remains 14 days.
- [ ] Evidence contains no env values, credentials, JWTs, cookies, user files or real geometry.
- [ ] PR #81 is described as merged and released only for its inactive scope.
- [ ] Production remains synthetic/local fallback, demo-only and soft access.
- [ ] Browser evidence remains separate and is not implied by a green source gate.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
