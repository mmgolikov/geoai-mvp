# Sprint 10 Auth Corrections Handoff

Status: Local Candidate correction; not released and not an activation approval

Branch: `codex/sprint10-auth-20260918`

Parent: `d24b0021b83fd4189234c8ce52c827783cb20288`

Corrective commit: the commit containing this document

Verification date: 2026-09-18

Runtime: Node.js `24.19.0`, Next.js `15.5.25`

## Scope and decision

This correction closes the independently reported browser/session defects in the local Sprint 10 Auth Candidate. It does not add membership, action entitlement, per-user quota, hosted persona, RLS, Storage or source-custody evidence. Runtime activation therefore remains **NO-GO** until those separately owned gates pass.

No hosted Supabase/Auth/Storage mutation, environment or secret change, push, deployment, Production action or paid provider call was performed.

## Corrections

1. Protected `supabase_auth` no longer accepts or advertises browser-only demo authority. A stale demo marker, demo profile PII record and browser demo namespace are removed before authoritative session reconciliation. Guided demo access remains available only in explicit `demo_public` mode.
2. Browser session reconciliation treats only an explicit `session_missing` response as anonymous. Invalid cookies, profile/RPC failures and dependency failures remain unresolved and cannot silently clear a previously confirmed session.
3. Confirmed or browser-local sign-out removes the demo user's local profile PII record. An unconfirmed server sign-out continues to preserve the current session.
4. `/onboarding` is public only for fragment-to-HttpOnly-cookie invitation staging. Invitation acceptance remains request-identity gated and returns `401` to a signed-out browser.
5. Same-origin mutation validation supports only exact loopback aliases (`localhost`, `127.0.0.1`, `[::1]`) with the same normalized protocol and port. Non-loopback authority disagreement, port mismatch and cross-site Fetch Metadata remain fail-closed.
6. Login continuation is parsed and allowlisted on the server, then passed into the first client render. This preserves bounded query state and prevents the SSR/client hydration mismatch previously observed on a non-default Point-to-Object continuation.
7. Workspace login continuation preserves only validated `segment` and `spatialMode` values.
8. Protected-mode request-access and phone failure copy no longer offers browser-local demo access.

## Exact local verification

| Gate | Environment | Result |
| --- | --- | --- |
| Focused Auth browser suite | `supabase_auth`, local Supabase-shaped fixture, one worker, `--fail-on-flaky-tests` | PASS — 6/6 |
| Login entry hydration regression | optimized `supabase_auth` build, 390×844 and 1440×900, non-default continuation, page-error capture | PASS — 1/1 |
| Production-like Auth build | local approved loopback fixture, hard access, demo disabled | PASS — 80/80 routes |
| Public-demo build | explicit `demo_public` | PASS — 80/80 routes |
| Public-demo API contract | local optimized build | PASS — all declared API and negative cases |
| Public-demo page smoke | `/`, `/workspace`, `/projects`, `/login`, `/onboarding`; `/explore` and `/demo` redirects | PASS |
| TypeScript | `npm run lint` | PASS |
| Auth SSR transport | static contract | PASS |
| Auth mutation origin | positive and adversarial static/runtime contract | PASS |
| Auth sign-out state | confirmed, rejected, network, timeout and reconciliation cases | PASS |
| Auth/Admin UI and profile | static contracts | PASS |
| Request-scoped project read | static contract | PASS |
| API access guards | 101 handlers / 62 protected / 81 blocking branches | PASS |
| API route inventory | 76 routes | PASS |
| Private cache boundary | 19 project GET routes + session route | PASS |
| Point-to-Object runtime gate | offline route/policy suite | PASS |
| Security headers | local optimized build | PASS |
| Secret hygiene | 1,056 tracked paths | PASS |
| Server credential boundary | 441 runtime files | PASS |
| Data-honesty AST scan | 441 files | PASS — 0 findings |
| Production dependency audit | `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| Full dependency audit | complete dependency tree | NON-BLOCKING MAINTENANCE — 21 dev-only findings (2 high, 18 moderate, 1 low); no dependency change in this correction |

The focused OTP test bypasses CSP only inside its intercepted Playwright context because the approved local Supabase fixture is intentionally absent from the Production CSP. `page.route` fulfils the request locally; no hosted Auth request is made. The security-header gate separately verifies that the Production CSP remains unchanged.

## Integration notes

- Preserve Main's separately owned AI-route/manifest changes and additional `tests/e2e/sprint10-auth-entry.spec.ts` coverage when integrating this commit.
- Do not restore the prior protected-mode demo journey in shared browser fixtures. Shared aggregate tests must select `demo_public` explicitly for demo journeys and `supabase_auth` for permanent-user boundaries.
- The current active-profile check proves identity/profile state only. It is not organization membership, project membership, action entitlement or per-user quota evidence.
- Main reported a fresh read-only `geoai-dev` catalogue connection with no application tables or migration ledger. That is connected-empty evidence, not hosted Auth/RLS/persona acceptance. The separate rehearsal project remained unavailable for physical read-back. This correction did not query or mutate either project.

## Claim boundary

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
