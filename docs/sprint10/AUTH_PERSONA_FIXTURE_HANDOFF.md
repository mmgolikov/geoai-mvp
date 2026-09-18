# Sprint 10 Auth-Persona Fixture Handoff

Date: 2026-09-18

Worktree: `/private/tmp/geoai-sprint10-analysis`

Branch: `codex/sprint10-analysis-20260918`

Parent before this fixture correction: `39b601c6fc15b7b80e2c98760b1632c21cf204bd`

## Scope and result

This bounded correction makes four existing browser contracts declare and exercise the auth environment they actually require. It changes tests, one test helper and one dedicated Playwright config only; no product, Auth runtime, API route, dependency or shared config is changed.

- `demo_public` is an authenticated synthetic demo persona. Create results are restored through its browser-local Projects artifact, and the test verifies that no anonymous Create session is written.
- `supabase_auth` uses a synthetic localhost URL and a fake publishable-format value. The browser remains server-verified anonymous, guest Create state stays in session storage, and the explicit mock-demo transition is exercised through the product UI rather than by seeding local storage.
- The protected anonymous server boundary is checked separately: `POST /api/projects` returns `403`, `ok:false` and no project. The middleware may intentionally sanitize the response, so the test does not require route-internal access fields that are not part of the observed boundary payload.
- The optional Supabase browser-client chunk failure path is exercised only in `supabase_auth`; `demo_public` correctly makes no Supabase chunk or session request.
- Find startup is blocked until account resolution only in `supabase_auth`; `demo_public` is resolved at startup and may search immediately.

No test is skipped. Persona-specific branches assert different, real product contracts rather than bypassing Auth guards.

## Files in the correction commit

- `tests/e2e/point-to-object-geocontext-v6.spec.ts`
- `tests/e2e/point-to-object-v5-offline-flow.spec.ts`
- `tests/e2e/sprint07-ux.spec.ts`
- `tests/e2e/helpers/auth-persona.ts`
- `playwright.auth-persona.config.ts`
- `docs/sprint10/AUTH_PERSONA_FIXTURE_HANDOFF.md`

## Exact validation

Runtime: Node.js `24.19.0`; Chrome channel, headless, one worker; localhost and deterministic local mocks only.

Type check:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npx tsc --noEmit --pretty false
```

Result: PASS.

Default `demo_public` run:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  PORT=3112 npm run dev

PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  GEOAI_E2E_BASE_URL=http://127.0.0.1:3112 \
  npx playwright test \
    tests/e2e/point-to-object-geocontext-v6.spec.ts \
    tests/e2e/point-to-object-v5-offline-flow.spec.ts \
    tests/e2e/sprint07-ux.spec.ts \
    -g 'auth-persona'
```

Result: 4/4 PASS in 15.3 seconds.

Synthetic `supabase_auth` run:

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npx playwright test --config playwright.auth-persona.config.ts
```

Result: 4/4 PASS in 52.9 seconds. The dedicated config starts its own server with:

- `NEXT_PUBLIC_AUTH_MODE=supabase_auth`
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE=true`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_e2e_only_1234567890`

The value is an explicit synthetic test fixture, not a secret or real Supabase key. No service is expected at port `54321`; tests mock the authoritative session boundary and fail closed.

## Blockers and boundaries

No blocker remains for this bounded persona-fixture correction. This is not proof of a real hosted Supabase login, real membership/RLS, or Production Auth. Those require separately authorized hosted personas and integration evidence.

No paid/provider call, dependency mutation, secret access, push, deployment, Production/main change or Supabase change occurred.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
