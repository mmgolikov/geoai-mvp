# GeoAI — Role, Scenario and Value Contract Matrix

Статус: **COMPACT PRODUCT CONTRACT · CANDIDATE · NOT MAIN/COMMERCIAL ACCEPTANCE**  
Дата: 18 сентября 2026  
Версия: `1.0`  

## 1. Contract rules

- Role и B2B/B2C определяют inputs, question, terminology, evidence priority, card order, output и next action.
- Role и B2B/B2C **никогда** не дают доступ. Authorization определяется identity, project membership/capability и RLS/server checks.
- Operator, beneficiary/decision owner, economic buyer и channel — разные сущности. Один человек может совмещать роли только если это подтверждено; Product не предполагает совмещение.
- Все market/buyer/budget/WTP statements ниже — `HYPOTHESIS` или `UNKNOWN`. Commercial06 на 9 сентября 2026 фиксировал нулевые external observations; более новые commercial account facts в этой Product-задаче не проверялись.
- Ни один scenario не получает automatic rank/winner. Factual comparison не равен recommendation.

## 2. Reconciliation of Product06 and Commercial06

| Contract field | Partner-led route | Direct developer route | Product resolution |
| --- | --- | --- | --- |
| Operator hypothesis | Feasibility/GIS/BIM/advisory analyst | Development/investment analyst | Оба создают один versioned O1/O2 contract |
| Beneficiary / decision owner | Client development/investment owner | Internal development/investment owner | Один тип конечного решения: advance/hold/stop screening + validation action |
| Economic buyer hypothesis | Practice principal / delivery P&L owner | Development/investment budget owner | Проверять отдельно; WTP не pooling |
| Channel hypothesis | Productized evidence service | Direct internal workflow / future software | Commercial discovery сначала проверяет partner-led route; это не Product winner |
| Value unit | Accepted client-ready brief | Accepted internal decision brief | Одинаковые evidence/quality gates, разные receiving workflow и economics |

## 3. MVP role/scenario matrix

| Segment / role ID | Organisational archetype hypothesis | Operator | Beneficiary / decision owner | Buyer / channel hypothesis | Scenario and trigger | Product question | Required output | Mode path | Current status | Required missing evidence | Explicit non-claims |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B2B / `consultant_broker` | UAE advisory/GIS/BIM practice preparing repeat client briefs | Feasibility/GIS/BIM analyst | Client developer/owner decision lead | Practice principal or delivery P&L; partner-delivered | New client known-site brief or programme change | What can the available evidence establish, what remains missing, and what should the client verify next? | O1 Site Screening Decision Brief; O2 when client supplies comparable candidates | Analyse → save/reopen/export; Find/Compare when eligible | Product candidate; first commercial discovery route; unvalidated | Actual brief frequency, accepted template, client redistribution rights, total minutes, budget/WTP, procurement | Not official planning/parcel/title/valuation; not assumed easy procurement; not PMF |
| B2B / `developer` | UAE developer/master developer conducting known-site diligence | Development/investment analyst | Development/investment decision owner | Feasibility/development budget owner; direct route | Named site enters review or brief changes | Does this site merit deeper diligence, require named evidence, or stop at screening? | O1 Site Screening Decision Brief | Select → Analyse depth → dashboard → save/reopen/export | Product candidate; direct route unvalidated | Decision frequency, owner/action threshold, lawful site inputs, baseline/rework, budget/WTP | Not acquisition recommendation, approved site, zoning/cadastral conclusion or valuation |
| B2B / `developer` | Same developer reviewing a bounded cohort | Analyst or authorised partner analyst | Development/investment decision owner | Same route as above; no separate product | 2–3 candidates need one comparable screening question | Which observed differences matter, which are coverage gaps, and which site needs individual diligence? | O2 Candidate Comparison Pack + linked O1 per candidate | Find → shortlist → factual Compare → individual Analyse → return → save | Candidate; ranking blocked by default | Same-profile evidence, comparable time window, accepted fields, actual criteria/weights if ranking is later requested | No winner/preferred site; no score from sparse/demo facts; no POI-as-parcel |
| B2B / `developer` | Team exploring bounded options for an already understood AOI | Development analyst with professional reviewer | Development/programme owner | Add-on hypothesis, not separate buyer route | Accepted site context merits conceptual option exploration | Which two bounded alternatives express a useful programme/form/quantity trade-off, and what must specialists verify? | O3 Scenario Alternatives Addendum | Create AOI → A/B → 3D/2D → restore → save/reopen | Conditional addendum; not core wedge | User programme/constraints, valid geometry, verified planning inputs if claimed, receiving workflow value | Not approved design/BIM/feasibility; user constraints/derived assumptions are not verified planning |
| B2B / `real_estate_fund` | Owner/fund screening an existing asset/site before specialist review | Investment/asset analyst | Investment decision owner | Fund/asset-management budget hypothesis | Potential acquisition/repositioning enters initial review | Which evidence could reverse a diligence decision and what remains unavailable? | Bounded O1 contextual acquisition brief | Analyse; factual compare only if commensurable | Partial/spec beyond context; not priority route | Rent roll, leases, capex, transactions, currency/date basis, valuation reviewer, rights | No yield, valuation, price forecast or investment advice without inputs |
| B2C / `family_relocation` | Individual/household preparing a UAE move or visit-based shortlist | User | User/household | Self-serve payer/channel unknown; not current commercial priority | User must narrow 2–3 areas/objects before visits | Which locations match stated everyday priorities on available factual infrastructure, and what must be checked in person/current sources? | O4 Living / Relocation Verification Pack: factual compare + saved visit/verification checklist | Own criteria → Find 2–3 → Compare → checklist → save/reopen | `NOT MVP-ACCEPTED`; target 31 Oct 2026 unless exact runtime proves full role effect | Current service availability, routes, admissions, housing cost, user baseline, B2C WTP/retention | No school quality/admission, safety/crime, actual commute, current listing/price or suitability claim |

