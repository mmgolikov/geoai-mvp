import type { SourceCatalogueEntry } from "../domain";

const FUTURE_SOURCE_LIMITATION = "Возможный источник будущего подключения; в prototype v1 не подключён.";

export const SOURCE_CATALOGUE: SourceCatalogueEntry[] = [
  {
    id: "rfi",
    sourceName: "Реестр федерального имущества (RFI)",
    integrationStatus: "not_connected",
    sourceAccessStatus: "permission_required",
    intendedUse: "Состав и атрибуты реестровой записи, предоставленные уполномоченной стороной",
    snapshotRuntimeStatus: "Снимок не загружен; synthetic fixtures не являются сведениями RFI",
    freshness: "unknown",
    licensePermissionNote: "Требуются подтверждённые полномочия, регламент передачи и правила обработки",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  },
  {
    id: "egrn",
    sourceName: "ЕГРН",
    integrationStatus: "not_connected",
    sourceAccessStatus: "permission_required",
    intendedUse: "Подтверждение юридически значимых характеристик объекта уполномоченным способом",
    snapshotRuntimeStatus: "Данные и выписки не загружены",
    freshness: "unknown",
    licensePermissionNote: "Требуются законное основание, разрешённый канал и проверка актуальности выписки",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  },
  {
    id: "nspd",
    sourceName: "НСПД",
    integrationStatus: "not_connected",
    sourceAccessStatus: "permission_required",
    intendedUse: "Пространственный контекст и доступные тематические сведения после подтверждения доступа",
    snapshotRuntimeStatus: "Machine access и импорт не подтверждены; значения отсутствуют",
    freshness: "unknown",
    licensePermissionNote: "Наличие публичного портала не подтверждает право машинного доступа или юридический статус объекта",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  },
  {
    id: "yandex_geoanalytics",
    sourceName: "Яндекс Геоаналитика",
    integrationStatus: "not_connected",
    sourceAccessStatus: "permission_required",
    intendedUse: "Будущий агрегированный контекст спроса, посещаемости и доступности",
    snapshotRuntimeStatus: "Договор, доступ и snapshot отсутствуют",
    freshness: "unknown",
    licensePermissionNote: "Требуются коммерческие условия, разрешение на использование и проверка допустимых производных",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  },
  {
    id: "telecom_geoanalytics",
    sourceName: "Телеком-геоаналитика",
    integrationStatus: "fixture_only",
    sourceAccessStatus: "licensed_aggregated_required",
    intendedUse: "Будущий лицензированный агрегированный контекст потоков и профиля территории",
    snapshotRuntimeStatus: "Телеком-данные не получены; доступна только явно маркированная synthetic fixture-метрика",
    freshness: "unknown",
    licensePermissionNote: "Допустимы только лицензированные агрегированные и обезличенные показатели после privacy review",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  },
  {
    id: "high_resolution_optical",
    sourceName: "Оптика высокого разрешения",
    integrationStatus: "not_connected",
    sourceAccessStatus: "licensed_snapshot_required",
    intendedUse: "Будущий визуальный контекст состояния и изменений объекта",
    snapshotRuntimeStatus: "Лицензированный снимок и права использования отсутствуют",
    freshness: "unknown",
    licensePermissionNote: "Нужны лицензия на конкретный snapshot, период съёмки и разрешённые производные материалы",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  },
  {
    id: "sentinel_2",
    sourceName: "Copernicus Sentinel-2",
    integrationStatus: "not_connected",
    sourceAccessStatus: "official_open",
    intendedUse: "Будущий обзорный контекст изменений при достаточном пространственном разрешении",
    snapshotRuntimeStatus: "Каталог, геометрия и изображения в runtime пилота не загружены",
    freshness: "unknown",
    licensePermissionNote: "Перед использованием нужны проверка lineage, атрибуция и фиксация конкретной сцены",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  },
  {
    id: "uav",
    sourceName: "БПЛА",
    integrationStatus: "not_connected",
    sourceAccessStatus: "unavailable",
    intendedUse: "Будущая детальная проверка выбранного объекта при отдельном законном задании",
    snapshotRuntimeStatus: "Съёмка и материалы недоступны",
    freshness: "unknown",
    licensePermissionNote: "Нужны разрешения на полёт, съёмку, обработку и передачу материалов",
    prototypeLimitation: "Источник недоступен в prototype v1."
  },
  {
    id: "moscow_open_data",
    sourceName: "Открытые данные Москвы",
    integrationStatus: "not_connected",
    sourceAccessStatus: "official_open",
    intendedUse: "Будущий городской контекст после проверки набора, лицензии и актуальности",
    snapshotRuntimeStatus: "Наборы и значения в runtime пилота не импортированы",
    freshness: "unknown",
    licensePermissionNote: "Для каждого набора отдельно проверяются условия, период и ограничения повторного использования",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  },
  {
    id: "investment_portals",
    sourceName: "torgi.gov.ru / инвестиционные порталы",
    integrationStatus: "not_connected",
    sourceAccessStatus: "official_open",
    intendedUse: "Будущий открытый контекст предложений и процедур без подмены реестровой или оценочной проверки",
    snapshotRuntimeStatus: "Runtime-вызовы и snapshots отсутствуют",
    freshness: "unknown",
    licensePermissionNote: "Нужны проверка разрешённого способа доступа, атрибуция, даты и сопоставимости записей",
    prototypeLimitation: FUTURE_SOURCE_LIMITATION
  }
];
