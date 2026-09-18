# GeoAI — MVP Scope and Customer Value Contract

Статус: **PRODUCT DECISION CANDIDATE · INTERNAL · NOT MARKET VALIDATION**  
Дата: 18 сентября 2026  
Владелец: `product_1`  
Горизонт: четыре текущих спринта; дальнейшие этапы условны  
Released baseline: `21b91c43c2fc8dd61b08962e562601b29dd89c76`  

## 1. Решение

MVP GeoAI — не «карта с AI» и не генератор красивых мастер-планов. Это воспроизводимый путь от выбранного места или набора кандидатов к **source-backed spatial decision output**, который помогает человеку решить, что проверить, продолжать ли более глубокую проверку и какие факты могут изменить решение. MVP должен иметь отдельные, функционально полные B2B и B2C journeys; коммерческая проверка при этом остаётся B2B-first.

Приоритетный end-beneficiary — команда девелопера/владельца, принимающая решение по участку. Оператором одного и того же результата может быть:

1. аналитик внутри developer / investment team; или
2. аналитик advisory / GIS / BIM practice, готовящий evidence package для клиента.

Commercial06 предлагает сначала проверять partner-led маршрут, поскольку повторяемая подготовка материалов для нескольких клиентов может быть быстрее опровергнута или подтверждена. Product06 описывает прямую работу developer analyst. Это **не два продукта**: это два непроверенных delivery/buying route вокруг одного output contract.

| Компонент | Рабочая гипотеза | Что пока не доказано |
| --- | --- | --- |
| Operator | Partner analyst — первый discovery route; developer analyst — прямой route | Доступность респондентов, частота задачи, предпочтительный оператор |
| Beneficiary / decision owner | Development / investment decision owner | Точный title, action threshold и veto |
| Economic buyer | Practice principal / delivery P&L owner или developer budget owner | Budget category, purchase path, WTP |
| Channel | Partner-delivered evidence service или direct developer workflow | Повторяемость, margin, conversion |
| Product unit | Принятый evidence-backed decision output | Фактическая готовность платить и reuse |

В Commercial06 register на 9 сентября 2026 интервью, наблюдаемая WTP, qualified opportunities, sent proposals, supplier quotes, paid pilots и GeoAI revenue были зафиксированы как нулевые. Более новые commercial account facts в этой Product-задаче не проверялись. Ни один из маршрутов не считается PMF, выбранным рынком или коммерчески валидированным предложением.

## 2. Четыре customer-output contracts одного MVP

O1, O2 и O4 — самостоятельные decision outputs; O3 — условное Create-приложение к принятому site context, а не отдельный commercial wedge.

### O1 · Site Screening Decision Brief — ядро

**Journey:** Dubai known site → Analyse → review evidence → explicit next action → save → reopen/export.

**Принимаемый результат:** сохранённый, повторно открываемый brief, содержащий:

- подтверждённую в рамках receipt идентичность выбранного point/object/AOI и тип связи с источником;
- decision question, role/scenario, depth, locale и horizon, привязанные к конкретному запуску;
- наблюдаемый пространственный контекст с единицами, методом, источником, датой/coverage и unavailable state;
- широкий блок **Surrounding Uses** с общим знаменателем, counts и короткой интерпретацией;
- material assumptions, contradictions, gaps и evidence quality;
- решение уровня screening: `ADVANCE_TO_DILIGENCE`, `HOLD_FOR_NAMED_EVIDENCE` или `STOP_AT_SCREENING` как пользовательская/организационная action, а не автоматическая рекомендация системы;
- один конкретный next validation action с владельцем/источником; если evidence недостаточно — идентифицированный missing item, объяснение, почему он меняет решение, и выполнимый способ закрытия;
- versioned saved project artifact; export/share заявляется только для реально проверенного способа и не подразумевается из наличия кнопки;
- обязательную границу: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

**Ценность-гипотеза:** сократить общее время и rework на подготовку принимаемого brief, сохраняя доказательную цепочку и делая недостающие факты видимыми.

**Acceptance:** правильный объект; ноль silent state loss; ноль critical factual/spatial error; evidence reachable; decision owner может назвать полезное следующее действие; reopen следует общему no-new-analysis правилу ниже. Технически корректный `INSUFFICIENT_EVIDENCE` не автоматически является accepted decision record: reviewer отдельно подтверждает полезность конкретного missing item, его decision impact и feasible next action.

### O2 · Candidate Comparison Pack — второй результат

**Journey:** Find → criteria → fresh results → shortlist 2–3 → Compare → individual brief → Back to results/map → save/reopen.

**Принимаемый результат:** aligned factual comparison по одним определениям, единицам, context-profile/version и сопоставимому acquisition window. В таблице сохраняются candidate identity, geometry state, source date, unavailable и coverage gaps. Пользователь может перейти к индивидуальному O1 и вернуться без потери shortlist.