## 4. Role-specific input/output contract

| Role/scenario | Required user inputs | Evidence priority | Decision output | Observable next action |
| --- | --- | --- | --- | --- |
| Partner known-site brief | Known site/object/AOI; decision question; permitted client context; receiving professional | Identity, geometry, surrounding uses, access, source lineage, missing client/official facts | Client-ready O1 with bounded claims | Ask client/professional for named evidence or advance/hold/stop screening |
| Developer known-site | Site/object/AOI; project question; programme assumptions if any | Same core evidence + developer scenario trade-offs | Internal O1 | Commission deeper diligence, hold for named item, or stop |
| Developer comparison | 2–3 candidates; same decision question and declared criteria | Same definitions/units/context version across candidates | O2 aligned comparison | Open individual O1, update stale search, or request missing evidence |
| Developer Create | Valid AOI; user constraints/programme; accepted O1 context | Controlled geometry, quantities, assumptions, violations, source-state | O3 A/B addendum | Select option for professional study, revise explicit input, or restore |
| B2C relocation | 2–3 locations/objects; stated daily priorities; visit horizon | Education/health/daily services/open space/mapped transport where supported | O4 factual comparison and checklist | Plan visits and verify named current facts |

## 5. Mode boundaries

### Analyse

Produces O1 from one selected identity/AOI and one evidence snapshot. Quick/Standard/Deep alter reasoning/checks only. Exact identity is mandatory: nearest fountain, viewpoint or address does not replace selected building/parcel. Submitted depth equals running/result depth; changes after success/error restore an explicit run action.

### Find

Produces a discovery cohort, then O2/O4 comparison. Hover, active selection, shortlist and result cohort are separate. Trusted geometry renders as geometry; point-only remains point. Stale results are labelled; reset is obvious; market switch clears invalid state. Ranking remains blocked without the full method/data gate.

### Create

Produces O3 only for an explicit AOI and assumptions. A/B must differ in actual decision trade-off, not random layout. Source originals are reversibly hidden, never deleted; map 3D, fullscreen 3D and 2D fallback read the same versioned result.

## 6. Output acceptance matrix

| Output | Reviewer acceptance question | Technical minimum | Correct insufficient-evidence treatment | Reject if |
| --- | --- | --- | --- | --- |
| O1 | Can the receiving professional name a justified next action? | Exact identity, evidence/gaps, depth receipt, save/reopen | Name the missing item, why it changes the decision and a feasible validation action; reviewer still decides usefulness | Wrong site, material fabrication, silent state loss, generic warning without actionable gap |
| O2 | Can the reviewer understand real differences without mistaking coverage for performance? | Same metric definitions/units/profile/window; 2–3 identities; return state | Show unavailable per candidate and block rank where necessary | Winner/score from sparse evidence, stale selection, invented geometry |
| O3 | Do A/B expose a useful quantified trade-off for specialist review? | Valid AOI, distinct programme/form/quantity result, assumptions, restore, save/reopen | Return infeasible/partial with violated constraint and revision path | Cosmetic randomization, originals under volumes, 2D/3D mismatch, planning claim |
| O4 | Can the user make a visit/verification plan without unsupported suitability claims? | Own criteria/question/result; factual 2–3 comparison; saved checklist | Name unavailable current fact and where/how to verify it | B2B result merely relabelled; safety/quality/commute/price invented |

Every eligible job is preregistered before execution. Failures, sparse cases, insufficient-evidence outputs and rejects stay in the Accepted Decision Record Rate denominator. Technical completion and reviewer acceptance are separate.

## 7. Portable/shareable result boundary

The MVP requires a versioned saved project artifact with exact subject/evidence/scenario/method references. `Export` or `share` is accepted only when the exact artifact can be opened/read back by the intended receiving workflow with claims and source lineage intact. A visible button, PDF screenshot or local URL does not prove external shareability, access control or cross-device persistence.

## 8. Product KPIs and guardrails

Only three primary KPIs:

1. Accepted Decision Record Rate on preregistered eligible jobs.
2. Total Human Minutes vs Same-Task Baseline, including review/rework/handoff.
3. Repeat Real-Task Adoption after separately authorised external testing.

Acceptance guardrails — zero critical wrong-site, fabricated material fact, data loss, unauthorised access and duplicate billable call.

## 9. Status and next gate

Current code/design/demo assets are incumbent implementation evidence, not customer demand. Login, model budget and demo data enable testing but are not value. Main must join Dev/GenAI/Data/QA evidence before any Product acceptance. External discovery, WTP and pilot claims require separate authority.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
