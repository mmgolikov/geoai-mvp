# GeoAI Design QA Gate After Data Foundation v1.2

Status: design QA active / implementation blocked  
Date: 2026-07-05  
Branch: `geoai-design-qa-v12`  
Base: fresh `main` after PR #33 / Data Foundation v1.2

## Executive summary

This document records the post-PR #33 design QA gate. It is docs/design-governance only and does not approve implementation.

Design work must preserve the current validated prototype UX and must not overwrite the Data Foundation v1.2 `/projects` Data Readiness / Source Lineage block.

## Source audit

- PR #33 is merged to `main`.
- `main` includes Data Foundation v1.2.
- `/projects` includes Data Readiness / Source Lineage.
- PR #32 remains open as a legacy docs/design-governance PR and is not approved for implementation handoff.
- This branch is created from fresh `main` after PR #33.

## UX preservation rule

Design must preserve:

- map-first flow;
- criteria-first flow;
- main canvas plus right command panel;
- desktop right panel around 380px;
- fixed bottom action placement in the panel;
- analysis, comparison and report as main canvas states;
- compact first dashboard viewport;
- current report/export state logic.

Visual design may improve:

- typography;
- surfaces;
- spacing polish;
- borders and shadows;
- component hierarchy;
- controlled GeoAI Light palette.

## Data Readiness / Source Lineage design requirement

Projects / Readiness design must preserve or explicitly include:

- source group name;
- status;
- data mode;
- record count where available;
- confidence;
- caveat;
- next validation step.

## Data honesty gate

Never claim live official integration, official parcel, official zoning, cadastral validation, ownership verification, certified valuation, production-ready status or pilot-ready status.

Required caveat:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Manual QA issue log

| ID | Area | Issue | Severity | Status |
| --- | --- | --- | --- | --- |
| DQA-01 | Legacy Figma V6 | Old generated drafts are not implementation source | High | Blocked |
| DQA-02 | Page 14 | Prototype-faithful frames require manual visual QA | High | Open |
| DQA-03 | Projects / Readiness | Data Readiness / Source Lineage must be preserved | Critical | Protected |
| DQA-04 | Responsive | Mobile/tablet must not be squeezed desktop | High | Open |
| DQA-05 | Data honesty | Caveats and source state must be visible near decisions | Critical | Active |

## Figma status

Figma page `14 — Prototype-faithful Visual Redesign` now includes prototype-faithful frames and a Projects / Readiness Data Readiness / Source Lineage treatment.

This is still design QA material only. It is not a Codex implementation source until visual QA passes.

## Current decision

Design implementation remains blocked.

No Codex prompt should be created until:

1. Figma page 14 passes manual visual QA.
2. Projects / Readiness Data Readiness treatment is visually accepted.
3. Data honesty labels pass review.
4. This docs branch or a successor docs branch is accepted.
