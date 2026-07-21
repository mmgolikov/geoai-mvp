# CR 09.23 — System Stabilization Audit v2

Status: Approved for isolated audit implementation
Date: 2026-07-21
Owner: GeoAI
Branch: `audit/cr-09-23-system-stabilization-v2`
Starting released main: `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b`
GitHub control: #107

## Problem

GeoAI has a stable released public demo after PR #106, but the system has not yet been re-audited as one complete baseline. Runtime, documentation, release evidence, browser-local state, API contracts, print/PDF quality, performance and the protected-pilot backlog must be reconciled before backend activation work is planned.

The committed release receipt and active release-state document already describe the previous PR #97 deployment rather than the current PR #106 Production release. The repository therefore cannot treat a deployment tuple committed before merge as durable current Production authority.

## Business reason

The next phase is protected-pilot technical preparation. Decisions about migrations, Auth, Storage, sources, observability and reports must be based on a current evidence package rather than accumulated historical claims.

## Users and stakeholders

- GeoAI founder and release owner
- Product and delivery governance
- Engineering / Codex
- Future pilot operators and client reviewers

No real end users are included in this change.

## Scope

1. Full post-release source audit of GitHub, Vercel, Supabase read-only state, Confluence authorities and existing evidence.
2. Release-governance and current-truth lifecycle audit.
3. Frontend, browser-local persistence and navigation audit.
4. Public and protected API, caching, headers, error and diagnostic-boundary audit.
5. Security, dependency, secret-hygiene, upload and geometry-boundary audit.
6. Desktop/tablet/mobile browser, keyboard, accessibility and deterministic visual audit.
7. Performance and route-bundle audit.
8. Real PDF/print generation and pagination audit.
9. Local/ephemeral clean and synthetic-upgrade database replay audit.
10. Reconciliation of open issues #80, #85, #88–#96, #98 and #99 into a current prioritized backlog.

## Affected product surfaces

- Landing
- Request Access
- Login
- Workspace
- Projects
- Explore
- Profile
- Analysis dashboard and comparison
- Printable analysis and comparison reports
- Public readiness and diagnostic APIs

## Data impact

Audit and synthetic/ephemeral test data only. Hosted Supabase access is read-only. No real geometry, client files, contact submissions, source snapshots or protected data.

## Design impact

None. Preserve the current released visual system. Do not open or modify Figma and do not perform a redesign.

## Engineering impact

Audit scripts, tests, evidence generation, documentation and low-risk truth/governance corrections may be added. Broad DB/Auth/Storage/source implementation is out of scope and must be returned as separately scoped work.

## Initial source-audit baseline

- Current `main`: `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b`.
- Current Production: `dpl_6RC2ohEdLBjiV82k758tFMkaDB9X`, READY at `https://geoai-mvp.vercel.app`.
- Rollback point: `dpl_ERVqZPD5GAGDLjAVhMcPF2HT5Br7`.
- Product stage: `public_demo_prototype`.
- Development: 10 migration-ledger entries, 0 Auth users.
- Auth rehearsal: 18 migration-ledger entries, 1 pre-existing confirmed Auth user with no project membership, tenant or protected-resource authority.
- `docs/CURRENT_RELEASE_RECEIPT.json` and `docs/CURRENT_RELEASE_STATE.md` still identify PR #97 / `b915a...` / `dpl_ERV...` as current.
- The Quality Gate workflow declares `push` and `pull_request` triggers for `main`; post-merge run evidence must be verified using an endpoint that includes push-triggered runs.
- Program issue #96 still describes PR #87 as the released baseline.

## Risks

- Treating historical evidence as current runtime truth.
- False-green CI caused by validators that agree with stale committed constants.
- Calling HTML print preview a proven PDF deliverable.
- Expanding the audit into unauthorized hosted backend activation.
- Broad refactors or visual changes that create unrelated regression risk.

## Acceptance criteria

1. One complete audit report states what passed, failed, remains unproven and why.
2. Findings are classified as P0, P1, P2, technical debt or documentation drift.
3. Every finding links to exact file, route, API, test or evidence.
4. Current Production and rollback facts are verified without changing Production.
5. Release authority no longer relies on a committed pre-merge tuple pretending to be permanently current.
6. Post-merge CI evidence is accurately distinguished from PR evidence.
7. Browser flows are deterministic with zero flaky tests in the accepted run.
8. Actual generated PDF evidence covers page count, clipping, breaks, overflow and required metadata.
9. Local/ephemeral database replay is reproducible and makes no hosted changes.
10. Open program issues are reconciled against current evidence without closing work that is not technically complete.
11. A draft PR is opened for independent review. Nothing is merged or promoted.

## Non-authorizations

Do not:

- merge or promote Production;
- modify Figma or product design;
- create, modify or use real users;
- apply hosted Supabase migrations or execute hosted DDL/DML;
- change Auth providers, Storage, environment variables or secrets;
- remove or rotate credentials;
- activate real sources or provider calls;
- upload real/client/confidential data;
- claim Production-ready, pilot-ready, official parcel, official zoning, cadastral validation, ownership verification or certified valuation status.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
