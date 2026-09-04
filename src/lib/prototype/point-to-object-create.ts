import type { Feature, FeatureCollection, Polygon } from "geojson";

import { calculatePolygonMeasurements, validatePolygonVertices } from "../polygon-aoi";

export type ConceptLocale = "en" | "ru";
export type ConceptTemplateId = "residential_mixed_use" | "commercial_hub" | "civic_green";
export type ConceptMassingStyle = "perimeter" | "courtyard" | "towers_on_podium" | "campus";
export type ConceptUse = "residential" | "office" | "retail" | "hospitality" | "civic" | "open_space";

export type RedevelopmentProgramInput = {
  templateId: ConceptTemplateId;
  title: string;
  summary: string;
  massingStyle: ConceptMassingStyle;
  blockCount: number;
  levelsMin: number;
  levelsMax: number;
  targetSiteCoveragePct: number;
  openSpacePct: number;
  setbackM: number;
  useMix: Array<{ use: ConceptUse; sharePct: number }>;
  rationale: string[];
};

export type ValidatedRedevelopmentProgram = RedevelopmentProgramInput & {
  schemaVersion: 1;
};

export type ConceptMassingProperties = {
  id: string;
  kind: "concept_massing";
  templateId: ConceptTemplateId;
  use: Exclude<ConceptUse, "open_space">;
  levels: number;
  heightM: number;
  baseM: 0;
  label: string;
};

export type ConceptMassingResult = {
  featureCollection: FeatureCollection<Polygon, ConceptMassingProperties>;
  requestedBlockCount: number;
  generatedBlockCount: number;
  aoiAreaSqM: number;
  generatedFootprintAreaSqM: number;
  achievedSiteCoveragePct: number;
  seed: string;
};

export type PointObjectCreateAoi = {
  id: string;
  coordinates: Point[][];
  areaSqM: number;
  perimeterM: number;
  vertexCount: number;
};

export type RedevelopmentProgramValidation =
  | { ok: true; value: ValidatedRedevelopmentProgram }
  | { ok: false; errors: string[] };

export type ConceptPosition = [number, number];
type Point = ConceptPosition;
type MetricPoint = { x: number; y: number };

const FLOOR_HEIGHT_M = 3.4;
const MAX_CONCEPT_BLOCKS = 12;
const MAX_CONCEPT_LEVELS = 80;
const MAX_INPUT_TEXT = 600;

