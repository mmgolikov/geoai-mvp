# POINT_TO_OBJECT_001 Clickable Prototype Change Request

Status: Approved implementation scope · Candidate only · Not Released
Date: 2026-09-01
Owner: dev_1
Authority: `POINT_TO_OBJECT_001 · CLICKABLE PROTOTYPE V1 · AUTONOMOUS IMPLEMENTATION`

## Problem

GeoAI has a deterministic point-to-object core and two governed frozen OpenStreetMap-derived case packs, but no bounded product surface where a reviewer can click a real geometry and inspect the resulting identity, context, provenance and uncertainty. The released Product remains fixture-bounded and must not be redesigned or activated for real-source runtime access.

## Business reason

A directly explorable prototype is the shortest honest way to test whether source-backed object selection is understandable and useful before investing in persistence, enterprise controls, live providers or broader decision workflows. The prototype must demonstrate traceability rather than readiness or official authority.

## Users

- Internal GeoAI product, engineering and data reviewers.
- External Preview reviewers evaluating the bounded interaction and evidence model.
- Not authorized for confidential client work, operational planning or official validation.

## Candidate authority and inputs

- Released base: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`.
- E1 deterministic core: `fddd003142b6d4d97cecc1fcb7fb25a65a449610`.
- E1 + Security Gate integration: `41509974e39248fa3c53ce8b2ca20e48e9a6a7bc`.
- Frozen data commits: `5d0633ab037e6953b4861d8658026b419e5702fc` and `f81de7122d539f794d079949c91613af0b8f9428`.
- Rights decision: `P2O-RIGHTS-OSM-ODBL-001`, state `cleared`, external Preview conditional on visible attribution, licence/copyright link, reachable source offer and no official/endorsement claim.
- Product System v3.2.2 released visual language is preserved. Figma and PR #143 are not implementation authorities.

## Affected surfaces

- New isolated route: `/prototype/point-to-object`.
- New prototype-only server projection for immutable case packs.
- New client interaction surface for preset selection, polygon/point selection, evidence inspection and an explicitly user-triggered grounded OpenAI interpretation.
- New Preview-only same-origin AI endpoint with a browser challenge, bounded rate limit, strict evidence binding and fail-closed output validation.
- New focused contract and browser tests.
- No changes to released top-level navigation, Workspace, Projects, Explore, Auth or Production routes.

## Data contract

- Inputs are immutable, repository-backed OSM-derived snapshots for Dubai Museum of the Future and Singapore Marina Bay.
- Public Overpass and Nominatim runtime calls are prohibited.
- Geometry is open community context, not an official parcel, cadastral boundary, zoning record, ownership record, approval or valuation.
- Resolution state remains independent from evidence quality and operational status.
- Missing records do not prove real-world absence.
- The server sends a minimized display projection; raw acquisition bodies and arbitrary tags are not sent to the client.
- Source attribution, snapshot/acquisition time, source feature ID, freshness limitation, ODbL link and source offer remain visible.

## Engineering approach

1. Merge the frozen data commit chain into the verified E1 + Security Gate integration without rewriting source history.
2. Add a server-only file-backed repository adapter that maps eligible frozen features into the existing E1 resolver contracts.
3. Render a deterministic geographic SVG fallback using the real WGS84 coordinates. It is not a street basemap and requires no secret, provider call or paid service.
4. Keep point/polygon resolution deterministic and execute it through the reused E1 resolver.
5. Keep identity, geometry and context selection deterministic; AI cannot select, rank or alter an object.
6. After explicit browser consent, send OpenAI only a minimized server-rebuilt evidence projection and a bounded user question. Raw geometries, acquisition bodies, arbitrary tags, browser-supplied evidence, credentials and hidden application context are excluded.
7. Use the Responses API with `store:false`, no tools, a strict JSON schema, evidence-reference validation, prohibited-claim checks, a 15-second timeout and an honest unavailable/error state. No deterministic or canned output may be labelled as OpenAI.

## Risks and controls

| Risk | Control |
| --- | --- |
| Geometry misrepresented as official | Persistent open-context labels and mandatory caveat |
| Hidden runtime source dependency | Repository-only server module plus browser request assertions blocking Overpass/Nominatim |
| Excessive source data sent to browser | Allowlisted projection only; raw snapshots and arbitrary tags excluded |
| False precision | Categorical evidence quality and explicit freshness/coverage limitations |
| Ambiguity hidden by UI | Dedicated trigger and exact candidate list; no silent selection |
| Missing record treated as absence | Explicit no-result language and validation action |
| Public endpoint or cross-site AI abuse | Exact-case allowlist, same-origin enforcement, SameSite browser challenge, explicit consent, bounded body/question and per-client rate limit |
| Prompt injection or unsupported AI claim | User question is an untrusted JSON field; strict system boundary, structured output, evidence-ID allowlist and fail-closed post-validation |
| Source or private data leakage to OpenAI | Server rebuilds an allowlisted evidence projection; no raw geometry, arbitrary tags, acquisition body, secret, customer data or browser-provided evidence is forwarded |
| AI result mistaken for deterministic truth | Separate AI badge, confirmed-fact/inference sections, low/medium inference confidence, exact caveat and provider telemetry |
| Released UI regression | Isolated direct route; no navigation or existing page-body changes |
| Mobile clipping or inaccessible controls | 390×844 browser coverage, keyboard/focus and minimum target checks |

## Acceptance criteria

- Both frozen case packs pass their exact validation contracts.
- Dubai and Singapore resolved selections highlight exact source-derived geometry.
- A user-triggerable ambiguity or no-result state is visible and fail-safe.
- Evidence panel includes the required lineage, limitation, attribution and caveat fields.
- No browser request reaches Overpass or Nominatim.
- Dubai and Singapore each record a real OpenAI success on the exact Preview, plus one grounded follow-up; output is bound to the exact evidence-pack hash.
- Adversarial questions about ownership, official zoning, valuation and prompt/credential disclosure fail closed or answer only with the stated evidence limitation.
- Missing credential, timeout, provider failure or invalid output remains an explicit unavailable state and never silently becomes a fake AI success.
- Desktop 1440×900 and mobile 390×844 flows pass focused browser tests and screenshots.
- Clean install, production audit, point-to-object tests, TypeScript, build, route inventory, data-honesty and secret-hygiene checks pass.
- Local acceptance requires P0=0 and P1=0.

## Rollback

The prototype is isolated behind a direct route and file-backed modules. Before any merge, rollback is removal of the local branch/worktree. After a future authorized integration, revert the single prototype integration commit. No database, provider, secret, Auth, Storage or Production rollback is required.

## Release dependencies and non-scope

This Change Request does not authorize merge, Production, Supabase, Auth/RLS, Storage, live geodata providers, MCP, 3D, routing, valuation, planning or customer data. It authorizes only the bounded Preview AI endpoint above using the existing `OPENAI_API_KEY` / `OPENAI_MODEL` configuration; no secret or environment change is authorized. External Preview is allowed only after local acceptance and exact-head verification. Production remains unchanged.

Mandatory caveat:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
