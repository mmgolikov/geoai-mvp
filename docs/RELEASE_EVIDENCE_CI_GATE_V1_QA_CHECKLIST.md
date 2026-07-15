# GeoAI Release Evidence and CI Gate v1 — QA Checklist

## Scope control

- [ ] Branch is based on the current `main` baseline.
- [ ] Only workflow, test/evidence script, package script registration and documentation files are changed.
- [ ] No product UI, API response, Supabase, Auth/RLS, Storage, env or secret change is included.
- [ ] No Production deployment or merge is requested by the implementation.

## Workflow checks

- [ ] Pull requests to `main` trigger the workflow.
- [ ] Pushes to `main` trigger exact merge-commit evidence.
- [ ] Manual dispatch is available.
- [ ] Workflow permissions are read-only for repository contents.
- [ ] Concurrent stale runs are canceled.
- [ ] Node.js 22 and npm cache are used.
- [ ] Workflow timeout is bounded.

## Static validation

- [ ] `npm ci` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test:access-decision` passes.
- [ ] `npm run test:rls-plan` passes.
- [ ] `npm run test:workspace-panel` passes.
- [ ] `npm run test:spatial-b1` passes.
- [ ] `npm run test:spatial-b2a` passes.
- [ ] `npm run test:data-honesty` passes or reports precise reviewed findings.
- [ ] `npm run build` passes.

## Local built-server validation

- [ ] Built application starts on `127.0.0.1:3000`.
- [ ] Readiness wait loop fails clearly if the process exits or times out.
- [ ] `npm run test:api-contract` passes against the built server.
- [ ] `/` returns 200.
- [ ] `/workspace` returns 200.
- [ ] `/projects` returns 200.
- [ ] Seeded analysis print route returns 200.
- [ ] Seeded comparison print route returns 200.
- [ ] Application log is preserved as a workflow artifact.

## Data-honesty validation

- [ ] Scan covers `app`, `components` and `src` source roots.
- [ ] Clear unsupported affirmative claims fail the workflow.
- [ ] Explicit negations, blocked-claim lists and validation requests are treated as reviewed context.
- [ ] Evidence JSON lists rules, files, lines and local context.
- [ ] The required caveat remains present.
- [ ] A green scan is not described as legal, cadastral, zoning, planning or valuation certification.

## Evidence artifact

- [ ] Static check outputs are saved.
- [ ] Exact tested commit and Node/npm versions are saved.
- [ ] Spatial B1 and Spatial B2A JSON evidence is saved.
- [ ] API contract result is saved.
- [ ] Route-smoke result is saved.
- [ ] Data-honesty JSON is saved.
- [ ] Runtime log is saved when available.
- [ ] Artifacts contain no raw env values, credentials, JWTs, cookies or confidential data.
- [ ] Artifact retention is limited.

## Governance validation

- [ ] PR links Confluence AUD-DEV6-001 and REL-EVID-001.
- [ ] PR description states that browser/responsive evidence remains WP-010 unless separately implemented.
- [ ] PR includes the standing caveat.
- [ ] No production-ready, pilot-ready, hard-access or official-data claim is made.
- [ ] Merge remains subject to explicit founder approval.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
