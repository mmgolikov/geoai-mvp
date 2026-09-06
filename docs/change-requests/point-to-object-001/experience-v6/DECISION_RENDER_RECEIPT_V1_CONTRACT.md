# DecisionRenderReceipt V1 Contract

Status: Candidate implementation contract; not runtime-active

Date: 2026-09-04

Owner: GeoAI Product and Decision Architecture

Authority: Acyclic rendering contract for the POINT_TO_OBJECT_001 V6 candidate. It does not authorize report sharing, export, protected persistence, merge or Production.

Successor: None. Schema identifier: `urn:geoai:decision-render-receipt:1.0.0`.

Machine contract: `DECISION_RENDER_RECEIPT_V1.schema.json`.

## Purpose

`DecisionRenderReceipt` proves how one dashboard, report or Project Summary presentation was produced from an already-final, immutable `DecisionRecord`. It closes the parent/artifact hash cycle: rendered artifacts are downstream outputs and can never be hash-bearing inputs of the parent record they cite.

The immutable dependency direction is:

`GeoContextSnapshot -> DecisionRecord -> rendered artifact -> DecisionRenderReceipt`

No arrow may point backward.

## Required fields

| Field | Contract |
| --- | --- |
| `schemaId`, `schemaVersion` | Exact receipt contract and `1.0.0`. |
| `renderReceiptId`, `renderReceiptHash` | Stable receipt identity and SHA-256 hash. |
| `sourceDecisionRecordRef` | Final parent record ID/hash plus finalization time and exact finalization-validator ID/version. |
| `renderKind`, `operation` | `dashboard -> dashboard`, `report -> report`, `project_summary -> project`. |
| `templateRef` | Exact template ID/version frozen by the parent `renderPolicy`. |
| `presentation.locale` | Presentation-only locale. It is receipt-bearing but never changes the parent truth hashes. |
| `renderer` | Versioned render method; it may format but cannot recompute truth. |
| `renderedAt` | Receipt/render finalization time; it follows parent finalization and any materialized artifact creation. |
| `renderManifestHash` | Hash of the complete ordered render inputs/layout manifest. |
| `artifact` | Optional for interactive dashboards; required for a report. Carries artifact hash and embedded parent ID/hash. |
| `truthRecomputationPerformed` | Always `false`. |
| `sourceOperationGate` | Field-identical copy of the matching non-blocked parent gate, including status, reasons, gaps, validation tasks and tuple-scoped rights evaluations. |
| `validation` | Parent hash/ref, rights, caveat and gap-render checks. |
| `governance` | Canonicalization profile and locale-neutral mandatory caveat-policy ID. |

## Acyclic finalization algorithm

1. Validate and finalize the parent DecisionRecord with the recorded validator ID/version, then calculate its `recordHash` with only `recordHash` omitted. The finalization object is part of the hashed bytes.
2. Resolve the template ID/version from that frozen parent. Copy the matching parent operation gate exactly and verify it is `pass` or `partial`; `blocked` stops rendering/export/sharing. No field, including reasons or tuple-scoped rights evaluations, may be removed or relabelled.
3. Build a render manifest from exact parent refs, template and presentation locale. Rendering may select, order, label and format values but cannot acquire, calculate, analyse, compare, rank, generate or evaluate.
4. If materializing an artifact, embed only `decisionRecordId` and `recordHash` as its truth anchor; calculate `artifactHash` after final bytes exist. `artifact.createdAt` must be at or after parent finalization.
5. Build the external receipt from the already-final parent, manifest and artifact hashes. `renderedAt` must be at or after `artifact.createdAt`; calculate `renderReceiptHash = sha256(JCS(receipt with only renderReceiptHash omitted))`.
6. Store/index the receipt separately. Never write its ID/hash or the rendered artifact hash back into the parent DecisionRecord.

The artifact cannot contain its later `renderReceiptHash`. This makes re-rendering, localization and format conversion append-only: each can create another child receipt without invalidating the parent.

## Truth and presentation boundary

- Locale, localized headings, number/date formatting and page layout belong to the receipt/artifact.
- Facts, metrics, units, claims, evidence classes, source/time/coverage/freshness/confidence/gaps and validation tasks come from exact parent/snapshot refs.
- A missing required value renders as a named gap. A renderer cannot fill it with a sample, model guess or stale UI state.
- A different locale may change the manifest, artifact and receipt hashes. It must not change the referenced GeoContextSnapshot or DecisionRecord hashes.

## Operation and rights gate

This contract uses the same eighteen-operation enum as GeoContext, Scenario Registry and DecisionRecord. Only these mappings are legal:

- `dashboard` render kind uses operation `dashboard`;
- `report` render kind uses operation `report`;
- `project_summary` render kind uses operation `project`.

The source gate must be field-identical to the matching gate in the referenced parent, including operation, status, gap IDs, validation-task IDs, rights-receipt IDs, rights-evaluation objects and reason codes. Every contributing source must explicitly permit the persisted operation/channel/delivery/territory/evaluation-time tuple under the exact hashed rights scope. Unknown/missing rights, expired review, missing licence/policy evidence, conditional obligations without a validated satisfaction receipt, or prohibited/restricted scope blocks the affected render, export or share path. A successful dashboard permission does not imply report, project or export permission.

## Semantic validation beyond JSON Schema

The validator must prove:

1. parent record bytes exist and their calculated hash equals `sourceDecisionRecordRef.recordHash`;
2. parent finalization is schema-valid, both validation flags are true, its time/validator ID/version equal the child reference and finalization precedes `renderedAt`; template ID/version equals parent `renderPolicy`;
3. render kind and operation agree and `sourceOperationGate` is exactly equal to the referenced parent gate;
4. the source gate is not blocked, child validation status preserves `pass -> passed` or `partial -> partial`, and referenced gaps/tasks/rights receipts/evaluations resolve;
5. manifest inputs are an allowlisted projection of the exact parent/snapshots;
6. the renderer performed no truth-producing operation;
7. artifact bytes hash to `artifactHash`, embed the same parent ID/hash, and satisfy `parent.finalizedAt <= artifact.createdAt <= renderedAt`;
8. artifact bytes do not contain `renderReceiptHash` and parent bytes contain neither child artifact nor receipt hash;
9. caveat, source/time/coverage/freshness/confidence/gaps and required validation state are rendered;
10. receipt hash follows the exact canonicalization rule and changes on any receipt-field change.

## Non-authorizations

This receipt does not prove that a source is official, complete, current, legally reusable or fit for a client decision. It does not authorize public/client sharing, export, hosted persistence, merge or Production promotion.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