**Ценность-гипотеза:** ускорить shortlist review и показать, какие различия реальны, а какие вызваны неполным покрытием.

**Acceptance:** geometry/selection/hover/shortlist разделены; list/map numbering совпадает; reset и stale-search semantics однозначны; минимум два кандидата сравнимы; неизвестное не становится нулём; при отсутствии утверждённых criteria/weights/coverage нет rank, winner или preferred-site claim.

### O3 · Scenario Alternatives Addendum — условное приложение

**Journey:** accepted site/AOI context → Create → A/B → inspect assumptions/KPIs → 3D/2D → restore → save/reopen.

**Принимаемый результат:** две действительно различимые, сохранённые conceptual alternatives A/B с одной исходной геометрией, явными programme assumptions, calculated geometry metrics, violations/unknowns и exact receipt. Различие выражает design trade-off в programme, form, quantities, open space, access или другом заявленном параметре, а не только случайную перестановку блоков. User constraints и derived assumptions отделены от verified planning evidence. Крупная 3D-модель и KPI являются представлением сохранённого результата; 2D fallback использует те же данные.

**Ценность-гипотеза:** дать receiving professional быстрее сравнить bounded options, не подменяя planning/design/feasibility authority.

**Acceptance:** valid AOI; bounded geometry; только intended objects скрыты; restore точен; переключение A/B, dashboard и reopen не генерируют заново; failure сохраняет последнюю удачную сцену; quantities не вычисляются из декоративного mesh.

O3 не является самостоятельным MVP wedge. Он добавляет ценность только после честного O1 и не может компенсировать слабые evidence, geometry или customer action.

### O4 · Living / Relocation Verification Pack — самостоятельный B2C journey

**Journey:** B2C living/family-relocation role → собственные бытовые критерии → Find 2–3 locations/objects → factual infrastructure comparison → saved visit/verification checklist → reopen.

**Принимаемый результат:** отдельный B2C decision record, в котором роль меняет входы, decision question, сравниваемые поля, card order и итоговый checklist, а не только визуальную сортировку одного developer report. Он содержит:

- 2–3 явно идентифицированных locations/objects с одинаково определённым factual context;
- user-stated priorities без чувствительного семейного профилирования;
- фактические counts/distances/coverage по education, health, daily services, open space и mapped transport только там, где источник это поддерживает;
- aligned comparison с `UNAVAILABLE` и coverage gaps;
- сохранённый visit/verification checklist: что проверить лично, у оператора или в официальном/актуальном источнике;
- explicit non-claims: school quality/admission, safety/crime, actual commute time, current housing price/availability и suitability не выводятся без соответствующих источников.

**Ценность-гипотеза:** сократить ручное сведение фактического neighborhood context и помочь пользователю сформировать проверяемый shortlist/visit plan. B2C WTP, acquisition и retention неизвестны; B2C не меняет B2B-first commercial discovery.

**Acceptance:** роль влияет на inputs/question/result; 2–3 candidates проходят factual compare; checklist сохраняется и открывается повторно без нового analysis acquisition; B2B criteria/claims не протекают в B2C; отсутствующие данные не становятся негативным выводом.

**Текущий статус:** `NOT MVP-ACCEPTED`. Наличие living presentation preset и перестановки карточек недостаточно. Если полный runtime effect не проходит в текущих четырёх спринтах, целевая дата Product acceptance — **31 октября 2026**, без заявления о завершённом B2C MVP до фактического прогона.

## 3. Quick / Standard / Deep

Depth меняет reasoning и checks на **одном и том же evidence snapshot**. Она не меняет радиус, не добавляет отсутствующие официальные данные и не маскирует одинаковый output более длинным текстом.

| Depth | Обязательный output contract | Дополнительная проверка | Запрещённая интерпретация |
| --- | --- | --- | --- |
| Quick | Identity; короткий профиль; ключевые доступные показатели; 2–3 evidence-backed observations; critical gaps; один next action | Базовая consistency и claim-boundary check | «Слабая аналитика», выдуманные факты или скрытые gaps |
| Standard | Всё Quick + scenario interpretation; trade-offs; проверяемые arguments; comparable metrics; action implications | Cross-field consistency, missing/partial handling, источник каждого material claim | Просто более длинный Quick |
| Deep | Всё Standard + contradiction check; alternative hypotheses; sensitivity только по существующим числам/явным assumptions; verification plan | Conflict preservation, named falsifiers, method/model receipt, material uncertainty | Кадастр, zoning, utility capacity, цены, спрос, school quality или route time из координат |

Каждый результат хранит submitted identity/geometry, evidence version, role, scenario, depth, language, question, method/model version, actual source/use receipt и статус `success`, `partial`, `error` или `cancelled`. Draft settings, running request и last successful result — разные состояния. Late response не может переписать новый object/request.

