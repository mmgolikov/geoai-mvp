# GeoAI Delivery Roadmap

Status: Active
Last verified: 2026-07-16
Current release: PR #87 merge `2999e7e857989baf53ce58ecfed63550b5896be0`; Production `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`

GeoAI remains a public demo prototype. Production is `demo_only`, `local_fallback`, soft access and has no Production Supabase connection. The source pack is fail-closed in Production. No Production-ready or pilot-ready maturity claim is supported.

## P0 — precondition for Auth, RBAC, Admin and real sources

1. Request-scoped Auth kernel: verify Supabase user, profile, organization, project membership and role on the server; remove placeholder/demo fallback from protected mode.
2. Canonical database migration: reconcile historical schemas, prove clean replay on an ephemeral project, zero drift and positive/negative RLS personas.
3. Protected Storage: derive scope server-side, validate full body and file magic, checksum/quarantine/AV state, and verify signed URL behavior in user context.
4. Source custody/visibility: explicit public-demo/project-private/operator visibility, rights/attribution, checksums, retention and a public DTO without internal paths.
5. AI safety gateway: request authorization, quotas/rate limits, privacy classification/redaction, bounded schemas/tokens, cost telemetry and fail-closed output filtering.

## P1 — reliability and production-quality engineering

1. Add request IDs, structured logs, traces/metrics, error monitoring and incident/runbook links.
2. Replace readiness boolean claims with deployment/Supabase-ref/TTL-bound verification evidence.
3. Add ephemeral migration replay, Auth/RLS persona E2E, IDOR and adversarial upload tests to CI.
4. Split multi-thousand-line UI coordinators and enforce route/bundle/Core Web Vitals budgets.
5. Protect report/print pages with the same server session model as APIs.

## P1 — current architecture and governance

1. Retire independent-reviewer prerequisites for the current phase; owner/Codex critical review is the honest governance model.
2. Keep objective technical gates: issue #85 migration chain, issue #80 geometry/distribution, provider rights and Production activation.
3. Publish implemented architecture separately from target architecture and dispose PR #84 findings by exact scope.
4. Reconcile open PRs/issues individually; do not hide them under a generic legacy bucket.

## P2 — product and design quality

1. Resolve the live UX/a11y/performance audit backlog.
2. Define and implement the missing criteria-first wireflow and empty/stub product documents.
3. Modularize Workspace, Project Dashboard, Map and Analysis surfaces with regression coverage.
4. Establish visual regression and multi-device browser tests for critical B2B/B2C journeys.

## Source activation sequence

The current fixed Preview pack may remain as a non-scoring, non-persistent public-demo track. Real source work must follow:

```text
rights + custody -> private ingestion -> quality/quarantine -> visibility/RLS
-> Preview evidence -> Product integration -> Production decision
```

No stage in this roadmap authorizes a Production deployment, Supabase migration, secret change, real geometry publication or provider activation by itself.
