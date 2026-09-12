# September 10 — Map reliability, unified Project Hub and landing

Status: Owner-approved implementation; not accepted or released
Date: 2026-09-10
Owner: GeoAI Main
Baseline: Existing Sprint06 Preview branch `codex/sprint06-mobile-decision-v1`; exact deployment receipts remain in the private operational log.

## Problem and business reason

Founder testing on iPhone 15 Pro / iOS 27 RC / Safari and macOS Chrome exposed source buildings remaining under generated concepts, unstable complex-footprint 3D highlights, missed selection, repeated object-context failures, a misleading permanent resolving state and Find failures. The Projects entry exposes two competing products. The landing does not demonstrate the three actions around a centered object.

## Authority and boundaries

The September 10 requests approve these corrections on the existing Preview branch. They explicitly supersede the older requirement to preserve the Data readiness / Saved spatial work split in the product Projects UI. Existing source evidence, stored legitimate user work and owner isolation must be preserved. No main merge, Production change, hosted Supabase/Auth change, provider key, plan or new paid service is authorized by this CR. Contact-form submission is proposal-only. Collaboration is a future extension, not an activated feature. The old accepted test receipts remain evidence only for their bounded cases; physical-device defects reopen the affected acceptance areas.

## Work packages

1. MAP10: diagnose and correct replacement lifecycle, whole/outside/multipart geometry safety, complex selected-object rendering and hit testing; align the 3D volume control. Do not hide unrelated districts or approximate a whole complex building with an invented uniform prism.
2. SOURCE10: distinguish application rate limits, upstream rate limits, upstream timeout and true empty results. Correct context/Find request lifecycle, stale-response protection and retry UX without removing protective limits or inventing source results.
3. HUB10: one `/projects` Project Hub; three summary widgets for Analyse, Find and Create; real saved projects/results below with query, type and sort controls. Preserve open/reopen, analyses, comparisons and generated geometry. No mock reports, duplicate readiness navigation or B2B/B2C control here. Desktop widgets are horizontal; mobile must fit and remain usable.
4. LANDING10: desktop and mobile Open map / Leave a request actions, centered genuine selected object and adjacent Analyse / Find / Create bubbles. Keep attribution. Propose a compact form with full name, profile selection, required email and optional phone; do not transmit or persist leads yet.

## Source audit and observed evidence

Current branch matches the baseline and has no tracked modifications at intake. Existing local Playwright outputs remain untracked/private. Runtime logs confirm area-context and Find timeouts and repeated context rate-limit responses. The UI chooses resolving copy from missing resolvedObject instead of the request's actual state. These observations require causal investigation; they are not proof of one shared upstream failure. Exact timestamps and deployment identifiers remain in the private operational log.

The Documentation Index, current release/architecture/data/roadmap/QA/backlog authorities were inspected against the newer external Sprint06 receipt. Their older release tuples remain historical, not authority to modify Production. No new source integration or protected persistence is part of this slice.

## Acceptance

- Reproduce complex geometry near DIFC / The Empty Quarter Gallery, not only the prior Shangri La rectangle.
- Selected highlight must not overlap an identical extrusion surface, lose holes/components or invent elevation; nonselectable cases get an accurate bounded fallback.
- Generation/source toggle, A/B, reset, delete/undo, zoom and style reload preserve intended inside/outside buildings; test boundary and multipart cases.
- Context failure ends loading, preserves selection/question and exposes actionable retry state; 429 does not trigger automatic retry storms.
- Find succeeds for a known populated, bounded view; true zero results and unavailable provider are distinct. Do not silently broaden criteria or claim completeness.
- One Project Hub opens existing results, filters/searches correctly, preserves storage owner scope and contains no fake successful reports or collaborative-sharing controls.
- Landing at 390 px and desktop: centered selection, readable three-action bubbles, no overlap/overflow, keyboard/touch controls.
- Targeted contracts plus lint/build, combined browser/identity regression checks; exact Preview verification before handoff. Physical iOS RC acceptance requires founder retest; local WebKit is not that device.

## Delivery and rollback

Independent lanes own separate files; Main owns integration, landing and final checks. No uncontrolled background paid requests. Preview baseline above is the rollback reference. Exact successor SHA, CI, deployment, known limits and test coverage will be recorded after verification. Sensitive operational details and costs stay in the local/private receipt rather than public GitHub.
