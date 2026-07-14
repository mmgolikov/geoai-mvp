type NameRecord = Record<string, unknown>;

function recordValue(value: unknown): NameRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as NameRecord) : {};
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function englishText(value: unknown) {
  const candidate = textValue(value);
  return candidate && /[A-Za-z]/.test(candidate) && !/[\u0600-\u06ff]/.test(candidate) ? candidate : null;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value as NameRecord).flatMap(collectStrings);
  return [];
}

export function normalizeSpatialNamesV1(input: {
  properties: NameRecord;
  provider: "osm" | "overture";
  category: string;
  providerId: string;
}) {
  const names = recordValue(input.properties.names);
  const common = recordValue(names.common);
  const primaryRecord = recordValue(names.primary);
  const primaryLanguage = textValue(primaryRecord.language)?.toLowerCase();
  const structuredPrimaryEnglish =
    textValue(primaryRecord.en) ??
    (primaryLanguage?.startsWith("en") ? textValue(primaryRecord.value) : null) ??
    englishText(names.primary);
  const structuredCommonEnglish = textValue(common.en);
  const osmEnglish = input.provider === "osm" ? textValue(input.properties["name:en"]) : null;
  const nameEn = textValue(input.properties.name_en);
  const localName = textValue(input.properties.name);
  const englishName = structuredPrimaryEnglish ?? structuredCommonEnglish ?? osmEnglish ?? nameEn;
  const sourceObjectName = localName ?? textValue(names.primary) ?? englishName;
  const fallback = `${input.category.replace(/_/g, " ").replace(/\b\w/g, (value) => value.toUpperCase())} — ${input.provider}:${input.providerId}`;
  const displayName = englishName ?? localName ?? fallback;
  const alternateNames = [...new Set([
    ...collectStrings(names.alternate),
    ...collectStrings(common),
    textValue(input.properties.alt_name),
    textValue(input.properties.official_name),
    textValue(input.properties.short_name),
    sourceObjectName
  ].filter((value): value is string => Boolean(value) && ![displayName, localName, englishName].includes(value)))].sort();
  const displayNameSource =
    displayName === structuredPrimaryEnglish
      ? "structured_provider_primary_english"
      : displayName === structuredCommonEnglish
        ? "structured_provider_common_english"
        : displayName === osmEnglish
          ? "osm_name_en"
          : displayName === nameEn
            ? "name_en"
            : displayName === localName
              ? "local_name"
              : "neutral_category_provider_identity";

  return {
    displayName,
    sourceObjectName,
    localName,
    englishName,
    alternateNames,
    displayNameSource
  };
}
