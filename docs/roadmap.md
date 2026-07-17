# GeoAI Delivery Roadmap

Status: Active
Last verified: 2026-07-16
Owner: GeoAI Product / Engineering
Authority: Current dependency-ordered delivery plan
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Current release: PR #87 merge `2999e7e857989baf53ce58ecfed63550b5896be0`; Production `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md)

GeoAI remains a public demo prototype. Production is `demo_only`, `local_fallback`, soft access and has no Production Supabase connection. The source pack is fail-closed in Production. No Production-ready or pilot-ready maturity claim is supported.

## P0 — precondition for Auth, RBAC, Admin and real sources

1. Data API and identity boundary: complete on isolated Free rehearsal only. Ref `bkmfcjzalcvdsdvyxpgi` exposes the RPC-only 14-function `api` schema; HTTP health is 200 and `public` is denied with `PGRST106`. Development and Production are unchanged.
2. Canonical database migration: the first six candidates replayed on rehearsal; hosted pgTAP is `183/183`; all 29 GeoAI domain tables have RLS and uncovered domain FKs are zero. Table-level two-session lock-order runtime evidence passes without deadlock or residual rows. A seventh migration that replaces the Admin AAL2 requirement with verified permanent identity is prepared but unapplied everywhere. Next prove the same concurrency through authenticated invitation RPCs, real email/phone HTTP Auth, resource-specific Admin pagination, Storage personas and the separately authorized development upgrade/drift/apply plan. [Receipt](SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json).
3. Public runtime credential evacuation: remove service-role/secret Supabase keys and direct DB URLs from all public Vercel scopes, rotate where necessary, isolate the operator/worker plane and prove an exact deployment that needs no privileged database credential.
4. Request-scoped Auth kernel: a single email-or-phone entry screen, email link/existing-password sign-in, phone SMS OTP, exact-target PKCE/session/logout, permanent-user verification and verified-identity Admin/Onboarding routes are implemented locally and statically verified. Landing `View demo`/`Leave a request` actions now enter this Auth screen with a bounded Workspace return, saved sessions continue automatically, and shared navigation exposes a highlighted authenticated profile icon. A candidate client gate now waits for session resolution before rendering Workspace, Projects, Explore or Profile in `supabase_auth`, redirects resolved anonymous users through the bounded login continuation, preserves `demo_public` and fails closed when Auth is disabled. Exact route-gate head `77ac593b51d43a62ddc89656dbae735378cab69f` passed Quality Gate `29579739837`; Preview `dpl_6Er5tTEesM2V6RA7ZQD8eR5VYJpQ` is READY and all four route HTML responses contain only the restoration shell. `/profile` adds personal details, email/password actions and B2B/B2C role defaults without using preferences as authorization. MFA is deliberately out of scope. The mock `demo@geoai.space` / `111111` session and all avatar images are browser-only and cannot authorize protected APIs. Exact browser-contract head `4e5208a729f9dfb13068dc9521871da74a7de8db` passed Quality Gate `29582671453`; Chrome completed the mock guest→login→Workspace→reload/direct routes→Profile→logout→login journey `1/1` using no real credential or hosted write. Its Vercel deployment is rejected for middleware 500s and requires a clean retry. This client/browser gate is not server authorization; AUTH-01B Product repositories and every runtime persona-readiness flag stay disconnected/false. Next configure an SMS provider if phone delivery is required, create an owner-approved confirmed user, bootstrap v2, prove profile/email/password plus the full email/phone HTTP/JWT/RLS/IDOR/Admin matrix on a clean Preview, and design a safe verified sign-in-phone change path.
5. Protected Storage: the review-only policy now uses narrow `geoai_private.has_storage_project_role()` because caller base/Auth `SELECT` is closed, and object reads are operation-aware/no-listing with `client_viewer` excluded. Next apply only through the approved owner path, derive scope server-side, validate full body/file magic/checksum/quarantine/AV state, and verify upload/fetch/sign/delete/negative personas. No Storage activation is authorized.
6. Source custody/visibility: SOURCE-01 is applied/SQL-tested on rehearsal only and remains unapplied to development/Production with no provider connected. SOURCE-02 adds only an unsigned, authorization-none `reserve_or_replay` correlation claim with exact execution/idempotency hashes; registry/plan/hash revalidation, trusted execution, transactional writing and atomic pre-fetch reservation remain external/absent. Registry empty, no fetch/env/secrets/persistence, Production denied. Next implement and prove those boundaries plus real source personas.
7. Conditional before protected/upstream AI use — AI safety gateway: request authorization, quotas/rate limits, privacy classification/redaction, bounded schemas/tokens, cost telemetry and fail-closed output filtering. This is P1 resilience work for the browser-local deterministic public demo.

