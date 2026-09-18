# Sprint 10 real password Auth test handoff

Status: **offline harness implemented; live execution not performed**

Scope: existing synthetic users only; exact protected Preview; exact development Supabase project

Target Supabase project: `geoai-dev`, ref `pphdqkurxneyagvnnjdt`

Authority: founder-approved S2 test-harness implementation; root retains the database, hosted-test and paid-budget gates

## Outcome and evidence boundary

`tests/e2e/sprint10-real-password-auth.spec.ts` is a deliberately opt-in Playwright harness for a later trusted-terminal acceptance run. It signs in through the rendered password form with credentials supplied only at runtime. It does not create users, send an email or OTP, reset or change a password, invite an account, mutate a profile, call a paid AI provider, request an external spatial source, write a storage state file or retain a credential-bearing trace, screenshot or video.

No live test was executed for this change. This handoff is not evidence that hosted password Auth, a real persona, transactional email, project authorization or tenant isolation works.

## Runtime variables

The trusted operator must inject these variables without printing or persisting their values:

- `GEOAI_E2E_BASE_URL`
- `GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL`
- `GEOAI_REAL_PASSWORD_AUTH_EXPECTED_COMMIT_SHA`
- `GEOAI_REAL_PASSWORD_AUTH_SUPABASE_PROJECT_REF`
- `GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET`
- `GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL`
- `GEOAI_REAL_PASSWORD_AUTH_PRIMARY_EMAIL`
- `GEOAI_REAL_PASSWORD_AUTH_PRIMARY_PASSWORD`
- `GEOAI_REAL_PASSWORD_AUTH_PRIMARY_USER_ID`

Optional second-persona browser-cookie isolation variables; provide all three or none:

- `GEOAI_REAL_PASSWORD_AUTH_SECONDARY_EMAIL`
- `GEOAI_REAL_PASSWORD_AUTH_SECONDARY_PASSWORD`
- `GEOAI_REAL_PASSWORD_AUTH_SECONDARY_USER_ID`

The two URL variables must resolve to the same exact HTTPS `*.vercel.app` origin. The expected SHA must be the exact 40-character commit served by that Preview. The project ref must be the approved development ref. The run-approval value uses `existing-password-only:<project-ref>:<preview-host>:<expected-commit-sha>` so a copied approval for another host or commit fails closed. Known Production hosts are denied before credentials are used.

## Preconditions owned by root

Run only after all of the following are true:

1. The database gate for `geoai-dev` is complete and explicitly recorded.
2. The protected Preview is READY and `/api/health` exposes `environment: vercel_preview`, the expected commit and its exact deployment hostname.
3. The primary account already exists, is non-anonymous and has an active application profile. The harness must not create or repair it.
4. If the second test is required, the secondary account independently satisfies the same conditions and has a different expected UUID.
5. Credentials and the Preview protection bypass are injected from the trusted terminal or an approved secret manager. Do not paste them into docs, shell history, CI output, screenshots or task comments.

## Offline and later live commands

Offline static preflight, safe to run without credentials or network:

```text
node scripts/sprint10-real-password-auth-check.mjs
```

After root approves the hosted run and injects every required runtime value:

```text
npx playwright test tests/e2e/sprint10-real-password-auth.spec.ts
```

Do not add this live harness to a default package script, CI workflow or unattended schedule.

## Acceptance sequence

The primary test performs the following bounded sequence:

1. Adds the Preview bypass header only to requests for the exact approved Preview origin. Requests to Supabase Auth are not intercepted or mocked.
2. Blocks every other HTTP(S) browser origin, observes application methods and fails if any application mutation other than logout occurs.
3. Reads `/api/health` before password entry and rejects non-Preview environments, wrong commits, wrong deployment hosts and known Production hosts.
4. Uses the rendered email/password form for one existing user. It never exercises magic-link, OTP or registration paths.
5. Verifies `/profile` is server-guarded, `/api/auth/session` is private/no-store, the session is a non-demo permanent Supabase identity, and both safe identity projections match the injected expected UUID.
6. Calls only `GET /api/prototype/point-to-object/ai`. A `200 ready` result or `403 AI_RUNTIME_DISABLED` proves the identity passed before the runtime gate. The harness never sends the corresponding POST, never exposes the returned challenge and never invokes the provider or source pipeline.
7. Reloads `/profile` and verifies the same SSR identity continues from cookies.
8. Logs out, verifies the SSR session is anonymous, verifies the guarded API returns `401 authentication_required`, and verifies direct navigation to `/profile` redirects to sign-in.
9. Preserves exact bytes in a synthetic browser-local project-store sentinel across login, reload and logout, and clears only that sentinel during teardown.

If all secondary variables are supplied, a separate test opens two isolated browser contexts, verifies each exact identity, logs out the first and proves the second remains authenticated. This is browser-cookie isolation evidence only.

## Unresolved product gates

- Project membership authorization remains unproven and is explicitly reported as disabled by the current session contract. The harness therefore does not pretend to prove cross-project RLS, object visibility or IDOR resistance. A later two-user resource fixture must be added only after the application exposes an approved membership-backed contract.
- Existing synthetic accounts, active profiles and exact UUIDs must be provisioned and checked outside this harness under the database authority. No account lifecycle action is authorized here.
- The protected Preview bypass secret and exact deployment URL are required for an unattended Playwright browser. Their values remain outside the repository.
- Transactional email is deferred and is neither executed nor claimed.
- This is a test harness, not activation or release evidence. Preview is not Production.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
