# Промт для немедленного продолжения GeoAI в новом чате

Скопируй весь текст ниже в новый чат.

```text
Ты продолжаешь работу над GeoAI как Codex-инженер, архитектор, security reviewer, QA и технический писатель. Это продолжение существующей работы, не новый проект. Сначала быстро перепроверь факты, затем сразу выполняй следующий незакрытый этап. Не останавливайся на отчёте, если безопасное исправление входит в scope.

Язык общения: русский. Пользователь просит автономную, максимально критическую, мультиагентную работу. Делегируй независимые конкретные проверки Supabase/RLS/Auth/MFA, frontend/performance и документации, но сам своди и перепроверяй результаты. Независимые reviewer approvals на текущем этапе не являются hold. Runtime evidence всё равно обязателен: отсутствие reviewer approval нельзя выдавать за PASS.

Используй интеграции GitHub, Supabase, Vercel и Atlassian Rovo/Confluence. Следуй их skills. Никогда не выводи секреты. Не изменяй Production и main без нового явного разрешения. Не выполняй платные действия без отдельного подтверждения.

Единственное подтверждение стоимости уже использовано:
«подтверждаю бесплатный Supabase project geoai-auth-rehearsal ($0/месяц)».

Проект уже создан. НЕ создавай дубль и НЕ запрашивай повторное подтверждение:
- name: geoai-auth-rehearsal
- ref: bkmfcjzalcvdsdvyxpgi
- organization: jxfaprylyupipfhbtcyb
- region: eu-west-1
- plan: Free, $0/month
- health: ACTIVE_HEALTHY
- PostgreSQL: 17.6.1.147
- Production: false

Authoritative machine receipt:
docs/SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json

Git/GitHub:
- repo: mmgolikov/geoai-mvp
- open Draft PR: #97
- PR branch: audit/system-readiness-and-docs-v1
- verified remote head: cf0ee1903e8411eabf8e048c1d8e775a0454340c
- current local branch: p0/db01-auth-rehearsal-rebuild-v1
- изменения ещё не pushed
- main и Production не изменялись
- два прежних локальных unpublished commit были потеряны при очистке scratch и не существуют на GitHub:
  - 1757256a98aa2521cd7cdc71117ba65303516537
  - fc62e416d61a919b6ba8701cb5cd22f66e355c8f
- не утверждай, что они восстановлены: activation была заново реализована новой миграцией
- artifacts/ содержит recovery evidence и намеренно остаётся untracked, не коммить его автоматически

Новая реализация БД:
- supabase/migrations/20260716164451_geoai_auth_admin_project_activation_rebuild_v1.sql
- supabase/migrations/20260716172000_geoai_foreign_key_index_hardening_v1.sql
- supabase/migrations/20260716175210_geoai_auth_admin_lifecycle_remediation_v1.sql
- supabase/tests/auth_admin_project_activation_rebuild_personas.sql
- supabase/tests/auth_admin_lifecycle_remediation_personas.sql
- supabase/tests/identity_authorization_personas.sql
- supabase/operator/20260716_data_api_api_only_owner_path.sql
- supabase/operator/20260716_first_platform_owner_bootstrap.sql

Activation rebuild — новая реализация, НЕ byte-for-byte восстановление утраченной миграции. Она содержит permanent confirmed Auth profile provisioning, platform/org/project roles, clients, projects, hashed one-time invitations, append-only admin audit, AAL2 gates, last-owner protection, org→project lock order, optimistic row versions, tenant-safe private implementations и SECURITY INVOKER api wrappers.

Forward-only lifecycle remediation не переписывает уже применённую activation. Она исправляет org→project→invitation lock order, сохраняет expired invitation без exception rollback, заменяет first-owner bootstrap на atomically audited v2 с change ticket/operator/request UUID, отделяет временный Auth ban от durable profile status и делает aggregate Admin snapshot initial-only с максимумом 25 записей на коллекцию. API inventory остаётся 14 RPC.

Hosted rehearsal evidence после полного replay:
- 17 canonical schema migrations + 1 environment operator ledger entry = 18 ledger entries
- 29 GeoAI public domain tables excluding managed spatial_ref_sys; RLS включён на всех 29
- 0 uncovered foreign keys после 39 covering indexes
- identity/authorization pgTAP: 71/71
- activation pgTAP: 73/73
- lifecycle remediation pgTAP: 39/39
- total hosted SQL personas: 183/183
- все test users откатились: auth.users = 0
- seed profiles = 1
- buckets = 4
- storage.objects policies = 0

Data API rehearsal уже изолирован:
- authenticator rolconfig: pgrst.db_schemas=api
- api: 14 functions, 0 tables/views/sequences
- anon может вызвать только api.healthcheck()
- authenticated имеет точный allowlist 14 RPC
- service_role не получает blanket api grant
- HTTP api.healthcheck(): 200, healthy=true
- HTTP Accept-Profile public: 406 PGRST106, only api exposed
- HTTP lookup base table in api: 404 PGRST205
- managed PostGIS ACL и RLS spatial_ref_sys намеренно не изменялись
- Supabase security advisor всё ещё показывает managed public/PostGIS findings и intentional RLS-no-policy deny-all tables; не выдавай их за удалённые. HTTP boundary доказан, linter не учитывает manual schema override.

Критическое разграничение готовности приложения:
- в текущем checkout отсутствуют продуктовые routes `/admin`, `/onboarding`, `/mfa`, Auth callback и registration;
- есть `/login` и `/api/auth/session`, но они не являются доказательством полного Auth flow;
- код приложения сейчас вызывает только три read-RPC: `api.current_profile()`, `api.current_project_access(text)` и `api.current_source_releases(...)`;
- девять новых Auth/Admin/client/project mutation RPC и один admin snapshot доказаны на уровне hosted SQL personas, но ещё не подключены к browser UI;
- поэтому не называй Auth/Admin/MFA реализованными end-to-end: сначала нужны route/UI implementation и реальные HTTP/browser personas.
- `src/lib/supabase/api-readiness.ts` сейчас допускает только development ref и вернёт `target_mismatch` для rehearsal; исправь exact-target selection до rehearsal HTTP E2E, не разрешая произвольный Supabase host.
- `/login` выглядит как magic-link форма, но `AuthProvider.signIn()` намеренно не вызывает Supabase; не считай форму функциональной до реальной интеграции.

Performance advisor после hardening:
- unindexed_foreign_keys = 0
- остаются только unused_index INFO на почти пустой rehearsal; не удаляй индексы по этому сигналу без реальной workload/statistics evidence.

Локальные проверки уже прошли после изменений:
- npm ci
- TypeScript/lint
- Next.js production build
- canonical migration chain
- migration security surface
- identity, source custody, activation, lifecycle remediation, FK-index, Data API operator static checks
- documentation current-truth
- documentation lifecycle: 12 active, 119 non-active, 131 total

Development Supabase НЕ изменялся:
- ref pphdqkurxneyagvnnjdt
- это отдельный development, не Production
- его старый public exposure и candidate apply остаются отдельным owner-controlled этапом

Production/main НЕ изменялись. Real sources НЕ подключены. Storage policies НЕ применены. Первый реальный platform owner НЕ создан, потому что в rehearsal нет реального подтверждённого Auth user/email и пользователь не указал owner identity.

Vercel:
- project prj_LE41wkaiRUgZgOynkkeixGbesJvp
- team team_MNxcLOOPgdHPt6fnfMGXODFx
- последний проверенный Preview deployment dpl_3r3eFhCEnhg7QdURF79r4tnLsPfF
- READY на remote PR head cf0ee1903e8411eabf8e048c1d8e775a0454340c
- privileged Supabase credential contamination в Preview/Development всё ещё блокирует push и новый Preview
- connector ранее не позволял безопасно mutate env
- не показывай значения переменных
- пока credential не удалена/ротирована, не push, чтобы не создать новый загрязнённый Preview
- после owner action: перепроверь env names/scopes, push только PR branch, дождись Preview, выполни Auth/Admin/MFA/browser E2E; не promote Production

Confluence:
- cloudId 8671019f-f899-4452-a153-9c96cc5eec31
- spaceId 98311
- Hub pageId 98425
- Project Home 98509
- Current Delivery 2097153
- Full Audit 12320972
- Documentation Lifecycle Audit 13008962
- Database 131194
- ERD 131293
- CHG-2026-07-16-18 завершён на 28/28 operational pages; authoritative receipt: `docs/CONFLUENCE_CHG18_RECEIPT.json`
- direct read-back: на каждой странице ровно один CHG18 marker, ни одного CHG16/CHG17 marker, rehearsal ref и 183/183; точные SHA-256 всех текущих тел сохранены в receipt и sync map
- canonical versions после CHG18: Hub 181, Project Home 184, Current Delivery 183, Full Audit 14, Documentation Lifecycle 6, Database 7, ERD 12
- CHG17 receipt сохранён как исторический и помечен superseded: после него независимое изменение Hub v180 вернуло CHG16; CHG18 обнаружил drift, полностью пересобрал Hub как operational entry point и проверил v181
- Confluence search может кратковременно возвращать исторические marker matches из-за async indexing; direct current-body read-back и SHA-256 являются authority
- перед update всегда read current version, после update read-back
- Hub всегда должен показывать: текущую версию/зрелость, released и candidate refs, Supabase dev/rehearsal, Vercel, blockers, evidence, главные ссылки и навигацию
- authoritative repo docs и Confluence не должны противоречить друг другу

Сразу после старта нового чата:
1. Прочитай AGENTS.md и authoritative docs из docs/DOCUMENTATION_INDEX.md.
2. Проверь git status/branch/log и не потеряй текущие изменения.
3. Прочитай rehearsal receipt и этот prompt; перепроверь Supabase project/list migrations/advisors без секретов.
4. Подтверди, что CHG18 receipt и 28-page sync map остаются согласованы по 28 версиям и SHA-256; не повторяй Confluence update без новой фактической дельты.
5. Проверь Vercel env metadata. Если mutation недоступна, подготовь точную owner/Codex задачу удаления и ротации без значений секретов.
6. Выполни двухсессионный concurrency-тест invitation create/accept/revoke с lock timeout и доказательством отсутствия deadlock; SQL structural check не заменяет этот runtime gate.
7. Исправь exact-target health readiness для rehearsal, реализуй отсутствующие registration/callback/session/logout routes и безопасный Auth UI, затем выполни реальные HTTP personas: signup, email confirmation, callback/PKCE, login, refresh, logout, banned/deleted/unconfirmed/anonymous denial.
8. Реализуй и проверь MFA: enroll, verify, AAL1→AAL2, safe factor removal, last-factor refresh/cookie evidence, replay/ambiguity denial.
9. После появления одобренного confirmed user выполни owner-only `bootstrap_first_platform_owner_v2` с change ticket/operator/request UUID и durable receipt; не выбирай email сам и не используй disabled v1.
10. Подключи уже доказанные RPC к browser Admin/Onboarding UI и выполни E2E: organizations, clients, projects, invitations, expired-success payload, membership mutation, cross-tenant denial, stale row_version, last owner, audit completeness. Aggregate snapshot поддерживает только initial page; для продолжения спроектируй отдельные typed keyset RPC для clients/projects/members/invitations/audit, затем обнови 14-RPC allowlist и повтори HTTP boundary evidence.
11. Затем STORAGE-01: owner-supported policies, magic bytes/size/checksum/quarantine/AV, signed URL TTL/revocation, wrong-tenant personas. Не загружай клиентские данные до PASS.
12. Только после Auth/Admin/Storage gates подключай реальные источники через trusted worker, SOURCE-01 immutable custody, rights/provenance, idempotent pre-fetch reservation, retries/budgets/observability. Никаких provider writes из public app.
13. Development apply — отдельный exact-ref plan с backup, drift, rollback и approval. Production/main требуют нового явного разрешения.

Обязательные правила качества:
- применяй DDL через Supabase apply_migration, SQL queries/DML через execute_sql;
- RLS и grants — defense in depth; no broad service_role/user-facing credential;
- функции SECURITY DEFINER только в private schema, empty search_path, explicit grants; exposed wrappers invoker wherever possible;
- lock order org→project→invitation там, где invitation входит в транзакцию; expected row_version для mutation; keyset/bounded pagination;
- invitation raw token никогда не хранится, только hash; elevated transitions требуют AAL2;
- не считай Storage/Realtime защищёнными Data API boundary;
- не включай RLS на managed spatial_ref_sys вслепую и не ломай PostGIS ACL;
- не удаляй unused indexes по статистике пустой rehearsal;
- не маскируй advisor findings и blockers;
- documentation is implementation: обновляй README, AGENTS, CURRENT_RELEASE_STATE, DOCUMENTATION_INDEX, FULL_SYSTEM_AUDIT, CODEX_BACKLOG, architecture, data-strategy, roadmap, qa, runbook, receipt и Confluence Hub после каждого существенного gate.

Формат отчёта пользователю:
- реализовано;
- доказано runtime;
- доказано только статически;
- остаётся blocked;
- требует owner action.

Продолжай сразу. Не создавай новый Supabase project. Не спрашивай подтверждение уже разрешённых $0. Не touch main/Production. Не push до очистки Vercel privileged env.
```
