# NIGHT21 — exact-object source reliability

Status: LOCAL CORRECTION VERIFIED / NOT RELEASED / LIVE INCIDENT CAUSE UNCONFIRMED

Owner: dev_1. Integrator and release authority: main_1.
Date: 2026-09-20 UTC.
Branch: `codex/night21-source`.
Parent: `4d179f485612d7ebfbaa357a84f21dd13ff33f50`.
Authority: founder-approved NIGHT21 plan and source-lane assignment; this receipt is not a new product or release decision.

## Problem and evidence

The supplied protected-Preview receipt records successful suggestion of Jumeirah Emirates Towers Hotel followed by `/context` HTTP 502. It did not retain the error code. Its specific upstream cause remains unknown; neither a synthetic regression nor this patch reconstructs that missing observation.

Two independent code-level defects were confirmed at the parent:

1. Nearby and urban-fabric requests entered the shared Overpass admission queue before the mandatory exact-object lookup. With 1,200 ms spacing and a 4,500 ms queue-plus-request deadline, optional work could consume approximately 2,400 ms of the cold exact lookup budget even without other traffic.
2. The exact-source adapter replaced every error with `OBJECT_NOT_RESOLVED` / 502, losing timeout, rate-limit and malformed-response distinctions already useful to the client recovery contract.

The new dedicated test was executed before the source patch. It failed on “Mandatory exact-source lookup must take the first source admission slot, before optional context”; the actual first query was the 800 m nearby query. This is evidence of request ordering, not proof of the historical hotel's 502 cause.

## Bounded correction

- Resolve the mandatory source first; validate exact identity and anchor before dispatching optional nearby/fabric work. No optional request is made after mandatory failure.
- Preserve sanitized error classes through the existing context-route response. No response body, provider exception, credential, query or URL is exposed.
- Retain the 4,500 ms upstream deadline including admission/body, 1,200 ms spacing, 512 KiB response cap, query limits, redirect rejection and no automatic retry.
- Reuse the existing server-owned five-minute Find snapshot without accepting client-supplied source geometry or hashes. Geometry, explicit height, acquired timestamp and source hash remain intact. Cold processes still require the exact source.
- Keep optional failures explicitly unavailable, with null response hashes and unavailable coverage. Existing zero-valued empty counters remain qualified by unavailable coverage; they are not measured absence. No scoring, nearby-object substitution or invented geometry is introduced.
- Success schema remains version 2; evidence hash construction, lineage, geometry validation, caveat, Auth, configuration and AI logic are unchanged.

| Condition | Public code | HTTP |
|---|---|---|
| Queue/fetch/body timeout, upstream 408/504 | `OVERPASS_TIMEOUT` | 504 |
| Upstream rate limit | `OVERPASS_RATE_LIMITED` | 429 + existing bounded Retry-After parser |
| Network failure/other non-2xx | `OVERPASS_UNAVAILABLE` | 502 |
| Declared/streamed size overflow | `OVERPASS_RESPONSE_TOO_LARGE` | 502 |
| Malformed JSON/schema/runtime remark/multiple exact results | `OVERPASS_RESPONSE_INVALID` | 502 |
| Valid empty exact result | `OBJECT_NOT_RESOLVED` | 422 |
| Wrong exact identity or spatial anchor | `OBJECT_NOT_RESOLVED` | 409 |
| Other bounded exact-adapter rejection | `OBJECT_NOT_RESOLVED` | 502 |

## Local verification

Environment: isolated assigned worktree, Node 24.19.0, Next.js 15.5.25. Reviewer: dev_1 self-review; independent integration review pending. No real AI, geographic provider or hosted Auth call was made by these tests.

| Check | Result |
|---|---|
| `node --experimental-transform-types scripts/night21-source-reliability-check.ts` | PASS, 30 offline cases; real source module and real context route, isolated framework/cache/identity/runtime adapters |
| `npm run lint` | PASS |
| `npm run build` | PASS, 81/81 static-generation entries; initial sandbox Google Fonts DNS block, then approved public-font fetch and complete build |
| `npm run test:point-to-object` | PASS, contract and provenance |
| `npm run test:point-to-object-geocontext` | PASS, six scripts |
| `npm run test:point-to-object-runtime-gate` | PASS, seven scripts including actual-route auth/runtime negatives and recovery |
| `npm run test:point-to-object-trusted-identity` | PASS |
| `node scripts/quality20-map-check.mjs` | PASS |
| `node scripts/quality20-evidence-receipt-check.mjs` | PASS |
| `npm run test:data-honesty` | PASS, 463 files, zero findings |
| `npm run test:server-credential-boundary` | PASS, 463 runtime files |
| `git diff --check` | PASS |

The 30 new cases include acquisition order, degraded valid subject, fetch/body/HTTP timeout, rate limit, 502/network failure, malformed/runtime/oversize replies, empty/multiple/mismatched records, wrong anchor, warm snapshot reuse, actual route error codes/headers and success provenance, and zero source calls for rejected identity/origin/client receipt or geometry injection. Mock identity-adapter tests are not hosted Auth certification. Existing route contracts separately cover runtime flag and application rate limits.

## Residual risk and handoff

- Main must add the dedicated script to the integration-owned gate, run exact-commit CI and the safe no-paid protected-Preview probe retaining only finite error codes. Live hotel resolution, rendered complete journeys and Production behavior remain unverified here.
- The public provider has no availability SLA. This change improves scheduling and diagnostic fidelity; it cannot guarantee a successful source response.
- Mandatory-first sequencing trades parallel latency for subject priority and avoids unnecessary optional calls. Direct reverse-geocoding clicks can take longer than the previous parallel path; individual source caps remain unchanged. Measure full-route latency during integration.
- In-process admission and snapshot reuse are not distributed quota control or durable frozen-evidence storage. No new persistent-cache/frozen-evidence semantics are claimed.
- Existing cache behavior is retained; this offline harness bypasses framework caching and does not certify multi-instance cache behavior.
- No UI, shared E2E, AI synthesis, auth, environment, hosted data, dependency, push, deployment or Production change. The only external read was the approved public font download for the local build.

Rollback: revert this source-lane commit on the integration branch; parent `4d179f485612d7ebfbaa357a84f21dd13ff33f50` is the local rollback point. No migration, persisted data or external configuration needs reversal.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
