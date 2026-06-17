# GeoAI Roadmap

## v0.1 — Public Demo Prototype

Status: current version.

Goals:

- Demonstrate the core GeoAI spatial decision workflow.
- Support Dubai map workspace.
- Show synthetic geospatial layers.
- Enable point and demo object selection.
- Generate deterministic scenario-based Express Analysis.
- Compare 2-3 selected sites or objects.
- Preview printable reports.
- Deploy on Vercel.

Limitations:

- Mock/demo data only.
- No OpenAI integration.
- No database.
- No authentication.
- No real data adapters.

## v0.2 — AI Analysis Engine

Goals:

- Add OpenAI API route integration.
- Create structured prompt templates per scenario.
- Add typed response schema validation.
- Separate AI-generated insights from deterministic demo scoring.
- Add error handling and retry behavior.
- Keep mock fallback mode for demos.

Key deliverables:

- `/api/analyze` route
- Scenario prompt library
- Structured AI response schema
- Server-side OpenAI key usage only
- AI/mock mode switch

## v0.3 — Data Source Registry And Real Data Adapters

Goals:

- Introduce Data Source Registry.
- Add real data adapter structure.
- Start with a small number of licensed or open Dubai-relevant sources.
- Add evidence metadata to dashboard outputs.

Key deliverables:

- Source metadata model
- Adapter interface
- OSM/infrastructure adapter
- Planning/GIS adapter stub
- Remote sensing adapter stub
- Evidence model

## v0.4 — Pilot-Ready Workflows

Goals:

- Support saved studies and repeatable client workflows.
- Add project/session model.
- Add uploaded documents as analysis context.
- Improve reporting and export workflow.
- Support pilot-specific scenarios.

Key deliverables:

- Saved project brief flow
- Named site studies
- Document upload placeholder to working parser flow
- Exportable client memo
- Site comparison workflow improvements
- Pilot QA pack

## v0.5 — Enterprise Readiness

Goals:

- Prepare for enterprise pilots and controlled production use.
- Add authentication, permissions, observability, auditability, and governance.

Key deliverables:

- Auth and organization workspace model
- Role-based access control
- Audit logs
- Usage logging
- Error monitoring
- Data governance controls
- Deployment and environment hardening
- Security review checklist
