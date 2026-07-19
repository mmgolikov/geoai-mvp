function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

type ExpectedPeriod = { from: string; to: string };

function calendarDay(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? value
    : null;
}

function compactCalendarDay(value: string) {
  if (!/^\d{8}$/.test(value)) return null;
  const expanded = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return calendarDay(expanded) ? expanded : null;
}

function strictUtcTimestamp(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/);
  return match && calendarDay(match[1]) && Number.isFinite(Date.parse(value)) ? value : null;
}

function validatePeriod(period: ExpectedPeriod) {
  const from = calendarDay(period.from);
  const to = calendarDay(period.to);
  if (!from || !to || from > to) throw new Error("upstream_schema_mismatch");
  return { from, to };
}

function providerSeries(value: unknown, minimum: number, maximum: number, expectedPeriod: ExpectedPeriod) {
  const record = asRecord(value);
  if (!record) throw new Error("upstream_schema_mismatch");
  const period = validatePeriod(expectedPeriod);
  const entries = Object.entries(record);
  if (entries.length === 0 || entries.length > 400) throw new Error("upstream_schema_mismatch");
  const series = new Map<string, number | null>();
  for (const [date, item] of entries) {
    const observedDay = compactCalendarDay(date);
    if (!observedDay || observedDay < period.from || observedDay > period.to || typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error("upstream_schema_mismatch");
    }
    if (item <= -900) {
      series.set(date, null);
      continue;
    }
    if (item < minimum || item > maximum) throw new Error("upstream_schema_mismatch");
    series.set(date, item);
  }
  return series;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function parseNasaPowerPayload(value: unknown, expectedPeriod: ExpectedPeriod) {
  const data = asRecord(value);
  const header = asRecord(data?.header);
  const api = asRecord(header?.api);
  const properties = asRecord(data?.properties);
  const parameters = asRecord(properties?.parameter);
  if (data?.type !== "Feature") throw new Error("upstream_schema_mismatch");
  const temperatureSeries = providerSeries(parameters?.T2M, -100, 80, expectedPeriod);
  const solarSeries = providerSeries(parameters?.ALLSKY_SFC_SW_DWN, 0, 20, expectedPeriod);
  const temperatureDates = [...temperatureSeries.keys()].sort();
  if (temperatureDates.length !== solarSeries.size || temperatureDates.some((date) => !solarSeries.has(date))) {
    throw new Error("upstream_schema_mismatch");
  }
  const paired = temperatureDates.flatMap((date) => {
    const temperature = temperatureSeries.get(date);
    const radiation = solarSeries.get(date);
    return temperature === null || temperature === undefined || radiation === null || radiation === undefined
      ? []
      : [{ date: compactCalendarDay(date) as string, temperature, radiation }];
  });
  if (paired.length === 0) throw new Error("upstream_schema_mismatch");
  const providerVersion = api?.version;
  if (providerVersion !== undefined && (typeof providerVersion !== "string" || providerVersion.length > 80)) {
    throw new Error("upstream_schema_mismatch");
  }

  return {
    providerVersion: providerVersion ?? null,
    averageTemperatureC: average(paired.map((item) => item.temperature)),
    averageSolarRadiationKwhM2Day: average(paired.map((item) => item.radiation)),
    observationDays: paired.length,
    observedFrom: paired[0].date,
    observedTo: paired[paired.length - 1].date
  };
}

export function parseCopernicusStacPayload(value: unknown, expected: { collection: string; period: ExpectedPeriod }) {
  const data = asRecord(value);
  const period = validatePeriod(expected.period);
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features) || data.features.length > 3) throw new Error("upstream_schema_mismatch");

  const scenes = data.features.map((feature) => {
    const item = asRecord(feature);
    const properties = asRecord(item?.properties);
    const id = item?.id;
    const collection = item?.collection;
    const datetime = properties?.datetime;
    const cloudCover = properties?.["eo:cloud_cover"];
    const strictDatetime = typeof datetime === "string" ? strictUtcTimestamp(datetime) : null;
    const observedDay = strictDatetime?.slice(0, 10) ?? null;
    if (item?.type !== "Feature" || typeof id !== "string" || id.length === 0 || id.length > 256 ||
        collection !== expected.collection || !strictDatetime || !observedDay || observedDay < period.from || observedDay > period.to ||
        (cloudCover !== undefined && cloudCover !== null &&
          (typeof cloudCover !== "number" || !Number.isFinite(cloudCover) || cloudCover < 0 || cloudCover > 100))) {
      throw new Error("upstream_schema_mismatch");
    }
    return {
      id,
      collection,
      datetime: strictDatetime,
      cloudCoverPercent: typeof cloudCover === "number" ? cloudCover : null
    };
  });

  return { scenes };
}

export function parseOverpassCountPayload(value: unknown) {
  const data = asRecord(value);
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  if (elements.length !== 3) throw new Error("upstream_schema_mismatch");
  const counts = elements.map((element) => {
    const item = asRecord(element);
    const tags = asRecord(item?.tags);
    const rawTotal = tags?.total;
    const validTotal = (typeof rawTotal === "string" && /^\d+$/.test(rawTotal)) ||
      (typeof rawTotal === "number" && Number.isSafeInteger(rawTotal) && rawTotal >= 0);
    const total = validTotal ? Number(rawTotal) : NaN;
    return item?.type === "count" && Number.isSafeInteger(total) && total >= 0 ? total : null;
  });
  if (counts.length !== 3 || counts.some((count) => count === null)) throw new Error("upstream_schema_mismatch");
  const osm3s = asRecord(data?.osm3s);
  const timestamp = osm3s?.timestamp_osm_base;
  if (timestamp !== undefined && (typeof timestamp !== "string" || timestamp.length > 64 || !strictUtcTimestamp(timestamp))) {
    throw new Error("upstream_schema_mismatch");
  }

  return {
    sourceObservedAt: typeof timestamp === "string" ? timestamp : null,
    amenityElements: counts[0] as number,
    publicTransportElements: counts[1] as number,
    highwayElements: counts[2] as number
  };
}

export function containsForbiddenSpatialFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenSpatialFields);
  const record = asRecord(value);
  if (!record) return false;
  return Object.entries(record).some(([key, item]) =>
    ["geometry", "bbox", "assets"].includes(key) || containsForbiddenSpatialFields(item)
  );
}
