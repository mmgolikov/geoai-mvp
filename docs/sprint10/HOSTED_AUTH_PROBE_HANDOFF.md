# Sprint 10 Hosted Auth Probe Handoff

Status: IMPLEMENTED OFFLINE · ROOT-ONLY LIVE EXECUTION PENDING

## Exact scope

This package adds a root-only acceptance operator for the exact development Supabase project `geoai-dev`, ref `pphdqkurxneyagvnnjdt`, origin `https://pphdqkurxneyagvnnjdt.supabase.co`. It creates exactly two isolated synthetic email/password users with `auth.admin.createUser({ email_confirm: true })`; this API does not send a confirmation email. The synthetic addresses are not claims of email ownership or deliverability. Transactional email remains deferred.

The operator then performs real password sign-in, `getClaims`, `getUser`, authenticated `api.current_profile`, two-persona profile isolation and anonymous `api.current_profile` denial. It invokes no AI, source, product, Storage or broad table endpoint.

No hosted call was executed during implementation. The worker did not read, request or receive any key. This is a root-only executor: only root may inject existing key values in process memory and execute the operator.

## Runtime-only inputs

- `GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN=create-two-synthetic-password-personas`
- `GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF=pphdqkurxneyagvnnjdt`
- `GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL=https://pphdqkurxneyagvnnjdt.supabase.co`
- `GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY`
- `GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY`
- `GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA`
- `GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL=hosted-auth-probe:pphdqkurxneyagvnnjdt:<exact-head>`
- `GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM=disabled` by default

Secrets, generated passwords, access tokens and refresh tokens must remain process-memory-only. Do not place them in arguments, files, shell history, receipts, logs or artifacts. The operator accepts no command-line arguments and emits only sanitized synthetic IDs and boolean/count evidence.

## Optional existing Preview harness seam

Set `GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM=run-existing-real-password-preview-harness` only when root already holds a current exact-Preview receipt and bypass value. The operator calls the existing reviewed `scripts/sprint10-real-password-auth-run.mjs` as a bounded child and supplies the generated persona tuples through its child environment. It does not duplicate that Playwright harness.

The existing runner still requires:

- `GEOAI_E2E_BASE_URL`;
- `GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL`;
- `GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET`;
- `GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH`;
- `GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL`.

The existing runner independently binds the Preview URL, deployment receipt, Vercel protection, exact head and development project. Its output is suppressed by the parent operator so a failing child cannot spill secret-bearing diagnostics. The child receives an explicit environment allowlist; the Admin secret and unrelated root environment values are not propagated.

## Terminal retirement contract

The `finally` path runs for every created user, including partial setup failures:

1. global sign-out of the in-memory user session;
2. rejected refresh-token replay;
3. normal Admin `updateUserById` with a long-duration ban;
4. rejected password sign-in after the ban;
5. denied `api.current_profile` for the retired identity;
6. Admin `getUserById` read-back proving the synthetic user remains present and banned.

No user is hard-deleted. Profile rows and append-only audit history are intentionally preserved. Because the Data API is `api`-only and direct `auth.users` SQL is prohibited, physical profile-row preservation is an architectural consequence of non-deletion rather than a separate broad-table read-back. If any retirement step is unproven, the run exits non-zero with the affected synthetic user ID and a sanitized stage/code receipt; it must not be accepted while credentials have unknown active state.

## Network and data boundary

The operator installs a pre-dispatch network allowlist for only:

- Supabase Auth Admin create/read/update user calls;
- password/refresh/user/JWKS/logout Auth calls;
- `POST /rest/v1/rpc/current_profile`.

Any other origin, method or path fails before dispatch. The operator contains no direct SQL, `auth.users`, trigger bypass, `session_replication_role`, hard deletion, email/OTP/invite flow, AI request, source request or product endpoint.

Root's current physical read-back — 22 migrations, an exact 16-RPC `api` allowlist and real `public`/`private` REST denial — is accepted as upstream evidence and is not reimplemented here.

## Official reference basis

Accessed `2026-09-18`, high confidence:

- Supabase JavaScript `createUser`: <https://supabase.com/docs/reference/javascript/auth-admin-createuser>;
- password sign-in: <https://supabase.com/docs/reference/javascript/auth-signinwithpassword>;
- verified claims and user: <https://supabase.com/docs/reference/javascript/auth-getclaims> and <https://supabase.com/docs/reference/javascript/auth-getuser>;
- global sign-out/session behavior: <https://supabase.com/docs/guides/auth/signout> and <https://supabase.com/docs/guides/auth/sessions>;
- Admin ban/read-back: <https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid>.

The Supabase changelog was read on `2026-09-18`. No current breaking change invalidates these hosted JavaScript Auth calls. Its Node.js 20 deprecation is reflected by the operator's Node.js 22+ preflight.

## Offline verification

Run without keys or network:

```sh
node --check scripts/sprint10-hosted-auth-probe.mjs
node --check scripts/sprint10-hosted-auth-probe-check.mjs
node scripts/sprint10-hosted-auth-probe-check.mjs
```

The offline contract exercises one accepted runtime tuple and negative fixtures for wrong project, origin, opt-in, Git head, key class, CLI arguments, Node version and incomplete Preview seam. It statically rejects email/OTP/invite/reset/delete/direct-SQL/file-write/default-CI wiring.

## Known limitations

- Live hosted behavior remains unverified until root executes the exact committed operator.
- A global sign-out revokes refresh sessions; already issued access JWTs remain cryptographically valid until expiry. The operator additionally requires the banned account to receive no `api.current_profile` row.
- Account retirement uses a long-duration Admin ban rather than deletion. The synthetic Auth users and profiles intentionally remain as audit evidence.
- The probe proves identity/profile isolation only. It creates no organization/project memberships and proves no tenant role, Admin role, Storage, source custody or product repository authorization.
- Transactional email, OTP, email ownership, external providers and customer data are excluded.

Mandatory product caveat: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
