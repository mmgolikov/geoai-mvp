# BPMN-001 Core Analysis Flow

Version: v0.9  
Status: Review  
Notation target: BPMN 2.0.2  
Publication gate: Not passed  

This file is the source specification for the BPMN visual model. The full BPMN XML and visual diagram must be generated after review.

## Lanes

- User
- GeoAI Workspace
- Data and GIS Layer
- Analysis Layer
- Report Service
- Project Storage

## Main process

1. Analysis need identified.
2. Open workspace.
3. Select AOI or object.
4. Check spatial context.
5. Select scenario or enter custom query.
6. Create analysis request.
7. Retrieve spatial context.
8. Check source availability.
9. Run analysis and scoring.
10. Attach evidence and confidence.
11. Render analysis dashboard.
12. Decide whether comparison is needed.
13. Render comparison view when needed.
14. Decide whether custom query refinement is needed.
15. Re-run analysis with query context when needed.
16. Decide whether report export is needed.
17. Generate report when requested.
18. Save analysis and report metadata.
19. Analysis completed.

## Exception flows

| Exception | Handling rule |
|---|---|
| Invalid spatial context | Show validation message and keep user in workspace |
| Missing required source | Continue only with clear confidence warning |
| Analysis failure | Show recoverable error and allow retry |
| Project mismatch | Block save/export and request state refresh |
| Export failure | Preserve analysis state and allow retry |

## Review status

Logical review: partial pass.  
Visual BPMN rendering: pending.  
Publication gate: not passed.
