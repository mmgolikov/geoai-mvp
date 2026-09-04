export const POINT_OBJECT_LOCALES = ["en", "ru"] as const;

export type PointObjectLocale = (typeof POINT_OBJECT_LOCALES)[number];

export const POINT_OBJECT_MARKET_KEYS = [
  "dubai",
  "abu_dhabi",
  "doha",
  "riyadh",
  "jeddah",
  "kuala_lumpur",
  "singapore",
  "hong_kong",
  "moscow"
] as const;

export type PointObjectMarketKey = (typeof POINT_OBJECT_MARKET_KEYS)[number];

export type PointObjectMarketDefinition = {
  key: PointObjectMarketKey;
  label: Record<PointObjectLocale, string>;
  countryCode: "ae" | "qa" | "sa" | "my" | "sg" | "hk" | "ru";
  center: readonly [longitude: number, latitude: number];
  zoom: number;
  bounds: readonly [
    southwest: readonly [longitude: number, latitude: number],
    northeast: readonly [longitude: number, latitude: number]
  ];
};

export const POINT_OBJECT_MARKETS = [
  {
    key: "dubai",
    label: { en: "Dubai", ru: "Дубай" },
    countryCode: "ae",
    center: [55.2818037, 25.2191],
    zoom: 16.8,
    bounds: [[54.8, 24.8], [55.8, 25.6]]
  },
  {
    key: "abu_dhabi",
    label: { en: "Abu Dhabi", ru: "Абу-Даби" },
    countryCode: "ae",
    center: [54.3773, 24.4539],
    zoom: 16.4,
    bounds: [[54.1, 24.15], [54.75, 24.75]]
  },
  {
    key: "doha",
    label: { en: "Doha", ru: "Доха" },
    countryCode: "qa",
    center: [51.531, 25.2854],
    zoom: 16.4,
    bounds: [[51.2, 24.9], [51.8, 25.7]]
  },
  {
    key: "riyadh",
    label: { en: "Riyadh", ru: "Эр-Рияд" },
    countryCode: "sa",
    center: [46.6753, 24.7136],
    zoom: 16.2,
    bounds: [[46.15, 24.25], [47.25, 25.15]]
  },
  {
    key: "jeddah",
    label: { en: "Jeddah", ru: "Джидда" },
    countryCode: "sa",
    center: [39.1925, 21.5433],
    zoom: 16.2,
    bounds: [[38.85, 21.05], [39.55, 22.0]]
  },
  {
    key: "kuala_lumpur",
    label: { en: "Kuala Lumpur", ru: "Куала-Лумпур" },
    countryCode: "my",
    center: [101.6869, 3.139],
    zoom: 16.4,
    bounds: [[101.35, 2.75], [102.05, 3.45]]
  },
  {
    key: "singapore",
    label: { en: "Singapore", ru: "Сингапур" },
    countryCode: "sg",
    center: [103.8605263, 1.2827539],
    zoom: 16.6,
    bounds: [[103.5, 1.1], [104.1, 1.55]]
  },
  {
    key: "hong_kong",
    label: { en: "Hong Kong", ru: "Гонконг" },
    countryCode: "hk",
    center: [114.1694, 22.3193],
    zoom: 16.4,
    bounds: [[113.75, 22.1], [114.55, 22.65]]
  },
  {
    key: "moscow",
    label: { en: "Moscow", ru: "Москва" },
    countryCode: "ru",
    center: [37.6176, 55.7558],
    zoom: 16.2,
    bounds: [[36.75, 55.25], [38.5, 56.15]]
  }
] as const satisfies readonly PointObjectMarketDefinition[];

const MARKET_BY_KEY = new Map<PointObjectMarketKey, (typeof POINT_OBJECT_MARKETS)[number]>(
  POINT_OBJECT_MARKETS.map((market) => [market.key, market])
);

export function isPointObjectLocale(value: unknown): value is PointObjectLocale {
  return value === "en" || value === "ru";
}

export function pointObjectLocale(value: unknown): PointObjectLocale {
  return isPointObjectLocale(value) ? value : "en";
}

export function isPointObjectMarketKey(value: unknown): value is PointObjectMarketKey {
  return typeof value === "string" && MARKET_BY_KEY.has(value as PointObjectMarketKey);
}

export function pointObjectMarket(key: PointObjectMarketKey) {
  return MARKET_BY_KEY.get(key) ?? POINT_OBJECT_MARKETS[0];
}

export function coordinatesMatchPointObjectMarket(
  key: PointObjectMarketKey,
  longitude: number,
  latitude: number
): boolean {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false;
  const market = pointObjectMarket(key);
  const [[west, south], [east, north]] = market.bounds;
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}

export function nominatimLocale(locale: PointObjectLocale): string {
  return locale === "ru" ? "ru,en" : "en";
}