const TEMPLATE_COPY: Record<ConceptLocale, Record<ConceptTemplateId, RedevelopmentProgramInput>> = {
  en: {
    residential_mixed_use: {
      templateId: "residential_mixed_use",
      title: "Residential mixed-use concept",
      summary: "Mid-rise residential blocks with active ground-floor uses and a shared open-space structure.",
      massingStyle: "courtyard",
      blockCount: 5,
      levelsMin: 6,
      levelsMax: 12,
      targetSiteCoveragePct: 38,
      openSpacePct: 35,
      setbackM: 8,
      useMix: [
        { use: "residential", sharePct: 72 },
        { use: "retail", sharePct: 18 },
        { use: "open_space", sharePct: 10 }
      ],
      rationale: ["Tests a compact residential programme.", "Keeps a meaningful shared open-space allowance."]
    },
    commercial_hub: {
      templateId: "commercial_hub",
      title: "Commercial hub concept",
      summary: "A high-intensity office and hospitality cluster with an active retail base.",
      massingStyle: "towers_on_podium",
      blockCount: 4,
      levelsMin: 14,
      levelsMax: 32,
      targetSiteCoveragePct: 42,
      openSpacePct: 25,
      setbackM: 10,
      useMix: [
        { use: "office", sharePct: 56 },
        { use: "hospitality", sharePct: 24 },
        { use: "retail", sharePct: 14 },
        { use: "open_space", sharePct: 6 }
      ],
      rationale: ["Tests a visible employment anchor.", "Retains ground-level activation and public-realm capacity."]
    },
    civic_green: {
      templateId: "civic_green",
      title: "Civic and green campus concept",
      summary: "Low- to mid-rise civic buildings arranged around a generous open-space network.",
      massingStyle: "campus",
      blockCount: 6,
      levelsMin: 3,
      levelsMax: 8,
      targetSiteCoveragePct: 28,
      openSpacePct: 50,
      setbackM: 12,
      useMix: [
        { use: "civic", sharePct: 66 },
        { use: "retail", sharePct: 8 },
        { use: "open_space", sharePct: 26 }
      ],
      rationale: ["Tests a public-serving programme.", "Prioritizes a connected landscape structure."]
    }
  },
  ru: {
    residential_mixed_use: {
      templateId: "residential_mixed_use",
      title: "Жилой многофункциональный концепт",
      summary: "Среднеэтажные жилые корпуса с активными первыми этажами и общей системой открытых пространств.",
      massingStyle: "courtyard",
      blockCount: 5,
      levelsMin: 6,
      levelsMax: 12,
      targetSiteCoveragePct: 38,
      openSpacePct: 35,
      setbackM: 8,
      useMix: [
        { use: "residential", sharePct: 72 },
        { use: "retail", sharePct: 18 },
        { use: "open_space", sharePct: 10 }
      ],
      rationale: ["Проверяет компактную жилую программу.", "Сохраняет существенную долю общего открытого пространства."]
    },
    commercial_hub: {
      templateId: "commercial_hub",
      title: "Концепт делового центра",
      summary: "Интенсивный офисно-гостиничный кластер с активным торговым основанием.",
      massingStyle: "towers_on_podium",
      blockCount: 4,
      levelsMin: 14,
      levelsMax: 32,
      targetSiteCoveragePct: 42,
      openSpacePct: 25,
      setbackM: 10,
      useMix: [
        { use: "office", sharePct: 56 },
        { use: "hospitality", sharePct: 24 },
        { use: "retail", sharePct: 14 },
        { use: "open_space", sharePct: 6 }
      ],
      rationale: ["Проверяет сценарий выраженного центра занятости.", "Сохраняет активные первые этажи и ресурс для общественных пространств."]
    },
    civic_green: {
      templateId: "civic_green",
      title: "Общественно-зелёный кампус",
      summary: "Низко- и среднеэтажные общественные объекты вокруг развитой сети открытых пространств.",
      massingStyle: "campus",
      blockCount: 6,
      levelsMin: 3,
      levelsMax: 8,
      targetSiteCoveragePct: 28,
      openSpacePct: 50,
      setbackM: 12,
      useMix: [
        { use: "civic", sharePct: 66 },
        { use: "retail", sharePct: 8 },
        { use: "open_space", sharePct: 26 }
      ],
      rationale: ["Проверяет общественно ориентированную программу.", "Отдаёт приоритет связному озеленённому каркасу."]
    }
  }
};

function cloneProgram(program: RedevelopmentProgramInput): RedevelopmentProgramInput {
  return {
    ...program,
    useMix: program.useMix.map((item) => ({ ...item })),
    rationale: [...program.rationale]
  };
}

export function conceptTemplates(locale: ConceptLocale): RedevelopmentProgramInput[] {
  return Object.values(TEMPLATE_COPY[locale]).map(cloneProgram);
}

export function conceptTemplate(templateId: ConceptTemplateId, locale: ConceptLocale): RedevelopmentProgramInput {
  return cloneProgram(TEMPLATE_COPY[locale][templateId]);
}

const UNSAFE_TEXT_CONTROLS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/;
const URL_LIKE_TEXT = /(?:https?:\/\/|www\.)/i;
const PROHIBITED_CREATE_CLAIMS = [
  /\bofficial\s+(?:parcel|cadastr(?:e|al)|zoning|valuation)\b/i,
  /\b(?:ownership|title|development rights?|planning approval|zoning)\s+(?:is|are|has been)\s+(?:confirmed|verified|approved)\b/i,
  /\b(?:certified valuation|guaranteed best use|guaranteed return)\b/i,
  /(?:официальн(?:ый|ая|ое|ые)\s+(?:кадастр|кадастров|зонирован|оценк)|право собственности подтверждено|права на застройку подтверждены|зонирование утверждено|сертифицированн(?:ая|ой) оценк|гарантированн(?:о|ая) лучшее использование|гарантированн(?:ая|ый) доходност)/i
] as const;

function safeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || UNSAFE_TEXT_CONTROLS.test(value)) return null;
  const normalized = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function integerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function numberInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

