# GeoAI — Remaining Three Sprints Value Backlog

Статус: **PRODUCT BACKLOG CANDIDATE · S2–S4 · NOT RELEASE AUTHORITY**  
Дата: 18 сентября 2026  
Base: `21b91c43c2fc8dd61b08962e562601b29dd89c76`  
Зависимость: S1 Product/Dev/GenAI outputs и Main integration gate  

## 1. Приоритетный результат

Оставшиеся три спринта должны не «добавить функции», а доказать одну связную систему ценности:

`authenticated project → B2B or B2C decision question → bounded evidence → accepted output → save/reopen → explicit next action`.

Commercial discovery остаётся B2B-first. Functional MVP acceptance включает отдельные B2B и B2C journeys. Никакой backlog item не создаёт demand, WTP, rights или release authority.

## 2. Общий Definition of Done

Backlog item считается `DONE` только если:

- выполнен на exact integrated candidate, а не только на isolated lane;
- eligible jobs/cases предзарегистрированы до попытки; failed, sparse и insufficient cases нельзя исключить post hoc;
- входы, состояние, output и negative outcome проверены;
- source/fixture/live boundary и unavailable state видимы;
- сохранение/повторное открытие не вызывают неожиданный AI/source request;
- есть evidence reference, defect state и owner;
- guardrails дают ноль critical wrong-site, fabricated material fact, data loss, unauthorised access и duplicate billable call;
- blocked dependency остаётся `BLOCKED`, а не превращается в демо-PASS;
- technical completion и reviewer acceptance записаны отдельно; честный insufficient-evidence output принят только если конкретный missing item, decision impact и feasible next action полезны reviewer.

Общее правило reopen: ноль новых AI, generation или context-acquisition operations, вызванных открытием saved result. Обычная авторизованная загрузка map tiles/assets и session validation не являются новым analysis и не дают false failure. Evidence refresh всегда отдельная explicit operation/version/cost receipt.

## 3. S2 — coherent value loop

### S2-PV-01 · B2B Site Screening Decision Brief

**Outcome:** developer или partner analyst получает один versioned O1 brief по known site и передаёт decision owner проверяемый next action.

**Acceptance:** submitted identity/geometry, role/scenario/depth/question и evidence version совпадают с running label и saved result; Quick/Standard/Deep различимы по reasoning/checks; result сохраняется после draft change/error; reopen не выполняет новую analysis operation по общему правилу; source/date/coverage/gap/next action доступны.

**Dependencies:** GenAI lifecycle/depth candidate; Dev project identity/persistence boundary; Data/Geo truth contract.  
**Not included:** buyer acceptance, WTP, official validation.

### S2-PV-02 · Find → factual comparison → individual decision

**Outcome:** пользователь строит свежий cohort, выбирает 2–3 кандидата, сравнивает их без ложного winner и переходит к O1.

**Acceptance:** hover/active/shortlist/result geometry разделены; stale criteria требуют Update search; reset contract ясен; numbering синхронна; compare использует одинаковые definitions/units/source window; unknown сохраняется; individual analysis и Back сохраняют state.

**Dependencies:** trusted subject/geometry; scenario context profile; saved shortlist.  
**Not included:** enabled ranking при отсутствии versioned weights/coverage/rights.

### S2-PV-03 · Create A/B as an addendum

**Outcome:** пользователь дополняет принятый site context двумя bounded conceptual alternatives и может восстановить исходную сцену.

**Acceptance:** A/B различимы по predeclared design trade-off в programme/form/quantities/open space/access, а не только random block placement; user constraints и derived assumptions отделены от verified planning; assumptions/KPI/violations связаны с exact AOI; 3D/2D читают один result; switch/save/reopen/restore не регенерируют; failed revision не уничтожает last success; hide не удаляет source objects.

**Dependencies:** valid AOI and geometry checks; cost guard; saved artifact identity.  
**Not included:** planning approval, BIM, investment recommendation, five alternatives.

### S2-PV-04 · Complete B2C living/relocation journey

**Outcome:** пользователь задаёт свои бытовые критерии, сравнивает 2–3 locations/objects и сохраняет visit/verification checklist.

**Acceptance:** B2C role изменяет inputs, decision question, comparable fields, result и checklist; factual infrastructure comparison показывает source/coverage/unknown; no school-quality/safety/live-commute/current-market inference; reopen сохраняет exact checklist; никакое B2B permission не возникает.

**Decision:** если role влияет только на card order, item `BLOCKED / NOT MVP-ACCEPTED`, target closure 31 October 2026.  
**Not included:** B2C monetisation, listings, personal recommendations.

### S2-PV-05 · Project trust boundary

**Outcome:** пользователь понимает, где хранится результат, кому он доступен и восстановится ли после logout/reload.

**Acceptance:** role/profile не является permission; guest UI и direct API fail closed в candidate authenticated mode; owner/project isolation доказана для двух personas или cloud claim снят; local/import status честен; failure не уничтожает prior artifact; versioned saved result обязателен, а export/share помечен implemented/verified/blocked по факту read-back.

**Dependencies:** Dev/Auth/Data exact target and gates.  
**Not included:** Production activation, confidential client data, broad collaboration.

### S2 exit

Один integrated path выполняет O1/O2/O3, а O4 выполняется отдельно либо честно остаётся blocked. Любой access bypass, state loss, wrong object или duplicate paid call блокирует переход к расширению.

## 4. S3 — repeatability, evidence and case packs

### S3-PV-01 · Six reproducible demo packs

**Outcome:** команда показывает не импровизированное demo, а шесть повторяемых cases: Dubai и Singapore × Analyse, Find/Compare, Create/reopen.

