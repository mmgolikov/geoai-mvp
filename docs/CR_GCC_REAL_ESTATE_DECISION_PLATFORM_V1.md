# CR — GCC Real Estate Decision Platform v1

Status: Owner-approved implementation authority
Approved: 2026-08-16
Owner: Maxim Golikov — Founder, GeoAI
GitHub task anchor: [Issue #142 — GCC Real Estate Decision Platform v1](https://github.com/mmgolikov/geoai-mvp/issues/142)
Implementation branch: `product/gcc-real-estate-decision-platform-v1`
Exact baseline: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`
Production baseline: `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` at https://geoai-mvp.vercel.app
Figma file: `TAzDqOvRCw1mQGMU3Y4S9H`
Supabase implementation target: development/Preview project `geoai-dev`, ref `pphdqkurxneyagvnnjdt`, only after exact-target health, migration and rights gates pass
Production: no manual promotion or environment change is authorized by this CR

## Decision

This CR authorizes a new documentation-first Product transformation from the current public-demo baseline into a credible GCC real-estate screening and validation experience.

For this branch and issue, this CR supersedes the narrower CR 10.13 scope. CR 10.13 remains historical evidence and is not rewritten.

It authorizes:

- product and market research for UAE, Saudi Arabia, Qatar and Oman;
- a UAE-first B2B and B2C real-estate scenario model;
- new Figma successor designs in the named file;
- bounded implementation of the Landing, Workspace, Decision Dashboard, Project Hub and printable reports;
- customer-facing content refinement that removes engineering fixture terminology from primary surfaces without concealing source provenance;
- local-first ingestion of approved public/open snapshots;
- reviewed Preview-only Supabase work on the exact development target after the existing security, rights, migration and rollback gates pass;
- active documentation and Confluence restructuring required by this change;
- Draft PR, Vercel Preview and independently downloadable evidence artifacts.

It does not authorize:

- a direct push or merge to `main`;
- a Production deployment or Production environment change;
- secrets in repository, browser bundles, logs or evidence;
- hard-access/Auth activation;
- destructive database actions;
- a live or official source claim without exact rights, custody and runtime evidence;
- confidential, regulated, sensitive or client-protected data;
- an unsupported production-ready or pilot-ready claim.

## Product objective

GeoAI becomes a GCC real-estate decision workspace that helps an organization or individual:

1. define a real-estate decision and geography;
2. select or discover a site, asset, area or project;
3. compare alternatives using explicit criteria;
4. understand the drivers, risks, assumptions and evidence gaps;
5. prepare the next validation action and a consistent report package.

The product is not a registry, cadastral authority, valuation authority, title service or zoning approval system.

## Required data-honesty boundary

Never claim or imply:

- official parcel;
- official zoning;
- cadastral validation;
- ownership verification;
- certified valuation;
- approved site;
- guaranteed best use;
- live DLD integration;
- live GeoDubai integration;
- production-ready;
- pilot-ready.

Required caveat in decision, report, AI and source surfaces:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

Primary customer surfaces may replace technical terms such as `mock`, `fixture`, `synthetic-demo-layers`, `demo normalized` and `sample fallback` only when the replacement is factually correct. Exact provenance, source mode, date, coverage, rights and validation state remain available in Evidence / Source Lineage.

Synthetic values must never be relabeled as observed real-world facts. Until an approved real snapshot exists, a synthetic case must remain isolated from customer-facing real-place claims.

## Market and scenario scope

### Release 1 — UAE B2B

Primary roles:

- developer;
- real-estate fund / investment committee;
- asset manager / family office;
- lender / risk reviewer;
- consultant / broker.

Primary decisions:

- development site acquisition and shortlist;
- redevelopment / renovation candidate screening;
- highest-and-best-use alternative screening;
- land-bank prioritization and phasing;
- residential, commercial, hospitality, logistics and mixed-use site templates;
- market, accessibility, infrastructure, climate and validation-gap review;
- alternative comparison and decision-report handoff.

### Release 1 — UAE B2C

Primary decisions:

- buy a home;
- rent a home;
- invest in a unit or off-plan project;
- family relocation;
- compare properties and prepare a validation checklist.

Tourism and attraction discovery remain available only as tertiary scenarios.

### Expansion

Saudi Arabia, Qatar and Oman require separate market adapters, rights receipts, ownership/eligibility rules and validation language. They may be designed in this CR but must not be presented as connected production markets until their source and runtime gates pass.

## Decision contract

Dashboard, comparison, Project Hub and report must consume the same normalized decision snapshot:

- decision question;
- audience, role, market and scenario;
- selected site/property/AOI identity and coordinates;
- criteria, weights and assumptions;
- result posture and score range;
- confidence and validation state;
- top drivers and risks;
- economics/feasibility assumptions where available;
- comparison set;
- source manifest and evidence gaps;
- next action and accountable reviewer;
- generated/saved timestamps and model/data versions.

## Design scope

### Landing

- Make the literal offer GCC real-estate site/property decision support.
- Use the actual product/map as the first-viewport signal.
- Primary action: `Open workspace`.
- Secondary action: `Request access` or `Prepare project brief`.
- Remove public engineering/prototype terminology while retaining truthful source and validation language.
- Present the supported UAE decisions, evidence model and market-expansion boundary.

### Workspace

- Preserve Map-first and Criteria-first.
- Desktop map occupies approximately 60–65% of the working surface.
- Keep audience, market, role, scenario, criteria and Custom Query compact and visible.
- Move AOI/import/advanced tools to explicit drawers/disclosures.
- Preserve full-screen mobile map selection, direct run and back-to-workflow.
- One sticky primary action; no input overlap or nested-scroll trap.

### Decision Dashboard

- After a run, the result replaces setup as the primary surface.
- Setup remains available only through an explicit `Edit criteria` / `Back to setup` control.
- Desktop: map plus concise decision panel, followed by Decision / Market / Feasibility / Evidence / Compare views.
- Mobile: concise result, bounded map preview, posture, next action, drivers, risks, disclosures and stable actions.
- Remove duplicate KPI/status cards, giant blank regions and the repeated setup panel.

### Project Hub

- Compact work summary rather than four decorative count cards.
- Work-oriented analyses, comparisons, reports and evidence sections/tabs.
- Explicit market, segment and lifecycle status.
- Data readiness remains visible but full operator diagnostics move to a dedicated Data/Admin view.

### Reports

- Executive body targets four to five pages plus optional evidence appendix.
- Include map/site identity, decision, posture, score, confidence, drivers, risks, assumptions, comparison, next action and validation checklist.
- Preserve source lineage and caveat without repeating the same prose throughout the document.
- Dashboard/report parity is mandatory.
- No missing spaces, clipped text, blank pages, orphan headings or uncontrolled card splits.

## Figma authority

Current Product System v3.2.2 and accessibility-corrected tokens remain the foundation. This CR authorizes successor page-body frames in file `TAzDqOvRCw1mQGMU3Y4S9H` for the named surfaces only.

Before code implementation:

1. preserve existing canonical nodes as historical evidence;
2. create a clearly named `GCC Real Estate Decision Platform v1` authority section/page;
3. record source nodes and successor nodes;
4. produce desktop, tablet and mobile states plus loading/empty/error/partial-evidence states;
5. run manual and programmatic accessibility/layout QA;
6. record approved node IDs in the QA receipt.

## Data and integration scope

### Preferred UAE source pack

- owner-approved DLD / Dubai Pulse transaction, rent and project snapshots;
- Geofabrik GCC OSM extract;
- Overture Maps buildings, places and transportation;
- ESA WorldCover land-cover context;
- permitted climate/energy context;
- user-provided project evidence.

Every snapshot requires:

- source group, canonical URL and local/private object identity;
- license, permitted use and attribution;
- extraction/generated timestamps;
- SHA-256 and byte size;
- row/feature count, CRS and bounds;
- schema version and rejected-row summary;
- coverage, freshness, confidence and validation state;
- transformation lineage and code version;
- visibility, retention, rollback and deletion rules.

Local normalized files and dry-run remain the first execution path. Preview Supabase writes require all of:

1. exact project status and migration ledger read-back;
2. reviewed rights/custody receipt;
3. canonical migration replay and RLS evidence;
4. non-destructive migration review;
5. pre-write dry-run and before counts;
6. explicit operator command with no credential exposure;
7. after counts, integrity checks and rollback evidence.

No source may affect scoring until its source-to-indicator mapping, quality and visibility gates pass.

## Documentation scope

Update the active authority set and Confluence operational navigation. Preserve historical receipts unchanged.

Target active set:

1. README;
2. Current Release State;
3. Product Scope / Market Strategy;
4. Architecture;
5. Data Strategy / Source Catalog;
6. Design Authority;
7. QA / Release Gate;
8. this CR and release note.

## Engineering boundaries

- Keep changes reviewable and aligned to existing repository patterns.
- Split multi-thousand-line components only along stable product boundaries introduced by this CR.
- Do not add a new styling framework.
- Do not add a debug endpoint or leave a temporary evidence workflow/harness in the final diff.
- Preserve browser-local fallback whenever Preview Supabase or an approved source is unavailable.
- Public APIs remain compact and sanitized.
- Service-role and database credentials remain server/operator-only.

## Required validation

At minimum:

- dependency audit;
- TypeScript/lint and production build;
- API access/security/data-honesty/documentation contracts;
- data status, normalized-data validation and source-readiness dry-run;
- full browser suites for B2B and B2C;
- Axe serious/critical = 0;
- no horizontal overflow or obscured controls;
- console error inventory = 0 on accepted routes;
- report/dashboard parity;
- 12 physical A4/Letter PDF fixtures and page-raster assertions;
- permanent GeoAI Quality Gate on the exact final clean head;
- exact Vercel Preview route/log verification.

Target viewports:

- 390x844;
- 430x932;
- 768x1024;
- 834x1112;
- 1366x768;
- 1440x900.

## Independent critical review

An independent critical agent must review the exact final branch after implementation. It may not author the product changes it reviews. Every P0 and P1 finding must be fixed or recorded as an explicit owner-approved limitation before the Draft PR may be described as ready for owner review.

## Deliverable

Open a Draft PR from `product/gcc-real-estate-decision-platform-v1` to `main`.

The PR must contain:

- objective and exact approved scope;
- files changed;
- Figma authority and node mapping;
- source/rights and Supabase receipt;
- local, browser, API, PDF and Quality Gate evidence;
- exact Vercel Preview deployment and logs;
- data-honesty note;
- known limitations and rollback point;
- critical-agent findings and disposition;
- explicit confirmation of no merge or Production promotion.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
