# GeoAI Pilot Workflow & Deliverables v2.0

Date: 2026-06-23

GeoAI Pilot Workflow & Deliverables v2.0 turns the demo workspace into a structured client pilot workflow layer. It helps a user understand what pilot is being configured, which business decision it supports, what client data is still needed, what GeoAI has generated and what remains blocked by validation.

This is not an auth system, secure file store, enterprise workflow engine, official validation connector or durable production storage layer.

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

Readiness caveat:

> Readiness reflects workflow completeness only; it is not an investment, legal, planning or valuation conclusion.

Storage caveat:

> Local/API fallback is not durable production storage.

## What It Adds

- Reusable project-scoped pilot workflow types.
- `GET /api/pilot-workflow?projectKey=...` summary endpoint.
- Local/API fallback status updates for client inputs and deliverables.
- Persona-specific default templates for fund, developer and bank demo projects.
- Compact Pilot Workflow section on `/projects`.
- Compact/collapsed Pilot Context block in the Workspace command panel.
- Client input checklist with lightweight status controls.
- Deliverables workflow with report/memo package status.
- Conservative workflow-readiness score with drivers, blockers and next actions.

## Model

Core types live in:

- `src/types/pilot-workflow.ts`
- `src/lib/pilot-workflow/pilot-workflow-types.ts`
- `src/lib/pilot-workflow/pilot-workflow-summary.ts`
- `src/lib/repositories/pilot-workflow-repository.ts`

Entities:

- `PilotWorkflow`
- `ClientInputItem`
- `PilotDeliverableStatus`
- `PilotReadinessSummary`

Project scoping is explicit through `projectId` and `projectKey`.

## Workflow Stages

- `draft`
- `configured`
- `data_collection`
- `analysis_in_progress`
- `validation_in_progress`
- `deliverables_ready_for_review`
- `completed_with_caveats`

The stage is a workflow marker only. It does not mean the output is officially validated or decision-grade.

## Client Input Checklist

Supported input statuses:

- `missing`
- `requested`
- `provided_unvalidated`
- `in_review`
- `accepted_for_screening`
- `blocked`
- `not_applicable`

`accepted_for_screening` means the item can support a screening workflow. It does not mean the data is official, legally validated or suitable for final decisions.

## Deliverables Workflow

Supported deliverable statuses:

- `planned`
- `in_progress`
- `generated`
- `ready_for_review`
- `validation_required`
- `blocked`

Generated deliverables remain caveated. `ready_for_review` means ready for client review with caveats, not officially validated.

## Readiness Scoring Logic

The readiness score means workflow completeness for review only.

Current weighting:

- 10% configured workflow
- 15% AOI availability
- 20% client input completeness
- 20% analyses/reports/comparisons
- 15% Data Room evidence
- 20% validation checklist progress

Caps and safeguards:

- If no AOIs are available, the score is capped.
- If no client inputs are provided, the score is capped.
- If validation is incomplete, the label cannot exceed `validation_required`.
- Sample fallback context remains clearly caveated.

Labels:

- `setup_required`
- `data_required`
- `analysis_ready`
- `validation_required`
- `review_ready_with_caveats`

## Relationship To Data Room v1.9

Pilot Workflow v2.0 layers on top of Client Data Room v1.9. It reads:

- AOI evidence
- uploaded metadata
- analyses
- reports
- comparisons
- validation checklist progress
- external source context

It does not duplicate Data Room storage logic and does not add durable production storage.

## UI Placement

Projects dashboard:

- Compact Pilot Workflow section near Client Data Room.
- Stage, decision question and readiness score.
- Top blockers and next actions.
- Client input progress.
- Deliverable progress.
- Compact editable input and deliverable status lists.
- Report Package Status section driven by workflow deliverables.

Workspace command panel:

- Collapsed Pilot Context block below the analysis-first controls.
- Scenario and Custom Query remain near the top.
- Run Express Analysis remains in the pinned footer.
- Pilot Context is secondary and compact by default.

## Future Work

- Durable storage.
- Auth and RBAC.
- Audit trail.
- Formal pilot contracts.
- Client organization workspace.
- Official validation connectors.
- Structured report package export.
- Source appendix, validation appendix, AOI factsheet and comparison memo bundle.
