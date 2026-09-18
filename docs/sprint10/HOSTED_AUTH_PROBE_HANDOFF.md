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

## Optional combined Auth + paid live-journey seam

The default remains Auth-only. Root may enable the reviewed live journey only before the same fresh personas enter the probe's unconditional retirement `finally`:

- `GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SEAM=run-reviewed-sprint10-live-journey-before-retirement`
- `GEOAI_HOSTED_AUTH_PROBE_LIVE_JOURNEY_SCOPE=journey|dubai-analyse|dubai-find|singapore-create`
- `GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_ROOT=<absolute existing private 0700 directory>`
- `GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_PATH=<absolute existing private 0600 ledger direct child>`
- `GEOAI_HOSTED_AUTH_PROBE_LIVE_EXPECTED_LEDGER_ID=5aa405b3-bbda-48aa-aeea-ca3357be4042`
- `GEOAI_HOSTED_AUTH_PROBE_LIVE_RUN_APPROVAL=paid-live-journey:<ledger-id>:<preview-host>:<exact-head>:<scope>`
- `GEOAI_HOSTED_AUTH_PROBE_ACTIVE_PERSONA_RECEIPT_PATH=<new absolute file in a root-provided private 0700 directory>`

This option requires the existing Preview Auth seam to be enabled first. Runtime validation calls the live runner's exported `validateLiveLedgerPreflight(root,path,scope)` before account creation. That helper uses the canonical strict ledger reader/parser, rejects malformed accounting, extra fields, unresolved receipts and existing cycle/runner leases, and requires exact scope reserve headroom from the shared `RESERVE_USD` caps. It does not initialize, repair, reserve or settle the ledger. The live runner repeats the authoritative preflight and owns its lease, reservations and telemetry settlement immediately before browser execution. Post-run read-only verification uses the separate `validateLiveLedgerPostRun(root,path)` export, which requires a strict fully settled ledger but does not incorrectly require another fresh scope reserve after paid settlement.

Before the first Admin create call, the probe writes an atomic private `0600` `geoai.sprint10.active-persona-checkpoint.v2` checkpoint. It tracks `provisioning|active|retired|retirement_failed` overall state and per-lane `not_attempted|create_dispatched|uuid_known|active|retired|retirement_failed` state. The lane is durably changed to `create_dispatched` before the create call, so that state is a conservative intent/possibly-dispatched recovery marker, not proof that a network dispatch occurred. The deterministic bounded run ID plus lane is the recovery handle while a possibly dispatched create has no known UUID; every directly returned or bounded-recovered UUID is committed immediately before later response-shape or Auth work. The file contains no email, password, key, token, cookie or profile data. It is atomically refreshed through Auth, both browser children and each retirement stage. Persona A must still be an active current-run identity with two in-memory sessions and untouched retirement flags before the paid child. Persona B is never sent to that child. The child may run once only.

The live child receives an explicit environment containing platform runtime basics, the exact Preview/receipt/ledger tuple, protection bypass and persona A email/password/user ID. It never receives the Admin secret, publishable key, persona B, access/refresh tokens, `NODE_OPTIONS`, the probe opt-ins or unrelated parent variables. The child timeout is 810 seconds with `SIGTERM`; stdout/stderr are not forwarded. Accepted paid receipts must be settled and match the exact selected ordered matrix: Analyse `ai/standard` capped at USD 1.2 and Create `create/standard` capped at USD 0.3. PASS/INCONCLUSIVE require the complete matrix; FAIL_CLEANUP permits only an ordered settled prefix for a cleanup that occurred before a later dispatch. Timeout, signal, malformed output and generic child failure become sanitized failure stages.

Every child result returns through the existing persona-retirement `finally`; an unexpected retirement throw is contained per lane so the other lane still retires. The checkpoint is changed to `retired` only after complete evidence or `retirement_failed` otherwise. Root must remove it only after accepting complete retirement; otherwise it retains all known UUIDs and the run-ID/lane recovery handle. No account is deleted, unbanned or reused.

Auth-only execution still emits `geoai.sprint10.hosted-auth-probe-receipt.v2`. Combined execution emits the separate strict schema `geoai.sprint10.hosted-auth-live-journey-receipt.v1`. PASS/INCONCLUSIVE include full observed Auth counts and aggregate retirement only after both are proven. FAIL/FAIL_ACTION_REQUIRED instead include exact observed stage booleans and per-lane terminal evidence; they never fill intended happy-path constants. `observed.createAttemptsMarked` counts durable pre-call intent markers and deliberately does not claim actual network dispatch. Per-lane `lifecycleState` is the in-memory terminal cleanup result; the retained checkpoint remains the only durable recovery state and may be earlier if its final atomic write failed. FAIL_ACTION_REQUIRED additionally includes sanitized cleanup failures. Combined exit codes are 0 PASS, 2 INCONCLUSIVE, and 1 FAIL/FAIL_ACTION_REQUIRED.

## Terminal retirement contract

The `finally` path runs for every known or exactly recovered created user, including partial setup failures. A valid returned UUID is stored before later response-shape checks. If a create response is missing, lost or ambiguous, the operator performs a bounded two-read Admin recovery sequence using only the exact unique synthetic email with `filter`, `page=1` and `per_page=2`: one immediate read and one fixed delayed read after 750 ms. It never retries account creation. A non-matching or broad result fails closed. Two empty reads do not prove absence after an ambiguous dispatch; the final `FAIL_ACTION_REQUIRED` receipt retains the exact synthetic identity for bounded manual recovery. The retirement stages are independent best-effort operations: a thrown revoke, refresh, password or RPC operation does not prevent the Admin ban and final read-back.

