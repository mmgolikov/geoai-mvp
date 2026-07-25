# QA-001 Enterprise Release Quality Gate

Status: Review source artifact  
Owner: GeoAI QA / Release Governance  
Confluence target: 07.09 Enterprise QA Release Gate

## Purpose

Define the minimum quality gate for a GeoAI release candidate before review, merge or deployment decision.

## Gate matrix

| Gate | Required evidence | Applies to |
|---|---|---|
| Source audit | Current GitHub, Vercel, Supabase, Figma and Confluence state checked | All release candidates |
| Lint | `npm run lint` passed | Code changes |
| Build | `npm run build` passed | Code changes and release candidates |
| Route smoke | Core routes and health/status APIs return expected responses | App/API changes |
| Visual QA | Desktop, tablet and mobile critical screens checked | UI changes |
| Data honesty QA | Source mode, confidence and caveats visible | Analysis/report/source changes |
| Project isolation QA | Project/segment switching does not leak state | Project/workspace changes |
| Report QA | Report snapshot matches dashboard state | Report/export changes |
| Artifact QA | Related artifacts and review logs updated | Docs/design/architecture/data changes |
| Rollback note | Safe rollback or isolation path documented | All release candidates |

## Blocking defects

- Broken workspace entry.
- Broken map-first or criteria-first core flow.
- Missing source/caveat language in user-facing output.
- Secret exposure.
- Unreviewed migration or environment change.
- Production deploy request without explicit approval.

## Maintenance rule

Update this gate after every release process change, new core route, new storage/auth/data dependency, or QA incident.