## P1A — reliability and production-quality engineering

1. Add request IDs, structured logs, traces/metrics, error monitoring and incident/runbook links.
2. Replace readiness boolean claims with deployment/Supabase-ref/TTL-bound verification evidence.
3. Retain run `29500488408` and both artifacts, then add a live-derived current-development upgrade/drift job, HTTP Auth/RLS/source persona E2E, IDOR and adversarial upload tests to CI.
4. Retain the safe lazy result-surface increment (local First Load JS 252 kB → 218 kB, approximately 13.5% gzip), then split multi-thousand-line UI coordinators and enforce exact-Preview route/bundle/Core Web Vitals budgets.
5. Protect report/print pages with the same server session model as APIs.
6. Remove the disabled legacy AnalysisPanel fanout/dead effects, aggregate or bound the six-request Hub bootstrap, retain compact 48/64 KB source and output-trace budgets, keep the public report-package collection summary-only/16 KB and scope `preserveDrawingBuffer` to capture. Exact-head Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` proves 4,292–18,284 B route bodies; browser-flow, bundle and Core Web Vitals evidence remains open because HTTP is not browser evidence.
7. Prove project-scoped browser artifact isolation/reload and fail-closed unknown-project behavior before durable persistence work.
8. Retain the 11-persona AOI integrity contract, then add authenticated server-route byte/feature/ring and durable-write geometry evidence before protected AOI persistence.

## P1B — current architecture and governance

1. **Completed governance rule:** independent-reviewer prerequisites are retired for the current phase; retain owner/Codex critical review as the honest model without reintroducing an approval hold.
2. Keep objective technical gates: issue #85 migration chain, issue #80 geometry/distribution, provider rights and Production activation.
3. Publish implemented architecture separately from target architecture and dispose PR #84 findings by exact scope.
4. Reconcile open PRs/issues individually; do not hide them under a generic legacy bucket.
5. Retain and regenerate the documentation lifecycle/successor inventory in CI; keep Hub, active authorities and the clickable archive index cross-confirmed.

## P2 — product and design quality

1. Resolve the live UX/a11y/performance audit backlog.
2. Define and implement the missing criteria-first wireflow and empty/stub product documents.
3. Modularize Workspace, Project Dashboard, Map and Analysis surfaces with regression coverage.
4. Establish visual regression and multi-device browser tests for critical B2B/B2C journeys. The current candidate supplies the narrow first slice—desktop/tablet/390px landing/login layout plus a 390px keyboard-only mock-demo/profile path—but Chrome CI, Axe/Lighthouse and deep Workspace/project/report/print coverage remain required.

## Source activation sequence

The current fixed Preview pack remains non-scoring and non-persistent. On the audit branch it is off by default and requires the flag, a server-only operator token and matching request authorization; Production remains disabled. Real source work must follow:

```text
rights + custody -> private ingestion -> quality/quarantine -> visibility/RLS
-> Preview evidence -> Product integration -> Production decision
```

SOURCE-02 currently covers only deterministic planning and non-persisted outcome receipts inside that sequence. It cannot perform private ingestion, credential injection, SOURCE-01 writes or Production execution.

No stage in this roadmap authorizes a Production deployment, Supabase migration, secret change, real geometry publication or provider activation by itself.
