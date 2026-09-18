# Sprint 10 Hosted Auth Probe Handoff

Status: CORRECTED OFFLINE · INDEPENDENT GO RE-REVIEW REQUIRED · ROOT LIVE EXECUTION BLOCKED

## Exact scope

This package adds a root-only acceptance operator for the exact development Supabase project `geoai-dev`, ref `pphdqkurxneyagvnnjdt`, origin `https://pphdqkurxneyagvnnjdt.supabase.co`. It creates exactly two isolated synthetic email/password users with `auth.admin.createUser({ email_confirm: true })`; this API does not send a confirmation email. The synthetic addresses are not claims of email ownership or deliverability. Transactional email remains deferred. Each persona establishes two independent refresh sessions so server-global revocation is tested across more than the initiating session.

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

Secrets, generated passwords, access tokens and refresh tokens must remain process-memory-only. Do not place them in arguments, files, shell history, receipts, logs or artifacts. The operator accepts no command-line arguments and emits only sanitized synthetic IDs and boolean/count evidence. Both Git preflight subprocesses receive a minimal explicit environment with global/system Git configuration disabled and `core.fsmonitor=false`; probe keys, Preview bypass values and unrelated runtime variables are not inherited.

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

The `finally` path runs for every known or exactly recovered created user, including partial setup failures. A valid returned UUID is stored before later response-shape checks. If a create response is missing, lost or ambiguous, the operator performs a bounded two-read Admin recovery sequence using only the exact unique synthetic email with `filter`, `page=1` and `per_page=2`: one immediate read and one fixed delayed read after 750 ms. It never retries account creation. A non-matching or broad result fails closed. Two empty reads do not prove absence after an ambiguous dispatch; the final `FAIL_ACTION_REQUIRED` receipt retains the exact synthetic identity for bounded manual recovery. The retirement stages are independent best-effort operations: a thrown revoke, refresh, password or RPC operation does not prevent the Admin ban and final read-back.

1. raw `POST /auth/v1/logout?scope=global` with an accepted HTTP 200/204 server response (SDK-local success is not accepted as proof);
2. rejected replay of both independently issued refresh tokens, accepting only the narrow revoked/missing-session code/status allowlist;
3. normal Admin `updateUserById` with a long-duration ban;
4. rejected password sign-in after the ban with exact `user_banned` / HTTP 400 evidence;
5. successful HTTP 200 `api.current_profile` returning exactly `[]` for the stale pre-ban JWT;
6. Admin `getUserById` read-back proving the synthetic user remains present and `banned_until` is a valid future timestamp.

Timeout, DNS/network failure, status 0, HTTP 429, HTTP 5xx and unknown/unallowlisted error codes never count as denial evidence. No user is hard-deleted. Profile rows and append-only audit history are intentionally preserved. Because the Data API is `api`-only and direct Auth-schema SQL is prohibited, physical profile-row preservation is an architectural consequence of non-deletion rather than a separate broad-table read-back. If any retirement step is unproven, the run exits non-zero with the affected synthetic user ID and a sanitized stage/code receipt. If an ambiguous create cannot be read back, `FAIL_ACTION_REQUIRED` includes only its unique synthetic address so root can identify the exact possible account; such a run must not be accepted while credential state is unknown.

## Network and data boundary

The operator installs a pre-dispatch network allowlist for exact origin, method, path, query and JSON-body shapes only:

- Supabase Auth Admin synthetic create, UUID read/update and bounded exact-email recovery calls;
- password/refresh/user/JWKS calls and raw server-global logout;
- `POST /rest/v1/rpc/current_profile`.

Redirect following is disabled (`redirect: error`). Any other origin, method, path, query or body fails before dispatch. The operator contains no direct SQL, Auth-schema table query, trigger bypass, `session_replication_role`, hard deletion, email/OTP/invite flow, AI request, source request or product endpoint.

Root's current physical read-back — 22 migrations, an exact 16-RPC `api` allowlist and real `public`/`private` REST denial — is accepted as upstream evidence and is not reimplemented here.

## Official reference basis

Accessed `2026-09-18`, high confidence:

- Supabase JavaScript `createUser`: <https://supabase.com/docs/reference/javascript/auth-admin-createuser>;
- password sign-in: <https://supabase.com/docs/reference/javascript/auth-signinwithpassword>;
- verified claims and user: <https://supabase.com/docs/reference/javascript/auth-getclaims> and <https://supabase.com/docs/reference/javascript/auth-getuser>;
- global sign-out/session behavior: <https://supabase.com/docs/guides/auth/signout> and <https://supabase.com/docs/guides/auth/sessions>;
- Admin ban/read-back: <https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid>;
- bounded Admin-user `filter` implementation used only for ambiguous-create recovery: <https://github.com/supabase/auth/blob/master/internal/api/admin.go>.

The Supabase changelog was read on `2026-09-18`. No current breaking change invalidates these hosted JavaScript Auth calls. Its Node.js 20 deprecation is reflected by the operator's Node.js 22+ preflight.

## Offline verification

Run without keys or network:

```sh
node --check scripts/sprint10-hosted-auth-probe.mjs
node --check scripts/sprint10-hosted-auth-probe-check.mjs
node scripts/sprint10-hosted-auth-probe-check.mjs
```

The offline contract exercises one accepted runtime tuple and negative fixtures for wrong project, origin, opt-in, Git head, key class, CLI arguments, Node version and incomplete Preview seam. Its injected-fetch and fault matrix behaviorally verifies exact request dispatch, redirect rejection, response-lost recovery after an initially empty read, persistently empty ambiguous outcomes, retention of the exact synthetic recovery identity, no blind create retry, transient/429/5xx/unknown denial rejection, exact anonymous denial, successful-empty stale-JWT evidence, raw logout status handling, future-ban read-back, immediate partial-create ID retention, secret-free Git child environments and continuation through every retirement-stage throw. It also statically rejects email/OTP/invite/reset/delete/direct-SQL/file-write/default-CI wiring.

Corrective-tree verification on Node.js `24.19.0`: operator/check syntax PASS; behavioral offline matrix PASS; TypeScript PASS; production build PASS with 80/80 routes; request-scoped project, source connector, AOI, canonical migration chain, identity authorization, Auth/Admin lifecycle, Data API operator, existing real-password harness and secret-hygiene contracts PASS. Production dependency audit reports zero vulnerabilities. The full development-dependency audit reports 21 current transitive findings (1 low, 18 moderate, 2 high) in the development toolchain, including Lighthouse transitive packages, while `package.json` and `package-lock.json` remain unchanged; this bounded three-file package does not apply the suggested out-of-range/force upgrade. That supply-chain result must remain an explicit separate review item and is not a hosted-Auth code failure.

## Known limitations

- Live hosted behavior remains unverified until root executes the exact committed operator.
- A confirmed server-global logout revokes refresh sessions; already issued access JWTs remain cryptographically valid until expiry. The operator therefore also requires the banned account's stale JWT to receive a successful, exact empty `api.current_profile` result.
- Account retirement uses a long-duration Admin ban rather than deletion. The synthetic Auth users and profiles intentionally remain as audit evidence.
- The probe proves identity/profile isolation only. It creates no organization/project memberships and proves no tenant role, Admin role, Storage, source custody or product repository authorization.
- Transactional email, OTP, email ownership, external providers and customer data are excluded.

Mandatory product caveat: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
