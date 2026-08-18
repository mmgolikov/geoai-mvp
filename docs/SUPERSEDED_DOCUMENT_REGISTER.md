# GeoAI Superseded and Duplicate Authority Register

Status: Active documentation lifecycle authority
Last verified: 2026-08-18
Owner: GeoAI Documentation Governance
Authority: Operational disposition of historical, duplicate and excluded authorities
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Product Baseline](PRODUCT_BASELINE_AND_READINESS.md) · [Authority Registry](EXTERNAL_AUTHORITY_REGISTRY.json)

Files in this register are retained in place. They must not be deleted or renamed as part of baseline recovery. A superseded or duplicate record may remain useful historical evidence, but it cannot override its named successor.

| Path or record | Lifecycle | Disposition | Current successor |
| --- | --- | --- | --- |
| `docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json` | Historical PR #106 release snapshot | `superseded_do_not_use_as_current` | `docs/CURRENT_RELEASE_STATE.md` plus live external evidence |
| `docs/FULL_SYSTEM_AUDIT_2026_07_16.md` | Historical audit and PR #97/PR #106 remediation record | `historical_evidence` | `docs/CURRENT_RELEASE_STATE.md` and `docs/PRODUCT_BASELINE_AND_READINESS.md` |
| `docs/CODEX_BACKLOG_2026_07_16.md` | Dated executable backlog | `historical_scoped_backlog` | `docs/PRODUCT_BASELINE_AND_READINESS.md` and `docs/roadmap.md` |
| `docs/SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md` | Dated rehearsal/development owner path | `historical_not_apply_ready` | `docs/PRODUCT_BASELINE_AND_READINESS.md`; a future exact-target CR is required |
| `docs/CR_10_02_DESIGN_FOUNDATION_SHARED_SHELL.md` and v3.2.1 receipts | Historical design provenance incorporated before PR #113 | `released_history_not_current_visual_authority` | Production PR #113 baseline; live Figma remains partial |
| `docs/DESIGN_SYSTEM_V3_2_AUTHORITY_REGISTRY.json` | Historical v3.2.1 branch registry | `superseded_release_status` | `docs/EXTERNAL_AUTHORITY_REGISTRY.json` |
| `docs/CONFLUENCE_SYNC_MAP.json`, CHG-17/18/19 receipts | Historical Confluence sync evidence | `partial_historical_readback` | `docs/EXTERNAL_AUTHORITY_REGISTRY.json`; current Hub read-back remains open |
| `docs/CURRENT_RELEASE_STATE_*.md`, `docs/CHECKPOINT_*`, `docs/RELEASE_*`, dated QA/CR files | Point-in-time or scoped evidence | `historical_or_scoped` | Follow `docs/DOCUMENTATION_INDEX.md` |
| `.github/workflows/apply-founder-ux-exact-head-qa-hardening.yml` | Invalid self-mutating branch helper | `superseded_retired_in_place` | `.github/workflows/geoai-quality-gate.yml` |
| PR #143 / `product/gcc-real-estate-decision-platform-v1` / `e92fb5d8e8d83de72ee4c4376d958ce598c00536` | Draft candidate outside the released lineage | `excluded_non_authority` | No successor; file-level salvage requires a separate approved CR |

## Semantic duplicate groups

No byte-identical Markdown duplicates were found. The duplication problem is semantic:

- release tuples appear across README, AGENTS, release state, architecture, roadmap and historical audit files;
- readiness claims appear across roadmap, backlog, QA and dated pilot documents;
- design authority appears across CR 10.02, token/component receipts, Figma notes and released runtime files;
- Supabase state appears across the dated audit, runbook, receipt and current product guidance.

The SSOT map in `DOCUMENTATION_INDEX.md` assigns one current owner to each domain. Historical records retain their original facts and must link forward rather than be silently reused.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
