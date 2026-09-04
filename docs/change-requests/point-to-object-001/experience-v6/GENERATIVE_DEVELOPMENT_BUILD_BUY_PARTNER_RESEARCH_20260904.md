# GeoAI Generative Development — Build / Buy / Partner Research

Status: `RESEARCH_WAVE_1_COMPLETE_POC_REQUIRED`

Date: 2026-09-04

Decision owner: Founder / GeoAI Control

Scope: early development-feasibility, massing, site-layout and scenario-decision tooling for UAE-first real-estate and urban-development workflows. This is research and architecture guidance, not supplier approval, procurement authority, source activation or a claim of planning compliance.

Required boundary for all prototype outputs:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

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

Public developer evidence describes feasibility, title/regulatory due diligence, site and environmental analysis, benchmarking, budget analysis, design optimisation and approvals as part of real development work. See [Emaar Development Integrated Annual Report 2025](https://properties.emaar.com/wp-content/uploads/2026/03/Emaar-Development-IR-2025_English_F.pdf) and [Aldar Projects](https://www.aldar.com/en/explore-aldar/businesses/aldar-projects).

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

[TestFit Site Solver](https://www.testfit.io/product/site-solver) joins parcel/site inputs, deterministic layout generation, yield, parking, quantity and pro-forma workflows. Public [pricing](https://www.testfit.io/pricing) lists Parking Solver at USD 195/month, Site Intelligence at an additional USD 150/month, Pro Forma at an additional USD 170/month, an MCP connection at an additional USD 100/month, Site Solver from USD 15,000/year and Portfolio from USD 20,000/year.

Its current [MCP offer](https://www.testfit.io/mcp) and [MCP FAQ](https://support.testfit.io/knowledge/mcp-faq) are strategically important: the user's AI assistant interprets intent, while TestFit's deterministic engine creates and edits geometry and analytics. Public documentation describes desktop use rather than a confirmed server-side OEM API.

**Strengths:** fast feasibility; domain typologies; parking; metrics/pro forma; geometry-edit loop; Revit/DXF workflow; credible paid benchmark.

**Gaps for GeoAI:** public availability of parcel, zoning, flood, utility and other layers varies by country; UAE data/rules coverage is not established by the public “global” statement; MCP is not evidence of a headless OEM right; MENA-specific evidence and authority validation remain external.

**Commercial/legal gate:** [TestFit terms](https://www.testfit.io/legal/terms-of-service) reserve TestFit materials and restrict sublicensing, service-bureau and similar reuse. Customer Data remains the customer's, but the public terms are not a sufficient basis for embedding or reselling TestFit output as a GeoAI service. An explicit OEM/API/white-label and generated-output-rights agreement is required.

**Decision:** benchmark first; explore partnership only after technical bake-off and written commercial-rights confirmation. Do not couple GeoAI contracts to TestFit's object model.

### 3.2 Autodesk Forma — analysis and BIM ecosystem candidate

[Autodesk Forma Site Design](https://www.autodesk.com/products/forma-site-design/overview) covers site planning, design automation, environmental analysis, alternatives and connections to IFC, OBJ, Revit, Dynamo and Rhino. Autodesk exposes [Forma cloud APIs](https://aps.autodesk.com/autodesk-forma); Site Design API availability is described as beta.

Public Autodesk documentation says contextual terrain/building/parcel availability varies by region and may use open-source data. [Autodesk Trust regional availability](https://www.autodesk.com/trust/availability) lists Site Design covered-content storage in the US, EU and Australia and the beta API in the US/EU; no UAE storage region is listed. Autodesk's [API terms](https://www.autodesk.com/company/legal-notices-trademarks/autodesk-digital-distribution-web-services-api-terms-of-service) preserve customer ownership of Customer Content, while [special terms](https://www.autodesk.com/company/terms-of-use/en/special-terms) keep third-party datasets subject to separate terms.

**Strengths:** established AEC ecosystem; credible environmental/site analysis; BIM handoff; APIs; familiar enterprise vendor.

**Gaps:** country-specific context coverage; beta API scope; UAE data residency; API/OEM limits; dependency on separate third-party-data rights.

**Decision:** priority POC for analysis and handoff, not a replacement for GeoAI GeoContext/evidence. Obtain a UAE account-level quote and precise API/data-region answers.

### 3.3 Hypar and Hypar Elements — composable geometry option

[Hypar](https://docs.hypar.io/) generates building systems through reusable design logic and supports optioning and AEC interchange. Public [pricing](https://docs.hypar.io/plans-account-and-admin/plans-pricing-and-licenses) lists USD 100/user/month or USD 1,000/user/year; Enterprise is quote-based.

[Hypar Elements](https://github.com/hypar-io/Elements) is an MIT-licensed C# library designed for cloud-friendly building generation, with JSON/IFC/glTF-oriented interoperability. Its own documentation describes a deliberately simple BREP/CSG kernel rather than a universal geometry engine.

**Strengths:** open and composable reference component; no dependency on Revit/Rhino for core geometry; useful IFC/glTF direction.

**Gaps:** C# service boundary for a TypeScript-led product; kernel limitations; no confirmed UAE rules/data; commercial Hypar embedding and residency need direct confirmation.

**Decision:** technical sandbox candidate for the reference provider, subject to prototype performance and output validation. Keep the MIT library and hosted Hypar service as separate legal/technical decisions.

### 3.4 Esri Urban — planning and public-sector integration candidate

[ArcGIS Urban](https://doc.arcgis.com/en/urban/11.4/get-started/get-started-what-is-urban.htm) supports 3D planning scenarios, zoning, plausible rule-based buildings and custom metrics. The [Urban GraphQL API](https://developers.arcgis.com/arcgis-urban-api/get-started/) exposes integration paths; private models use ArcGIS identity/OAuth.

**Strengths:** municipal/enterprise GIS fit; zoning and scenario concepts; existing customer accounts and governance; self-managed ArcGIS Enterprise can change deployment control.

**Gaps:** quote-based product licensing; public API/OEM scope must be confirmed; customer model/rules availability; not primarily a developer underwriting product.

**Decision:** partner where an authority or enterprise customer already has authoritative ArcGIS data/models. Do not make Esri a mandatory dependency for commercial site screening.

### 3.5 Bentley iTwin — later digital-twin/federation layer

[Bentley iTwin Platform](https://developer.bentley.com/) provides APIs for digital-twin federation, access control, reporting and visualization. Public [developer pricing](https://developer.bentley.com/pricing/) lists a non-commercial Community tier, Standard at USD 199/month including 200 credits, Premium at USD 499/month including 500 credits, additional credits at USD 1.20 and Enterprise by quote.

**Strengths:** infrastructure/enterprise digital-twin integration; data federation; API surface; public-sector relevance.

**Gaps:** not an early-stage massing generator; credit/TCO variability; location documentation needs confirmation before a UAE residency claim.

**Decision:** later partner for customers needing federated project/asset twins; exclude from the first generation-engine bake-off unless a target pilot already uses Bentley.

### 3.6 Finch, Archistar and specialist engines

Finch is relevant for detailed floorplate/unit planning and Rhino/Revit/Grasshopper workflows; Archistar is relevant if its planning-rule content and generative options cover the target jurisdiction. Both require direct verification of UAE rules, API/OEM availability, output rights, data handling and enterprise pricing before inclusion in a product dependency. They are secondary POC candidates, not assumptions in the target architecture.

### 3.7 Open-source and infrastructure components

- [CesiumJS](https://github.com/CesiumGS/cesium) is Apache-2.0 and supports commercial or non-commercial 2D/3D visualization. Cesium ion is a separate commercial service and its SaaS integration terms must be reviewed independently.
- [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) provides IFC parsing, geometry and conversion under LGPL-3.0-or-later for many components; some ecosystem components use GPL. Component-by-component legal review is required before distribution.
- [Hypar Elements](https://github.com/hypar-io/Elements) is MIT-licensed and suitable for a bounded geometry proof of concept.
- Rhino.Compute can expose Rhino/Grasshopper geometry through a service, but Windows/runtime licensing, scaling and operational cost require a POC.
- Speckle can provide AEC model transport/versioning and self-hosting patterns, but hosted/white-label terms and support are separate from open-source components.
- OR-Tools is a candidate solver component; GeoAI must still own the objective functions, constraint provenance and reproducibility contract.

## 4. Pricing and monetisation benchmark

Public list prices are supplier cost anchors, not evidence of GeoAI willingness to pay.

| Option | Public anchor | What the price does and does not prove |
| --- | ---: | --- |
| TestFit Parking Solver | USD 195/month | Low entry price for parking and basic massing; does not include confirmed UAE data/rules |
| TestFit add-ons | Site Intelligence +150, Pro Forma +170, MCP +100 USD/month | Shows modular monetisation and direct MCP value capture |
| TestFit Site Solver | From USD 15,000/year | Enterprise feasibility reference price; exact seats, credits, regions and rights still need quote |
| TestFit Portfolio | From USD 20,000/year | Portfolio/SSO anchor; not an OEM price |
| Hypar paid seat | USD 100/month or USD 1,000/year | Professional seat benchmark; hosted embedding not established |
| Bentley iTwin Standard/Premium | USD 199/499 per month plus credits | API/digital-twin platform anchor; usage cost can scale materially |
| Autodesk Forma | Locale/account dependent | Obtain a UAE quote; public pages and API entitlements must be reconciled before TCO |
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

## 8. Three-year TCO model

Build one comparable model per provider/architecture with low/base/high usage cases.

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
4. Run TestFit, Forma and Hypar/Rhino feasibility POCs against the identical inputs.
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
| [TestFit pricing](https://www.testfit.io/pricing), [MCP](https://www.testfit.io/mcp), [FAQ](https://support.testfit.io/knowledge/mcp-faq), [terms](https://www.testfit.io/legal/terms-of-service) | Current offer, pricing, deterministic-MCP pattern and public commercial restrictions | High for published terms/offers | Headless OEM rights, UAE layers/rules, output ownership and residency |
| [Autodesk Forma overview](https://www.autodesk.com/products/forma-site-design/overview), [APIs](https://aps.autodesk.com/autodesk-forma), [availability](https://www.autodesk.com/trust/availability), [terms](https://www.autodesk.com/company/terms-of-use/en/special-terms) | Site/analysis features, integration surface, stated regions and third-party data boundary | High for published product state | UAE quote, precise API entitlement/SLAs, UAE context coverage and residency |
| [Hypar pricing](https://docs.hypar.io/plans-account-and-admin/plans-pricing-and-licenses), [Elements](https://github.com/hypar-io/Elements) | Current seat price and MIT component capabilities/limits | High | Hosted-service OEM/residency and POC output quality |
| [ArcGIS Urban](https://doc.arcgis.com/en/urban/11.4/get-started/get-started-what-is-urban.htm), [Urban API](https://developers.arcgis.com/arcgis-urban-api/get-started/) | Scenario/zoning concepts and API integration | High | Customer model availability, UAE rule sources, price/OEM terms |
| [Bentley developer platform](https://developer.bentley.com/), [pricing](https://developer.bentley.com/pricing/) | API/digital-twin role and public cost anchors | High | UAE location consistency, full TCO, massing not core |
| [CesiumJS](https://github.com/CesiumGS/cesium) | Apache-2.0 browser 2D/3D runtime | High | Cesium ion commercial integration is a separate decision |
| [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) | IFC/geometry tooling and component licences | High | Distribution architecture and LGPL/GPL legal review |
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

Proceed with GeoAI-owned contracts and a bounded deterministic reference generator now. Run a time-boxed, identical UAE bake-off before selecting a production geometry or simulation provider. Keep TestFit as the direct commercial benchmark, Forma as the strongest analysis/BIM ecosystem candidate, Hypar/Rhino as the composable geometry route, Esri as the authority-GIS partner path and Bentley as a later digital-twin integration. Promote no provider until commercial rights, UAE applicability, security, TCO and customer decision value are verified in writing and in the same test set.
