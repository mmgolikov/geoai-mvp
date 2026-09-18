# Sprint 10 real password Auth test handoff

Status: **offline harness hardened after independent NO-GO review; live execution not performed**

Scope: existing synthetic users only; exact protected Preview; exact development Supabase project

Target Supabase project: `geoai-dev`, ref `pphdqkurxneyagvnnjdt`

Authority: founder-approved S2 test-harness implementation; root retains the database, hosted-test and paid-budget gates

## Outcome and evidence boundary

`tests/e2e/sprint10-real-password-auth.spec.ts` is a deliberately opt-in Playwright harness for a later trusted-terminal acceptance run. It signs in through the rendered password form with credentials supplied only at runtime. It does not create users, send an email or OTP, reset or change a password, invite an account, mutate a profile, call a paid AI provider, request an external spatial source, write a storage state file or retain a credential-bearing trace, screenshot or video.

No live test was executed for this change. This handoff is not evidence that hosted password Auth, a real persona, transactional email, project authorization or tenant isolation works.

The candidate was corrected after independent review of `917ce0c76d98c69df6b25b91f869584529da35f4`. The reviewed P1/P2 findings are closed in the harness design, subject to later exact-deployment execution evidence:

- all HTTP(S) browser traffic now passes through one pre-dispatch route; an unexpected application mutation, non-allowlisted Supabase Auth operation or external origin is aborted before dispatch and is also counted for final evidence;
- Supabase browser traffic is restricted to password/refresh token grants, user read, logout and the corresponding exact CORS preflight paths; signup, OTP, invitation, recovery, email/profile/password mutation and non-Auth paths are not allowlisted;
- default Playwright discovery remains skipped, while an explicit live opt-in without the dedicated runner or with incomplete selected-scope configuration fails closed;
- the dedicated runner requires the exact expected passed count, zero skipped, zero failed and zero flaky tests for `primary` or `primary_and_secondary` scope;
- before any password entry, the spec validates a current root-owned exact-deployment receipt and anonymously requests the same `/api/health` URL without a bypass header and with redirect following disabled; only the exact Vercel SSO target `https://vercel.com/sso-api` is accepted.

## Runtime variables

The trusted operator must inject these variables without printing or persisting their values:

- `GEOAI_E2E_BASE_URL`
- `GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL`
- `GEOAI_REAL_PASSWORD_AUTH_EXPECTED_COMMIT_SHA`
- `GEOAI_REAL_PASSWORD_AUTH_SUPABASE_PROJECT_REF`
- `GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET`
- `GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL`
- `GEOAI_REAL_PASSWORD_AUTH_EXPLICIT_RUN` — exact value `existing-password-only-live-acceptance`
- `GEOAI_REAL_PASSWORD_AUTH_SCOPE` — `primary` or `primary_and_secondary`
- `GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH` — absolute path to the current root-owned JSON receipt described below
- `GEOAI_REAL_PASSWORD_AUTH_PRIMARY_EMAIL`
- `GEOAI_REAL_PASSWORD_AUTH_PRIMARY_PASSWORD`
- `GEOAI_REAL_PASSWORD_AUTH_PRIMARY_USER_ID`

Optional second-persona browser-cookie isolation variables; provide all three or none:

- `GEOAI_REAL_PASSWORD_AUTH_SECONDARY_EMAIL`
- `GEOAI_REAL_PASSWORD_AUTH_SECONDARY_PASSWORD`
- `GEOAI_REAL_PASSWORD_AUTH_SECONDARY_USER_ID`

The two URL variables must resolve to the same exact HTTPS `*.vercel.app` origin. The expected SHA must be the exact 40-character commit served by that Preview. The project ref must be the approved development ref. The run-approval value uses `existing-password-only:<project-ref>:<preview-host>:<expected-commit-sha>` so a copied approval for another host or commit fails closed. Known Production hosts, including the repository-authoritative immutable Production host, are denied before credentials are used.

`primary` scope requires exactly the primary persona and rejects supplied secondary credentials. `primary_and_secondary` requires all three secondary values and distinct email/UUID identities. Partial persona configuration cannot become a skipped green acceptance receipt.

## Root exact-deployment receipt prerequisite

Root must create a non-secret, short-lived JSON receipt only after independently confirming the exact protected deployment. The harness accepts this schema and exact values:

```json
{
  "schemaVersion": "geoai.sprint10.real-password-preview-receipt.v1",
  "verifiedAt": "ISO-8601 timestamp not in the future",
  "expiresAt": "ISO-8601 timestamp later than the run",
  "deployment": {
    "id": "dpl_exactVercelDeploymentId",
    "url": "https://exact-preview-host.vercel.app",
    "state": "READY",
    "target": "preview",
    "commitSha": "exact 40-character candidate SHA"
  },
  "protection": {
    "kind": "vercel_sso",
    "anonymousStatus": 302,
    "locationOrigin": "https://vercel.com",
    "locationPath": "/sso-api"
  }
}
```

The receipt path is runtime-only and must be absolute. The runner and spec independently bind it to the injected Preview URL and commit. The live spec then repeats the anonymous no-follow protection challenge against the same origin before installing the bypass-bearing browser route or entering credentials. The receipt is a prerequisite, not a substitute for that fresh challenge.

