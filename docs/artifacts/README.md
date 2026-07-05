# GeoAI Artifact File Registry

This directory stores controlled GeoAI architecture, system-analysis and data-model artifacts as actual repository files.

Confluence remains the documentation hub. GitHub stores artifact source files so they can be versioned, reviewed, linked, rendered and reused by engineering.

## Artifact status

| Artifact ID | File | Type | Status |
|---|---|---|---|
| BPMN-001 | `bpmn/BPMN-001-core-analysis-flow.bpmn` | BPMN 2.0 XML | Review |
| C4-001 | `c4/C4-001-system-context.mmd` | Mermaid C4-style context diagram | Review |
| C4-002 | `c4/C4-002-container-architecture.mmd` | Mermaid C4-style container diagram | Review |
| ERD-001 | `erd/ERD-001-core-data-model.mmd` | Mermaid ERD | Review |
| STATE-001 | `state/STATE-001-analysis-lifecycle.mmd` | Mermaid state diagram | Review |
| SEQ-001 | `sequence/SEQ-001-analysis-request-sequence.mmd` | Mermaid sequence diagram | Review |
| SQL-001 | `sql/ERD-001-supabase-schema-draft.sql` | Supabase/PostGIS draft schema | Review |

## Publication gate

Files in this directory are source artifacts. They are not approved implementation specifications until:

1. The corresponding Confluence page is marked Approved.
2. Artifact Review Log shows Publication gate = Passed.
3. Visual rendering has been reviewed.
4. Engineering has validated the artifact against code and target architecture.

## Current Figma board

Figma/FigJam artifact board: https://www.figma.com/board/hjy7prEcRySkqPvJYWIwwX

The board exists, but automatic diagram generation was blocked by the Figma connector safety layer during setup. Visual rendering remains pending.