1. raw `POST /auth/v1/logout?scope=global` with an accepted HTTP 200/204 server response (SDK-local success is not accepted as proof);
2. rejected replay of both independently issued refresh tokens, accepting only the narrow revoked/missing-session code/status allowlist;
3. normal Admin `updateUserById` with a long-duration ban;
4. rejected password sign-in after the ban with exact `user_banned` / HTTP 400 evidence;
5. successful HTTP 200 `api.current_profile` returning exactly `[]` for the stale pre-ban JWT;
6. Admin `getUserById` read-back proving the synthetic user remains present and `banned_until` is a valid future timestamp.

Timeout, DNS/network failure, status 0, HTTP 429, HTTP 5xx and unknown/unallowlisted error codes never count as denial evidence. No user is hard-deleted. Profile rows and append-only audit history are intentionally preserved. Because the Data API is `api`-only and direct Auth-schema SQL is prohibited, physical profile-row preservation is an architectural consequence of non-deletion rather than a separate broad-table read-back. If any retirement step is unproven, the run exits non-zero with every known synthetic user UUID and sanitized stage/code evidence. For an unresolved ambiguous create, the Auth-only v2 diagnostic retains its existing exact synthetic identity; combined mode keeps email out of output and instead preserves the private checkpoint's bounded run-ID/lane recovery handle. Such a run must not be accepted while credential state is unknown.

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
node --check scripts/sprint10-hosted-auth-live-check.mjs
node --check scripts/sprint10-live-journey-run.mjs
node scripts/sprint10-hosted-auth-probe-check.mjs
node scripts/sprint10-hosted-auth-live-check.mjs
node scripts/sprint10-live-journey-runner-offline-check.mjs
```

The offline contract exercises one accepted runtime tuple and negative fixtures for wrong project, origin, opt-in, Git head, key class, CLI arguments, Node version and incomplete Preview seam. Its injected-fetch and fault matrix behaviorally verifies exact request dispatch, redirect rejection, response-lost recovery after an initially empty read, persistently empty ambiguous outcomes, retention of the exact synthetic recovery identity, no blind create retry, transient/429/5xx/unknown denial rejection, exact anonymous denial, successful-empty stale-JWT evidence, raw logout status handling, future-ban read-back, immediate partial-create ID retention, secret-free Git child environments and continuation through every retirement-stage throw. It also statically rejects email/OTP/invite/reset/delete/direct-SQL/default-CI wiring and permits file writes only inside the approved atomic checkpoint function.

The dedicated combined-seam matrix additionally verifies Auth-only mode never reads the live ledger; exact live opt-in/approval/scope/Preview/ledger gates; persona freshness and one-child enforcement; absence of Admin/persona-B/token/`NODE_OPTIONS` data in the child environment; exact route/depth/cap and settled-only receipt parsing; full versus cleanup-prefix matrices; timeout and malformed-output failure; checkpoint secret exclusion; integrated PASS/INCONCLUSIVE execution; and 28 injected lifecycle faults from initial checkpoint through both create intents, an ambiguous create-call return before UUID capture, both UUID captures, both authentications, both browser children, every retirement stage, an unexpected retirement throw, a failed second checkpoint write before any create call, and a failed terminal checkpoint write after cleanup. Each fixture asserts one receipt/exit, no per-lane create replay, truthful intent counts, continued retirement of the other lane and recoverable last-durable checkpoint state. The runner matrix separately verifies the canonical ledger parser, malformed accounting/extra fields, unresolved receipts, every scope's headroom boundary, regular and dangling-link stale leases, race-after-preflight refusal and post-run validation without fresh-reserve demand.

Corrective-tree verification on Node.js `24.19.0`: operator/check syntax PASS; behavioral offline matrix PASS; TypeScript PASS; production build PASS with 80/80 routes; request-scoped project, source connector, AOI, canonical migration chain, identity authorization, Auth/Admin lifecycle, Data API operator, existing real-password harness and secret-hygiene contracts PASS. Production dependency audit reports zero vulnerabilities. The full development-dependency audit reports 21 current transitive findings (1 low, 18 moderate, 2 high) in the development toolchain, including Lighthouse transitive packages, while `package.json` and `package-lock.json` remain unchanged; this bounded corrective package does not apply the suggested out-of-range/force upgrade. That supply-chain result must remain an explicit separate review item and is not a hosted-Auth code failure.

## Known limitations

- Live hosted behavior remains unverified until root executes the exact committed operator.
- A confirmed server-global logout revokes refresh sessions; already issued access JWTs remain cryptographically valid until expiry. The operator therefore also requires the banned account's stale JWT to receive a successful, exact empty `api.current_profile` result.
- Account retirement uses a long-duration Admin ban rather than deletion. The synthetic Auth users and profiles intentionally remain as audit evidence.
- The probe proves identity/profile isolation only. It creates no organization/project memberships and proves no tenant role, Admin role, Storage, source custody or product repository authorization.
- The combined journey proves only the current identity-guarded source/Analyse/Find/Create flow and browser-local save/reopen. It does not claim cloud persistence. `analysis-runs` and cloud project-artifact APIs require separate organization/project membership evidence.
- The checkpoint begins before the first create call. Before each call it stores run ID, lane and `create_dispatched`; this is a conservative intent/possibly-dispatched marker, not proof of network dispatch. If the create response is lost, root must use that bounded handle for exact containment and must not claim UUID evidence that is absent.
- Transactional email, OTP, email ownership, external providers and customer data are excluded.

Mandatory product caveat: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
