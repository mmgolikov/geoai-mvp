# COMPLETE26 — bounded password-session confirmation repair

Scope: two reproduced client reliability defects, isolated from frozen live1723d95. No hosted action, account creation, password retry, API permission change, timeout increase, session cache or deployment. Root owns integration, build and browser execution.

## Before and after

On baseline `f56b039da15dd5600252ee4e8cbc45f3d75d3367`, actual extracted provider functions reproduce:

1. Successful SDK exchange + unavailable server session returns `ok:true` although client identity remains anonymous.
2. Authenticated server identity is not published until optional browser-profile enrichment completes; an indefinitely pending enrichment blocks login.

Now password login returns success only after server confirmation for the SDK-returned expected user ID in the current Auth epoch. Anonymous/unavailable/wrong/missing UUID cannot report success. The message asks the user to check the connection and reload to verify the existing session; there is no automatic repeat of the password exchange.

SDK `SIGNED_IN` can arrive before the sign-in promise supplies its UUID. During that narrow pending exchange, event reads are deferred to the explicit confirmation. Concurrent reads during confirmation share one in-flight request in the same epoch; ordinary background reads retain latest-sequence-wins semantics. In-flight tracking is cleared on settlement, not cached. Logout, unmount and a new login invalidate old work.

Verified server identity is published synchronously before optional metadata. Enrichment can update only the same user in the same current epoch/sequence. Failure cannot replace identity; a late result cannot resurrect logout or overwrite another account. SSR claims/permanent-user/active-profile verification and existing10s session-read deadline are unchanged. SDK data alone never grants authenticated state.

## Offline evidence and commands

Use Node24. No operational credentials or private evidence needed.

```sh
git show f56b039da15dd5600252ee4e8cbc45f3d75d3367:components/auth/auth-provider.tsx | node --experimental-transform-types scripts/complete26-password-session-confirmation-check.mjs --before-stdin
node --experimental-transform-types scripts/complete26-password-session-confirmation-check.mjs
node --experimental-transform-types scripts/night21-auth-session-generation-check.mjs
```

Observed: baseline9 assertions reproduce both defects; new71 checks PASS/network0; existing lifecycle suite19 cases PASS/network0. Coverage: unavailable/anonymous/mismatched/missing SDK identity, one password call, event overlap and joined confirmation, pending read/profile completion after logout/unmount/new identity, ordinary latest-read ordering, optional failure and foreign-user metadata, later session read without password resend.

Root approved changes to the one existing lifecycle test: its SDK fixture now returns `data.user.id`; verified identity is expected before optional enrichment; checks explicitly forbid every later write after logout/unmount. Successful late-read and late-profile mutations still demonstrate that removing epoch/sequence guards resurrects identity. Failed optional enrichment no longer writes at all, even in that mutation. No existing security-negative was removed.

Also observed PASS, unchanged: `test:auth-signout-state`, `test:auth-ssr-transport`, `test:auth-session-e2e-contract`, `test:request-scoped-project-read`, `test:source-connector-foundation`, `test:aoi-integrity` (11 personas), `npm run lint`, TypeScript `--noEmit --incremental false`.

## Browser regression prepared for root

```sh
node node_modules/@playwright/test/cli.js test --config=playwright.complete26-password-session.config.ts
```

Discovery PASS: four tests, two each Chromium/WebKit. Runtime not run by this worker. New config inherits the existing cloud fixture's local Auth devserver3117 and synthetic Supabase URL54321; the spec owns54321 while running. Both ports must be free. Existing config unchanged. All values are synthetic, local-only; fake JWTs cannot authorize a hosted backend. External browser HTTP/WebSockets are blocked; only exact locally fulfilled SDK endpoints are excepted. No AI/source/Create POST reaches a server. Trace/video/screenshots off. The inherited local Auth CSP test exception is explicit and is not hosted-policy acceptance.

- Successful token response + session503: actual LoginPanel stays at `/login`, shows the unconfirmed message, releases pending UI; password POST exactly1.
- Confirmed same-user server session + held optional browser `/auth/v1/user`: actual LoginPanel navigates to the real `/profile`; authenticated profile UI appears while enrichment is still held. Gate releases only in `finally`, so the old provider cannot satisfy this case.

These are local intercepted-browser regressions, not live Auth or actual A05 replay. Root should also run the existing Auth/browser suite on the integrated build. No build/server was started here to avoid conflicting with root's shared-worktree orchestration.

## Limits and rollback

Actual A05 logs establish successful password and user/profile HTTP responses with slow reads; the original diagnostic does not identify the precise browser substage. These fixes remove proven code defects, not prove the historical failure's single root cause. Slow server confirmation can still truthfully return unconfirmed at the existing deadline. Optional metadata remains best-effort and may remain pending, but no longer blocks identity. Phone/OTP permissions, Auth environment, persistence, cleanup and live-journey harness are not broadened. Rollback is the isolated commit only; no operational state or data was modified.
