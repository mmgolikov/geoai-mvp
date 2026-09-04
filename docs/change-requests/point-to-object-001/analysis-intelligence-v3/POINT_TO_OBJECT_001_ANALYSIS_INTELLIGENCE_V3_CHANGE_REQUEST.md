# POINT_TO_OBJECT_001 Analysis Intelligence V3 Change Request

Status: Founder-approved for implementation on the isolated protected Preview; Production and `main` excluded

Date: 2026-09-03

Owner: GeoAI product delivery team

Authority: Founder feedback in Main on 2026-09-03 approved reuse of the existing OpenAI API credential, model reconfiguration, a stronger focused-analysis path, and a user-facing analysis-depth selector. This authority does not permit a merge to `main` or a Production deployment.

## Problem

The live map and object selection now work, but the analysis is not decision-useful. The current `gpt-4o-mini` response is constrained to a narrow projection and the server discards most model output, rebuilding the visible result as a repetitive OpenStreetMap record summary. A valid first request can also fail post-generation evidence validation and require a manual retry.

## Business reason

The prototype must demonstrate the product thesis: a selected spatial object becomes an evidence-bound decision brief for a developer, investor or asset owner. A source record is necessary evidence, but it is not the product outcome. The user should receive implications, opportunity hypotheses, material risks and a prioritized validation plan without unsupported cadastral, planning, ownership or valuation claims.

## Users

- Founder and invited UAE/Singapore prototype reviewers.
- Development, investment and asset-management users performing early screening.
- Not authorized for legal, cadastral, zoning, planning, ownership, valuation or investment conclusions.

## Affected surfaces

- `/prototype/point-to-object/analysis` result hierarchy and focused-analysis controls.
- `/api/prototype/point-to-object/ai` bounded request schema and server-side model router.
- OpenAI Responses API request, strict structured-output schema, validation and repair policy.
- Browser session parsing, point-to-object contract tests and Preview deployment evidence.
- No change to released Product navigation, Supabase, Auth policy, Production or `main`.

## Product decision

1. Replace the visible record-summary-first layout with a decision-first result: decision brief, key signals, surrounding context, opportunity hypotheses, risks and prioritized validation actions.
2. Retain source facts and lineage in a secondary evidence details surface. Every meaningful AI claim must cite an allowed evidence reference or be explicitly labelled as a hypothesis.
3. Add user-facing depth modes `Quick`, `Standard` and `Deep`. The browser sends only the mode; model ID, reasoning effort, output budget, retry and tool policy remain server-controlled.
4. Add optional perspective and time-horizon settings without exposing raw model names in the primary UI.
5. Use the GPT-5.6 family as the stable Preview baseline. GPT-6 Astra is not a default while broad API access is still rolling out and must remain a later access-smoke experiment.
6. Use a stronger floor for custom/focused analysis than for a quick initial profile.
7. Preserve `store: false`, strict JSON Schema output, no silent mock fallback and no automatic downgrade to a weaker model.
8. On a valid provider response that fails application evidence validation, perform one bounded repair attempt using the configured stronger repair route. If repair fails, return an honest recoverable unavailable state without exposing internal validator wording.

## Model routing

| User mode | Initial analysis | Focused/custom analysis | Reasoning |
| --- | --- | --- | --- |
| Quick | `gpt-5.6-luna` | `gpt-5.6-terra` | low |
| Standard | `gpt-5.6-terra` | `gpt-5.6-sol` | medium |
| Deep | `gpt-5.6-sol` | `gpt-5.6-sol` | high |

One invalid-output repair uses Terra/low for Quick and Sol/medium for Standard or Deep; the Deep repair is deliberately bounded below the initial Deep effort to preserve the shared route deadline. Exact model IDs remain server defaults with validated environment overrides. `max` reasoning is excluded from the interactive UI until representative evals show a measurable gain that justifies latency and cost.

## Source and evidence decision

- Confirmed identity, classification, address, geometry relationship and allowlisted attributes continue to come from the server-resolved OpenStreetMap/Nominatim record.
- Public Overpass remains excluded as a runtime dependency under the prior source decision; no attempt is made to bypass that control.
- Server-side extraction from the public OpenFreeMap tile service is `HOLD_RIGHTS_PERMISSION_REQUIRED` and is not shipped. OpenFreeMap Terms prohibit automated collection without permission, and the existing live-source decision authorizes interactive rendering only.
- Client-rendered nearby labels remain visual-only context and are never promoted to confirmed analytical evidence.
- The compliant next-stage route is a separately approved Overture Maps or controlled/self-hosted extract with a documented licence/terms receipt, release pin, lineage, bounded ingestion and database ownership. It is outside this Preview change.
- Web search is not silently enabled. It is a subsequent evidence scope requiring citation rendering, source capture and a two-stage retrieval/synthesis contract.

