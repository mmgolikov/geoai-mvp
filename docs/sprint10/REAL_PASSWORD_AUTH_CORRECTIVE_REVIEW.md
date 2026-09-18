# Sprint 10 Real Password Auth Harness Corrective Review

Status: read-only corrective review complete  
Date: 2026-09-18  
Decision: **GO for root integration at the exact reviewed SHA; NOT AUTHORIZED for LIVE execution**

## Exact candidate reviewed

- Repository: `/private/tmp/geoai-sprint10-real-auth-tests-20260918`
- Branch: `codex/sprint10-real-auth-tests-20260918`
- Initial harness: `917ce0c76d98c69df6b25b91f869584529da35f4`
- Hardening correction: `35be9254b8a0bb19c1c936de155ca1a3b4740084`
- Reviewed HEAD: `2ad1d9ea123e2c47224918cee5f93766a3824181`
- The four reviewed paths had no tracked or staged worktree delta from that HEAD. One unrelated untracked file, `docs/sprint10/STATIC_CONTRACT_REVIEW.md`, was present and was neither reviewed nor changed.

Reviewed file SHA-256 values:

- `b3197aab10bd954f2ecd902d453680c617688e8ace3713e8cd869622ed52d109` — `tests/e2e/sprint10-real-password-auth.spec.ts`
- `617967e818eade685198f80f0e44d0041aee38e782348f4e23d99df9a9a8c8ad` — `scripts/sprint10-real-password-auth-run.mjs`
- `3b6868a77b856307b9a750ef9234b8b860cc7ec0ff0a8bd17f3e515effe9ef31` — `scripts/sprint10-real-password-auth-check.mjs`
- `1f974732d7bf175b4e4e6be06cdedb1ba8e402c38c86399be3180a9d0e152464` — `docs/sprint10/REAL_PASSWORD_AUTH_TEST_HANDOFF.md`

## Integration findings

No blocking finding remains for integration of this test harness.

1. **Forbidden browser mutations are stopped before dispatch.** One `page.route("**/*")` policy is installed before credential entry. For the Preview origin it continues only allowlisted `GET`/`HEAD` reads and exact `POST /api/auth/logout`; other application requests are counted and aborted. For the exact development Auth origin it continues only password/refresh token grants, user read, logout, and their bounded CORS preflights; all other Supabase and external HTTP(S) requests are counted and aborted. The final counters remain secondary evidence rather than the safety boundary. The prior post-dispatch P1 is closed.

2. **Explicit opt-in and partial configuration fail closed.** Live collection requires the exact `existing-password-only-live-acceptance` opt-in, the dedicated runner attestation, an explicit scope, every target field, the complete primary tuple and either all or none of the secondary tuple. `primary` rejects unused secondary credentials; `primary_and_secondary` requires distinct complete identities. A direct explicit Playwright invocation fails without the runner; default discovery is skipped and is not an accepted receipt. The prior skipped-green P1 is closed.

3. **The target is exact and non-Production.** Both spec and runner pin development ref `pphdqkurxneyagvnnjdt`, reject the current known Production hosts including `geoai-a71p4fxnr-geoaidev.vercel.app`, bind approval to one Preview hostname and 40-character commit, and require the base URL to equal that exact HTTPS Vercel origin.

4. **Protected Preview evidence is required before password entry.** Runner and spec independently validate an unexpired root-owned receipt bound to an exact deployment ID, URL, `READY` state, `preview` target and commit. The live spec then performs a fresh credential-free, no-follow anonymous request without the bypass header and accepts only the receipt status plus exact `https://vercel.com/sso-api` challenge. The bypassed health check separately requires `vercel_preview`, the exact commit and exact deployment host. The prior protected-Preview P2 is closed as a harness prerequisite and live recheck.

5. **Receipt cardinality is bounded.** The runner generates a temporary configuration containing one explicitly selected Playwright project, performs `--list` discovery, requires exactly one primary test or two selected-scope tests, and accepts the live JSON report only when the same count is expected/passed with `skipped=0`, `unexpected=0`, `flaky=0`, exit status zero and no discovery errors.

6. **Credential-bearing failure material is not emitted or retained by the bounded runner.** Trace, screenshot and video are off; browser storage state is not written; the JSON reporter output and stderr stay captured in the parent process and are not echoed; errors emitted by the runner contain setting names or aggregate counts, not values; `preserveOutput: "never"` is set; credential-bearing pages/contexts are closed in cleanup; and the complete temporary directory is removed in `finally`. No credential literal or key-like value was found in the four reviewed files.

7. **The implemented activity stays within the requested Auth slice.** The test drives existing-password login, normal session/user reads and refresh, guarded read-only application checks, logout, reload continuity and optional cookie isolation. It contains no signup, OTP, invitation, recovery, profile/email/password update, account creation, paid provider call, source call or application-data POST.

## Non-blocking hardening note

The browser Auth allowlist accepts Supabase logout scopes `local`, `global` and `others`. The current application path used by this test is `POST /api/auth/logout`, whose server route calls Supabase with `scope: "local"`; the test does not directly invoke the other scopes. This is still within the declared logout operation and does not block integration, but before any future browser-direct logout is added, narrow the allowlist to the exact intended scope so a regression cannot revoke unrelated sessions.

## Offline validation performed in this review

- `node scripts/sprint10-real-password-auth-check.mjs` — passed.
- `node --check scripts/sprint10-real-password-auth-run.mjs` — passed.
- Independent search found no package script or GitHub workflow reference to the live runner/spec.
- Runner with a clean environment — failed before Playwright because the explicit opt-in was absent.
- Runner with only explicit opt-in plus `primary` scope — failed before Playwright because the Preview target was absent.
- Runner with a complete synthetic target/primary tuple but partial secondary tuple — failed before receipt loading, Playwright and network dispatch.
- Manual source review confirmed the one-project discovery/count logic, aggregate-only result output, pre-dispatch abort branches and exact target/receipt bindings.

No browser, live Playwright test, network request, Vercel/Supabase/hosted call, credential, account, email, paid API, database, application or repository mutation was used in this review. The only new file is this review record.

## Limits and release boundary

- This is a GO for the root integrator to integrate **test infrastructure only** at exact HEAD `2ad1d9ea123e2c47224918cee5f93766a3824181`.
- It is not approval to create accounts, inject credentials, contact Preview/Supabase, spend budget, run LIVE acceptance, merge/release Production or change hosted state.
- A later LIVE run still requires root's database/profile gate, current protected exact-deployment receipt, exact existing synthetic persona UUIDs, trusted runtime secret injection and a separately authorized hosted run.
- No qualifying Preview, account, password flow, session continuity or logout was tested here. Offline safety evidence cannot prove hosted Auth behavior.
- Project membership authorization, cross-project RLS, object visibility and IDOR resistance remain outside this harness and unproven.
- Preview evidence would remain Candidate evidence and would not by itself establish Pilot Ready, Production Ready or Released status.

Data-honesty caveat: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
