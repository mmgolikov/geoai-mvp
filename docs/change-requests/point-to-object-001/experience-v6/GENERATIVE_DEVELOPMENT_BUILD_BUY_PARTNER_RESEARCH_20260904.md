# GeoAI Generative Development — Build / Buy / Partner Research

Status: `RESEARCH_WAVE_1_COMPLETE_POC_REQUIRED`

Date: 2026-09-04

Decision owner: Founder / GeoAI Control

Scope: early development-feasibility, massing, site-layout and scenario-decision tooling for UAE-first real-estate and urban-development workflows. This is research and architecture guidance, not supplier approval, procurement authority, source activation or a claim of planning compliance.

Required boundary for all prototype outputs:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

The product-keyed [Technical and Commercial Matrix](./GENERATIVE_DEVELOPMENT_TECHNICAL_COMMERCIAL_MATRIX_20260904.md) is the controlling cross-vendor comparison for API/SDK/MCP, headless and OEM use, inputs/exports, reproducibility, UAE/wider-MENA coverage, security, data location, retention, input/output rights, licensing, pricing, TCO drivers and promotion gates. `Unknown` and `Contract/quote required` cells are intentional fail-closed findings, not implied supplier clearance.

## Executive decision

GeoAI should not become a general-purpose CAD/BIM authoring system and should not delegate its product core to one geometry vendor. The recommended target is a **vendor-neutral development-decision layer** with a hybrid implementation:

- **Build and own:** UAE/MENA GeoContext, source/evidence lineage, Scenario Registry, constraints and assumptions, economic model, explainable comparison, Decision Record, report/project workflow, provider orchestration and the API/MCP contract.
- **Build a bounded prototype:** deterministic, rules-based conceptual massing sufficient to create materially different alternatives and reproducible GFA/coverage/open-space metrics. It is a replaceable reference provider, not a long-term CAD kernel.
- **Buy or use open source:** specialised geometry, BIM interchange, 3D streaming and proven simulation components where their commercial and data rights are clear.
- **Partner after a controlled POC:** feasibility and planning platforms such as TestFit, Autodesk Forma, Esri Urban and Bentley iTwin when the customer already uses them or when their engine outperforms the GeoAI reference provider.
- **Do not build now:** universal BIM authoring, a proprietary general geometry kernel, daylight/CFD/microclimate solvers, or an “official planning checker” without licensed authority-grade rules and data.

The LLM must not invent a supposedly compliant design. Its role is to translate an intent into a typed brief, identify missing decisions, orchestrate deterministic tools, explain alternatives and preserve evidence. Geometry and metrics must be produced or checked by deterministic code.

The strongest immediate competitor and benchmark is **TestFit**, because it already connects an AI assistant to a deterministic feasibility engine through MCP. That validates the interaction pattern but also shows that “prompt-to-massing” alone is not a defensible differentiator. GeoAI's proposed moat is the combination of UAE-specific context, evidence lineage, economic-spatial evaluation and one decision workflow from site screening through report and project.

## 1. Customer process and paid outcome

The practical development chain is:

`land discovery -> preliminary screening -> acquisition due diligence -> feasibility and options -> investment decision -> planning/design handoff -> project monitoring`.

