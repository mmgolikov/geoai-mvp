# Sprint 10 portable runtime handoff

Status: bounded implementation candidate; not deployed, not Production, not pilot-ready.

Base: `49885f1594c110627ad0d080f17b1c7d1cfec8a8`.
Target: one Next.js standalone instance behind Caddy, managed Supabase, 5–10 named testers.

## Implemented contract

- Conditional standalone output only for `GEOAI_BUILD_TARGET=self_hosted_candidate`; existing Vercel builds retain their prior configuration.
- Pinned multi-stage Node 22 glibc image; minimal standalone runtime, fixed non-root UID/GID, read-only root, no published app port.
- Pinned Caddy reverse proxy with automatic HTTPS, bounded body/log files, credential/query redaction, zero upstream retries, and a 130-second response-header timeout.
- Strict startup rejection for unknown/conflicting runtime identity, fake Vercel identity, malformed/non-public origin, host mismatch, non-exact release identity, public build drift, demo/soft/local fallback, wrong managed Supabase target, AI/persistence enablement, and privileged/operator/provider credentials.
- A configured public origin anchors mutation validation, Auth callback redirects, and Secure invitation-cookie decisions. Forwarded headers must agree with that configured authority; they are not independently trusted.
- Liveness (`/api/health`) is dependency-free. Readiness (`/api/runtime/readiness`) uses the existing five-second read-only `api.healthcheck()` and returns sanitized states only.
- The point-object UI surface may be explicitly enabled for deterministic local behavior, while self-host AI and cloud persistence are forced off in this first packet.

## Deliberately excluded

No host/domain purchase, DNS/certificate operation, deployment, Supabase change, migration, Auth account, key read, real API call, provider call, ledger action, cloud-artifact/UI change, global inventory update, or Production change is included. Browser-local/local project state is not relabeled as cloud persistence.

## Acceptance still required

1. Root reviews and integrates this commit without combining unaccepted cloud/Auth evidence.
2. Root builds and inspects the container in newly owned resources, validates Caddy syntax, image contents, non-root/read-only operation, ingress isolation, body/timeout/no-retry behavior, safe logs, and image size/RSS.
3. After separately authorized host/DNS/Auth configuration, root performs the exact named-persona login/logout/session and negative-origin matrix.
4. Analyse/Find/Create save/reopen and two-user isolation remain blocked until the S3 cloud artifact migration/server/UI work is integrated, applied, and accepted.
5. Provider-backed execution remains disabled until a separate paid-call reservation and durable budget control are accepted.

Sizing of 2 vCPU, 4 GB RAM, and 50–80 GB SSD remains an unverified initial hypothesis, not a capacity claim.
