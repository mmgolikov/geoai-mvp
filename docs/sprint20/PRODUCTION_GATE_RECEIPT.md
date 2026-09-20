# Closed-MVP Production gate — local engineering receipt

Version 1.0 · 2026-09-20 · LOCAL CANDIDATE / NOT RELEASED.
Owner: dev_1; integration, hosted configuration and release: control.
Branch: `codex/quality20-production-gate`; exact starting commit `f09bfba430108aa9d3625322d5d2894a11122c35`, initially clean.

## Authority and decision

The September 20 Change Request and controller's explicit package authorize a closed MVP at `geoai-mvp.vercel.app` using existing `geoai-dev / pphdqkurxneyagvnnjdt`, shared with Preview. Mandatory login, caller-owned persistence, existing keys/data/RLS retained. This worker may change local code/tests only; no hosted writes, environment-file edits, pushes or deployments. Historical blanket Production prohibitions are superseded only for this exact controller-owned release; no readiness promotion follows.

GO for integration review; hosted acceptance remains required. Existing dedicated JWT-scoped persistence is retained. `requestScopedSupabaseRepositoriesEnabled` remains false.

## Findings and correction

- Persistence previously allowed only explicit Preview/self-host opt-in. Added independent `GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE`; a Preview flag never activates Production.
- Production source/AI surface and persistence now require explicit Supabase Auth configuration, a publishable-key-shaped public key and the exact approved geoai-dev URL. Rehearsal, local, look-alike domain, malformed URL, service/legacy key and missing config fail closed. This validates configuration syntax/target, **not** the credential or hosted state.
- When either Production surface or persistence is explicitly requested, missing/demo/invalid Auth mode cannot fall through to public demo. Page and API guards see disabled Auth on bad configuration. Outside that closed Production request, existing Preview/self-host/default behavior is unchanged.
- Cloud scope uses `GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY` on Production without Preview fallback. The response/client accept explicit `authenticated_supabase_production`; Preview retains its prior label.
- APIs still require verified claims plus fresh user, matching permanent identity, active profile, exact project membership and role. SSR cookie JWT transport only; bearer/mixed credentials rejected. Browser mock demo never authorizes persistence. A genuine authorized account in a demo project may operate only through existing caller-owned RPC/RLS.
- Private/no-store responses, origin guards, bounded bodies, revision/idempotency and database ownership rules are unchanged. No service-role client, global repository activation or migration introduced.

## Exact changes

Runtime: `src/lib/prototype/point-object-persistence-gate.ts`, `point-object-runtime-policy.ts`, `point-object-cloud-repository.ts`, `point-object-cloud-client.ts`; `src/lib/auth/auth-mode.ts`; `app/api/prototype/point-to-object/project-artifacts/route.ts` (wire label only).

Tests: new `scripts/quality20-production-gate-check.mjs`; updated `scripts/point-to-object-runtime-gate-check.ts`, `point-to-object-ai-route-runtime-check.ts`, `point-to-object-source-route-runtime-check.ts`, `point-to-object-persistence-check.mjs`, `point-object-cloud-persistence-check.mjs`, `point-object-cloud-client-check.ts`. Plus this receipt. No UI in this first gate change.

## Verification

Environment: local macOS, Node 24.19.0, Next 15.5.25; unchanged lockfile/dependencies. Reviewer: dev_1 self-review; independent integration review not claimed.

| Lane | Receipt |
|---|---|
| TypeScript / lint | PASS |
| Production build | PASS, 81/81 static-generation entries |
| New gate/auth/page/API matrix | PASS: Production/Preview/self-host isolation; absent/invalid flags; missing/demo/invalid Auth; wrong target/key shape; no Preview scope fallback; missing/expired/anonymous/mismatched/inactive identity; nonmember/other-profile/viewer denied; bearer and cross-origin denied; authorized demo-project principal accepted; simulated RLS denial propagated |
| Cloud client | PASS: new Production GET/PUT receipts accepted, unknown modes rejected, old Preview and CAS/replay/abort/error checks retained |
| Existing runtime gate group | PASS: all seven scripts (runtime policy, AI route, five source routes, source recovery, middleware, request limits and budget) |
| Dedicated persistence + cloud SQL/source contracts | PASS |
| Request-scoped read, SOURCE connector, AOI, API guards, server credential boundary, secret hygiene, data honesty, self-host runtime | PASS |
| Built HTTP negative smoke | PASS on local port 3047: `/workspace`, `/projects`, `/prototype/point-to-object`, `/prototype/point-to-object/analysis` redirect 307 to login; `analysis-runs`, `project-artifacts`, `context`, `find`, `create`, `ai` deny 503 under deliberately invalid closed-MVP Auth config |
| Diff whitespace | PASS |

