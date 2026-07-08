# Codex UI v2.2 Isolated Preview Approval

Date: 2026-07-08  
Repository: `mmgolikov/geoai-mvp`  
Approved by: Founder / product owner  
Scope: First isolated Codex implementation test for UI v2.2  
Target branch: `codex/ui-v22-isolated-preview`

## Executive Summary

This document is the explicit founder approval for Codex to start the first isolated implementation test for the GeoAI UI v2.2 design direction.

This approval clears the previous design-governance blocker **only for the isolated preview branch** named:

`codex/ui-v22-isolated-preview`

It does **not** approve merge to `main`, production deployment, Supabase changes, auth changes, secrets/env changes, or any production/pilot-ready claim.

## What Is Approved

Codex may proceed with the first isolated preview implementation test:

1. Create a new branch from fresh `origin/main`:
   `codex/ui-v22-isolated-preview`
2. Implement UI v2.2 styling and layout improvements based on the current Figma design row.
3. Preserve existing product behavior:
   - maps,
   - workspace flows,
   - demo analysis,
   - AI/API hooks if present,
   - report/export behavior,
   - mobile map picker behavior,
   - routes and navigation.
4. Open a **draft PR** for review when ready.
5. Use Vercel preview if automatically created.
6. Run available tests/checks and report results.

## What Is Not Approved

Codex must not:

- merge the PR;
- modify production deployment manually;
- change Supabase schema, migrations, RLS, auth hardening, storage, secrets or env vars;
- change billing or production configuration;
- make official/live/cadastral/valuation/production-ready/pilot-ready claims;
- convert the product into static screenshots;
- remove existing functional behavior to make styling easier.

## Elevated Git Permission Approval

Codex previously reported a local `.git` write permission restriction.

Approved action:

- Codex may use the minimal approved elevated git execution required to create and work on the isolated branch:
  `codex/ui-v22-isolated-preview`

This approval is limited to normal branch/commit operations for this isolated preview branch only. It does not authorize protected branch changes, production deployments, Supabase changes, secrets/env changes, or direct changes to `main` beyond this documentation approval artifact.

## Figma Source of Truth

Figma file key:

`TAzDqOvRCw1mQGMU3Y4S9H`

Current Product Design row:

| Order | Frame | Node |
|---:|---|---:|
| 00 | `CURRENT MASTER / START HERE` | `169:2` |
| 01 | `Landing / current v1.8` | `166:2` |
| 02 | `Workspace setup / current` | `119:2` |
| 03 | `Selected AOI / current` | `119:106` |
| 04 | `Criteria candidates / current` | `119:220` |
| 05 | `ExpressDashboard / current` | `119:366` |
| 06 | `ComparisonDashboard / current` | `119:590` |
| 07 | `ReportPreview / current` | `119:804` |
| 08 | `Project Hub / current` | `119:971` |
| 09 | `Data Readiness / current` | `119:1046` |
| 10 | `Mobile workflow / current` | `119:1134` |
| 11 | `Mobile map picker / current` | `119:1164` |
| 12 | `Codex state map / design-to-code reference` | `179:53` |

## Required PR Labeling / Body Language

The PR must clearly state:

> This PR is isolated preview work. Do not merge without founder approval.

It must also include:

- branch name;
- summary of changes;
- routes/screens changed;
- behavior preserved;
- tests/checks run;
- preview URL if available;
- known issues/limitations;
- confirmation that `main`, production, Supabase, auth, secrets and env vars were not changed by the implementation branch.

## Data Honesty Requirement

Mandatory caveat remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

No official/live/cadastral/valuation/production-ready or pilot-ready claims are approved.

## Current Decision

Codex may proceed now with the first isolated UI v2.2 implementation test on:

`codex/ui-v22-isolated-preview`

This is a first test, not a release approval.