Public developer evidence describes feasibility and market studies, title and regulatory due diligence, site and environmental analysis, architectural and engineering design, procurement and approvals as parts of real development work. See the current [Emaar Development Integrated Annual Report 2025](https://uae-cms.emaar.com/uploads/Emaar_Development_IR_2025_English_F_2be1c144c4.pdf), especially report page 33, and [Aldar Projects](https://www.aldar.com/en/explore-aldar/businesses/aldar-projects) for the broader development/project-delivery context. These public sources do not validate GeoAI buyer demand or willingness to pay.

The buyer is unlikely to pay primarily for a visually attractive AI-generated model. The paid outcomes to validate are:

1. a faster, defensible go/no-go decision before land or design spend;
2. a larger feasible yield or a clearer explanation of why yield is constrained;
3. fewer manual handoffs and less rework between investment, development, planning, architecture and BIM teams;
4. an auditable investment-committee package that binds geometry, assumptions, context, economics and risks;
5. repeatable portfolio screening rather than one-off consultant work;
6. controlled integration into the buyer's existing GIS/BIM/data environment.

### Customer, user and budget-owner map

| Stage | Primary users | Likely budget owner | Job to be done | Candidate success metric |
| --- | --- | --- | --- | --- |
| Land sourcing | Land acquisition, GIS and investment analysts | Chief Development Officer or Chief Investment Officer | Exclude weak locations and build an evidence-backed shortlist | Time to shortlist; weak sites rejected before paid DD |
| Pre-acquisition | Development manager, planner, technical/legal DD | Investment committee / Development Director | Surface constraints, missing official checks and fatal risks | Risk recall; avoided late disqualification; evidence coverage |
| Feasibility | Development manager, architect, feasibility analyst | Development Director | Produce comparable yield, massing, use-mix and parking options | Time to first option; viable variants; metric reproducibility |
| Master planning | Urban designer, master planner, infrastructure planner | Head of Master Planning | Compare density, land-use and infrastructure scenarios | Scenario cycle time; trade-offs made explicit |
| Environmental screening | Sustainability, architecture and engineering teams | Design / Engineering Director | Detect orientation, sun, wind, terrain or climate issues early | Issues found before detailed design; analysis cost and latency |
| Underwriting | Investment, finance and asset-management teams | CIO / investment committee | Bind a spatial option to cost, revenue, phasing and sensitivity | Decision time; assumption traceability; financial sensitivity |
| Design handoff | Architecture and BIM teams | Design Director | Reuse accepted geometry and data without rebuilding it | Handoff rework; IFC/Revit/DWG/glTF validation pass rate |
| Portfolio / public sector | Portfolio, GIS, authority and digital-twin teams | CIO/CDO/public programme owner | Govern many sites and decisions with common evidence | Portfolio throughput; comparability; audit completeness |

## 2. Market taxonomy

The market is fragmented by layer. Treating all suppliers as one category would produce the wrong build-versus-buy decision.

| Layer | Typical product category | Representative options | GeoAI position |
| --- | --- | --- | --- |
| Site discovery and context | GIS, property data, open/official data services | Esri ecosystem, OSM/Overture, local authority or commercial feeds | **Own the normalized GeoContext and rights ledger; partner/buy sources** |
| Constraints and planning | Zoning/rules engines, planning platforms | Esri Urban, Forma, Archistar and local planning data | **Own typed constraint contract; buy/partner for rule content and solvers** |
| Feasibility and massing | Yield, typology, parking and site-layout generators | TestFit, Forma, Finch, Hypar | **Own reference massing and provider interface; POC suppliers** |
| Optimisation | Multi-objective and operational-research engines | commercial vendor engines, OR-Tools, custom algorithms | **Build objectives and evaluation; use proven solver components** |
| Environmental simulation | Sun/daylight, wind, microclimate, terrain, carbon | Autodesk Forma and specialist engineering tools | **Buy/partner; preserve inputs, version and output lineage** |
| 3D and digital twin | web maps, 3D Tiles, federation and asset twins | MapLibre, CesiumJS/ion, Bentley iTwin | **Keep current runtime for prototype; buy/partner for enterprise scale** |
| BIM/CAD handoff | IFC/Revit/DWG/Rhino/Grasshopper tooling | Autodesk, Rhino.Compute, Hypar Elements, IfcOpenShell, Speckle | **Use open standards; do not build authoring software** |
| Economics and decisioning | pro forma, sensitivity, ranking and governance | TestFit Pro Forma, spreadsheets, custom underwriting systems | **Core GeoAI-owned differentiator** |
| AI interaction and distribution | copilots, agents, APIs and MCP servers | TestFit MCP, vendor APIs, GeoAI API/MCP | **Core GeoAI-owned orchestration and commercial channel** |

## 3. Supplier and competitor assessment

### 3.1 TestFit — direct competitor and mandatory benchmark

[TestFit Site Solver](https://www.testfit.io/product/site-solver) joins parcel/site inputs, algorithmic layout generation, yield, parking, quantity and pro-forma workflows. Public [pricing](https://www.testfit.io/pricing) lists Parking Solver at USD 195/month, Site Intelligence at an additional USD 150/month, Pro Forma at an additional USD 170/month, an MCP connection at an additional USD 100/month for Parking Solver, Site Solver from USD 15,000/year including MCP and Portfolio from USD 20,000/year. However, TestFit's official [MCP FAQ](https://support.testfit.io/knowledge/mcp-faq), dated 2026-09-03, says MCP is included with all new subscriptions and existing customers should contact their account manager or sales. The published entitlement therefore conflicts by plan or customer cohort and requires an account-level quote; `MCP + USD 100/month` must not be used as a universal price.

Its current [MCP offer](https://www.testfit.io/mcp) and FAQ are strategically important: the user's AI assistant interprets intent, while TestFit says its deterministic engine creates and edits geometry and analytics. The FAQ confirms that MCP is currently desktop-only and has no web functionality. This vendor claim still needs an identical-input reproducibility test, and MCP is not evidence of a server-side OEM API.

**Strengths:** fast feasibility; domain typologies; parking; metrics/pro forma; geometry-edit loop; Revit/DXF workflow; credible paid benchmark.

**Gaps for GeoAI:** public availability of parcel, zoning, flood, utility and other layers varies by country; UAE data/rules coverage is not established by the public “global” statement; MCP is not evidence of a headless OEM right; MENA-specific evidence and authority validation remain external.

**Commercial/legal gate:** [TestFit terms](https://www.testfit.io/legal/terms-of-service) limit standard use to internal authorised users and prohibit sublicensing, SaaS/service-bureau availability, combining TestFit Materials into other programs and competitive-product use unless expressly permitted. Customer Data remains the customer's, but the terms do not clearly classify generated site configurations, geometry and analytics as Customer Data or grant perpetual post-termination use. Standard rights to TestFit Materials end at termination. An explicit OEM/API/white-label agreement must therefore cover generated-output classification, derivatives, export, customer delivery and post-termination use before GeoAI embeds or resells the workflow.

**Decision:** benchmark first; explore partnership only after technical bake-off and written commercial-rights confirmation. Do not couple GeoAI contracts to TestFit's object model.

### 3.2 Autodesk Forma Site Design — analysis and BIM ecosystem candidate

[Autodesk Forma Site Design](https://www.autodesk.com/products/forma-site-design/overview) covers site planning, design automation, environmental analysis, alternatives and connections to IFC, OBJ, Revit, Dynamo and Rhino. Autodesk exposes [Forma cloud APIs](https://aps.autodesk.com/autodesk-forma); Site Design API availability is described as beta.

Public Autodesk documentation says contextual terrain/building/parcel availability varies by region and may use open-source data. [Autodesk Trust regional availability](https://www.autodesk.com/trust/availability) lists Site Design covered-content storage in the US, EU and Australia and the beta API in the US/EU; no UAE storage region is listed. Autodesk's [API terms](https://www.autodesk.com/company/legal-notices-trademarks/autodesk-digital-distribution-web-services-api-terms-of-service) say Autodesk-defined `Your Content` remains yours, but separately define `Autodesk Materials` to include content, data or materials generated by the Service and restrict API exposure, service-bureau/competitive use and continued API/Autodesk-Material use after termination. Input ownership therefore does not establish ownership or perpetual commercial rights in generated outputs. [Special terms](https://www.autodesk.com/company/terms-of-use/en/special-terms) also keep third-party datasets subject to separate terms.

**Strengths:** established AEC ecosystem; credible environmental/site analysis; BIM handoff; APIs; familiar enterprise vendor.

**Gaps:** country-specific context coverage; beta API scope; UAE data residency; API/OEM limits; dependency on separate third-party-data rights.

**Decision:** priority POC for analysis and handoff, not a replacement for GeoAI GeoContext/evidence. Obtain a UAE account-level quote and precise API/data-region answers.

### 3.3 Autodesk Forma Building Design — current schematic-building candidate

[Autodesk Forma Building Design](https://www.autodesk.com/products/forma-building-design/overview) is a distinct current product for schematic building exploration, including building mass, floor plans, façades, units and performance analysis with a geolocated native-Revit handoff. [Forma for Buildings](https://www.autodesk.com/products/forma-for-buildings/overview) combines Site Design, Building Design, Data Management and Board. Building Design is included with Revit, the AEC Collection and Forma for Buildings; the official [UAE Autodesk store](https://www.autodesk.com/ae/products) currently lists Forma Site Design at USD 655/year and the AEC Collection at USD 3,425/year.

**Strengths:** extends the Autodesk comparison from site feasibility into schematic building detail, unit mix, analysis and native BIM continuity.

**Gaps:** no Building Design production API, UAE processing/storage region, OEM right, generated-output right or standalone UAE entitlement was established in this research wave. Site Design's beta API and region statements must not be inherited by Building Design.

**Decision:** add as a separate matrix row and test only where schematic-building detail or native Revit handoff changes the customer decision. It does not replace the Site Design API POC.

### 3.4 Hypar and Hypar Elements — composable geometry option

[Hypar](https://docs.hypar.io/) generates building systems through reusable design logic and supports optioning and AEC interchange. Public [pricing](https://docs.hypar.io/plans-account-and-admin/plans-pricing-and-licenses) lists USD 100/user/month or USD 1,000/user/year; Enterprise is quote-based.

[Hypar Elements](https://github.com/hypar-io/Elements) is an MIT-licensed C# library designed for cloud-friendly building generation, with JSON/IFC/glTF-oriented interoperability. Its own documentation describes a deliberately simple BREP/CSG kernel rather than a universal geometry engine.

**Strengths:** open and composable reference component; no dependency on Revit/Rhino for core geometry; useful IFC/glTF direction.

**Gaps:** C# service boundary for a TypeScript-led product; kernel limitations; no confirmed UAE rules/data; commercial Hypar embedding and residency need direct confirmation.

**Decision:** technical sandbox candidate for the reference provider, subject to prototype performance and output validation. Keep the MIT library and hosted Hypar service as separate legal/technical decisions.

### 3.5 Esri Urban — planning and public-sector integration candidate

[ArcGIS Urban](https://doc.arcgis.com/en/urban/11.4/get-started/get-started-what-is-urban.htm) supports 3D planning scenarios, zoning, plausible rule-based buildings and custom metrics. The [Urban GraphQL API](https://developers.arcgis.com/arcgis-urban-api/get-started/) exposes integration paths; private models use ArcGIS identity/OAuth.

**Strengths:** municipal/enterprise GIS fit; zoning and scenario concepts; existing customer accounts and governance; self-managed ArcGIS Enterprise can change deployment control.

**Gaps:** quote-based product licensing; public API/OEM scope must be confirmed; customer model/rules availability; not primarily a developer underwriting product.

**Decision:** partner where an authority or enterprise customer already has authoritative ArcGIS data/models. Do not make Esri a mandatory dependency for commercial site screening.

### 3.6 ArcGIS CityEngine — procedural-city candidate

[ArcGIS CityEngine](https://www.esri.com/en-us/arcgis/products/arcgis-cityengine/overview) is Esri's procedural 3D city-generation product. Esri describes creation and iteration from real or synthetic GIS, scenario scaling, rule-driven buildings and import of shapefiles, geodatabases, CAD and BIM. This covers the procedural-city category that ArcGIS Urban alone does not.

**Strengths:** procedural AOI/city modelling, GIS context, scalable scenario generation and Esri ecosystem handoff.

**Gaps:** desktop licensing, production headless automation, API/OEM rights, procedural-rule authorship, UAE rules/data, exports and TCO were not established in this wave.

**Decision:** component/partner candidate for a procedural-AOI brief; do not include automatically in the first bake-off unless city-scale generation is material to the named customer decision.

### 3.7 Bentley iTwin — later digital-twin/federation layer

[Bentley iTwin Platform](https://developer.bentley.com/) provides APIs for digital-twin federation, access control, reporting and visualization. Public [developer pricing](https://developer.bentley.com/pricing/) lists a non-commercial Community tier, Standard at USD 199/month including 200 credits, Premium at USD 499/month including 500 credits, additional credits at USD 1.20 and Enterprise by quote.

**Strengths:** infrastructure/enterprise digital-twin integration; data federation; API surface; public-sector relevance.

**Gaps:** not an early-stage massing generator; credit/TCO variability; location documentation needs confirmation before a UAE residency claim.

**Decision:** later partner for customers needing federated project/asset twins; exclude from the first generation-engine bake-off unless a target pilot already uses Bentley.

### 3.8 Finch, Archistar and specialist engines

Finch is relevant for detailed floorplate/unit planning and Rhino/Revit/Grasshopper workflows; Archistar is relevant if its planning-rule content and generative options cover the target jurisdiction. Both require direct verification of UAE rules, API/OEM availability, output rights, data handling and enterprise pricing before inclusion in a product dependency. They are secondary POC candidates, not assumptions in the target architecture.

### 3.9 Open-source and infrastructure components

- [CesiumJS](https://github.com/CesiumGS/cesium) is Apache-2.0 and supports commercial or non-commercial 2D/3D visualization. Cesium ion is a separate commercial service and its SaaS integration terms must be reviewed independently.
- [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) provides IFC parsing, geometry and conversion under LGPL-3.0-or-later for many components; some ecosystem components use GPL. Component-by-component legal review is required before distribution.
- [Hypar Elements](https://github.com/hypar-io/Elements) is MIT-licensed and suitable for a bounded geometry proof of concept.
- [Rhino.Compute](https://developer.rhino3d.com/guides/compute/compute-faq/) can expose Rhino/Grasshopper geometry through a self-hosted Windows or Linux service; macOS is unsupported. The current [production-server guide](https://developer.rhino3d.com/en/guides/compute/deploy-to-iis/) states USD 0.10 per core-hour, before VM/cloud, plugins, support and operations. Customer-facing service rights, scaling, definitions/plugins and full operating cost require a POC and written licence confirmation.
- [Speckle Server](https://github.com/specklesystems/speckle-server) can provide AEC model transport/versioning and self-hosting patterns. The repository says code is generally Apache-2.0 while some modules may differ; module/dependency review is mandatory. Hosted Speckle/white-label terms and support remain separate from the open-source server decision.
- [OR-Tools](https://github.com/google/or-tools) is an Apache-2.0 candidate solver component; GeoAI must still own objective functions, constraint provenance, solver/version/seed controls and the reproducibility contract.

### 3.10 UAE and wider-MENA applicability boundary

No assessed proprietary generator has published evidence sufficient to confirm authoritative UAE planning-rule coverage, and no country-level coverage has been verified for Saudi Arabia, Qatar, Oman, Bahrain or Kuwait. The linked technical/commercial matrix therefore marks these country questions `Unknown` or `Contract/quote required`. This report supports UAE-first technical discovery only; it is not a MENA-wide data/rules conclusion. Country promotion requires a licensed source pack, effective date, jurisdiction, professional validation and an identical local test set.

## 4. Pricing and monetisation benchmark

Public list prices are supplier cost anchors, not evidence of GeoAI willingness to pay.

| Option | Public anchor | What the price does and does not prove |
| --- | ---: | --- |
| TestFit Parking Solver | USD 195/month | Low entry price for parking and basic massing; does not include confirmed UAE data/rules |
| TestFit add-ons | Site Intelligence +150, Pro Forma +170 USD/month; pricing page shows MCP +100 for Parking Solver | Shows modular monetisation; the 2026-09-03 FAQ instead says MCP is included with all new subscriptions, so entitlement/value capture must be quoted |
| TestFit Site Solver | From USD 15,000/year; pricing page includes MCP | Enterprise feasibility reference price; exact seats, add-ons, customer cohort, regions and rights still need quote |
| TestFit Portfolio | From USD 20,000/year | Portfolio/SSO anchor; not an OEM price |
| Hypar paid seat | USD 100/month or USD 1,000/year | Professional seat benchmark; hosted embedding not established |
| Bentley iTwin Standard/Premium | USD 199/499 per month plus credits | API/digital-twin platform anchor; usage cost can scale materially |
| Autodesk Forma Site Design | UAE public-store anchor USD 655/year | Dated seat anchor only; obtain the account/order/API quote and reconcile tax, region, third-party data and rights before TCO |
| Autodesk AEC Collection | UAE public-store anchor USD 3,425/year | Bundle anchor relevant to Forma Building Design/Revit access; not a standalone Building Design, API or OEM price |
| Rhino.Compute production server | USD 0.10/core-hour | Runtime anchor only; VM/cloud, concurrency, plugins, engineering, support and customer-facing licence interpretation remain additional |
| Esri Urban | Quote-based | Often follows broader ArcGIS account/user-type economics; partner around customer estate |
| Open-source runtime | No licence fee does not mean zero cost | Engineering, cloud, observability, security, support and compliance remain material |

### GeoAI revenue model hypotheses

1. **Paid diagnostic pilot:** a bounded site/portfolio decision package, with setup/data work priced separately from software. This is the first revenue proof.
2. **Annual enterprise workspace:** role-based use of Analyse/Find/Create, projects, evidence, reports and integrations.
3. **Usage-based generation/simulation:** charge or meter expensive provider calls and compute separately, with per-operation cost visible internally.
4. **Premium data pass-through:** source-specific subscription/transaction fees separated from GeoAI software where contracts require it.
5. **Configuration and professional services:** jurisdiction rules, scenario templates, system integration and onboarding.
6. **GeoAI API/MCP:** bill external agents per resolved site, context snapshot, generated option set, evaluation or report—not per raw LLM token alone.

Do not fix GeoAI list pricing before buyer interviews and at least two paid-pilot negotiations. Instrument the prototype first so cost and outcome per decision can be measured.

## 5. API/MCP product architecture

### Required boundary

The API/MCP server should expose GeoAI business operations rather than a vendor's low-level geometry calls:

1. `resolve_site` — bind user point/object/AOI to a versioned geometry and identity hypothesis;
2. `build_geocontext` — create an immutable `GeoContextSnapshot` with source receipts, coverage and gaps;
3. `screen_scenario` — apply a versioned Scenario Registry definition and declare missing inputs;
4. `generate_alternatives` — call a selected deterministic provider through a replaceable adapter;
5. `evaluate_alternatives` — calculate metrics, constraints, economics and confidence;
6. `compare_alternatives` — return explainable differences without a hidden composite score;
7. `create_decision_record` — bind inputs, method versions, alternatives, evidence and decision state;
8. `render_report` — produce a human-reviewable artifact with the same Decision Record hash.

### Safety and unit-economics controls

- authenticate organisation/user/agent and authorise project scope;
- quote or estimate chargeable operations before execution;
- require explicit confirmation before a high-cost provider/compute call;
- enforce per-tenant budgets, concurrency, rate and geometry-size limits;
- cache only when the exact input, source and method version match;
- log provider, latency, input/output units, direct cost, retry and failure class;
- isolate customer content and prevent model/provider training unless contractually authorised;
- keep source and generated-output rights machine-readable;
- return `unsupported` or `validation_required` rather than fabricate a result;
- preserve idempotency for paid operations and a stable Decision Record identifier.

### Candidate billing unit

Use outcome-oriented units with internal cost metering:

- context snapshot;
- site/scenario screening;
- generated alternative set;
- simulation package;
- evaluated/compared scenario set;
- exported decision report.

The commercial price must exceed the full unit cost: provider licence/credit, geodata, model tokens, geometry compute, storage/egress, retry allowance, support and gross-margin reserve. A raw “per prompt” price is unsafe because one prompt can trigger radically different work.

## 6. Layer-by-layer decision

| Layer | Recommendation now | Rationale | Promotion gate |
| --- | --- | --- | --- |
| GeoContext and source ledger | **Build** | Core evidence, regional differentiation and provider independence | UAE coverage set; rights ledger; snapshot reproducibility |
| Scenario Registry | **Build** | Encodes customer decisions and validation obligations | Product review and professional validation |
| Constraints compiler | **Build orchestration; partner for content** | GeoAI needs a common contract but should not invent official rules | Licensed source; version/date/jurisdiction; expert acceptance |
| Reference massing | **Build bounded spike** | Fast learning and deterministic baseline | Geometry, rollback and metric fixtures pass |
| Production geometry engine | **Hybrid / POC** | Avoid monolithic CAD build; compare own, Hypar/Rhino and vendors | Identical UAE bake-off, API/OEM rights and TCO |
| Optimisation | **Open-source/hybrid** | Solvers are commodity; objectives and evidence are not | Deterministic objective/constraint tests |
| Environmental simulation | **Buy/partner** | Specialist validation and maintenance burden | Method validity, latency, cost, region/security |
| 3D visualization | **Reuse current; buy if scale requires** | Existing MapLibre workflow already proves interaction | Performance/coverage need demonstrates change |
| BIM/CAD interchange | **Open standards + partner** | IFC/glTF/DWG/Revit handoff matters more than authoring | Round-trip and downstream BIM validation |
| Economics/evaluation | **Build** | Direct connection to investment decision is a product moat | Reconciled calculations and assumptions |
| Comparison/ranking | **Build** | Must remain explainable and snapshot-bound | No hidden score; missing-value policy; reproducibility |
| Reports/projects/audit | **Build** | Decision continuity and diligence readiness | Exact Decision Record parity and permissions |
| API/MCP | **Build** | Distribution and unit economics must remain provider-neutral | Auth, metering, idempotency, tenancy and cost controls |

## 7. Identical UAE-oriented bake-off

Run the same dataset and brief through the GeoAI reference provider, TestFit, Autodesk Forma and one open/composable route such as Hypar Elements or Rhino.Compute. Esri may be added when an Urban model exists.

### Test set

- 20 Dubai/Abu Dhabi sites covering empty plots, infill, redevelopment and larger AOIs;
- 5–10 briefs across residential, mixed-use, hospitality, office, retail and industrial/data-centre patterns;
- fixed input package for each site: geometry, north, road/frontage graph, neighbouring heights/uses, explicit assumptions, available constraints, unit/parking/mix brief and target metrics;
- the same prohibited claims and missing-data rules for every provider.

### Required outputs

- at least three materially different alternatives per brief;
- geometry export in an open browser format and at least one BIM/CAD handoff format;
- deterministic GFA, footprint/coverage, height distribution, open-space, access/circulation and parking assumptions;
- constraint violations with source and method version;
- provider latency, manual intervention and full marginal cost;
- a reproducibility run using the same input and provider version;
- output-rights and retention statement.

### Scorecard

Do not collapse the result into one opaque weighted score. Show each metric and a decision rationale:

| Dimension | Measurement |
| --- | --- |
| Input fidelity | Geometry/context fields accepted and preserved |
| Feasibility utility | Correctness/relevance judged by developer, architect and planner reviewers |
| Metric reproducibility | Re-run variance and reconciliation against independent calculations |
| Alternative diversity | Material differences in typology, height/mix/access, not cosmetic changes |
| UAE fit | Local data/rules coverage and explicit unsupported areas |
| Integration | API/headless mode, auth, webhooks/jobs, export formats and error handling |
| Rights | embedding, sublicensing, generated-output, derivatives and termination rights |
| Security | region, subprocessors, encryption, deletion, SSO/audit and private deployment |
| Operations | latency, concurrency, reliability, support and observability |
| Cost | one-off, recurring and marginal cost per successful evaluated scenario |
| Exit | portable data/geometry, replacement effort and contract termination impact |

### Stop/go rules

- Stop any supplier POC if OEM/commercial use is explicitly prohibited or generated-output rights remain materially ambiguous after written clarification.
- Do not promote a provider that silently drops source geometry, changes metric definitions or cannot reproduce a result within the agreed tolerance.
- Do not label an output compliant when the relevant authority data and rule version are absent.
- A supplier advances only if it delivers a clear advantage over the reference provider on a paid customer decision—not merely better graphics.

## 8. Three-year TCO input framework

This section defines the required inputs; it is not a completed TCO calculation. Build one quantified model per provider/architecture with low/base/high usage cases. Public anchors available now include Autodesk Forma Site Design at USD 655/year in the UAE store, the AEC Collection at USD 3,425/year, Rhino.Compute server runtime at USD 0.10/core-hour and the TestFit, Hypar and Bentley prices above. All anchors remain subject to entitlement, tax, account, contract and usage assumptions.

### One-off cost inputs

- vendor onboarding and professional services;
- integration and adapter engineering;
- reference dataset preparation and mapping;
- security/legal/procurement review;
- rule/scenario configuration;
- migration, training and customer rollout;
- POC and downstream BIM validation.

### Recurring fixed inputs

- platform and seat licences;
- enterprise/SSO/support tiers;
- private deployment or reserved infrastructure;
- required premium-data subscriptions;
- observability, security and compliance operations;
- internal product/engineering ownership.

### Variable inputs

- provider credits/API transactions;
- geometry/simulation compute;
- LLM input/output/reasoning tokens;
- geodata query or tile costs;
- storage, egress and report rendering;
- retries, failures and manual review;
- customer support per project.

### Lock-in and exit inputs

- data/geometry export restrictions;
- retained access after termination;
- migration and adapter replacement effort;
- rule/scenario portability;
- revalidation of reference outputs;
- contract minimums and price-escalation clauses.

Report annual cash cost, cost per successful evaluated scenario, gross margin under the candidate GeoAI price, engineering capacity consumed and exit cost. Do not compare subscription prices alone.

## 9. Security, data residency and legal gates

UAE personal-data requirements and customer/sovereign procurement requirements are related but not identical. The [UAE Government data-protection overview](https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws) confirms a federal framework and cross-border-transfer controls; project-specific legal interpretation remains required. DIFC and ADGM customers may add their own regimes and safeguards.

Use two deployment classes as a working architecture hypothesis:

1. managed SaaS for public/open and non-confidential screening data;
2. private cloud or customer-controlled deployment for confidential development, authority or sovereign data when required by contract.

Every vendor review must resolve:

- content and generated-output ownership;
- perpetual export/use after termination;
- API embedding, commercial sublicensing and white-label rights;
- whether customer/project data may train vendor models;
- derived-data/database rights and upstream-source disclosure;
- processing regions, subprocessors, encryption, deletion, incident notice and audit rights;
- tenant isolation, SSO, audit logs and private deployment;
- indemnity and survival clauses.

Open geodata needs a separate rights review. [OSM attribution guidance](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) establishes attribution obligations; derivative-database implications depend on the actual combination and distribution architecture. [Overture licensing guidance](https://docs.overturemaps.org/attribution/) applies different licences by theme. No open-source or open-data label should be treated as blanket permission to combine, redistribute or resell.

## 10. POC brief and next evidence wave

### Objective

Decide whether a third-party or open-source geometry/analysis provider creates enough customer and operational advantage to replace or augment GeoAI's bounded reference massing engine, without sacrificing evidence, rights, economics or provider independence.

### Work packages

1. Build the `GeoContextSnapshot`, Scenario Registry and Decision Record contracts before provider integration.
2. Add one deterministic multi-building reference generator with typologies, assumptions, metrics, violations and full rollback.
3. Prepare the 20-site UAE golden set and five to ten fixed briefs.
4. Run TestFit Site Solver, Forma Site Design and Hypar/Rhino feasibility POCs against the identical inputs; add Forma Building Design only when schematic-building/Revit handoff is material and CityEngine only for a procedural-AOI brief.
5. Validate IFC/Revit/DWG/glTF output with a downstream BIM practitioner.
6. Obtain written API/OEM/embedding/output-rights and security answers from shortlisted vendors.
7. Conduct 12–15 interviews across development, investment, master planning, GIS/BIM and digital transformation.
8. Conduct at least two paid-pilot conversations; until then commercial validation is zero.
9. Measure unit cost and manual review time for every successful and failed scenario.
10. Hold an architecture decision review using evidence from the same dataset and customer decisions.

### Founder decisions required after evidence, not before

- Which first paid workflow: site-acquisition screening, development feasibility or portfolio redevelopment?
- Which two or three customers will validate the golden set and reference outputs?
- Which vendors may receive project data during the POC?
- What deployment class is required for the first UAE buyer?
- What output must be accepted by the buyer's investment/BIM process?

## 11. Evidence register and unresolved questions

| Evidence | Supports | Confidence | Remaining gap |
| --- | --- | --- | --- |
| [Technical and Commercial Matrix](./GENERATIVE_DEVELOPMENT_TECHNICAL_COMMERCIAL_MATRIX_20260904.md) | Product-keyed 25-field comparison covering technical surface, UAE/wider-MENA applicability, security, rights, licensing, pricing, TCO drivers and promotion gates | Complete as a Wave-1 public-evidence matrix; `Unknown`/`Contract required` are substantive findings | Vendor contracts, quotes, attestations, local data/rules, POCs and customer validation |
| [TestFit pricing](https://www.testfit.io/pricing), [MCP](https://www.testfit.io/mcp), [FAQ](https://support.testfit.io/knowledge/mcp-faq), [terms](https://www.testfit.io/legal/terms-of-service), [security policy](https://www.testfit.io/legal/information-security-policy), [backup policy](https://www.testfit.io/legal/cloud-backup-policy) | Product/MCP pattern, published prices, desktop boundary, standard-use restrictions and public security/retention controls | Published entitlement conflict: pricing page and 2026-09-03 FAQ must be reconciled by quote; high for quoted source text, not a unified offer | Headless/OEM rights, generated-output classification, post-termination use, UAE layers/rules, attestation and processing region |
| [Autodesk Forma Site Design](https://www.autodesk.com/products/forma-site-design/overview), [UAE store](https://www.autodesk.com/ae/products), [APIs](https://aps.autodesk.com/autodesk-forma), [availability](https://www.autodesk.com/trust/availability), [API terms](https://www.autodesk.com/company/legal-notices-trademarks/autodesk-digital-distribution-web-services-api-terms-of-service), [special terms](https://www.autodesk.com/company/terms-of-use/en/special-terms) | Site/analysis features, UAE seat anchor, beta API, stated regions, input-ownership and Autodesk-Material/third-party-data boundaries | High for public product/price/term text; not generated-output/OEM clearance | Account quote, API entitlement/SLA, UAE context, output/derivative/post-term rights and UAE residency |
| [Autodesk Forma Building Design](https://www.autodesk.com/products/forma-building-design/overview), [Forma for Buildings](https://www.autodesk.com/products/forma-for-buildings/overview) | Current schematic-building, unit/floor-plan/façade, analysis, native-Revit and bundle scope | High for published features/bundle; low for product-specific API, regions and rights | Product-specific API/OEM, security/region, output/export rights, price/entitlement and UAE fit |
| [Hypar pricing](https://docs.hypar.io/plans-account-and-admin/plans-pricing-and-licenses), [Elements](https://github.com/hypar-io/Elements) | Current seat price and MIT component capabilities/limits | High | Hosted-service OEM/residency and POC output quality |
| [ArcGIS Urban](https://doc.arcgis.com/en/urban/11.4/get-started/get-started-what-is-urban.htm), [Urban API](https://developers.arcgis.com/arcgis-urban-api/get-started/) | Scenario/zoning concepts and API integration | High | Customer model availability, UAE rule sources, price/OEM terms |
| [ArcGIS CityEngine](https://www.esri.com/en-us/arcgis/products/arcgis-cityengine/overview) | Procedural city/AOI generation, GIS/CAD/BIM inputs and scenario role | High for published product role | Headless/API/OEM, rule authorship/rights, export, UAE applicability, price and TCO |
| [Rhino.Compute FAQ](https://developer.rhino3d.com/guides/compute/compute-faq/), [production-server guide](https://developer.rhino3d.com/en/guides/compute/deploy-to-iis/) | Windows/Linux server support and USD 0.10/core-hour runtime anchor | High for published runtime/platform price; not full service rights or TCO | Customer-facing use rights, plugin/definition licences, scaling, support, security and complete cloud cost |
| [Bentley developer platform](https://developer.bentley.com/), [pricing](https://developer.bentley.com/pricing/) | API/digital-twin role and public cost anchors | High | UAE location consistency, full TCO, massing not core |
| [CesiumJS](https://github.com/CesiumGS/cesium) | Apache-2.0 browser 2D/3D runtime | High | Cesium ion commercial integration is a separate decision |
| [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) | IFC/geometry tooling and component licences | High | Distribution architecture and LGPL/GPL legal review |
| [Speckle Server](https://github.com/specklesystems/speckle-server) | Self-hosted server/viewer/worker pattern and generally Apache-2.0 repository boundary | High for repository statement; selected modules/dependencies remain unverified | Exact module licences, hosted-service rights, security architecture and round-trip fidelity |
| [OR-Tools](https://github.com/google/or-tools), [documentation](https://developers.google.com/optimization) | Apache-2.0 optimization component and supported solver families/interfaces | High for code/licence role | Selected solver/version/seed reproducibility, objective quality, compute and any wrapped-solver rights |
| [UAE data-protection overview](https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws) | Federal data-protection and transfer framework | High for public legal summary | Counsel interpretation and buyer-specific sovereign requirements |

### Known unknowns that block a production choice

- no verified paid willingness-to-pay for the GeoAI generative workflow;
- no authoritative UAE rule/data pack connected to the prototype;
- no common professional reference output for scoring geometry quality;
- no written OEM/embedding agreement from any proprietary generator;
- no complete three-year TCO or marginal-cost trace;
- no confirmed confidential-data deployment requirement for a named pilot customer;
- no legal conclusion on the intended OSM/Overture/other dataset combination;
- no evidence that a supplier's better visual output improves the buyer's decision enough to justify dependency and cost.

## Final recommendation

Proceed with GeoAI-owned contracts and a bounded deterministic reference generator now. Run a time-boxed, identical UAE bake-off before selecting a production geometry or simulation provider. Keep TestFit as the direct commercial benchmark, Forma Site Design as the analysis/BIM ecosystem candidate, Forma Building Design as a separate schematic-building/Revit route, Hypar/Rhino as the composable geometry route, Esri Urban/CityEngine as customer-GIS and procedural-city paths and Bentley as a later digital-twin integration. Promote no provider until commercial rights, UAE applicability, security, quantified TCO and customer decision value are verified in writing and in the same test set. This is an architecture hypothesis, not supplier selection, procurement approval or commercial validation.
