# GeoAI — Outcome Backcast Roadmap

Статус: **CONDITIONAL PRODUCT ROADMAP · NOT A DELIVERY OR REVENUE FORECAST**  
Дата: 18 сентября 2026  
Владелец: `product_1`  
География: Dubai/UAE first; Singapore — comparison/demo with separate evidence limits  

## 1. Как читать roadmap

Roadmap построен назад от customer outcomes и evidence gates. Дата не переводит продукт на следующий уровень автоматически. Если входной gate не выполнен, результат остаётся `BLOCKED`, `PIVOT` или `STOP`, а не получает более сильную label.

Четыре customer-output contracts описаны в `MVP_SCOPE_AND_VALUE.md`: B2B Site Screening Decision Brief, B2B Candidate Comparison Pack, условный Scenario Alternatives Addendum и отдельный B2C Living / Relocation Verification Pack.

## 2. Product capability ladder

### К концу текущих четырёх спринтов · 19 сентября 2026

**Minimum — реальный узкий vertical candidate сейчас:** связный Dubai B2B путь known site → Analyse → decision dashboard → saved result; Find → shortlist → factual compare → individual result → return; Create A/B → restore → save/reopen. Deep lifecycle и timeout согласованы; wrong-object, stale Find и 2D/3D divergence входят в negative acceptance. Это candidate, не customer validation.

**Conditional:** authenticated personal project path, cloud persistence и share/export только если exact identity/DB/RLS/restore/read-back gates пройдены. B2C living journey должен получить отдельные inputs/question/result/checklist; если текущий runtime меняет только presentation, он остаётся `NOT MVP-ACCEPTED`, а не переносит весь B2C scope молча.

**Stretch после P0/P1:** fullscreen interactive 3D, variable-size dashboard polish и дополнительные demo refinements. Они не заменяют узкий working vertical.

### К 31 октября 2026 · Functional MVP candidate

**Minimum product outcome:**

- отдельные complete B2B и B2C journeys: B2B O1/O2 с условным O3; B2C own criteria → 2–3 objects → factual infrastructure compare → saved visit/verification checklist;
- authenticated, owner-scoped, versioned saved DecisionRecord; reload/reopen не запускает новый analysis/generation/context acquisition, а ordinary authorised tile/asset/session loading не считается analysis;
- portable/shareable result: save обязателен, export/share доказан exact receiver read-back либо честно blocked;
- reusable Dubai demonstration packs и честный Singapore comparison pack с отдельными coverage labels;
- bounded tester onboarding: identity, sample data boundary, steps, expected outputs, limitations и recovery;
- Quick/Standard/Deep меняют reasoning/checks, wide Surrounding Uses и decision-first dashboard работают на одном evidence contract.

**Conditional:** 1–2 targeted data integrations только если они нужны выбранным jobs и прошли exact source/owner/licence, serving policy, operation/channel/delivery/territory rights, coverage/freshness и fail-closed unavailable-state gate.

**Stretch:** fund/contextual acquisition preset и richer Create presentation — только после B2B/B2C minimum acceptance.

### К 31 декабря 2026 · Pilot-adapted product candidate

**Minimum product outcome:** версия адаптирована на фактических задачах одного выбранного B2B route — partner-led или direct developer:

- controlled import клиентского site/AOI, brief и разрешённых supporting inputs с provenance/custody/delete states;
- role/scenario methods ограничены наблюдаемыми selected jobs, а не общей библиотекой обещаний;
- reviewer feedback, correction и explicit revision history встроены в DecisionRecord lifecycle;
- owned projects, access isolation, backup/restore, usage/cost operations и support/rollback проверены;
- 2–3 mostly real/open/authorised UAE cases работают без material sample/mock influence на recommendation-driving fields;
- B2C functional journey остаётся поддерживаемым, но B2C commercial acquisition/WTP не предполагается.

**Conditional:** 1–2 rights-approved connectors, только если actual task evidence показывает, что они меняют action/acceptance. Named route получает matched-scope offer/entry package; это `PILOT DISCOVERY / ENTRY PACKAGE CANDIDATE`, не `Pilot Ready`.

**Stretch:** bounded collaboration/comment/review между operator и decision owner, если реальный receiving workflow требует её. Не строить general collaboration suite заранее.

### К 15 февраля 2027 · Repeatable pilot-product candidate

**Minimum product outcome:**

- воспроизводимые refreshed comparisons на одном contract: новый source snapshot создаёт новую version, показывает changes/gaps и не переписывает историю;
- reusable templates по выбранному job, project history, reviewer acceptance/revision trail и repeat-task workflow;
- один delivery route повторяет продукт на втором сопоставимом реальном task без semantic redesign; managed-service customization видна отдельно;
- операционные controls покрывают identity/access, backup/restore, cost, sources, retries, support и rollback;
- Main может принять `PROCEED`, `PIVOT` или `STOP` на основе product use, buyer/data/economics evidence.

**Conditional:** collaboration расширяется только по наблюдаемой потребности. Вторую product geography подключать только после работающего UAE route, с собственными sources/rights/methods; Singapore demo сам по себе не является market launch.