**Acceptance per pack:** exact place/AOI; role/scenario/depth; source/date/rights state; fixture/live/replay label; expected invariants; saved output; limitation; next user action; no cross-market parity claim.

**Priority:** Dubai packs определяют основной demonstration narrative. Singapore демонстрирует переносимость с отдельным coverage statement.

### S3-PV-02 · Three KPI evidence hooks

**Outcome:** future field test может измерить customer value без survivorship bias.

**Acceptance:** система/receipt позволяет рассчитать:

1. Accepted Decision Record Rate по предзарегистрированному до запуска набору eligible jobs, со всеми failures/sparse/insufficient cases в знаменателе и отдельным reviewer acceptance;
2. Total Human Minutes vs Same-Task Baseline, включая review/corrections/rework/handoff;
3. Repeat Real-Task Adoption для последующего authorised external cycle.

Нет observed baseline — нет процента улучшения. Honest insufficient-evidence handling не автоматически accepted output. Demo/replay — не repeat adoption.

### S3-PV-03 · Depth and truth evaluation

**Outcome:** Quick/Standard/Deep дают различимую полезность без новых фактов из воздуха.

**Acceptance:** fixed evidence fixtures; contradiction and unavailable cases; method/model receipt; latency/usage/cost per attempt; rejected/partial results сохранены; Deep не проходит только потому, что длиннее.

### S3-PV-04 · Recovery and portability evidence

**Outcome:** candidate переносим и восстанавливаем, а не только запускается на машине разработчика.

**Acceptance:** backup/restore, rollback, cancellation/late response, cost cap and saved-artifact recovery; portable rehearsal. Непрошедший gate остаётся future deployment blocker.

### S3-PV-05 · Decision dashboard and report parity

**Outcome:** экран и export объясняют одно и то же decision record.

**Acceptance:** wide Surrounding Uses, compact KPIs, comparison table, source/gaps/next action и Create addendum читают frozen result; missing value имеет named state; no dashboard-only recomputation or invented default.

### S3 exit

Шесть case packs воспроизводимы; primary KPI denominators определены; Product/QA видят полный список failures; portable/restore boundary известна. P2 polish не вытесняет P0/P1.

## 5. S4 — freeze, acceptance and decision

### S4-PV-01 · Fresh journey acceptance

**Outcome:** exact immutable candidate проверен как продукт, а не набор отдельных lane tests.

**Acceptance:** Chrome/WebKit; EN/RU; 390×844, 430×932, 360-width stress, tablet and desktop; keyboard/focus/long labels; negative auth personas; Dubai/Singapore cases. Real iPhone — отдельный founder smoke либо `UNVERIFIED`.

### S4-PV-02 · Commercial-truth demo narrative

**Outcome:** presenter показывает problem → evidence → decision output → next action, не выдавая UI за спрос.

**Acceptance:** operator/beneficiary/buyer/channel названы как hypotheses; partner-led и direct developer routes не смешаны; B2C journey показан как functional value, не monetisation proof; no Pilot/Production/Commercially Validated wording.

### S4-PV-03 · GO / NO-GO package

**Outcome:** Main принимает решение о следующем controlled step.

**GO candidate requires:** mandatory P0/P1 pass; zero guardrail violations; reproducible cases; exact build/rollback/known limits; bounded source/model use; B2B+B2C functional outcomes честно классифицированы.

**NO-GO:** access leak, data loss, wrong-site result, fabricated material fact, uncontrolled cost, duplicate paid call, blocked core journey или false persistence/source identity. В NO-GO Production остаётся прежней, а остаток работ фиксируется.

### S4-PV-04 · Product/DD index

**Outcome:** третья сторона может найти Product scope, role/scenario contract, case evidence, source/rights state, architecture/security boundaries, model/cost evidence, gaps и roadmap без устного исправления claims.

**Acceptance:** exact candidate SHA/Preview; current vs historical separated; missing legal/commercial/traction facts marked `MISSING/UNVERIFIED`; Figma/Confluence navigation не повышает maturity.

### S4 exit

Один immutable candidate, один evidence pack и один Main decision. Release/Production требует отдельной authority.

## 6. Cross-lane handoff contract

| Lane | Product передаёт | Product получает | Product не решает |
| --- | --- | --- | --- |
| Dev/Auth | Journey/access acceptance и truthful states | Identity, membership, persistence, restore evidence | Schema/RLS implementation и hosted activation |
| GenAI | Depth/output/guardrail contract | Lifecycle, receipt, cost/latency/failure evidence | Provider/model implementation |
| Data/Geo | Required fact/gap/method fields | Rights/coverage/freshness/identity feasibility | Source rights или official truth |
| Design | Outcome hierarchy and states | Reachability, layout, responsive/accessibility evidence | Visual implementation details |
| Research | Falsifiers and respondent evidence requests | Workflow/problem/substitute/counter-evidence | Market facts without sources |
| Commercial | Output unit and exact scope boundary | Buyer/budget/WTP/economics evidence | Price or offer validation |
| Main/QA | Acceptance gates and stop rules | Integrated exact-candidate evidence and decision | Release or outreach authority |

## 7. Explicit deferrals

- No additional market/country breadth before the six base packs.
- No new data integration without exact source/owner/licence and serving policy, operation/channel/delivery/territory rights, coverage/freshness and fail-closed unavailable-state gate.
- No public MCP/headless launch before direct operator need, rights and economics.
- No new ranking system before comparable evidence and accepted weights.
- No official planning/parcel/ownership/valuation claim.
- No B2C pricing/marketplace/listing build from the functional journey alone.
- No broad redesign; preserve light/teal desktop/mobile behavior and current accepted surfaces.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
