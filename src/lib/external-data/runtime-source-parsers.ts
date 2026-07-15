function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteProviderValues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.values(value as Record<string, unknown>)
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item) && item > -900);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function parseNasaPowerPayload(value: unknown) {
  const data = asRecord(value);
  const header = asRecord(data?.header);
  const api = asRecord(header?.api);
  const properties = asRecord(data?.properties);
  const parameters = asRecord(properties?.parameter);
  const temperatures = finiteProviderValues(parameters?.T2M);
  const solar = finiteProviderValues(parameters?.ALLSKY_SFC_SW_DWN);
  if (temperatures.length === 0 || solar.length === 0) throw new Error("upstream_schema_mismatch");

  return {
    providerVersion: typeof api?.version === "string" ? api.version : null,
    averageTemperatureC: average(temperatures),
    averageSolarRadiationKwhM2Day: average(solar),
    observationDays: Math.min(temperatures.length, solar.length)
  };
}

export function parseCopernicusStacPayload(value: unknown) {
  const data = asRecord(value);
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error("upstream_schema_mismatch");

  const scenes = data.features.slice(0, 3).map((feature) => {
    const item = asRecord(feature);
    const properties = asRecord(item?.properties);
    return {
      id: typeof item?.id === "string" ? item.id : null,
      collection: typeof item?.collection === "string" ? item.collection : "sentinel-2-l2a",
      datetime: typeof properties?.datetime === "string" ? properties.datetime : null,
      cloudCoverPercent: typeof properties?.["eo:cloud_cover"] === "number" ? properties["eo:cloud_cover"] : null
    };
  }).filter((scene): scene is typeof scene & { id: string } => Boolean(scene.id));

  return { scenes };
}

export function parseOverpassCountPayload(value: unknown) {
  const data = asRecord(value);
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  const counts = elements.slice(0, 3).map((element) => {
    const tags = asRecord(asRecord(element)?.tags);
    const total = Number(tags?.total);
    return Number.isFinite(total) && total >= 0 ? total : null;
  });
  if (counts.length !== 3 || counts.some((count) => count === null)) throw new Error("upstream_schema_mismatch");
  const osm3s = asRecord(data?.osm3s);

  return {
    sourceObservedAt: typeof osm3s?.timestamp_osm_base === "string" ? osm3s.timestamp_osm_base : null,
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