const TEMPLATE_IDS = new Set<ConceptTemplateId>(["residential_mixed_use", "commercial_hub", "civic_green"]);
const MASSING_STYLES = new Set<ConceptMassingStyle>(["perimeter", "courtyard", "towers_on_podium", "campus"]);
const USES = new Set<ConceptUse>(["residential", "office", "retail", "hospitality", "civic", "open_space"]);
const PROGRAM_KEYS = new Set([
  "templateId",
  "title",
  "summary",
  "massingStyle",
  "blockCount",
  "levelsMin",
  "levelsMax",
  "targetSiteCoveragePct",
  "openSpacePct",
  "setbackM",
  "useMix",
  "rationale"
]);
const USE_MIX_KEYS = new Set(["use", "sharePct"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unexpectedKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function unsafeNarrative(values: readonly string[]): boolean {
  return values.some((value) => URL_LIKE_TEXT.test(value) || PROHIBITED_CREATE_CLAIMS.some((pattern) => pattern.test(value)));
}

export function validateRedevelopmentProgram(value: unknown): RedevelopmentProgramValidation {
  if (!isRecord(value)) {
    return { ok: false, errors: ["Program must be an object."] };
  }
  const input = value as Partial<RedevelopmentProgramInput>;
  const errors: string[] = [];
  if (unexpectedKeys(value, PROGRAM_KEYS).length > 0) errors.push("Program contains unsupported fields.");
  if (!TEMPLATE_IDS.has(input.templateId as ConceptTemplateId)) errors.push("Unsupported template.");
  const title = safeText(input.title, 120);
  const summary = safeText(input.summary, MAX_INPUT_TEXT);
  if (!title) errors.push("Title must be non-empty, bounded and free of unsafe controls.");
  if (!summary) errors.push("Summary must be non-empty, bounded and free of unsafe controls.");
  if (!MASSING_STYLES.has(input.massingStyle as ConceptMassingStyle)) errors.push("Unsupported massing style.");
  if (!integerInRange(input.blockCount, 1, MAX_CONCEPT_BLOCKS)) errors.push("Block count is outside the prototype limit.");
  if (!integerInRange(input.levelsMin, 1, MAX_CONCEPT_LEVELS)) errors.push("Minimum levels are outside the prototype limit.");
  if (!integerInRange(input.levelsMax, 1, MAX_CONCEPT_LEVELS)) errors.push("Maximum levels are outside the prototype limit.");
  if (typeof input.levelsMin === "number" && typeof input.levelsMax === "number" && input.levelsMax < input.levelsMin) errors.push("Maximum levels must not be below minimum levels.");
  if (!numberInRange(input.targetSiteCoveragePct, 8, 60)) errors.push("Target site coverage must be between 8% and 60%.");
  if (!numberInRange(input.openSpacePct, 15, 75)) errors.push("Open-space share must be between 15% and 75%.");
  if (!numberInRange(input.setbackM, 2, 30)) errors.push("Setback must be between 2 m and 30 m.");
  if (!Array.isArray(input.useMix) || input.useMix.length < 1 || input.useMix.length > 6) {
    errors.push("Use mix must contain one to six entries.");
  } else {
    const seen = new Set<ConceptUse>();
    let total = 0;
    for (const item of input.useMix) {
      if (!isRecord(item)) {
        errors.push("Use mix entries must be objects.");
        continue;
      }
      if (unexpectedKeys(item, USE_MIX_KEYS).length > 0) errors.push("Use mix entries contain unsupported fields.");
      if (!USES.has(item.use as ConceptUse) || seen.has(item.use as ConceptUse)) {
        errors.push("Use mix contains an unsupported or duplicate use.");
        continue;
      }
      seen.add(item.use as ConceptUse);
      if (!numberInRange(item.sharePct, 0, 100)) errors.push("Use shares must be between 0% and 100%.");
      else total += item.sharePct;
    }
    if (Math.abs(total - 100) > 0.01) errors.push("Use shares must total 100%.");
    if ((input.openSpacePct ?? 0) > 0 && !seen.has("open_space")) errors.push("The programme must include an open-space use share.");
  }
  const rationale = Array.isArray(input.rationale) ? input.rationale.map((item) => safeText(item, 240)) : [];
  if (!Array.isArray(input.rationale) || input.rationale.length < 1 || input.rationale.length > 5 || rationale.some((item) => item === null)) {
    errors.push("Rationale must contain one to five bounded statements.");
  }
  if (title && summary && rationale.every((item): item is string => item !== null) && unsafeNarrative([title, summary, ...rationale])) {
    errors.push("Narrative contains a URL or an unsupported authoritative claim.");
  }
  if (errors.length) return { ok: false, errors: [...new Set(errors)] };

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      templateId: input.templateId as ConceptTemplateId,
      title: title!,
      summary: summary!,
      massingStyle: input.massingStyle as ConceptMassingStyle,
      blockCount: input.blockCount!,
      levelsMin: input.levelsMin!,
      levelsMax: input.levelsMax!,
      targetSiteCoveragePct: input.targetSiteCoveragePct!,
      openSpacePct: input.openSpacePct!,
      setbackM: input.setbackM!,
      useMix: input.useMix!.map((item) => ({ use: item.use, sharePct: item.sharePct })),
      rationale: rationale as string[]
    }
  };
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function metricProjection(ring: Point[]) {
  const points = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  const originLng = points.reduce((sum, point) => sum + point[0], 0) / Math.max(points.length, 1);
  const originLat = points.reduce((sum, point) => sum + point[1], 0) / Math.max(points.length, 1);
  const metresPerLng = Math.max(1, 111_320 * Math.cos(toRadians(originLat)));
  const metresPerLat = 110_540;
  return {
    forward: ([longitude, latitude]: Point): MetricPoint => ({
      x: (longitude - originLng) * metresPerLng,
      y: (latitude - originLat) * metresPerLat
    }),
    inverse: ({ x, y }: MetricPoint): Point => [originLng + x / metresPerLng, originLat + y / metresPerLat]
  };
}

function pointInRing(point: MetricPoint, ring: MetricPoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index];
    const prior = ring[previous];
    if (!current || !prior) continue;
    const crosses = (current.y > point.y) !== (prior.y > point.y) &&
      point.x < ((prior.x - current.x) * (point.y - current.y)) / ((prior.y - current.y) || Number.EPSILON) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: MetricPoint, rings: MetricPoint[][]): boolean {
  const outer = rings[0];
  if (!outer || !pointInRing(point, outer)) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole));
}