## Data and engineering controls

- Normalize and bound goal, depth, perspective, horizon and user question on both client and server.
- Treat manually edited text as the `custom` goal, keep preset wording role-neutral, and retain the submitted question in the bounded response receipt/session cache.
- Do not allow the browser to select a model, reasoning effort, output budget or tool.
- Send public object identity and address only as inert, length-bounded evidence data; arbitrary OSM prose, contact fields, raw payloads, geometry and secrets remain excluded.
- Do not perform server-side scraping, decoding or analytical extraction from public rendered-tile services unless a provider terms receipt explicitly authorizes it.
- Preserve the exact mandatory caveat and reject prohibited claims about official parcel identity, ownership/title, zoning, approvals, exact value, building condition, guaranteed best use or return.
- Require claim-to-evidence semantic compatibility for coordinates, geometry, mapped attributes, classification and nearby-distance statements; reject unsourced operational/market metrics and speculative observations mislabeled as observed.
- Share a 115-second route deadline across source resolution and generation and fail closed before the route's 120-second platform limit. This allows one bounded repair for structured reasoning while remaining well below Vercel's current Fluid Compute limits.
- Pin Responses API processing to the Standard service tier. The success envelope and methodology receipt carry literal analysis schema version `3`; the receipt identifies the accepted model/effort plus a per-provider-attempt route ledger with model, effort, request ID, ordinary/cached/cache-write token usage and rate-based estimated cost.

## Risks and controls

| Risk | Control |
| --- | --- |
| Stronger model creates plausible unsupported advice | Evidence-reference allowlist, explicit hypothesis class, prohibited-claim validator and mandatory caveat |
| User assumes depth means certainty | Depth descriptions explain work level; confidence and evidence quality remain separate |
| Latency rises materially | Quick/Standard/Deep routing, bounded output budgets, one repair maximum and measured Preview telemetry |
| Existing key lacks GPT-5.6 entitlement | Exact Preview access smoke; fail closed and adjust only the isolated branch configuration |
| First response fails validation | Deterministic validator diagnostics server-side and one stronger repair, without exposing internal details to the UI |
| Rendered nearby labels are treated as complete | Label as visible open-map context only; no absence, route, service-level or completeness claim |
| Public map tiles are repurposed as an analytical data feed | Server-side OpenFreeMap extraction is held; use only a separately approved Overture or controlled/self-hosted data route |
| Public web data becomes untraceable | Do not enable web search until clickable citations and retrieval receipts are implemented |

## Acceptance criteria

- The first visible result is a concise decision brief, not a description of a resolver response.
- The same object produces materially different answers for object profile, development screening, redevelopment and due diligence goals.
- At least three useful implications are explicitly separated into observed, derived or hypothesis classes.
- Visible nearby map labels, when present, are explicitly marked visual-only and are not cited as analytical evidence.
- Opportunity and risk items explain why they matter and what evidence is still required.
- Validation actions are prioritized and state which decision they can change.
- `Quick`, `Standard` and `Deep` controls are usable on desktop and mobile; the server receipt proves the actual routed model and reasoning effort.
- The cost receipt accounts separately for ordinary input, cached reads, GPT-5.6 cache writes and output across every bounded attempt; incomplete usage fails closed instead of showing a partial estimate.
- Aggregate usage and estimated cost reconcile exactly to the one- or two-attempt ledger; if repair changes the model, the UI shows the complete model route rather than attributing all usage to the accepted attempt.
- Nearby context is projected or rendered only when its name, feature class, source feature identity and distance match the canonical structured `EVD-CONTEXT-N` receipt.
- Focused/custom Standard analysis uses a stronger model than the initial Standard analysis.
- An invalid first model result triggers at most one repair and does not require the user to manually retry for a routine schema/evidence mismatch.
- Failed or cancelled provider responses cannot be accepted solely because they contain partial output text.
- No unsupported official/cadastral/zoning/ownership/valuation claim passes validation.
- TypeScript, point-to-object contract, build, secret hygiene, API access/inventory and focused browser checks pass.
- Exact-head protected Vercel Preview smoke succeeds. Production and `main` remain unchanged.

## Rollback

Revert the V3 commits or discard the isolated branch. No database migration, Supabase mutation, Auth change, Production deployment or `main` merge is part of this change.

Mandatory decision boundary:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
