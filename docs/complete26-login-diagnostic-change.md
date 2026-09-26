# COMPLETE26 — bounded live-harness login diagnostics

## Change request

Following the COMPLETE25/26 completion work, the frozen 1723d95 batch stopped
at A05 before source acquisition/AI. The old receipt proves `auth_login` plus
`logout_session_precheck`, not the underlying login failure and not a logout
POST. This change does not reconstruct that missing historical cause.

## Contract

Only the test harness and its diagnostic serialization change. Optional
`authLogin` is accepted only when the primary stage remains `auth_login`.
Old five-field diagnostics retain their original shape. The runner already
passes the validated diagnostic through, so its implementation is unchanged.

The six failure substages distinguish navigation, visible form, credential fill,
submission/redirect, session fetch and session assertion. Error classification
is only `timeout` or `assertion_or_operation_failed`; no exception message or
stack is copied. At most eight observations and 1600 diagnostic bytes are
allowed. Overflow is explicit; this is not a complete request log.

Observed endpoints are only POST `/auth/v1/token` on the exact development Auth
origin and GET `/api/auth/session` on the configured Preview origin. Output is
only the path, method, HTTP status and derived allowlisted outcome. Queries,
origins, credentials, headers, request data and response bodies are never read
by these listeners or persisted. Token response bodies are never inspected,
including errors. A 401 is classified as HTTP unauthorized, not asserted to be
an incorrect password. Request failures remain `network_failed`, without
inventing a transport cause.

The existing session GET adds only a public session-status enum and a fixed
classification to its existing browser-side identity/no-store assertion.
Unknown status strings become `unrecognized`, never arbitrary text. No UUID,
email or raw body leaves that callback. Listeners are removed in `finally`
before the existing logout cleanup. No new requests, retries, paid dispatch,
identity acceptance, cleanup semantics or product Auth behavior are introduced.

## Offline verification

The new check first failed against the prior transport: the strict parser
rejected the additional safe login diagnostic. After the change it exercises
the real harness login function and session callback with inert fake pages,
every failure substage, strict identity/auth/demo checks, successful cleanup of
listeners, malformed/private fields, unknown origins/paths/methods, token body
non-access, count/byte bounds and runner receipt pass-through including cleanup
failure. Existing diagnostic and runner suites remain required unchanged.

Recorded verification: 193 new assertions PASS; existing live-journey diagnostic,
runner-offline and paid-diagnostic checks PASS; full TypeScript no-emit check and
diff whitespace check PASS. No browser was launched.

Run with Node 24: `node scripts/complete26-login-diagnostic-check.mjs`.
This is offline harness coverage, not successful hosted login or a diagnosis of
the original A05 failure. No operational accounts, ledger, candidate or batch
were accessed or changed.