## Preconditions owned by root

Run only after all of the following are true:

1. The database gate for `geoai-dev` is complete and explicitly recorded.
2. Root has produced an unexpired exact-deployment receipt for a READY protected Preview, exact non-Production target, commit, hostname and anonymous Vercel SSO challenge. With the approved runtime-only bypass, `/api/health` must expose `environment: vercel_preview`, the expected commit and its exact deployment hostname.
3. The primary account already exists, is non-anonymous and has an active application profile. The harness must not create or repair it.
4. If the second test is required, the secondary account independently satisfies the same conditions and has a different expected UUID.
5. Credentials and the Preview protection bypass are injected from the trusted terminal or an approved secret manager. Do not paste them into docs, shell history, CI output, screenshots or task comments.

## Offline and later live commands

Offline static preflight, safe to run without credentials or network:

```text
node scripts/sprint10-real-password-auth-check.mjs
```

After root approves the hosted run and injects every required runtime value, use only the bounded runner:

```text
node scripts/sprint10-real-password-auth-run.mjs
```

Direct `npx playwright test tests/e2e/sprint10-real-password-auth.spec.ts` is not an accepted evidence command. Default discovery skips the live suite; setting the explicit opt-in without the runner fails. Do not add the runner or live harness to a default package script, CI workflow or unattended schedule.

## Offline correction evidence

No target, Supabase, Auth, email, provider or other external request was made. The corrected harness passed:

- `node scripts/sprint10-real-password-auth-check.mjs`;
- `npm run lint`;
- `npm run build`;
- `npm run test:auth-session-e2e-contract`;
- `npm run test:auth-mutation-origin`;
- `npm run test:auth-signout-state`;
- `npm run test:api-access-guards`;
- `npm run test:data-honesty` (`445` files, zero findings).

Offline negative controls also passed: default Playwright discovery registered one skipped test and dispatched no live work; the runner with no configuration failed at the explicit-opt-in preflight; the runner with only explicit scope failed on the first missing target field; a complete synthetic configuration with an expired local receipt failed before Playwright/network dispatch; and a direct explicit Playwright invocation failed before test execution because the bounded runner attestation was absent. These negative controls are safety evidence only, not hosted Auth acceptance.

## Acceptance sequence

The primary test performs the following bounded sequence:

1. Revalidates the root-owned receipt, then anonymously calls the exact Preview `/api/health` with `redirect: manual`, no bypass header and no credentials. It requires the receipt status and the exact `https://vercel.com/sso-api` challenge target.
2. Installs one browser request policy. It adds the Preview bypass header only to allowed requests for the exact approved Preview origin and aborts every forbidden request before dispatch.
3. Allows only safe Preview reads and exact `POST /api/auth/logout`; allows only existing-password/refresh token, user-read and logout Supabase Auth operations; blocks every other HTTP(S) origin and mutation before dispatch.
4. Reads bypassed `/api/health` before password entry and rejects non-Preview environments, wrong commits, wrong deployment hosts and known Production hosts.
5. Uses the rendered email/password form for one existing user. It never exercises magic-link, OTP or registration paths.
6. Verifies `/profile` is server-guarded, `/api/auth/session` is private/no-store, the session is a non-demo permanent Supabase identity, and both safe identity projections match the injected expected UUID.
7. Calls only `GET /api/prototype/point-to-object/ai`. A `200 ready` result or `403 AI_RUNTIME_DISABLED` proves the identity passed before the runtime gate. The harness never sends the corresponding POST, never exposes the returned challenge and never invokes the provider or source pipeline.
8. Reloads `/profile` and verifies the same SSR identity continues from cookies.
9. Logs out, verifies the SSR session is anonymous, verifies the guarded API returns `401 authentication_required`, and verifies direct navigation to `/profile` redirects to sign-in.
10. Preserves exact bytes in a synthetic browser-local project-store sentinel across login, reload and logout, and clears only that sentinel during teardown.

The runner accepts the result only when the selected scope reports its exact expected count (`1` for primary, `2` for primary plus isolation), zero skipped tests, zero failures and zero flaky tests. It emits only aggregate counts and never prints credentials, the bypass value or persona identifiers.

If all secondary variables are supplied, a separate test opens two isolated browser contexts, verifies each exact identity, logs out the first and proves the second remains authenticated. This is browser-cookie isolation evidence only.

## Unresolved product gates

- Project membership authorization remains unproven and is explicitly reported as disabled by the current session contract. The harness therefore does not pretend to prove cross-project RLS, object visibility or IDOR resistance. A later two-user resource fixture must be added only after the application exposes an approved membership-backed contract.
- Existing synthetic accounts, active profiles and exact UUIDs must be provisioned and checked outside this harness under the database authority. No account lifecycle action is authorized here.
- The protected Preview bypass secret and exact deployment URL are required for an unattended Playwright browser. Their values remain outside the repository.
- Root must supply a current exact-deployment receipt. This candidate does not create that receipt or assert that a qualifying Preview currently exists.
- Transactional email is deferred and is neither executed nor claimed.
- This is a test harness, not activation or release evidence. Preview is not Production.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
