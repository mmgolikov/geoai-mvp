# GeoAI UI v2.2 Isolated Preview Release Note

Status: isolated preview branch only  
Branch: `codex/ui-v22-isolated-preview`  
Approval source: `docs/design/CODEX_UI_V22_ISOLATED_PREVIEW_APPROVAL.md`

## Summary

This preview branch applies UI v2.2 styling and layout updates across the existing GeoAI investor/client demo surfaces while preserving current product behavior.

Patch v2.2.1 restores the production landing narrative sections, tightens landing data-honesty wording, restores printable-route-first report export behavior, cleans up the Project Hub hero-control card and documents the Data Readiness route strategy.

## Scope

- Landing page hero, product visual, workflow strip, workflow cards, scenario examples, source-lineage band, output cards and demo workspace CTA.
- Workspace command panel state header, segment switcher and pinned footer-safe styling.
- Map and report-map visual accents updated to spatial blue and validation gold.
- Express dashboard, comparison dashboard and report preview action/header styling.
- Project Hub hero control card, KPI cards and Data Readiness / Source Lineage hero-control treatment.
- Design-to-code state mapping in `docs/design/CODEX_UI_V22_STATE_MAP.md`.

## Route Strategy

- Project Hub exposes Data Readiness / Source Lineage at `/projects#data-readiness`.
- `/data-readiness` is a lightweight wrapper route that redirects to `/projects#data-readiness`.

## Not Changed

- No production deployment was performed.
- No Supabase schema, migration, RLS, storage, auth hardening, secrets or environment variables were changed.
- No API contract, AI/OpenAI hook, report/export behavior, workspace flow, mobile map picker behavior, map initialization or data persistence behavior was intentionally changed.

## Data Honesty

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

This preview does not make official, live-data, cadastral, valuation or release-readiness claims.
