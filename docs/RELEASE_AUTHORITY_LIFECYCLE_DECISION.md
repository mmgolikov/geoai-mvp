# GeoAI Release Authority Lifecycle Decision

Status: Active release-governance decision
Last verified: 2026-07-21
Owner: GeoAI Release Engineering
Authority: Current release-authority lifecycle model for repository docs and machine receipts
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [System Stabilization Audit v2](SYSTEM_STABILIZATION_AUDIT_V2_2026_07_21.md) · [Current Release Receipt](CURRENT_RELEASE_RECEIPT.json)

## Decision

`docs/CURRENT_RELEASE_RECEIPT.json` remains the current machine-readable release authority, but it must be updated after each merge-to-main plus Production alias verification. Dated receipts, PR bodies and historical release notes remain evidence only and must not be cited as current runtime truth unless the Documentation Index and Current Release State explicitly say so.

CR 09.23 updates the receipt from the stale PR #97 tuple to the current PR #106 tuple:

| Field | Current authority |
| --- | --- |
| Released PR | PR #106 |
| `main` SHA | `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b` |
| Production deployment | `dpl_6RC2ohEdLBjiV82k758tFMkaDB9X` |
| Production URL | https://geoai-mvp.vercel.app |
| Rollback deployment | `dpl_ERVqZPD5GAGDLjAVhMcPF2HT5Br7` |
| Product stage | `public_demo_prototype` |

## Lifecycle Rules

1. After a PR merges to `main`, query GitHub Actions for a `push` Quality Gate on the exact merge SHA.
2. Query Vercel for the Production alias and exact deployment ID.
3. Run or record route smoke for the declared release routes.
4. Update `CURRENT_RELEASE_RECEIPT.json`, `CURRENT_RELEASE_STATE.md`, `DOCUMENTATION_INDEX.md`, README, AGENTS, roadmap, QA checklist and backlog where those files state current runtime facts.
5. Keep historical PR and audit evidence intact, but label it historical or scoped.
6. Never use a rollback deployment as current Production.
7. Never use a closed PR body as current authority after a newer merged PR unless the receipt still points to that PR.

## Non-Authorizations

This decision does not authorize a merge, Production deployment, Supabase migration/write, Auth/provider/Storage activation, secret change, Figma/design work, real-user execution or protected-data operation.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