The new executable test loads real page/route/Auth/repository code with a synthetic SSR adapter; network fetch is forbidden. Expired-claims and ownership failures are injected at that boundary. It does not certify real JWT cryptography or physical hosted RLS. Existing SQL ownership predicates were read and statically checked, not applied/executed. Source-route transport tests explicitly use an authenticated fixture; actual identity negatives are in the new matrix. Initial old source harness attempted a Next header import once Auth became mandatory; the authenticated fixture isolates its intended origin/body/quota lane. Synthetic public-key fixtures triggered hygiene before being expressed as clearly constructed test-only placeholders; no real key was accessed.

Local process-only negative-test variables were used; no operator env file or hosted configuration was read/written. Local server stopped after smoke. No paid requests.

## Minimal operator inventory (names only; no values)

Existing required public configuration: `NEXT_PUBLIC_AUTH_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Existing isolated runtime gates: `GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_SURFACE`, `GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_AI`, `OPENAI_API_KEY` (reuse existing approved key; this worker does not read it).

New dedicated persistence controls: `GEOAI_ALLOW_POINT_OBJECT_PRODUCTION_PERSISTENCE`, `GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY`.

Existing access policy to reconcile: `GEOAI_ACCESS_ENFORCEMENT_MODE`, `GEOAI_ALLOW_DEMO_PUBLIC`. They do not replace the dedicated gate, JWT or ownership checks. Do not enable any global repositories.

Preview-only existing controls remain `GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI`, `GEOAI_ALLOW_POINT_OBJECT_PREVIEW_PERSISTENCE`, `GEOAI_POINT_OBJECT_PREVIEW_PROJECT_KEY`. Self-host flags remain unchanged. Do not copy Preview activation by inference.

Public variables must match at build and runtime; redeployment/configuration is controller-owned. There is no new client persistence toggle: the existing authenticated cloud client reads the gated API, including its new Production receipt label. Missing server project scope yields 503 rather than a fallback.

## Required hosted acceptance / rollback

Before enablement, controller must inventory the exact project, migration ledger, `api` RPC grants, active profile/memberships, `geoai_private.point_object_artifact_scope_config`, and creator-bound RLS. Verify the configured project key is the intended existing authorized scope; do not invent or enable a database scope from a string.

Then prove two real test accounts: owner write/read/reopen, other-account denial/own empty view, anonymous/no-cookie/invalid-expired session denial, viewer write denial, idempotent replay/CAS conflict, private cache headers, reload continuity and zero regeneration on reopen. Preserve existing records and Preview compatibility. No email/signup/reset/invitation or protected customer data is authorized for the worker. A public key with valid shape but incorrect project association must fail during real Auth verification; this is a required hosted negative, not a local PASS.

Rollback: controller disables the dedicated Production persistence/surface gates and restores the prior exact app/config tuple as needed; no row deletion or schema rollback is needed for this code-only patch. Local rollback is a revert of the bounded commit, not a destructive reset. Keep the SQL data-preserving deactivation scripts as historical/operator references, not automatic actions.

Read-only UI finding routed to controller: the old login branch tests mock demo email before password login. Controller confirmed the designated real demo account uses a different email; a separate explicitly granted password-only/login correction follows. Blank-password magic-link and phone methods are not disabled by this first gate commit.

## External documentation and truth limits

Supabase skill security checklist reviewed: no user_metadata authorization, verified identity not raw session, no service/secret browser key, ownership predicates and update guards retained. Current SSR documentation read 2026-09-20: https://supabase.com/docs/guides/auth/server-side/creating-a-client . Changelog summary fetched read-only on 2026-09-20: https://supabase.com/changelog.md ; visible recent breaking changes concern management logs, extension version pinning, self-host gateway and Realtime schema, none used by this local gate change. A later duplicate fetch encountered DNS failure; no hosted project probe or SDK upgrade followed.

No new commercial, live-source or Production/pilot readiness claim. No secret/personal data accessed, no hosted mutation, push, merge or deployment.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
