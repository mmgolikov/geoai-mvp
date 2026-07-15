# BPMN-001 Core Analysis Flow — Review Notes

Version: v1.0

Status: Review

Publication gate: Not passed

Canonical visual source: `BPMN-001-core-analysis-flow.puml`

The committed SVG is an implementation-aligned, BPMN-style activity rendering of the current workspace process. It is not executable BPMN 2.0 XML and does not claim process-engine conformance.

## Implemented participants

- User
- `components/workspace-shell.tsx`
- `app/api/analyze/route.ts`
- optional OpenAI request with validated deterministic fallback
- repository adapters and report-package routes

## Controlled exception behavior

| Condition | Implemented behavior |
|---|---|
| No selected target in map-first mode | Primary analysis action does not run |
| Criteria change after search | Candidate state becomes stale/ready and results must be regenerated |
| Invalid analysis payload | `/api/analyze` returns HTTP 400 |
| OpenAI unavailable or invalid | Deterministic structured fallback is returned |
| Decision-score request unavailable | Analysis remains usable with a null score extension |
| Persistence unavailable | Recoverable UI state remains; local fallback is explicitly non-durable |
| Official validation missing | Screening claims remain bounded and caveated |

Independent review must confirm the lanes, exception boundaries and repository semantics before publication. Converting this model into BPMN XML is a separate decision and is not required by the current Product runtime.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
