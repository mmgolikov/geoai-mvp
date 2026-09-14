# GeoAI Design System Components v1

Status: active component system / implementation blocked  
Date: 2026-07-07  
Branch: `design-audit-v1`

## Executive summary

This document defines the first structured component layer for GeoAI Light.

It follows `GeoAI Brand Foundation v1` and keeps the current product geometry intact. The goal is to style the existing product states rather than invent a new application structure.

## Figma

Page:

`02 — Design System`

Current frame:

`Design System v1.0 / current`

Previous frames on the page were moved left as version/reference material.

## Component scope

The v1.0 component kit includes:

- token summary;
- buttons and action states;
- segmented controls;
- inputs and selectors;
- right AnalysisPanel components;
- decision cards;
- caveat bar;
- source labels;
- readiness table;
- map and layer components;
- usage rules.

## Buttons and actions

Rules:

- one main action per state;
- primary CTA uses Signal Blue `#2563EB`;
- active mode uses Deep Teal `#155E75`;
- secondary actions use neutral surfaces and borders;
- disabled actions use soft neutral states.

## Right AnalysisPanel

The right panel component system is built around the existing 380px product panel and includes:

- B2B / B2C tabs;
- project block;
- role / scenario block;
- candidate search block;
- selected point / object / AOI block;
- footer area with Add to compare and primary CTA.

This does not create a new navigation model.

## Decision cards and caveats

Cards must map to one of:

- context;
- evidence;
- decision;
- action;
- output.

Decorative empty cards are not allowed.

The caveat bar must keep validation language visible near decision output.

## Source labels

Required source labels include:

- snapshot;
- open context;
- validation required;
- not official.

## Readiness table

The readiness table component must include:

- source group;
- status;
- data mode;
- records;
- confidence;
- next validation step.

Validation gaps must not be hidden below the fold.

## Map and layer components

Map styling should remain light, precise and decision-oriented.

Layer controls include:

- Land plots;
- Transport;
- Prices;
- Climate;
- Zoning.

Selected AOI / object uses Signal Blue. Open context uses Geo Teal. Validation gaps use Amber.

## Usage rules

- No decorative empty cards.
- No more than two strong accent colors per screen.
- Amber is only for validation, caveat or risk-gap states.
- The 380px AnalysisPanel and main canvas geometry are preserved.
- Before editing current, duplicate it left as the previous version.

## Required caveat

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Decision

No implementation handoff is approved. This is design governance and component preparation only.