**Stretch:** selected headless/partner delivery interface только после подтверждённого consuming workflow, rights и economics. Это не public MCP by default.

Ни один February outcome не является автоматическим `Pilot Ready`, `Production Ready`, PMF или revenue. Trial/sample counts — предлагаемые evidence targets, не обещания и не результаты; отдельная revenue goal здесь не задаётся.

## 3. Evidence gates supporting the product ladder

- Accepted Decision Record Rate использует предзарегистрированный до запусков набор eligible jobs; failures, sparse и insufficient-evidence cases остаются в знаменателе; reviewer acceptance отдельно от technical completion.
- Total Human Minutes сравнивает тот же task и включает preparation, review, corrections, rework и handoff. Наблюдаемого baseline/target пока нет.
- Repeat Real-Task Adoption измеряется только в отдельно разрешённом внешнем цикле.
- Один versioned output contract сохраняет portable/shareable read-back, lawful input path и decision-owner action.
- Matched-scope WTP, buyer/budget, procurement/security/legal и fully loaded contribution подтверждают route, но не подменяют сам продукт.
- Partner-led high-bespoke work остаётся managed-service evidence; current workflow adequate или no useful action блокирует расширение build.

## 4. Текущие четыре спринта: 18–19 сентября 2026

### S1 · Contract and foundations

**Outcome:** единый Product value/output contract; воспроизведённый analysis lifecycle; независимые auth/persistence и analysis candidates; baseline evidence.

**Exit evidence:** exact current baseline; разделённые draft/running/last-success states; route/access inventory; first local candidate; технические blockers не маскируются Product language.

### S2 · One coherent product path

**Outcome:** пользователь проходит защищённый project path и получает/сохраняет O1/O2/O3 без state loss; B2C O4 имеет отдельное поведение либо отмечен blocked.

**Exit evidence:** login/session/logout, project save/reload/reopen, Find state contract, Create restore/A/B, cross-user negative checks там, где DB gate разрешён.

### S3 · Repeatability and truthful case packs

**Outcome:** продукт повторяемо выполняет bounded Dubai/Singapore cases, измеряет cost/latency/failures и имеет portable rehearsal.

**Exit evidence:** eligible case set предзарегистрирован до запусков; accepted decision record denominator включает failures/sparse/insufficient cases; reviewer acceptance отделён от technical completion; six case packs; provider calls отделены от fixtures; backup/restore и VPS-equivalent rehearsal либо точный blocker.

### S4 · Freeze and decide

**Outcome:** immutable candidate получает fresh Chrome/WebKit, EN/RU, desktop/mobile and negative-persona evidence; Main выдаёт GO/NO-GO для controlled next step.

**Exit evidence:** exact SHA/Preview/known gaps/rollback; changed build после freeze повторно проверен; Production остаётся неизменной без отдельного разрешения.

## 5. Backcast dependencies

| Required outcome | Последняя допустимая точка доказательства | Product dependency | Owner/input |
| --- | --- | --- | --- |
| Repeat real-task adoption | 15 Feb 2027 | Один стабильный output contract и второй реальный task | Commercial + Research + authorised external cycle |
| Matched-scope WTP | до 31 Dec 2026 для entry decision | Один scope/price/version; три actual budget-owner responses | Commercial; отдельное outreach approval |
| Named action and accepted brief | до 31 Dec 2026 | Decision rubric, lawful inputs, O1/O2 | Product + Research + Data/Geo |
| B2C functional MVP | 31 Oct 2026 | Role-specific inputs/question/result/checklist | Product acceptance + Dev implementation gate |
| B2B coherent journeys | 31 Oct 2026 | State contracts, source truth, save/reopen | Product + Dev + GenAI + Data/Geo |
| Auth/project isolation/restore | 31 Oct 2026 | Identity/membership/RLS independent of roles | Dev/Data; exact hosted target approval |
| Reproducible demo packs | 31 Oct 2026 | Exact cases, sources, replay/live labels | Product + QA + Data/Geo |

## 6. Decision sequence

1. **Now:** make outputs coherent and measurable; do not infer demand from implementation.
2. **By 31 Oct:** accept or reject the functional B2B+B2C MVP journeys on exact candidate evidence.
3. **After separate outreach approval:** test repeated problem/operator/channel, not a generic product pitch.
4. **By 31 Dec:** assemble one route-specific entry package or explicitly park/pivot.
5. **By 15 Feb:** decide PROCEED/PIVOT/STOP from repeat task, buyer, data, action and economics evidence.

## 7. Risks and assumptions

- The mid-February milestone is assumed as **15 February 2027**; founder confirmation can change the calendar, not the evidence gate.
- Partner access may be easier or harder than direct developer access. Commercial06 на 9 сентября фиксировал нулевые external observations; более новые commercial account facts в этой Product-задаче не проверялись.
- Authenticated rehearsal may remain local if hosted gates are not authorised/passed.
- Official/client planning, parcel, ownership, utility and valuation inputs remain separate dependencies.
- B2C functional completeness does not prove B2C monetisation.
- Product scope must shrink before QA/evidence gates are weakened.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