function rectangleSamples(center: MetricPoint, width: number, height: number): MetricPoint[] {
  const samples: MetricPoint[] = [];
  for (let yIndex = 0; yIndex <= 4; yIndex += 1) {
    for (let xIndex = 0; xIndex <= 4; xIndex += 1) {
      samples.push({
        x: center.x - width / 2 + width * xIndex / 4,
        y: center.y - height / 2 + height * yIndex / 4
      });
    }
  }
  return samples;
}

function rectangleIsInside(center: MetricPoint, width: number, height: number, rings: MetricPoint[][]): boolean {
  return rectangleSamples(center, width, height).every((point) => pointInPolygon(point, rings));
}

function rectanglesOverlap(left: { center: MetricPoint; width: number; height: number }, right: { center: MetricPoint; width: number; height: number }, gapM: number): boolean {
  return Math.abs(left.center.x - right.center.x) < (left.width + right.width) / 2 + gapM &&
    Math.abs(left.center.y - right.center.y) < (left.height + right.height) / 2 + gapM;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFraction(seed: string, index: number): number {
  return stableHash(`${seed}:${index}`) / 0xffffffff;
}

function normalizedUseSequence(program: ValidatedRedevelopmentProgram): Array<Exclude<ConceptUse, "open_space">> {
  const activeUses = program.useMix.filter((item): item is { use: Exclude<ConceptUse, "open_space">; sharePct: number } => item.use !== "open_space");
  if (!activeUses.length) return ["civic"];
  const sequence: Array<Exclude<ConceptUse, "open_space">> = [];
  for (const item of activeUses) {
    const copies = Math.max(1, Math.round(item.sharePct / 10));
    for (let index = 0; index < copies; index += 1) sequence.push(item.use);
  }
  return sequence;
}

function rectangleRing(center: MetricPoint, width: number, height: number, inverse: (point: MetricPoint) => Point): Point[] {
  const corners = [
    { x: center.x - width / 2, y: center.y - height / 2 },
    { x: center.x + width / 2, y: center.y - height / 2 },
    { x: center.x + width / 2, y: center.y + height / 2 },
    { x: center.x - width / 2, y: center.y + height / 2 }
  ].map(inverse);
  return [...corners, corners[0]];
}

export function generateConceptMassing(
  aoiCoordinates: Point[][],
  program: ValidatedRedevelopmentProgram,
  seed = `${program.templateId}:${program.title}`
): ConceptMassingResult {
  const outer = aoiCoordinates[0];
  if (!outer) throw new Error("AOI exterior ring is required.");
  const openOuter = outer.length > 1 && outer[0][0] === outer[outer.length - 1][0] && outer[0][1] === outer[outer.length - 1][1]
    ? outer.slice(0, -1)
    : outer;
  const validation = validatePolygonVertices(openOuter);
  if (!validation.valid || !validation.measurements) throw new Error(validation.message);
  if (validation.measurements.areaSqM > 1_000_000) throw new Error("Create prototype AOI must not exceed 1 sq km.");
  if (openOuter.length > 25) throw new Error("Create prototype AOI must not exceed 25 exterior vertices.");

  const projection = metricProjection(outer);
  const rings = aoiCoordinates.map((ring) => ring.map(projection.forward));
  const outerMetric = rings[0];
  const minX = Math.min(...outerMetric.map((point) => point.x));
  const maxX = Math.max(...outerMetric.map((point) => point.x));
  const minY = Math.min(...outerMetric.map((point) => point.y));
  const maxY = Math.max(...outerMetric.map((point) => point.y));
  const desiredTotalArea = validation.measurements.areaSqM * program.targetSiteCoveragePct / 100;
  const aspectRatio = program.massingStyle === "perimeter" ? 2.4 : program.massingStyle === "campus" ? 1.35 : 1.75;
  const baseArea = desiredTotalArea / program.blockCount;
  const initialWidth = Math.sqrt(baseArea * aspectRatio);
  const initialHeight = baseArea / initialWidth;
  const gapM = Math.max(4, program.setbackM * 0.55);
  const candidateCount = 196;
  const candidates: Array<{ center: MetricPoint; order: number }> = [];

  for (let yIndex = 1; yIndex <= 14; yIndex += 1) {
    for (let xIndex = 1; xIndex <= 14; xIndex += 1) {
      const linearIndex = (yIndex - 1) * 14 + xIndex;
      candidates.push({
        center: {
          x: minX + (maxX - minX) * xIndex / 15,
          y: minY + (maxY - minY) * yIndex / 15
        },
        order: seededFraction(seed, linearIndex)
      });
    }
  }
  candidates.sort((left, right) => left.order - right.order);

  const chosen: Array<{ center: MetricPoint; width: number; height: number }> = [];
  for (let shrinkStep = 0; shrinkStep < 7 && chosen.length < program.blockCount; shrinkStep += 1) {
    const scale = 1 - shrinkStep * 0.1;
    const width = Math.max(8, initialWidth * scale);
    const height = Math.max(8, initialHeight * scale);
    for (const candidate of candidates) {
      if (chosen.length >= program.blockCount) break;
      if (!rectangleIsInside(candidate.center, width, height, rings)) continue;
      const next = { center: candidate.center, width, height };
      if (chosen.some((existing) => rectanglesOverlap(existing, next, gapM))) continue;
      chosen.push(next);
    }
  }

  const uses = normalizedUseSequence(program);
  const levelsRange = program.levelsMax - program.levelsMin;
  const features: Array<Feature<Polygon, ConceptMassingProperties>> = chosen.map((block, index) => {
    const levelOffset = levelsRange > 0 ? Math.round(seededFraction(`${seed}:levels`, index) * levelsRange) : 0;
    const levels = program.levelsMin + levelOffset;
    const use = uses[index % uses.length] ?? uses[0];
    return {
      type: "Feature",
      id: `concept-${index + 1}`,
      properties: {
        id: `concept-${index + 1}`,
        kind: "concept_massing",
        templateId: program.templateId,
        use,
        levels,
        heightM: Number((levels * FLOOR_HEIGHT_M).toFixed(1)),
        baseM: 0,
        label: `${program.title} · ${index + 1}`
      },
      geometry: {
        type: "Polygon",
        coordinates: [rectangleRing(block.center, block.width, block.height, projection.inverse)]
      }
    };
  });
  const generatedFootprintAreaSqM = chosen.reduce((sum, block) => sum + block.width * block.height, 0);

  return {
    featureCollection: { type: "FeatureCollection", features },
    requestedBlockCount: program.blockCount,
    generatedBlockCount: features.length,
    aoiAreaSqM: validation.measurements.areaSqM,
    generatedFootprintAreaSqM,
    achievedSiteCoveragePct: Number((generatedFootprintAreaSqM / validation.measurements.areaSqM * 100).toFixed(1)),
    seed
  };
}
