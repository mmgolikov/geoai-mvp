# CR-DEV7-003 — Architecture Rendering & Exact Implementation Mapping v1

Status: In implementation review

Branch: `dev7-architecture-rendering-exact-mapping-v1`

Baseline: `main` at `754a9c68cd1ee7af80731f1b779df023d54e901e`

Publication decision: Not passed

## Problem

The architecture registry contained schematic v0.9 Mermaid text but no committed render, no freshness control, incomplete artifact coverage and a stale architecture narrative that contradicted the implemented API, repository and runtime-readiness foundation. Reviewers could not prove that diagrams matched code.

## Authorized change

1. Replace schematic canonical sources with implementation-aligned PlantUML sources and committed SVGs.
2. Cover the required C4, BPMN-aligned flow, state, sequence, ERD, data-lineage, activity, deployment and API views.
3. Add exact file/symbol, route, schema and payload mappings.
4. Add missing/invalid/unapproved/approved/rollback and actual-layer/attribution traces.
5. Add deterministic render provenance and a permanent CI check for artifact completeness, freshness and mapped code references.
6. Update repository architecture guidance to the current bounded runtime.
7. Prepare, but do not self-pass, the independent review/publication gate.

## Out of scope

- Product feature or UI behavior changes
- Real/provider geometry or a delivery bundle
- Spatial B2B/B2C activation
- Supabase migration application, Auth/RLS/Storage activation or data mutation
- Environment variables, secrets or Figma changes
- Merge, Vercel Production deployment or release promotion
- Treating a diagram as proof that a conditional runtime path is active

## Pre-review correction note

Codex pre-review identified and corrected inaccurate ERD field/relationship labels, deployment ownership semantics, missing explicit C4 stereotypes and an artifact-version lineage reset before independent dispatch. The review package now also records two unresolved decisions: whether the bounded BPMN-aligned activity rendering is sufficient without BPMN 2.0 XML, and whether the ordered migration source matches a fresh/applied schema at column and constraint level. Neither issue is self-approved by this change request.

## Deliverables

- 11 canonical `.puml` files and 11 committed SVG renders
- `architecture-artifact-manifest.json` with exact implementation references
- `rendered/render-manifest.json` with pinned renderer and SHA-256 provenance
- architecture implementation map, trace matrix and independent review packet
- architecture change request and QA checklist
- `render:architecture` and `test:architecture` scripts
- permanent Quality Gate architecture evidence
- current `docs/architecture.md`, artifact registry and `AGENTS.md` governance context

## Acceptance criteria

- All required artifacts exist, render and are legible.
- Each artifact has an ID, version, Draft/Review status, `approved=false`, canonical source, SVG and live implementation references.
- Every referenced file and mapped symbol exists on the tested commit.
- Source and SVG digests match the committed render manifest.
- The package distinguishes current runtime, conditional code foundation and future authorization.
- Missing, invalid, unapproved, approved, rollback and layer/attribution parity paths are traceable to automated evidence.
- `npm run test:architecture`, existing gates, lint and build pass.
- PR remains draft/HOLD until independent artifact acceptance.

## Rollback

Revert this CR commit. Product runtime is unchanged because the package modifies documentation, generated SVG evidence, verification scripts and CI only.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
