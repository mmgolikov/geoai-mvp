# Sprint 10 Auth-Persona Integration Handoff

Date: 2026-09-18

Worktree: `/private/tmp/geoai-sprint10-personas-integrated`

Branch: `codex/sprint10-personas-integrated-20260918`

Integrated base: `2ca25d2da7b56b1bf935a0388f925db2600136ac`

Carried fixture commit: `262c915` (cherry-pick of old-branch commit `f938a93`)

## Scope and integrated result

This bounded follow-on aligns the auth-persona browser tests with the integrated real SSR page guards. It changes only three existing E2E specs, one test helper, one dedicated Playwright config and this handoff. It does not change application code, Auth runtime, API routes, dependencies or shared Playwright configuration.

The `f938a93` protected-mode 4/4 result was obtained on the OLD BRANCH only. It is historical evidence, not integration acceptance. Its browser-demo transition and guest product-entry assumptions were superseded by the real guards on the integrated base.

The corrected contracts are:

- `demo_public`: full browser product entry remains available. The suite verifies Create A/B persistence and reopen with no extra AI call, Russian draft Back/browser-Back/reload recovery, absence of optional Supabase SDK/session traffic, and Find readiness at startup.
- `supabase_auth`: an anonymous browser cannot enter the protected product page. Navigation is verified against the running server and must redirect to `/login?next=...`; the tests do not intercept protected page markup, forge a session or bypass the guard.
- A mocked anonymous `/api/auth/session` response is explicit: `isAuthenticated:false`, `sessionStatus:"session_missing"`, `user:null`.
- Denied entry must leave the pre-existing local/session storage bytes unchanged and issue no protected workflow request.
- The optional Supabase browser-client chunk failure is exercised at login only; login remains fail-closed and does not offer a browser-demo transition.
- The server boundary is checked independently: anonymous `POST /api/projects` returns `403`, `ok:false` and no project.

No test is skipped. The protected test environment is synthetic and localhost-only; it is not evidence of hosted Supabase Auth, membership or RLS behavior.

## Files in the integrated correction

- `tests/e2e/point-to-object-geocontext-v6.spec.ts`
- `tests/e2e/point-to-object-v5-offline-flow.spec.ts`
- `tests/e2e/sprint07-ux.spec.ts`
- `tests/e2e/helpers/auth-persona.ts`
- `playwright.auth-persona.config.ts`
- `docs/sprint10/AUTH_PERSONA_FIXTURE_HANDOFF.md`

## Exact validation

Runtime: Node.js `24.19.0`; Playwright Chrome channel, headless, one worker; localhost and deterministic local mocks only.

Type check / lint:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run lint
```

Result: PASS.

Exact integrated production build:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run build
```

Result: PASS; Next.js `15.5.25`; 80/80 static pages generated.

Production-build `demo_public` run:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npx next start -H 127.0.0.1 -p 3114

PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  GEOAI_E2E_BASE_URL=http://127.0.0.1:3114 \
  npx playwright test \
    tests/e2e/point-to-object-geocontext-v6.spec.ts \
    tests/e2e/point-to-object-v5-offline-flow.spec.ts \
    tests/e2e/sprint07-ux.spec.ts \
    -g 'auth-persona'
```

Result: 4/4 PASS in 7.5 seconds.

Synthetic protected-mode run:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npx playwright test --config playwright.auth-persona.config.ts
```

Result: 4/4 PASS in 20.0 seconds. The dedicated config starts and automatically stops its own dev server on port `3115`, with `reuseExistingServer:false` and:

- `NEXT_PUBLIC_AUTH_MODE=supabase_auth`
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE=true`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_e2e_only_1234567890`
- `GEOAI_ACCESS_ENFORCEMENT_MODE=hard`
- `GEOAI_ALLOW_DEMO_PUBLIC=false`

The publishable-format value is an explicit synthetic fixture, not a secret or real key. No Supabase service is expected at port `54321`; the suite validates fail-closed anonymous behavior.

## Blockers and boundaries

Root independent review found one test-coverage blocker in `98a7f23`: the conversion to an explicit demo persona had dropped failed-Create-update and market-reset regressions. Root restored those assertions against the correct owner-demo project store: forced 502 preserves last-good B and exact saved project bytes; reload plus explicit project reopen makes no new Create call; Singapore clears the active concept/session without deleting the archived project. The restored case passed in optimized local Chrome (1/1, 4.2 seconds) against application source `c9be8fa`. Final reviewer and combined-browser acceptance are tracked in `S1_INTEGRATION_REVIEW_20260918.md`, not inferred from the earlier 4/4 result.

This correction does not prove a real hosted Supabase login, real membership/RLS enforcement or Production Auth; those require separately authorized hosted personas and evidence.

No paid/provider call, dependency mutation, secret access, push, deployment, Production/main change or Supabase change occurred.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
