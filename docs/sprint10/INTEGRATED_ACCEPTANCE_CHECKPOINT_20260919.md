# Integrated candidate acceptance checkpoint — 19 September 2026

Status: **candidate, not released; live product acceptance incomplete**. This checkpoint supplements, and does not replace, earlier exact-scope receipts.

## Exact candidate CI

GitHub Actions [run 35405850909](https://github.com/mmgolikov/geoai-mvp/actions/runs/35405850909) completed successfully for `bc795e28902f63594d509504644aefdb66b7ec4e` on `codex/sprint10-control-20260918`. All three jobs succeeded. Root downloaded and inspected the artifacts rather than relying only on the green run badge:

- 81/81 product browser scenarios and 33/33 demo/session browser scenarios passed.
- Clean database replay: 288/288 pgTAP assertions passed; the synthetic upgrade job also passed.
- Seven Lighthouse profiles passed their original budgets. Protected optimized login scored 1.00 in all four categories, LCP 612 ms, CLS 0 and TBT 0. Mobile landing performance was 0.88 with LCP 3.78 s; this is not a claim of uniformly perfect performance.
- Runtime inventory covered 78 API routes; the audit verified 12 physically generated PDF outputs.

These are controlled CI scenarios, not proof of external providers, physical iPhone behavior or cloud product persistence. Later commits must obtain their own fresh gate results.

## First combined real Auth and product attempt

Protected Preview `dpl_9WjZZThBQr8dCTskhEAZoCxBTM1J`, [geoai-o8553yoii-geoaidev.vercel.app](https://geoai-o8553yoii-geoaidev.vercel.app), was READY for the same exact commit. Root verified runtime SHA and anonymous SSO protection before dispatch.

The combined run exited 1 with a strict `FAIL` / `pre_live_failure` receipt. Both newly created synthetic development identities completed real primary and secondary password login, claims/user checks and own-profile lookup. Distinct profiles and anonymous denial passed. The Preview password-browser seam did not complete; source retrieval and the paid product journey did not begin.

Both identities were terminally retired: server-global revocation, rejection of both refresh tokens, ban and password rejection, empty current-profile response for old JWTs, final future-ban read-back and credential clearing. They must not be reused or unbanned. The durable terminal checkpoint is retained privately. No identities or customer records were deleted.

Post-run canonical cycle ledger validation reported generation 0, zero receipts and USD0 reserved/estimated against the single USD15 cycle cap. This is not an OpenAI billing statement; no paid dispatch occurred in this attempt.

### Confirmed test-harness defects, not yet a product diagnosis

Independent static review found that the test policy omitted the exact normal GET `/brand/geoai-identity-symbol-32.svg`, although the login navigation requires it. A separate anonymous read-only browser check confirmed the route rendered with HTTP200, the expected sign-in/password controls and no page JavaScript errors.

The outer 240-second process timeout also failed to cover two sequential 180-second tests plus discovery and cleanup. The observed duration is consistent with that timeout, but the original inner failure cannot be recovered from the sanitized receipt. Its `previewHarness: not_requested` field was an initial-value artifact, not proof that a launch had never been attempted.

No automatic replay was performed. Before another attempt, the harness must allow only that exact read-only asset, use a coherent bounded timeout, preserve fixed non-secret failure stages, and pass offline negative tests and independent review. Raw browser errors, credentials and source content must not be exposed for diagnosis.

## Portable runtime load evidence

Against the previously tested exact `e9c57a738db6d12c61bf0a3bcef80f404a1ce189` container image `sha256:d009e9261c4a74a99a0ff8efbb364a0b330e5dc7d2f4c53a875a0e7207789f11`, a bounded local health-only probe completed 200/200 requests with zero errors: p50 13.9 ms, p95 56 ms, maximum 234 ms, elapsed 507.1 ms. Reported memory after the probe was 123.4 MiB; peak memory was not measured.

The container was non-root, read-only, network-isolated and had no published ports. It was stopped after the probe. These results do not establish ten-user AI capacity, real hosted Auth/database connectivity, TLS, VPS operation or full self-host parity.

## Remaining acceptance boundaries

Real Analyse/Find/Compare/Create, saved-result reopen, qualitative depth/role value, cloud multi-user persistence, six regional live cases and physical iPhone smoke remain separate acceptance gates. Transactional email is deferred until the founder has the domain and corporate sender. Main, Production, domain/DNS and purchases are unchanged. No release or pilot GO is claimed.