Quick/Standard/Deep сравниваются на одном frozen evidence snapshot. Любое дополнительное acquisition или source refresh — отдельное явное действие, новая evidence/result version и отдельный cost/rights receipt; оно не происходит скрыто из-за выбора Deep.

`Reopen without a new call` означает ноль новых AI, generation или context-acquisition operations, вызванных открытием сохранённого результата. Обычная авторизованная загрузка map tiles/assets и session validation не является новым analysis и не должна давать false failure.

### Concrete regression anchors for acceptance

Эти примеры получены от founder/Main как negative-test anchors. Они задают конкретные проверки; документ не утверждает, что каждый дефект заново воспроизведён Product на текущем Production.

- Выбранное здание ранее интерпретировалось как `Al Mustaqbal Street / amenity fountain`, затем как `Sky Views Dubai / tourism viewpoint`. Exact candidate должен сохранять selected building identity и показывать nearest POI только как separate relation; viewpoint/fountain не становятся building или parcel.
- При выбранном Deep running label показывал Standard, а последующее изменение scenario/depth оставляло запуск недоступным. Submitted depth обязан совпадать с running/result receipt; после success/error изменение параметров переводит в `READY_TO_RUN`, не dead-end.
- Main сообщил baseline, где client timeout `45s` короче Deep server envelope `82–90s`; исправление ведётся отдельно. Product acceptance требует согласованного timeout/retry/cancel contract и не считает client abort качеством Deep.
- Find ранее показывал markers как circles, сохранял stale 3D selection и не давал очевидного reset. Exact candidate проверяется на trusted geometry, снятие stale selection и явный reset/result-state transition.
- Create ранее оставлял original buildings под generated volumes, а fullscreen report показывал только 2D при 3D map. Exact candidate требует verified hide/restore и один saved geometry result для map 3D, fullscreen 3D и 2D fallback.

Model budget, login и demo data — enabling constraints, не customer value и не замена accepted decision output.

## 4. Dashboard hierarchy

1. **Decision header:** selected identity, decision question, role/scenario/depth, receipt/source state, saved-version state.
2. **Primary action row:** decision implication, next action, material blocker; не декоративный score.
3. **Compact KPI row:** district character, transport proximity, building context — с единицами, методом и unavailable states.
4. **Wide Surrounding Uses:** counts, common denominator, category shares, coverage/sample cap и короткий вывод. Это mapped-feature mix, не land area, demand или population share.
5. **Context and evidence row:** local context, gaps/contradictions, source lineage/freshness.
6. **Detailed reasoning:** scenario trade-offs, assumptions, sensitivity/alternatives по depth.
7. **Validation checklist:** official/client evidence, owner и next step.
8. **Create addendum, если применимо:** крупная 3D/2D scene, A/B, geometry KPIs, assumptions и violations.

Карточки имеют размер по вопросу: инфраструктура — compact KPI; Surrounding Uses — wide; comparison — aligned table; Create — large model. Никаких декоративных 0–100 scores, traffic-light suitability или нулей вместо unknown.

## 5. Find state contract

- `hover`, `active candidate`, `shortlist`, `result cohort` и geometry — разные состояния.
- Изменённые criteria делают результат `STALE`; primary action становится `Update search`, а не выдаёт старое как новое.
- При fresh result и ≥2 shortlisted candidates primary action — `Compare`.
- `Reset search` очищает query/result cohort/search geometry/shortlist только после ясного подтверждённого контракта; не удаляет уже сохранённые project artifacts.
- Object polygon используется только при trusted physical association. POI не превращается в building/parcel; point-only остаётся point.
- Dubai result не может незаметно стать Ajman или Singapore result.
- Ranking по умолчанию blocked. Factual comparison допустим; rank требует versioned method, weights, coverage, rights и metric-level contribution.

## 6. Create state contract

- AOI, source-building hide set, generated alternative и saved artifact имеют отдельные identities.
- Hide reversible; source data не удаляются. Multipart/tile/holes/boundary behavior явно определены и проверены.
- A/B переключаются без нового платного запроса; regenerate/revise — отдельное явное действие с cost guard.
- Save/reopen читает exact stored result. Ошибка или draft change не уничтожает last successful concept.
- 3D — interactive view сохранённой canonical geometry; 2D fallback равноправен по фактам. Photorealistic enrichment не становится источником quantities.
- Третья и последующие альтернативы — future paid hypothesis, не scope текущего MVP.

## 7. География и demo truth

**Dubai** — первая полная decision journey и основной рынок-гипотеза. Нужны три воспроизводимых case packs: Analyse/O1, Find/Compare/O2, Create/reopen/O3. Каждый pack фиксирует exact place/AOI, source/date, role/scenario, expected invariant, saved result, live/replay label, limitation и next action.

