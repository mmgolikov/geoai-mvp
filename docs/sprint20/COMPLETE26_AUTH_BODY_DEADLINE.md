# COMPLETE26 — complete client Auth response deadline

Date: 2026-09-26. Status: local candidate correction, not hosted acceptance.
Baseline/rollback: `61d333ed210e3b6ffb8ed5448a67ebe78bfab0f9`.
Authority: founder-approved COMPLETE25 continuation; root-scoped `COMPLETE26_BOUNDARY_CORRECTION_CR.md` and body-only implementation assignment. Only browser transport, this document and the new regression check are owned here.

## Defect and scope

The prior helper cleared its 10-second timer when response headers arrived. JSON body consumption occurred after that boundary, so a stalled body could leave session confirmation or sign-out pending indefinitely. An abort-ignoring dependency could also leave the caller pending after the header timeout.

The helper now includes fetch and response consumption in one bounded operation. It passes the same abort signal to the actual fetch, rejects independently of a dependency honoring that signal, and retains the timer until body consumption finishes. Elapsed monotonic time is checked before/after consumption: synchronous parse work cannot publish a success after the deadline merely because its timer callback has not run yet. JavaScript parsing is not preempted; an over-deadline result is rejected on returning control.

The default remains **10,000 ms**. There is one request and no retry. Session timeout remains `unavailable`, not anonymous. Sign-out timeout remains `ok:false, reason:timeout`; malformed body and HTTP rejection retain `server_rejected`. A late result cannot replace the settled failure. Existing identity interpretation, AuthProvider expected-UUID checks, server claims/user/profile checks, no-store, and sign-out reconciliation are unchanged.

This does **not** fix A02's observed no-headers session timeout or establish which server dependency was slow. No server/middleware deadlines, login navigation, reconciliation retry, authorization rule, credentials, database, ledger or hosted state changed.

## Reproducible offline evidence

Use Node24.19.0. The baseline mode consumes only the actual baseline source on stdin; both runs exercise the same tests, not an imitation implementation.

```sh
git show 61d333ed210e3b6ffb8ed5448a67ebe78bfab0f9:src/lib/auth/browser-session-transport.ts | node --experimental-strip-types scripts/complete26-auth-body-deadline-check.mjs --baseline-stdin
node --experimental-strip-types scripts/complete26-auth-body-deadline-check.mjs
```

Before: exit1, **16 passed / 10 failed**, networkCalls0. Failures: session/logout stalled body with abort honored or ignored; stalled headers with abort ignored; actual Response stream not aborted; elapsed parsing beyond the deadline accepted.

After: exit0, **26 passed / 0 failed**, networkCalls0. The deterministic clock asserts the unchanged default10000ms; actual Response/ReadableStream cases use a short injected15ms deadline. Tests release retained synthetic promises and include a bounded watchdog for baseline failure. Coverage also includes fast success, malformed JSON,503, network/body rejection, external abort, late-success exclusion, anonymous-vs-unavailable and explicit sign-out success status. No password/provider/browser calls occur.

Adjacent checks actually run:

- `npm run lint` and `tsc --noEmit`: PASS.
- `scripts/auth-signout-state-check.ts`: PASS.
- `scripts/complete26-password-session-confirmation-check.mjs`: 71 PASS, networkCalls0, including wrong UUID and stale identity races.
- `scripts/auth-ssr-transport-check.mjs`: PASS.
- `npm run test:request-scoped-project-read`: PASS.
- `npm run test:source-connector-foundation`: PASS.
- `npm run test:aoi-integrity`: PASS,11 geometry personas.
- `git diff --check`: PASS.

Build/browser/hosted checks are not claimed: this lane forbids network and `app/layout.tsx` uses Google font acquisition during a fresh build. Root retains integration/build/browser ownership. The dependency symlink is read-only reuse of the control tree; no shared dependency files were changed.

## Next gate

Root reviews/cherry-picks the three-file commit, wires the new pure check, and verifies the integrated candidate. Resolve the separate A02 server timing evidence before promising improved live login success. Full58, client decision quality, cloud persistence and Production remain separate unaccepted gates.
