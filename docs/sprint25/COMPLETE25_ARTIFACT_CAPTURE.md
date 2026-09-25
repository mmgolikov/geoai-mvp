# COMPLETE25: один реальный браузерный артефакт A09

Тестовый opt-in; продукт, AI-запрос, бюджет и облако не изменяются. Только A09 / Dubai Hills Mall / `way/797700047`, standard / custom / developer / unspecified / EN. Вопрос берётся из утверждённого immutable manifest, не из старого legacy-сценария.

## Вход оператора

Root передаёт только дочернему запуску A09:

```
GEOAI_COMPLETE25_A09_ARTIFACT_CAPTURE=export-one-frozen-a09-browser-artifact-v1
GEOAI_COMPLETE25_A09_ARTIFACT_PATH=<private batch output>/A09-browser-artifact.json
```

Родительская папка уже существует, real path, права 0700; файл отсутствует. Неполная пара, другой scope/case/source или существующий файл блокируются. Root выбирает фиксированное имя через batch; helper не создаёт папки и не разрешает cloud write. Старый `GEOAI_QUALITY20_ARTIFACT_EXPORT` по-прежнему запрещён для quality20-analyse.

## Что сохраняется

После успешного обычного A09 анализа и его local reopen тест читает identity-scoped browser store, но возвращает из браузера **ровно один artifact с уже проверенным artifactId**. Store, проекты, userId и credentials не экспортируются. Артефакт не создаётся заново из AI JSON.

Новый envelope `geoai.complete25.a09-browser-artifact.v1` содержит caseId, execution(commit/origin/deploymentId), manifestSha256, source(sourceIdentity/geometryHash/sourceResponseHash/evidencePackHash/acquiredAt), responseHash, resultHash, actualRequestHash, payloadHash и исходный browser artifact.

Проверки: полный текущий product parser без потери/добавления полей; canonical payload checksum; фактический HTTP request/response и актуальная provider telemetry; точное совпадение saved analysis с product-проекцией wire response; source identity, полная display geometry и receipt snapshot соответствуют manifest. Приватные поля/токены/почта и размер более 512 KiB запрещены. Файл 0600, temp+fsync+exclusive hardlink+directory fsync; повторная запись невозможна.

Manifest принимает исходный batch-сериализатор pretty JSON + newline (также compact JSON для offline fixtures), сохраняя SHA исходных байтов. Артефакт может содержать публичные геоданные и неприватный provider requestId; это не выгрузка учётной записи.

## Отдельное read-only чтение перед cloud save

`validateComplete25RealArtifactEnvelope(value, {candidateCommit,candidateHost,manifestRaw,manifestSha256})` синхронно проверяет точные ключи envelope, исходные bytes/hash полного 58-case manifest и его привязку. Возвращает `{envelope,selection}`; **не заменяет** полный product parser.

`await parseComplete25RealArtifactExport(value, sameExpected)` дополнительно проверяет product parser/checksum, source, request, telemetry и result/request hashes. Cloud consumer обязан выполнить эту async-проверку до записи. Требуется отдельный исходный A09 manifest, не последняя версия с другими SHA. Повторное получение источников и продление lease не выполняются: это reopen сохранённого результата.

`responseHash` — SHA исходного wire response, проверенный при capture; при reopen его нельзя заново вычислить из нормализованного saved artifact. Поэтому consumer также проверяет root-pinned SHA всего файла. Успех capture не доказывает cloud save, cloud copy, hosted acceptance или новый бюджет.

## Проверка

`node --experimental-transform-types scripts/complete25-artifact-capture-check.mjs` (Node 24): offline positives/negative scopes, manifest/candidate/source/request/response drift, rehashed source drift, secrets/fullstore rejection, bounded size, permissions/symlink/no overwrite, legacy rejection, saved read-back. Network stub запрещает обращения.

Снимки actual dashboard вызываются до local reopen через отдельный `captureNight21AnalysisDashboard` и существующий private visual writer; это зависимость отдельного reviewed helper. Для FA не вызывается Find-map capture под scope quality20-analyse. Платных вызовов эти чтения не добавляют.

Ограничение проверки: synthetic offline fixtures не являются реальным A09 результатом. Реальный artifact появляется только в отдельно разрешённом root-owned batch на frozen Preview; отдельная облачная запись выполняется root после проверки.