**Singapore** — честный comparison/demo market с отдельными coverage и source limitations; не доказательство UAE parity и не второй коммерческий launch. Те же три типа pack допустимы только там, где подтверждены данные и права. Qatar/KSA/Oman и прочие рынки остаются discovery hypotheses, не coverage claims.

## 8. Role, segment и access

B2B/B2C и role выбирают inputs, вопрос, терминологию, comparable fields, card order и result/checklist contract. Они **не** дают project/data permission. Доступ определяется authenticated identity, membership/capability и server/RLS decision.

B2C living/family-relocation — отдельный узкий functional MVP journey на переиспользуемом evidence/Find foundation. Это не текущий commercial priority, не доказанная monetisation programme и не разрешение строить listing, pricing, safety, school-quality или commute claims.

## 9. Scope / non-scope

### В scope четырёх спринтов

- связные O1/O2/O3 journeys на desktop/mobile web;
- honest lifecycle, save/reopen, zero-duplicate-call recovery;
- Dubai-first и bounded Singapore demo packs;
- role/scenario/depth/output consistency;
- complete B2C living/relocation comparison + saved verification checklist либо честный `NOT MVP-ACCEPTED` до 31 октября;
- source lineage, gaps, limitations и report/export basis;
- authenticated rehearsal и personal project path только при прохождении технических gates владельца lane.

### Вне scope

- market winner, validated demand, PMF, Pilot Ready, Production Ready;
- official parcel/zoning/ownership/valuation или guaranteed best use;
- автоматический investment/acquisition recommendation;
- ranking без утверждённого метода/coverage;
- full BIM/editor, engineering model, five generated options;
- B2C pricing/acquisition/monetisation claims;
- SMS, payments, enterprise SSO, broad collaboration;
- одинаковое покрытие нескольких стран;
- public MCP/headless product без отдельного evidence, rights, economics и access contract.

## 10. Метрики и decision rules

### Три primary KPI

1. **Accepted Decision Record Rate** = число outputs, принятых reviewer по заранее заданному contract/rubric, / все **до запуска предзарегистрированные** eligible jobs. В знаменатель входят failures, timeouts, sparse/insufficient-evidence cases, partials и отклонённые outputs; post-hoc exclusion и retries не скрывают исходную попытку. Honest `INSUFFICIENT_EVIDENCE` считается корректным handling, но accepted record — только при отдельном reviewer acceptance конкретного missing item, decision impact и feasible next action.
2. **Total Human Minutes vs Same-Task Baseline** = подготовка + source gathering + review + corrections + rework + handoff для GeoAI и того же реального задания в текущем процессе. Наблюдаемого baseline и допустимого target пока нет; сокращение 30–50%/40% остаётся гипотезой, не KPI result.
3. **Repeat Real-Task Adoption** = доля организаций, которые после первого принятого результата используют тот же versioned output contract для второго сопоставимого реального задания в согласованном окне. Измеряется только после отдельного разрешения внешнего теста; demo/replay не считается.

**Guardrails в acceptance suite — target `0`:** critical wrong-site; fabricated material fact; data loss; unauthorised access; duplicate billable call. Latency, source-call count, gaps и cost остаются обязательной диагностикой, но не раздувают список primary KPI.

### STOP / PIVOT

Остановить или перевести в managed-service/partner route, если цепочка `repeated decision → lawful data → defensible output → useful action → bounded economics` не подтверждается; current process достаточен; partner custom work доминирует; rights блокируют output; либо software не улучшает accepted action/time/rework. Не защищать существующий build от отрицательного evidence.

## 11. Evidence boundary

Подтверждены только текущая release authority, существующие contracts/candidate capabilities и assumption-led desk inputs. Product06, Commercial06 и Research report задают гипотезы и критерии; они не создают buyer observation. Технический PASS не является customer value, а красивый Create output не является feasibility.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## 12. Source register

- `PRODUCT06_DECISION_BRIEF.md` and `PRODUCT06_ACCEPTANCE_MATRIX.md`, 9 September 2026 — accepted Product hypothesis and journey acceptance input.
- `commercial/decision-memo.md` and companion tables, 9 September 2026 — assumption-led commercial route/economics input; zero external validation.
- `spatial-market-research/report-source.md`, executive and §§4, 8, 10–12, 6 September 2026 — research synthesis and limitations.
- `ROLE_SCENARIO_DASHBOARD_MATRIX_V1.md` and `SCENARIO_REGISTRY_V1_CONTRACT.md` — current role/scenario and method contracts; registry not runtime-active.
- `docs/sprint10/CHANGE_REQUEST.md` and `FOUR_SPRINT_PLAN.md`, 18 September 2026 — current four-sprint authority and constraints.
