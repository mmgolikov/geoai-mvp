# Figma GCC Real Estate Authority v1

Status: Candidate design authority for Draft PR #143
Last verified: 2026-08-16
Owner: GeoAI Product Design
Authority: Successor page-body design under CR GCC Real Estate Decision Platform v1
Successor: Founder-approved canonical successor or a later owner-approved design authority

## File and page

- Figma file: `TAzDqOvRCw1mQGMU3Y4S9H`
- Candidate page: `1956:11`
- Page name: `09 - GCC REAL ESTATE DECISION PLATFORM / v1 / CANDIDATE`
- Authority board: `1956:12`

Existing canonical Product System nodes remain historical foundation and were not deleted or overwritten.

## Screen map

### Landing

- section: `1957:11`
- desktop: `1957:12`
- tablet: `1957:721`
- mobile: `1957:1146`

### Workspace

- section: `1957:23360`
- Map-first desktop: `1957:23361`
- Criteria-first desktop: `1957:23419`
- ranked desktop: `1957:23483`
- Map-first mobile: `1957:23549`
- full-screen picker mobile: `1957:23584`
- Criteria-first mobile: `1957:23639`
- ranked mobile: `1957:23687`

### Decision intelligence

- section: `1957:24166`
- dashboard desktop: `1957:24167`
- dashboard tablet: `1957:24279`
- dashboard mobile: `1957:24381`
- comparison desktop: `1957:24501`
- evidence desktop: `1957:24640`
- partial-evidence desktop: `1957:24727`

### Project Hub

- section: `1957:25221`
- desktop: `1957:25222`
- tablet: `1957:25329`
- mobile: `1957:25397`
- analyses: `1957:25482`
- data room: `1957:25521`
- reports: `1957:25562`

### Reports

- section: `1957:26088`
- preview desktop: `1957:26089`
- preview mobile: `1957:26200`
- analysis print page 1: `1957:26312`
- analysis print page 2: `1957:26383`
- comparison print page 1: `1957:26461`
- comparison print page 2: `1957:26553`

### System states

- section: `1961:1059`
- loading desktop: `1961:1060`
- empty desktop: `1961:1177`
- error desktop: `1961:1294`
- partial-evidence desktop: `1957:24727`

## Design decisions

- Landing makes GCC real-estate decision support the first-viewport offer.
- Workspace preserves Map-first and Criteria-first; mobile uses a full-screen map picker.
- A result replaces setup after analysis rather than leaving a competing setup panel.
- Dashboard leads with map, posture, score, confidence, validation, drivers, risks and next action.
- Project Hub is work-oriented and keeps one Data Readiness surface.
- Reports derive from the same result contract and keep map context and source lineage.
- Internal fixture vocabulary is replaced by truthful customer language: screening context, public/open context, local context and validation required.

## Visual QA performed

- Authority board rendered at 1600x900.
- Dashboard rendered at 1440x900.
- Workspace mobile rendered at 390x844.
- Project Hub rendered at 1440x960.
- Analysis print rendered at 794x1123.
- Loading, empty and error states rendered as independent 1440x964 frames; partial evidence remains a separate 1440x964 frame.
- Immutable state export: [`system-states-candidate.png`](evidence/figma-gcc-real-estate-v1/system-states-candidate.png), 4780x1280, SHA-256 `fee1f2d765949e6b63d5c4672bed17ff8229d68f4bd0e916abf0db49c4ed7c14`.
- Machine-readable receipt: [`system-states-manifest.json`](evidence/figma-gcc-real-estate-v1/system-states-manifest.json).
- Presentation-sensitive copy scan found only negative statements that explicitly deny live official integration.

This page remains `CANDIDATE` until founder review. Runtime implementation may use its bounded screen composition under the approved CR, but the page must not be described as the canonical released design before approval.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
