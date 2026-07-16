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

1. Data API and identity boundary: the repository draft selects a dedicated minimal `api` schema and global profile + organization/project membership semantics; follow the [containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md) to execute and evidence the owner schema action or disable the Data API. No live apply is authorized.
2. Canonical database migration: exact live-ledger reconstruction, local `api`-only Postgres 17 config, pinned Supabase CLI `2.109.1`, three-migration operator guard, CI `database-replay` and static containment/identity/source-custody contracts are staged; next obtain an exact-head clean-replay/57-assertion pgTAP pass across all three pending migrations, then prove upgrade replay, zero drift, direct-`public` denial and positive/negative HTTP/JWT/source personas.
3. Public runtime credential evacuation: remove service-role/secret Supabase keys and direct DB URLs from all public Vercel scopes, rotate where necessary, isolate the operator/worker plane and prove an exact deployment that needs no privileged database credential.
4. Request-scoped Auth kernel: SSR cookie, claims/user/profile verification and exact action/capability contracts are staged. AUTH-01B now provides a cookie-only exact-project read facade around caller-bound `api.current_project_access()`, the shared role kernel and bounded approved source-release DTOs, with no `client_viewer`, base-table, service-role or public-cache path. All readiness flags remain false and no route consumes it. Next execute the DB/ENV gates, bind reviewed reads to routes and prove the HTTP/JWT/RLS/IDOR matrix before activation.
5. Protected Storage: the review-only policy now uses narrow `geoai_private.has_storage_project_role()` because caller base/Auth `SELECT` is closed, and object reads are operation-aware/no-listing with `client_viewer` excluded. Next apply only through the approved owner path, derive scope server-side, validate full body/file magic/checksum/quarantine/AV state, and verify upload/fetch/sign/delete/negative personas. No Storage activation is authorized.
6. Source custody/visibility: the pending five-table RLS-closed model, immutable release/artifact/status/receipt records, actor/tenant FKs, fail-closed `restricted`/`registered_unverified` backfill, approved-only bounded `api.current_source_releases()` without arbitrary summaries/paths/URI/secrets, and static checker are staged. SOURCE-02 adds only a pure provider-neutral planner/receipt foundation: empty registry, no fetch/env/secrets/persistence and Production denied. Next execute replay and real source-read personas, then implement the separate trusted executor/credential broker and transactional idempotent receipt writer. Every future connector needs rights, custody/personas, worker, owner, exact-SHA, distributed-rate/circuit evidence and applicable distribution/geometry/imagery gates. Zero/manual/planned sources cannot become report evidence.
7. Conditional before protected/upstream AI use — AI safety gateway: request authorization, quotas/rate limits, privacy classification/redaction, bounded schemas/tokens, cost telemetry and fail-closed output filtering. This is P1 resilience work for the browser-local deterministic public demo.

## P1A — reliability and production-quality engineering

1. Add request IDs, structured logs, traces/metrics, error monitoring and incident/runbook links.
2. Replace readiness boolean claims with deployment/Supabase-ref/TTL-bound verification evidence.
3. Execute and stabilize the configured ephemeral `database-replay` job, then add upgrade replay, HTTP Auth/RLS/source persona E2E, IDOR and adversarial upload tests to CI.
4. Retain the safe lazy result-surface increment (local First Load JS 252 kB → 218 kB, approximately 13.5% gzip), then split multi-thousand-line UI coordinators and enforce exact-Preview route/bundle/Core Web Vitals budgets.
5. Protect report/print pages with the same server session model as APIs.
6. Remove the disabled legacy AnalysisPanel fanout/dead effects, aggregate or bound the six-request Hub bootstrap, retain compact 48/64 KB source and output-trace budgets, keep the public report-package collection summary-only/16 KB, obtain exact-head CI/Preview evidence against the old 133–158 KB baseline and scope `preserveDrawingBuffer` to capture.
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
4. Establish visual regression and multi-device browser tests for critical B2B/B2C journeys.

## Source activation sequence

The current fixed Preview pack remains non-scoring and non-persistent. On the audit branch it is off by default and requires the flag, a server-only operator token and matching request authorization; Production remains disabled. Real source work must follow:

```text
rights + custody -> private ingestion -> quality/quarantine -> visibility/RLS
-> Preview evidence -> Product integration -> Production decision
```

SOURCE-02 currently covers only deterministic planning and non-persisted outcome receipts inside that sequence. It cannot perform private ingestion, credential injection, SOURCE-01 writes or Production execution.

No stage in this roadmap authorizes a Production deployment, Supabase migration, secret change, real geometry publication or provider activation by itself.
