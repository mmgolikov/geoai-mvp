import type { Feature, FeatureCollection, Polygon } from "geojson";

import { calculatePolygonMeasurements, validatePolygonVertices } from "../polygon-aoi";

export type ConceptLocale = "en" | "ru";
export type ConceptTemplateId = "residential_mixed_use" | "commercial_hub" | "civic_green";
export type ConceptMassingStyle = "perimeter" | "courtyard" | "towers_on_podium" | "campus";
export type ConceptUse = "residential" | "office" | "retail" | "hospitality" | "civic" | "open_space";
export type ConceptAlternativeId = "A" | "B";
export type ConceptVolumeRole = "perimeter_wing" | "courtyard_wing" | "podium" | "tower" | "campus_block";

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
  massingStyle: ConceptMassingStyle;
  variantId: ConceptAlternativeId;
  volumeRole: ConceptVolumeRole;
  primaryBlock: boolean;
  use: Exclude<ConceptUse, "open_space">;
  levels: number;
  /** Absolute extrusion top above the site datum, not the volume thickness. */
  heightM: number;
  /** Absolute extrusion base above the site datum. */
  baseM: number;
  /** Tower support lineage; may be omitted only for legacy single-podium tower results. */
  supportingPodiumId?: string | null;
  label: string;
};

export type ConceptMassingResult = {
  featureCollection: FeatureCollection<Polygon, ConceptMassingProperties>;
  variantId: ConceptAlternativeId;
  massingStyle: ConceptMassingStyle;
  requestedBlockCount: number;
  /** Number of primary buildings/towers, excluding supporting podiums. */
  generatedBlockCount: number;
  /** Actual GeoJSON feature count, including supporting podiums. */
  generatedFeatureCount: number;
  aoiAreaSqM: number;
  /** Unique ground footprint. Stacked tower footprints do not double-count the podium. */
  generatedFootprintAreaSqM: number;
  achievedSiteCoveragePct: number;
  estimatedFloorAreaSqM: number;
  minGeneratedLevels: number;
  maxGeneratedLevels: number;
  seed: string;
};

export type ConceptMassingAlternative = {
  id: ConceptAlternativeId;
  label: string;
  massing: ConceptMassingResult;
};

export class ConceptMassingError extends Error {
  readonly code:
    | "courtyard_requires_four_blocks"
    | "tower_height_incompatible"
    | "programme_does_not_fit"
    | "geometry_validation_failed";

  constructor(
    code:
      | "courtyard_requires_four_blocks"
      | "tower_height_incompatible"
      | "programme_does_not_fit"
      | "geometry_validation_failed",
    message: string
  ) {
    super(message);
    this.code = code;
    this.name = "ConceptMassingError";
  }
}

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

export type PointObjectCreateAoiValidation =
  | { ok: true; measurements: ReturnType<typeof calculatePolygonMeasurements> }
  | {
      ok: false;
      code: "too_small" | "too_large" | "too_many_vertices" | "invalid_geometry";
      message: string;
    };

export type ConceptPosition = [number, number];
type Point = ConceptPosition;
type MetricPoint = { x: number; y: number };

const FLOOR_HEIGHT_M = 3.4;
const MAX_CONCEPT_BLOCKS = 12;
const MAX_CONCEPT_LEVELS = 80;
const MAX_INPUT_TEXT = 600;
export const pointObjectCreateMinAreaSqM = 100;
export const pointObjectCreateMaxAreaSqM = 1_000_000;
export const pointObjectCreateMaxVertices = 25;

export function validatePointObjectCreateAoiVertices(vertices: Point[]): PointObjectCreateAoiValidation {
  if (vertices.length > pointObjectCreateMaxVertices) {
    return {
      ok: false,
      code: "too_many_vertices",
      message: `Create prototype AOI must not exceed ${pointObjectCreateMaxVertices} exterior vertices.`
    };
  }

  const validation = validatePolygonVertices(vertices);
  const measuredArea = validation.measurements?.areaSqM;
  if (typeof measuredArea === "number" && measuredArea < pointObjectCreateMinAreaSqM) {
    return {
      ok: false,
      code: "too_small",
      message: `Create prototype AOI must cover at least ${pointObjectCreateMinAreaSqM} sq m.`
    };
  }
  if (typeof measuredArea === "number" && measuredArea > pointObjectCreateMaxAreaSqM) {
    return {
      ok: false,
      code: "too_large",
      message: "Create prototype AOI must not exceed 1 sq km."
    };
  }
  if (!validation.valid || !validation.measurements) {
    return { ok: false, code: "invalid_geometry", message: validation.message };
  }

  return { ok: true, measurements: validation.measurements };
}

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
  if (typeof input.targetSiteCoveragePct === "number" && typeof input.openSpacePct === "number" &&
      input.targetSiteCoveragePct + input.openSpacePct > 100) {
    errors.push("Site coverage and open-space share must not exceed 100% together.");
  }
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

type MetricBounds = { minX: number; minY: number; maxX: number; maxY: number };
type OrientedRectangle = {
  center: MetricPoint;
  width: number;
  height: number;
  angle: number;
  points: MetricPoint[];
};
type PlannedVolume = {
  footprint: MetricPoint[];
  role: ConceptVolumeRole;
  primaryBlock: boolean;
  levels: number;
  baseLevels: number;
  use: Exclude<ConceptUse, "open_space">;
  supportingPodiumIndex?: number;
};

const GEOMETRY_EPSILON_M = 0.02;
const MIN_BUILDING_DIMENSION_M = 4;

function openRing<T extends MetricPoint | Point>(ring: T[]): T[] {
  const first = ring[0];
  const last = ring.at(-1);
  return first && last && "x" in first && "x" in last
    ? first.x === last.x && first.y === last.y ? ring.slice(0, -1) : [...ring]
    : first && last && Array.isArray(first) && Array.isArray(last) && first[0] === last[0] && first[1] === last[1]
      ? ring.slice(0, -1)
      : [...ring];
}

function metricBounds(points: MetricPoint[]): MetricBounds {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y))
  };
}

function metricPolygonArea(points: MetricPoint[]): number {
  const ring = openRing(points);
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

function pointDistance(left: MetricPoint, right: MetricPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function pointToSegmentDistance(point: MetricPoint, start: MetricPoint, end: MetricPoint): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared <= Number.EPSILON) return pointDistance(point, start);
  const projection = Math.max(0, Math.min(1,
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared
  ));
  return pointDistance(point, { x: start.x + projection * deltaX, y: start.y + projection * deltaY });
}

function orientation(left: MetricPoint, middle: MetricPoint, right: MetricPoint): number {
  return (middle.y - left.y) * (right.x - middle.x) - (middle.x - left.x) * (right.y - middle.y);
}

function pointOnSegment(point: MetricPoint, start: MetricPoint, end: MetricPoint): boolean {
  return Math.abs(orientation(start, point, end)) <= GEOMETRY_EPSILON_M &&
    point.x >= Math.min(start.x, end.x) - GEOMETRY_EPSILON_M &&
    point.x <= Math.max(start.x, end.x) + GEOMETRY_EPSILON_M &&
    point.y >= Math.min(start.y, end.y) - GEOMETRY_EPSILON_M &&
    point.y <= Math.max(start.y, end.y) + GEOMETRY_EPSILON_M;
}

function segmentsIntersect(leftStart: MetricPoint, leftEnd: MetricPoint, rightStart: MetricPoint, rightEnd: MetricPoint): boolean {
  const first = orientation(leftStart, leftEnd, rightStart);
  const second = orientation(leftStart, leftEnd, rightEnd);
  const third = orientation(rightStart, rightEnd, leftStart);
  const fourth = orientation(rightStart, rightEnd, leftEnd);
  if (((first > GEOMETRY_EPSILON_M && second < -GEOMETRY_EPSILON_M) ||
      (first < -GEOMETRY_EPSILON_M && second > GEOMETRY_EPSILON_M)) &&
      ((third > GEOMETRY_EPSILON_M && fourth < -GEOMETRY_EPSILON_M) ||
      (third < -GEOMETRY_EPSILON_M && fourth > GEOMETRY_EPSILON_M))) return true;
  return pointOnSegment(rightStart, leftStart, leftEnd) || pointOnSegment(rightEnd, leftStart, leftEnd) ||
    pointOnSegment(leftStart, rightStart, rightEnd) || pointOnSegment(leftEnd, rightStart, rightEnd);
}

function segmentDistance(leftStart: MetricPoint, leftEnd: MetricPoint, rightStart: MetricPoint, rightEnd: MetricPoint): number {
  if (segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)) return 0;
  return Math.min(
    pointToSegmentDistance(leftStart, rightStart, rightEnd),
    pointToSegmentDistance(leftEnd, rightStart, rightEnd),
    pointToSegmentDistance(rightStart, leftStart, leftEnd),
    pointToSegmentDistance(rightEnd, leftStart, leftEnd)
  );
}

function pointInRing(point: MetricPoint, ringInput: MetricPoint[], includeBoundary = true): boolean {
  const ring = openRing(ringInput);
  for (let index = 0; index < ring.length; index += 1) {
    if (pointOnSegment(point, ring[index], ring[(index + 1) % ring.length])) return includeBoundary;
  }
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
  if (!outer || !pointInRing(point, outer, true)) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole, true));
}

function polygonEdges(pointsInput: MetricPoint[]): Array<[MetricPoint, MetricPoint]> {
  const points = openRing(pointsInput);
  const edges: Array<[MetricPoint, MetricPoint]> = [];
  for (let index = 0; index < points.length; index += 1) {
    edges.push([points[index], points[(index + 1) % points.length]]);
  }
  return edges;
}

function polygonsOverlap(left: MetricPoint[], right: MetricPoint[]): boolean {
  if (polygonEdges(left).some(([leftStart, leftEnd]) =>
    polygonEdges(right).some(([rightStart, rightEnd]) => segmentsIntersect(leftStart, leftEnd, rightStart, rightEnd)))) return true;
  return pointInRing(left[0], right, false) || pointInRing(right[0], left, false);
}

function polygonGap(left: MetricPoint[], right: MetricPoint[]): number {
  if (polygonsOverlap(left, right)) return 0;
  let minimum = Number.POSITIVE_INFINITY;
  for (const [leftStart, leftEnd] of polygonEdges(left)) {
    for (const [rightStart, rightEnd] of polygonEdges(right)) {
      minimum = Math.min(minimum, segmentDistance(leftStart, leftEnd, rightStart, rightEnd));
    }
  }
  return minimum;
}

function polygonInsideAoi(candidate: MetricPoint[], rings: MetricPoint[][], setbackM: number): boolean {
  if (!candidate.every((point) => pointInPolygon(point, rings))) return false;
  const candidateEdges = polygonEdges(candidate);
  for (const boundary of rings) {
    for (const [candidateStart, candidateEnd] of candidateEdges) {
      for (const [boundaryStart, boundaryEnd] of polygonEdges(boundary)) {
        if (segmentsIntersect(candidateStart, candidateEnd, boundaryStart, boundaryEnd)) return false;
        if (segmentDistance(candidateStart, candidateEnd, boundaryStart, boundaryEnd) + GEOMETRY_EPSILON_M < setbackM) return false;
      }
    }
  }
  for (const hole of rings.slice(1)) {
    if (openRing(hole).some((point) => pointInRing(point, candidate, true))) return false;
  }
  return true;
}

function localToWorld(center: MetricPoint, angle: number, local: MetricPoint): MetricPoint {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: center.x + local.x * cosine - local.y * sine,
    y: center.y + local.x * sine + local.y * cosine
  };
}

function orientedRectangle(center: MetricPoint, width: number, height: number, angle: number): OrientedRectangle {
  const points = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 }
  ].map((point) => localToWorld(center, angle, point));
  return { center, width, height, angle, points };
}

function dominantEdgeAngle(ringInput: MetricPoint[]): number {
  const ring = openRing(ringInput);
  let longest = -1;
  let angle = 0;
  for (const [start, end] of polygonEdges(ring)) {
    const length = pointDistance(start, end);
    if (length > longest) {
      longest = length;
      angle = Math.atan2(end.y - start.y, end.x - start.x);
    }
  }
  while (angle >= Math.PI / 2) angle -= Math.PI;
  while (angle < -Math.PI / 2) angle += Math.PI;
  return angle;
}

function normalizeRectangleAngle(angle: number): number {
  let normalized = angle;
  while (normalized >= Math.PI / 2) normalized -= Math.PI;
  while (normalized < -Math.PI / 2) normalized += Math.PI;
  return normalized;
}

function rectangleAngleDistance(left: number, right: number): number {
  const delta = Math.abs(normalizeRectangleAngle(left) - normalizeRectangleAngle(right));
  return Math.min(delta, Math.PI - delta);
}

function principalAxisAngle(ringInput: MetricPoint[]): number {
  const ring = openRing(ringInput);
  const center = centroidOfPoints(ring);
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const point of ring) {
    const deltaX = point.x - center.x;
    const deltaY = point.y - center.y;
    xx += deltaX * deltaX;
    yy += deltaY * deltaY;
    xy += deltaX * deltaY;
  }
  return normalizeRectangleAngle(0.5 * Math.atan2(2 * xy, xx - yy));
}

function boundaryAlignedAngles(ringInput: MetricPoint[]): number[] {
  const candidates = polygonEdges(ringInput)
    .map(([start, end]) => ({
      angle: normalizeRectangleAngle(Math.atan2(end.y - start.y, end.x - start.x)),
      length: pointDistance(start, end)
    }))
    .sort((left, right) => right.length - left.length);
  const unique: number[] = [];
  for (const candidate of candidates) {
    if (unique.every((angle) => rectangleAngleDistance(angle, candidate.angle) > toRadians(2))) {
      unique.push(candidate.angle);
    }
    if (unique.length === 4) break;
  }
  return unique;
}

function adaptivePodiumAngles(ring: MetricPoint[], variantId: ConceptAlternativeId): number[] {
  const dominant = dominantEdgeAngle(ring);
  const principal = principalAxisAngle(ring);
  const offset = variantId === "B" ? toRadians(12) : 0;
  const ordered = [
    dominant + offset,
    dominant,
    principal + offset,
    principal,
    ...boundaryAlignedAngles(ring).flatMap((angle) => variantId === "B" ? [angle + offset, angle] : [angle])
  ].map(normalizeRectangleAngle);
  return ordered.filter((angle, index) =>
    ordered.findIndex((candidate) => rectangleAngleDistance(candidate, angle) <= toRadians(2)) === index
  ).slice(0, 6);
}

function centroidOfPoints(pointsInput: MetricPoint[]): MetricPoint {
  const points = openRing(pointsInput);
  return points.reduce<MetricPoint>((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 });
}

function findLargestEnvelope(
  rings: MetricPoint[][],
  aspectRatio: number,
  angle: number,
  setbackM: number,
  variantId: ConceptAlternativeId,
  gridDivisions = 18,
  binaryIterations = 24
): OrientedRectangle | null {
  const bounds = metricBounds(rings[0]);
  const center = centroidOfPoints(rings[0]);
  const candidates: MetricPoint[] = [center, { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }];
  for (let yIndex = 1; yIndex < gridDivisions; yIndex += 1) {
    for (let xIndex = 1; xIndex < gridDivisions; xIndex += 1) {
      candidates.push({
        x: bounds.minX + (bounds.maxX - bounds.minX) * xIndex / gridDivisions,
        y: bounds.minY + (bounds.maxY - bounds.minY) * yIndex / gridDivisions
      });
    }
  }
  const target = variantId === "A"
    ? center
    : { x: bounds.minX + (bounds.maxX - bounds.minX) * 0.56, y: bounds.minY + (bounds.maxY - bounds.minY) * 0.44 };
  candidates.sort((left, right) => pointDistance(left, target) - pointDistance(right, target));
  const maximumArea = Math.max(1, (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY) * 1.5);
  let best: OrientedRectangle | null = null;
  for (const candidate of candidates) {
    if (!pointInPolygon(candidate, rings)) continue;
    let low = 0;
    let high = maximumArea;
    for (let iteration = 0; iteration < binaryIterations; iteration += 1) {
      const area = (low + high) / 2;
      const width = Math.sqrt(area * aspectRatio);
      const height = area / Math.max(width, Number.EPSILON);
      const rectangle = orientedRectangle(candidate, width, height, angle);
      if (polygonInsideAoi(rectangle.points, rings, setbackM)) low = area;
      else high = area;
    }
    if (low <= MIN_BUILDING_DIMENSION_M ** 2) continue;
    const width = Math.sqrt(low * aspectRatio);
    const height = low / width;
    const rectangle = orientedRectangle(candidate, width, height, angle);
    if (!best || width * height > best.width * best.height) best = rectangle;
  }
  return best;
}

function scaleRectangle(rectangle: OrientedRectangle, scale: number): OrientedRectangle {
  return orientedRectangle(rectangle.center, rectangle.width * scale, rectangle.height * scale, rectangle.angle);
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

function levelForPrimary(program: ValidatedRedevelopmentProgram, seed: string, index: number, count: number): number {
  const range = program.levelsMax - program.levelsMin;
  if (range === 0) return program.levelsMin;
  if (count === 1) return program.levelsMin + Math.round(range / 2);
  const order = Array.from({ length: count }, (_, candidate) => candidate)
    .sort((left, right) => seededFraction(`${seed}:level-order`, left) - seededFraction(`${seed}:level-order`, right));
  const rank = order.indexOf(index);
  return program.levelsMin + Math.round(range * rank / (count - 1));
}

function useForPrimary(program: ValidatedRedevelopmentProgram, index: number): Exclude<ConceptUse, "open_space"> {
  const uses = normalizedUseSequence(program);
  return uses[index % uses.length] ?? uses[0] ?? "civic";
}

function featureFromVolume(
  volume: PlannedVolume,
  index: number,
  program: ValidatedRedevelopmentProgram,
  variantId: ConceptAlternativeId,
  inverse: (point: MetricPoint) => Point
): Feature<Polygon, ConceptMassingProperties> {
  const id = `concept-${variantId.toLowerCase()}-${index + 1}`;
  const baseM = Number((volume.baseLevels * FLOOR_HEIGHT_M).toFixed(1));
  const heightM = Number((volume.levels * FLOOR_HEIGHT_M).toFixed(1));
  const ring = volume.footprint.map(inverse);
  const closedRing = [...ring, ring[0]];
  return {
    type: "Feature",
    id,
    properties: {
      id,
      kind: "concept_massing",
      templateId: program.templateId,
      massingStyle: program.massingStyle,
      variantId,
      volumeRole: volume.role,
      primaryBlock: volume.primaryBlock,
      use: volume.use,
      levels: volume.levels,
      heightM,
      baseM,
      ...(volume.supportingPodiumIndex === undefined ? {} : {
        supportingPodiumId: `concept-${variantId.toLowerCase()}-${volume.supportingPodiumIndex + 1}`
      }),
      label: `${program.title} · ${volume.role.replaceAll("_", " ")} ${index + 1}`
    },
    geometry: { type: "Polygon", coordinates: [closedRing] }
  };
}

function sideCounts(blockCount: number, variantId: ConceptAlternativeId, requireAllSides: boolean): number[] {
  const counts = [0, 0, 0, 0];
  const order = variantId === "A" ? [0, 2, 1, 3] : [1, 3, 2, 0];
  let assigned = 0;
  if (requireAllSides) {
    counts.fill(1);
    assigned = 4;
  }
  while (assigned < blockCount) {
    counts[order[assigned % order.length]] += 1;
    assigned += 1;
  }
  return counts;
}

function sideRectangles(
  envelope: OrientedRectangle,
  depth: number,
  counts: number[],
  fill: number,
  courtyard: boolean,
  variantId: ConceptAlternativeId
): OrientedRectangle[] | null {
  const cornerMargin = courtyard ? 1.5 : Math.max(2, depth * 0.65);
  const segmentGap = courtyard ? 1.8 : Math.max(3, depth * 0.45);
  const output: OrientedRectangle[] = [];
  const horizontalLength = envelope.width - 2 * cornerMargin;
  const verticalLength = envelope.height - 2 * (depth + cornerMargin);
  if (horizontalLength <= 0 || verticalLength <= 0) return null;
  for (let side = 0; side < 4; side += 1) {
    const count = counts[side] ?? 0;
    if (count === 0) continue;
    const horizontal = side === 0 || side === 2;
    const available = horizontal ? horizontalLength : verticalLength;
    const slot = available / count;
    const length = (slot - segmentGap) * fill;
    if (length < 6 || depth < MIN_BUILDING_DIMENSION_M) return null;
    for (let position = 0; position < count; position += 1) {
      const baseAlong = -available / 2 + slot * (position + 0.5);
      const shiftDirection = [1, -1, -1, 1][side] * (position % 2 === 0 ? 1 : -1);
      const along = baseAlong + (variantId === "B" ? shiftDirection * Math.max(0, slot - length) * 0.28 : 0);
      const localCenter = horizontal
        ? { x: along, y: (side === 0 ? -1 : 1) * (envelope.height / 2 - depth / 2) }
        : { x: (side === 1 ? 1 : -1) * (envelope.width / 2 - depth / 2), y: along };
      output.push(orientedRectangle(
        localToWorld(envelope.center, envelope.angle, localCenter),
        horizontal ? length : depth,
        horizontal ? depth : length,
        horizontal ? envelope.angle : envelope.angle + Math.PI / 2
      ));
    }
  }
  return output;
}

function findSideLayout(
  rings: MetricPoint[][],
  program: ValidatedRedevelopmentProgram,
  variantId: ConceptAlternativeId,
  courtyard: boolean,
  desiredArea: number
): OrientedRectangle[] | null {
  const baseAngle = dominantEdgeAngle(rings[0]);
  const preferredAngle = baseAngle + (variantId === "B" ? toRadians(courtyard ? 18 : 10) : 0);
  const bounds = metricBounds(rings[0]);
  const boundsAspect = Math.max(0.65, Math.min(2.2,
    Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) /
    Math.max(1, Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY))
  ));
  const counts = sideCounts(program.blockCount, variantId, courtyard);
  const aoiArea = metricPolygonArea(rings[0]) - rings.slice(1).reduce((sum, ring) => sum + metricPolygonArea(ring), 0);
  const targetCoreOpenArea = aoiArea * program.openSpacePct / 100 * (courtyard ? 0.55 : 0.35);
  let bestPieces: OrientedRectangle[] | null = null;
  let bestError = Number.POSITIVE_INFINITY;
  for (const angle of [preferredAngle, baseAngle]) {
    const maximum = findLargestEnvelope(rings, boundsAspect, angle, program.setbackM, variantId);
    if (!maximum) continue;
    for (let scaleStep = 10; scaleStep >= 4; scaleStep -= 1) {
      const envelope = scaleRectangle(maximum, scaleStep / 10);
      const maxDepth = Math.min(envelope.width, envelope.height) * (courtyard ? 0.27 : 0.22);
      for (let depthStep = 0; depthStep <= 18; depthStep += 1) {
        const depth = MIN_BUILDING_DIMENSION_M + (maxDepth - MIN_BUILDING_DIMENSION_M) * depthStep / 18;
        if (depth < MIN_BUILDING_DIMENSION_M) continue;
        const full = sideRectangles(envelope, depth, counts, 1, courtyard, variantId);
        if (!full) continue;
        const capacity = full.reduce((sum, rectangle) => sum + rectangle.width * rectangle.height, 0);
        const fill = desiredArea / Math.max(capacity, Number.EPSILON);
        const minimumFill = courtyard ? 0.76 : 0.42;
        if (fill < minimumFill || fill > 0.98) continue;
        const pieces = sideRectangles(envelope, depth, counts, fill, courtyard, variantId);
        if (!pieces || pieces.length !== program.blockCount) continue;
        if (!pieces.every((piece) => polygonInsideAoi(piece.points, rings, program.setbackM))) continue;
        const gapM = courtyard ? 0.5 : Math.max(1.5, program.setbackM * 0.2);
        if (pieces.some((piece, index) => pieces.slice(index + 1).some((other) => polygonGap(piece.points, other.points) < gapM))) continue;
        const actualArea = pieces.reduce((sum, rectangle) => sum + rectangle.width * rectangle.height, 0);
        const coreOpenArea = Math.max(0, envelope.width * envelope.height - actualArea);
        const coverageError = Math.abs(actualArea - desiredArea) / Math.max(desiredArea, 1);
        const openSpaceError = Math.abs(coreOpenArea - targetCoreOpenArea) / Math.max(targetCoreOpenArea, 1);
        const error = coverageError + openSpaceError * 0.08;
        if (error < bestError) {
          bestPieces = pieces;
          bestError = error;
        }
      }
    }
    if (bestPieces && Math.abs(angle - preferredAngle) < 1e-9) return bestPieces;
    if (bestPieces && bestError < 0.03) break;
  }
  return bestPieces;
}

function targetFractions(variantId: ConceptAlternativeId): Array<[number, number]> {
  return variantId === "A"
    ? [[0.22, 0.22], [0.78, 0.78], [0.78, 0.22], [0.22, 0.78], [0.5, 0.18], [0.5, 0.82], [0.18, 0.5], [0.82, 0.5], [0.38, 0.38], [0.62, 0.62], [0.62, 0.38], [0.38, 0.62]]
    : [[0.5, 0.2], [0.2, 0.5], [0.8, 0.5], [0.5, 0.8], [0.28, 0.28], [0.72, 0.72], [0.72, 0.28], [0.28, 0.72], [0.5, 0.4], [0.4, 0.6], [0.6, 0.6], [0.5, 0.75]];
}

type DistributedRectangleOptions = {
  aspectRatios?: number[];
  areaFactors?: number[];
  gridDivisions?: number;
  scaleSteps?: number[];
  targetFractions?: Array<[number, number]>;
};

function placeDistributedRectangles(
  rings: MetricPoint[][],
  program: ValidatedRedevelopmentProgram,
  variantId: ConceptAlternativeId,
  desiredArea: number,
  seed: string,
  setbackM: number,
  gapM: number,
  angleOffsets: number[],
  options: DistributedRectangleOptions = {}
): OrientedRectangle[] | null {
  const bounds = metricBounds(rings[0]);
  const dominant = dominantEdgeAngle(rings[0]);
  const targets = options.targetFractions ?? targetFractions(variantId);
  const gridDivisions = options.gridDivisions ?? 22;
  const candidates: MetricPoint[] = [];
  for (let yIndex = 1; yIndex < gridDivisions; yIndex += 1) {
    for (let xIndex = 1; xIndex < gridDivisions; xIndex += 1) {
      candidates.push({
        x: bounds.minX + (bounds.maxX - bounds.minX) * xIndex / gridDivisions,
        y: bounds.minY + (bounds.maxY - bounds.minY) * yIndex / gridDivisions
      });
    }
  }
  const rawFactors = Array.from({ length: program.blockCount }, (_, index) =>
    options.areaFactors?.[index % options.areaFactors.length] ?? 0.88 + (index % 3) * 0.12
  );
  const factorScale = program.blockCount / rawFactors.reduce((sum, factor) => sum + factor, 0);
  const scaleSteps = options.scaleSteps ?? Array.from({ length: 7 }, (_, index) => 10 - index);
  for (const scaleStep of scaleSteps) {
    const scale = scaleStep / 10;
    const placed: OrientedRectangle[] = [];
    for (let index = 0; index < program.blockCount; index += 1) {
      const blockArea = desiredArea / program.blockCount * rawFactors[index] * factorScale * scale * scale;
      const narrow = Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) /
        Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) < 0.3;
      const aspect = Math.max(1, options.aspectRatios?.[index % options.aspectRatios.length] ??
        (narrow ? 2.6 : 1.25 + (index % 2) * 0.5));
      const width = Math.sqrt(blockArea * aspect);
      const height = blockArea / width;
      const offset = angleOffsets[index % angleOffsets.length] ?? 0;
      const angle = dominant + toRadians(offset);
      const fraction = targets[index % targets.length];
      const target = {
        x: bounds.minX + (bounds.maxX - bounds.minX) * fraction[0],
        y: bounds.minY + (bounds.maxY - bounds.minY) * fraction[1]
      };
      let choice: { rectangle: OrientedRectangle; score: number } | null = null;
      for (const candidate of candidates) {
        const rectangle = orientedRectangle(candidate, width, height, angle);
        if (!polygonInsideAoi(rectangle.points, rings, setbackM)) continue;
        if (placed.some((other) => polygonGap(rectangle.points, other.points) < gapM)) continue;
        const separation = placed.length
          ? Math.min(...placed.map((other) => pointDistance(rectangle.center, other.center)))
          : 0;
        const tieBreak = seededFraction(`${seed}:candidate:${index}`, Math.round(candidate.x * 10) + Math.round(candidate.y * 10)) * 0.01;
        const score = pointDistance(candidate, target) - separation * 0.22 + tieBreak;
        if (!choice || score < choice.score) choice = { rectangle, score };
      }
      if (!choice) break;
      placed.push(choice.rectangle);
    }
    if (placed.length === program.blockCount) return placed;
  }
  return null;
}

function planPerimeterOrCourtyard(
  rings: MetricPoint[][],
  program: ValidatedRedevelopmentProgram,
  variantId: ConceptAlternativeId,
  seed: string,
  desiredArea: number
): PlannedVolume[] {
  const courtyard = program.massingStyle === "courtyard";
  if (courtyard && program.blockCount < 4) {
    throw new ConceptMassingError("courtyard_requires_four_blocks", "A courtyard needs at least four primary wings.");
  }
  const pieces = findSideLayout(rings, program, variantId, courtyard, desiredArea);
  if (!pieces) throw new ConceptMassingError("programme_does_not_fit", "The requested perimeter programme does not fit inside this AOI and setback.");
  return pieces.map((piece, index) => ({
    footprint: piece.points,
    role: courtyard ? "courtyard_wing" : "perimeter_wing",
    primaryBlock: true,
    levels: levelForPrimary(program, seed, index, pieces.length),
    baseLevels: 0,
    use: useForPrimary(program, index)
  }));
}

function planCampus(
  rings: MetricPoint[][],
  program: ValidatedRedevelopmentProgram,
  variantId: ConceptAlternativeId,
  seed: string,
  desiredArea: number
): PlannedVolume[] {
  const angles = variantId === "A" ? [-18, 12, 0, 24, -10] : [28, -12, 15, -26, 0];
  const openSpaceGap = Math.sqrt(desiredArea / Math.max(1, program.blockCount)) * program.openSpacePct / 100 * 0.35;
  const candidates = [
    placeDistributedRectangles(
      rings,
      program,
      variantId,
      desiredArea,
      seed,
      program.setbackM,
      Math.max(4, program.setbackM * 0.45, openSpaceGap),
      angles
    ),
    placeDistributedRectangles(
      rings,
      program,
      variantId,
      desiredArea,
      seed,
      program.setbackM,
      Math.max(3, program.setbackM * 0.35, openSpaceGap * 0.65),
      angles
    ),
    placeDistributedRectangles(
      rings,
      program,
      variantId,
      desiredArea,
      seed,
      program.setbackM,
      Math.max(3, program.setbackM * 0.35, openSpaceGap * 0.75),
      [0]
    )
  ].filter((value): value is OrientedRectangle[] => Boolean(value));
  const pieces = candidates.sort((left, right) =>
    right.reduce((sum, piece) => sum + piece.width * piece.height, 0) -
    left.reduce((sum, piece) => sum + piece.width * piece.height, 0)
  )[0] ?? null;
  if (!pieces) throw new ConceptMassingError("programme_does_not_fit", "The requested campus blocks do not fit inside this AOI and setback.");
  return pieces.map((piece, index) => ({
    footprint: piece.points,
    role: "campus_block",
    primaryBlock: true,
    levels: levelForPrimary(program, seed, index, pieces.length),
    baseLevels: 0,
    use: useForPrimary(program, index)
  }));
}

function ringIsConcave(ringInput: MetricPoint[]): boolean {
  const ring = openRing(ringInput);
  let sign = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const previous = ring[(index + ring.length - 1) % ring.length];
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    const cross = (current.x - previous.x) * (next.y - current.y) -
      (current.y - previous.y) * (next.x - current.x);
    if (Math.abs(cross) <= GEOMETRY_EPSILON_M) continue;
    const currentSign = Math.sign(cross);
    if (sign !== 0 && currentSign !== sign) return true;
    sign = currentSign;
  }
  return false;
}

function distributeTowerCounts(podiums: OrientedRectangle[], towerCount: number): number[] {
  const totalArea = podiums.reduce((sum, podium) => sum + podium.width * podium.height, 0);
  if (!Number.isFinite(totalArea) || totalArea <= 0) return [];
  const raw = podiums.map((podium) => podium.width * podium.height / totalArea * towerCount);
  const counts = raw.map((value) => Math.max(1, Math.floor(value)));
  while (counts.reduce((sum, count) => sum + count, 0) > towerCount) {
    let candidate = -1;
    for (let index = 0; index < counts.length; index += 1) {
      if (counts[index] <= 1) continue;
      if (candidate === -1 || counts[index] - raw[index] > counts[candidate] - raw[candidate]) candidate = index;
    }
    if (candidate === -1) return [];
    counts[candidate] -= 1;
  }
  while (counts.reduce((sum, count) => sum + count, 0) < towerCount) {
    const candidate = raw.reduce((best, value, index) =>
      value - counts[index] > raw[best] - counts[best] ? index : best, 0);
    counts[candidate] += 1;
  }
  return counts;
}

function planTowersForPodiums(
  podiums: OrientedRectangle[],
  program: ValidatedRedevelopmentProgram,
  variantId: ConceptAlternativeId,
  seed: string
): PlannedVolume[] | null {
  if (podiums.length === 0 || podiums.length > program.blockCount) return null;
  const podiumLevels = Math.max(1, Math.min(4, program.levelsMin - 1));
  const activeUses = normalizedUseSequence(program);
  const podiumUse = activeUses.includes("retail") ? "retail" : activeUses[0] ?? "civic";
  const towerCounts = distributeTowerCounts(podiums, program.blockCount);
  if (towerCounts.length !== podiums.length ||
      towerCounts.some((count) => count < 1) ||
      towerCounts.reduce((sum, count) => sum + count, 0) !== program.blockCount) return null;
  const baseTowerAreaShare = Math.max(0.18, Math.min(0.36, (100 - program.openSpacePct) / 220));
  const areaShares = [baseTowerAreaShare, baseTowerAreaShare * 0.84, 0.18, 0.14];
  const aspectProfiles = variantId === "A"
    ? [[1.25, 1.7], [1.7, 1.25], [2.1, 1.4], [1, 1.6]]
    : [[1.7, 1.25], [1.25, 1.9], [2.2, 1.35], [1.5, 1]];
  const angleProfiles = variantId === "A"
    ? [[0, 0, 0, 0], [-7, 7, -7, 7], [0, 90, 0, 90]]
    : [[8, -8, 8, -8], [0, 0, 0, 0], [90, 0, 90, 0]];
  const placedGroups: OrientedRectangle[][] = [];
  for (let podiumIndex = 0; podiumIndex < podiums.length; podiumIndex += 1) {
    const podium = podiums[podiumIndex];
    const count = towerCounts[podiumIndex];
    const towerProgram: ValidatedRedevelopmentProgram = { ...program, blockCount: count, targetSiteCoveragePct: 32 };
    const minimumDimension = Math.min(podium.width, podium.height);
    const internalSetback = Math.max(2, Math.min(5, minimumDimension * 0.055));
    const gapM = Math.max(2.5, Math.min(5, minimumDimension * 0.06));
    let placed: OrientedRectangle[] | null = null;
    for (const areaShare of areaShares) {
      for (let profileIndex = 0; profileIndex < aspectProfiles.length && !placed; profileIndex += 1) {
        for (const angles of angleProfiles) {
          placed = placeDistributedRectangles(
            [podium.points],
            towerProgram,
            variantId,
            podium.width * podium.height * areaShare,
            `${seed}:podium:${podiumIndex}`,
            internalSetback,
            gapM,
            angles,
            {
              aspectRatios: aspectProfiles[profileIndex],
              gridDivisions: 24
            }
          );
          if (placed) break;
        }
      }
      if (placed) break;
    }
    if (!placed || placed.length !== count) return null;
    placedGroups.push(placed);
  }
  const podiumVolumes: PlannedVolume[] = podiums.map((podium) => ({
    footprint: podium.points,
    role: "podium",
    primaryBlock: false,
    levels: podiumLevels,
    baseLevels: 0,
    use: podiumUse
  }));
  let towerIndex = 0;
  const towerVolumes: PlannedVolume[] = [];
  for (let podiumIndex = 0; podiumIndex < placedGroups.length; podiumIndex += 1) {
    for (const tower of placedGroups[podiumIndex]) {
      towerVolumes.push({
        footprint: tower.points,
        role: "tower",
        primaryBlock: true,
        levels: levelForPrimary(program, seed, towerIndex, program.blockCount),
        baseLevels: podiumLevels,
        use: useForPrimary(program, towerIndex),
        supportingPodiumIndex: podiumIndex
      });
      towerIndex += 1;
    }
  }
  return [...podiumVolumes, ...towerVolumes];
}

function tryMultiplePodiumPlan(
  rings: MetricPoint[][],
  program: ValidatedRedevelopmentProgram,
  variantId: ConceptAlternativeId,
  seed: string,
  desiredArea: number
): PlannedVolume[] | null {
  const countOrder = variantId === "A" ? [2, 3] : [3, 2];
  const targetPattern = variantId === "A"
    ? [[0.68, 0.2], [0.2, 0.68], [0.8, 0.68], [0.5, 0.82]] as Array<[number, number]>
    : [[0.32, 0.2], [0.8, 0.68], [0.2, 0.68], [0.5, 0.82]] as Array<[number, number]>;
  const profiles = [
    { aspects: [2.2], offsets: [0, 90, 90] },
    { aspects: [2.8, 2.2], offsets: [0, 90, 90] },
    { aspects: [1.75], offsets: [0, 90, 90] },
    { aspects: [3.5, 2.4, 2.4], offsets: [0, 90, 90] }
  ];
  for (const podiumCount of countOrder) {
    if (podiumCount > program.blockCount) continue;
    const podiumProgram: ValidatedRedevelopmentProgram = {
      ...program,
      blockCount: podiumCount,
      targetSiteCoveragePct: program.targetSiteCoveragePct
    };
    for (const profile of profiles) {
      const podiums = placeDistributedRectangles(
        rings,
        podiumProgram,
        variantId,
        desiredArea,
        `${seed}:split:${podiumCount}`,
        program.setbackM,
        Math.max(0.75, program.setbackM * 0.08),
        profile.offsets,
        {
          aspectRatios: profile.aspects,
          areaFactors: [1],
          gridDivisions: 40,
          scaleSteps: [10],
          targetFractions: targetPattern
        }
      );
      if (!podiums) continue;
      const volumes = planTowersForPodiums(podiums, program, variantId, seed);
      if (volumes) return volumes;
    }
  }
  return null;
}

function planTowersOnPodium(
  rings: MetricPoint[][],
  program: ValidatedRedevelopmentProgram,
  variantId: ConceptAlternativeId,
  seed: string,
  desiredArea: number
): PlannedVolume[] {
  if (program.levelsMin < 2) {
    throw new ConceptMassingError("tower_height_incompatible", "Towers on a podium require primary heights of at least two levels.");
  }
  const aspects = variantId === "A"
    ? [1.45, 1, 1.9, 2.8, 4, 6, 8]
    : [1.45, 1.9, 1, 3.5, 2.6, 5, 8];
  const angles = adaptivePodiumAngles(rings[0], variantId);
  const concave = ringIsConcave(rings[0]);
  let deferredSinglePodium: PlannedVolume[] | null = null;
  for (const angle of angles) {
    for (const aspect of aspects) {
      const maximum = findLargestEnvelope(rings, aspect, angle, program.setbackM, variantId, 14, 18);
      if (!maximum) continue;
      const maximumArea = maximum.width * maximum.height;
      if (maximumArea + 0.1 < desiredArea) continue;
      const podium = scaleRectangle(maximum, Math.sqrt(desiredArea / maximumArea));
      if (!polygonInsideAoi(podium.points, rings, program.setbackM)) continue;
      const volumes = planTowersForPodiums([podium], program, variantId, seed);
      if (!volumes) continue;
      // A near-capacity rectangle on one concave arm is valid but spatially brittle; prefer a
      // split layout when the same bounded search can use the site's disjoint buildable arms.
      const tightlyConsumesOneConcaveArm = concave && desiredArea / maximumArea > 0.86;
      if (!tightlyConsumesOneConcaveArm) return volumes;
      deferredSinglePodium ??= volumes;
    }
  }
  if (deferredSinglePodium && openRing(rings[0]).length > 12) return deferredSinglePodium;
  const multiplePodiums = tryMultiplePodiumPlan(rings, program, variantId, seed, desiredArea);
  if (multiplePodiums) return multiplePodiums;
  if (deferredSinglePodium) return deferredSinglePodium;
  throw new ConceptMassingError(
    "programme_does_not_fit",
    "The bounded podium-layout search could not produce the requested coverage and tower count inside this AOI and setback."
  );
}

function geoJsonRingToMetric(ring: Point[], forward: (point: Point) => MetricPoint): MetricPoint[] {
  return openRing(ring).map(forward);
}

function primaryVolumes(features: Array<Feature<Polygon, ConceptMassingProperties>>) {
  return features.filter((feature) => feature.properties.primaryBlock);
}

export function validateConceptMassingGeometry(
  aoiCoordinates: Point[][],
  program: ValidatedRedevelopmentProgram,
  result: ConceptMassingResult
): string[] {
  const outer = aoiCoordinates[0];
  if (!outer) return ["AOI exterior ring is required."];
  if (aoiCoordinates.length !== 1) {
    return ["Create prototype AOI supports exactly one exterior ring and does not support interior or additional rings."];
  }
  const projection = metricProjection(outer);
  const rings = aoiCoordinates.map((ring) => geoJsonRingToMetric(ring, projection.forward));
  const errors: string[] = [];
  const ids = new Set<string>();
  const maximumFeatureCount = program.massingStyle === "towers_on_podium"
    ? MAX_CONCEPT_BLOCKS * 2
    : MAX_CONCEPT_BLOCKS;
  if (result.featureCollection.features.length > maximumFeatureCount) {
    errors.push("Concept feature count exceeds the bounded prototype limit.");
  }
  const projected = result.featureCollection.features.map((feature) => {
    const properties = feature.properties;
    if (ids.has(properties.id)) errors.push("Concept feature IDs must be unique.");
    ids.add(properties.id);
    if (!Number.isFinite(properties.baseM) || !Number.isFinite(properties.heightM) || properties.baseM < 0 || properties.heightM <= properties.baseM) {
      errors.push(`Concept feature ${properties.id} has invalid vertical bounds.`);
    }
    if (!Number.isInteger(properties.levels) || properties.levels < 1) errors.push(`Concept feature ${properties.id} has invalid levels.`);
    const expectedHeightM = Number((properties.levels * FLOOR_HEIGHT_M).toFixed(1));
    if (!Number.isFinite(properties.heightM) || Math.abs(properties.heightM - expectedHeightM) > 0.05) {
      errors.push(`Concept feature ${properties.id} height must equal its absolute level count.`);
    }
    if (properties.volumeRole !== "tower" && (!Number.isFinite(properties.baseM) || Math.abs(properties.baseM) > 0.05)) {
      errors.push(`Concept feature ${properties.id} must start at site datum for its volume role.`);
    }
    if (properties.primaryBlock !== (properties.volumeRole !== "podium")) {
      errors.push(`Concept feature ${properties.id} has inconsistent primary-block semantics for its volume role.`);
    }
    const ring = feature.geometry.coordinates[0] as Point[];
    if (feature.id !== properties.id || properties.massingStyle !== result.massingStyle || properties.variantId !== result.variantId) {
      errors.push(`Concept feature ${properties.id} has inconsistent identity metadata.`);
    }
    if (!ring.length || ring.some((point) => !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
      point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90) ||
      ring[0][0] !== ring.at(-1)?.[0] || ring[0][1] !== ring.at(-1)?.[1]) {
      errors.push(`Concept feature ${properties.id} has an invalid polygon ring.`);
    }
    const footprint = geoJsonRingToMetric(ring, projection.forward);
    if (metricPolygonArea(footprint) <= 1) errors.push(`Concept feature ${properties.id} has a degenerate footprint.`);
    if (!polygonInsideAoi(footprint, rings, Math.max(0, program.setbackM - 0.25))) {
      errors.push(`Concept feature ${properties.id} does not respect the AOI setback.`);
    }
    return { feature, footprint };
  });
  const podiums = projected.filter((item) => item.feature.properties.volumeRole === "podium");
  const towers = projected.filter((item) => item.feature.properties.volumeRole === "tower");
  const podiumById = new Map(podiums.map((item) => [item.feature.properties.id, item]));
  const supportByTowerId = new Map<string, (typeof podiums)[number]>();
  const supportedTowerCounts = new Map(podiums.map((item) => [item.feature.properties.id, 0]));
  for (const item of projected) {
    const supportId = item.feature.properties.supportingPodiumId;
    if (item.feature.properties.volumeRole !== "tower") {
      if (supportId !== undefined && supportId !== null) {
        errors.push(`Concept feature ${item.feature.properties.id} must not declare podium support.`);
      }
      continue;
    }
    const support = typeof supportId === "string"
      ? podiumById.get(supportId)
      : podiums.length === 1 ? podiums[0] : undefined;
    if (!support) {
      errors.push(`Tower ${item.feature.properties.id} must reference one valid supporting podium.`);
      continue;
    }
    supportByTowerId.set(item.feature.properties.id, support);
    supportedTowerCounts.set(support.feature.properties.id,
      (supportedTowerCounts.get(support.feature.properties.id) ?? 0) + 1);
    if (!item.footprint.every((point) => pointInRing(point, support.footprint, true)) ||
      Math.abs(item.feature.properties.baseM - support.feature.properties.heightM) > 0.05) {
      errors.push(`Tower ${item.feature.properties.id} must sit inside and directly above its supporting podium.`);
    }
  }
  for (let leftIndex = 0; leftIndex < projected.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < projected.length; rightIndex += 1) {
      const left = projected[leftIndex];
      const right = projected[rightIndex];
      const podiumItem = left.feature.properties.volumeRole === "podium" ? left
        : right.feature.properties.volumeRole === "podium" ? right : null;
      const towerItem = left.feature.properties.volumeRole === "tower" ? left
        : right.feature.properties.volumeRole === "tower" ? right : null;
      const linkedSupportPair = Boolean(podiumItem && towerItem &&
        supportByTowerId.get(towerItem.feature.properties.id) === podiumItem);
      if (!linkedSupportPair && polygonsOverlap(left.footprint, right.footprint)) {
        errors.push(`Concept footprints ${left.feature.properties.id} and ${right.feature.properties.id} overlap.`);
      }
    }
  }
  const primary = primaryVolumes(result.featureCollection.features);
  if (primary.length !== program.blockCount || result.generatedBlockCount !== program.blockCount) {
    errors.push("Generated primary block count does not match the requested control.");
  }
  if (result.generatedFeatureCount !== result.featureCollection.features.length) errors.push("Generated feature count is inconsistent.");
  if (primary.some((feature) => feature.properties.levels < program.levelsMin || feature.properties.levels > program.levelsMax)) {
    errors.push("A primary volume violates the requested level range.");
  }
  if (program.levelsMin === program.levelsMax && primary.some((feature) => feature.properties.levels !== program.levelsMin)) {
    errors.push("Fixed primary height was not preserved.");
  }
  const projectedPrimary = projected.filter((item) => item.feature.properties.primaryBlock);
  const measuredGroundArea = program.massingStyle === "towers_on_podium"
    ? podiums.reduce((sum, item) => sum + metricPolygonArea(item.footprint), 0)
    : projectedPrimary.reduce((sum, item) => sum + metricPolygonArea(item.footprint), 0);
  const measuredFloorArea = projected.reduce((sum, item) =>
    sum + metricPolygonArea(item.footprint) *
      (item.feature.properties.heightM - item.feature.properties.baseM) / FLOOR_HEIGHT_M, 0);
  const measuredCoverage = Number((measuredGroundArea / result.aoiAreaSqM * 100).toFixed(1));
  if (Math.abs(measuredGroundArea - result.generatedFootprintAreaSqM) > 0.6 ||
      Math.abs(measuredCoverage - result.achievedSiteCoveragePct) > 0.1) {
    errors.push("Ground-footprint or site-coverage metrics are inconsistent with geometry.");
  }
  if (Math.abs(measuredFloorArea - result.estimatedFloorAreaSqM) > 1) {
    errors.push("Modelled floor-area metric is inconsistent with vertical geometry.");
  }
  if (projectedPrimary.length > 0) {
    const primaryLevels = projectedPrimary.map((item) => item.feature.properties.levels);
    if (Math.min(...primaryLevels) !== result.minGeneratedLevels || Math.max(...primaryLevels) !== result.maxGeneratedLevels) {
      errors.push("Generated level-range metrics are inconsistent.");
    }
  }
  if (program.massingStyle === "courtyard") {
    const wings = projected.filter((item) => item.feature.properties.volumeRole === "courtyard_wing");
    if (wings.length < 4) errors.push("Courtyard geometry requires at least four physical wings.");
    const center = centroidOfPoints(rings[0]);
    if (wings.some((wing) => pointInRing(center, wing.footprint, true))) errors.push("Courtyard geometry must preserve an unbuilt central void.");
  }
  if (program.massingStyle === "towers_on_podium") {
    if (podiums.length === 0) errors.push("Tower geometry requires at least one physical podium feature.");
    if (podiums.length > program.blockCount) errors.push("Tower geometry cannot contain more podiums than towers.");
    if (towers.length !== program.blockCount) {
      errors.push("Tower count does not match the requested control.");
    }
    if (projected.some((item) => item.feature.properties.volumeRole !== "podium" && item.feature.properties.volumeRole !== "tower")) {
      errors.push("Tower geometry may contain only podium and tower volume roles.");
    }
    for (const podium of podiums) {
      if ((supportedTowerCounts.get(podium.feature.properties.id) ?? 0) === 0) {
        errors.push(`Podium ${podium.feature.properties.id} must support at least one tower.`);
      }
    }
  }
  return [...new Set(errors)];
}

function buildMassingResult(
  aoiCoordinates: Point[][],
  program: ValidatedRedevelopmentProgram,
  seed: string,
  variantId: ConceptAlternativeId,
  volumes: PlannedVolume[],
  aoiAreaSqM: number,
  inverse: (point: MetricPoint) => Point
): ConceptMassingResult {
  const features = volumes.map((volume, index) => featureFromVolume(volume, index, program, variantId, inverse));
  const groundFootprintArea = program.massingStyle === "towers_on_podium"
    ? volumes.filter((volume) => volume.role === "podium")
      .reduce((sum, volume) => sum + metricPolygonArea(volume.footprint), 0)
    : volumes.filter((volume) => volume.primaryBlock).reduce((sum, volume) => sum + metricPolygonArea(volume.footprint), 0);
  const estimatedFloorArea = volumes.reduce((sum, volume) =>
    sum + metricPolygonArea(volume.footprint) * Math.max(0, volume.levels - volume.baseLevels), 0);
  const primary = volumes.filter((volume) => volume.primaryBlock);
  const result: ConceptMassingResult = {
    featureCollection: { type: "FeatureCollection", features },
    variantId,
    massingStyle: program.massingStyle,
    requestedBlockCount: program.blockCount,
    generatedBlockCount: primary.length,
    generatedFeatureCount: features.length,
    aoiAreaSqM,
    generatedFootprintAreaSqM: Number(groundFootprintArea.toFixed(1)),
    achievedSiteCoveragePct: Number((groundFootprintArea / aoiAreaSqM * 100).toFixed(1)),
    estimatedFloorAreaSqM: Number(estimatedFloorArea.toFixed(1)),
    minGeneratedLevels: Math.min(...primary.map((volume) => volume.levels)),
    maxGeneratedLevels: Math.max(...primary.map((volume) => volume.levels)),
    seed
  };
  if (Math.abs(result.achievedSiteCoveragePct - program.targetSiteCoveragePct) > 1) {
    throw new ConceptMassingError(
      "programme_does_not_fit",
      "The bounded geometry search exhausted its valid layouts before it could fit the requested site coverage inside this AOI and setback."
    );
  }
  const errors = validateConceptMassingGeometry(aoiCoordinates, program, result);
  if (errors.length) throw new ConceptMassingError("geometry_validation_failed", errors.join(" "));
  return result;
}

export function generateConceptMassing(
  aoiCoordinates: Point[][],
  program: ValidatedRedevelopmentProgram,
  seed: string | undefined = undefined,
  variantId: ConceptAlternativeId = "A"
): ConceptMassingResult {
  const outer = aoiCoordinates[0];
  if (!outer) throw new Error("AOI exterior ring is required.");
  if (aoiCoordinates.length !== 1) {
    throw new Error("Create prototype AOI supports exactly one exterior ring and does not support interior or additional rings.");
  }
  const openOuter = outer.length > 1 && outer[0][0] === outer[outer.length - 1][0] && outer[0][1] === outer[outer.length - 1][1]
    ? outer.slice(0, -1)
    : outer;
  const validation = validatePolygonVertices(openOuter);
  if (!validation.valid || !validation.measurements) throw new Error(validation.message);
  if (validation.measurements.areaSqM > 1_000_000) throw new Error("Create prototype AOI must not exceed 1 sq km.");
  if (openOuter.length > 25) throw new Error("Create prototype AOI must not exceed 25 exterior vertices.");

  const projection = metricProjection(outer);
  const rings = aoiCoordinates.map((ring) => geoJsonRingToMetric(ring, projection.forward));
  const desiredTotalArea = validation.measurements.areaSqM * program.targetSiteCoveragePct / 100;
  const geometrySeed = seed ?? JSON.stringify({
    aoiCoordinates,
    templateId: program.templateId,
    massingStyle: program.massingStyle,
    blockCount: program.blockCount,
    levelsMin: program.levelsMin,
    levelsMax: program.levelsMax,
    targetSiteCoveragePct: program.targetSiteCoveragePct,
    openSpacePct: program.openSpacePct,
    setbackM: program.setbackM,
    useMix: program.useMix
  });
  const variantSeed = `${geometrySeed}:${variantId}`;
  const volumes = program.massingStyle === "perimeter" || program.massingStyle === "courtyard"
    ? planPerimeterOrCourtyard(rings, program, variantId, variantSeed, desiredTotalArea)
    : program.massingStyle === "towers_on_podium"
      ? planTowersOnPodium(rings, program, variantId, variantSeed, desiredTotalArea)
      : planCampus(rings, program, variantId, variantSeed, desiredTotalArea);
  return buildMassingResult(
    aoiCoordinates,
    program,
    variantSeed,
    variantId,
    volumes,
    validation.measurements.areaSqM,
    projection.inverse
  );
}

function conceptGeometrySignature(result: ConceptMassingResult): string {
  return JSON.stringify(result.featureCollection.features.map((feature) => ({
    coordinates: feature.geometry.coordinates,
    baseM: feature.properties.baseM,
    heightM: feature.properties.heightM,
    role: feature.properties.volumeRole
  })));
}

function conceptFootprintSignature(result: ConceptMassingResult): string {
  return JSON.stringify(result.featureCollection.features.map((feature) => feature.geometry.coordinates));
}

function reflectValidatedAlternativeAcrossAoiCenter(
  aoiCoordinates: Point[][],
  program: ValidatedRedevelopmentProgram,
  source: ConceptMassingResult
): ConceptMassingResult {
  const outer = aoiCoordinates[0];
  if (!outer || aoiCoordinates.length !== 1) {
    throw new ConceptMassingError("geometry_validation_failed", "A single exterior AOI ring is required for symmetry fallback.");
  }
  const projection = metricProjection(outer);
  const center = centroidOfPoints(geoJsonRingToMetric(outer, projection.forward));
  const sourceIndexById = new Map(source.featureCollection.features.map((feature, index) => [feature.properties.id, index]));
  const sourcePodiumIndices = source.featureCollection.features
    .map((feature, index) => feature.properties.volumeRole === "podium" ? index : -1)
    .filter((index) => index >= 0);
  const volumes: PlannedVolume[] = source.featureCollection.features.map((feature) => {
    const explicitSupportIndex = typeof feature.properties.supportingPodiumId === "string"
      ? sourceIndexById.get(feature.properties.supportingPodiumId)
      : undefined;
    const supportingPodiumIndex = feature.properties.volumeRole === "tower"
      ? explicitSupportIndex ?? (sourcePodiumIndices.length === 1 ? sourcePodiumIndices[0] : undefined)
      : undefined;
    return {
      footprint: geoJsonRingToMetric(feature.geometry.coordinates[0] as Point[], projection.forward).map((point) => ({
        x: 2 * center.x - point.x,
        y: 2 * center.y - point.y
      })),
      role: feature.properties.volumeRole,
      primaryBlock: feature.properties.primaryBlock,
      levels: feature.properties.levels,
      baseLevels: Math.round(feature.properties.baseM / FLOOR_HEIGHT_M),
      use: feature.properties.use,
      supportingPodiumIndex
    };
  });
  return buildMassingResult(
    aoiCoordinates,
    program,
    `${source.seed}:central-reflection:B`,
    "B",
    volumes,
    source.aoiAreaSqM,
    projection.inverse
  );
}

export function generateConceptMassingAlternatives(
  aoiCoordinates: Point[][],
  program: ValidatedRedevelopmentProgram,
  seed: string | undefined = undefined,
  locale: ConceptLocale = "en"
): ConceptMassingAlternative[] {
  const alternatives: ConceptMassingAlternative[] = [];
  let firstError: unknown = null;
  for (const id of ["A", "B"] as const) {
    try {
      const massing = generateConceptMassing(aoiCoordinates, program, seed, id);
      const geometrySignature = conceptGeometrySignature(massing);
      const duplicatesExisting = alternatives.some((alternative) =>
        conceptGeometrySignature(alternative.massing) === geometrySignature);
      if (!duplicatesExisting) {
        alternatives.push({
          id,
          label: locale === "ru" ? `Вариант ${id}` : `Alternative ${id}`,
          massing
        });
      }
    } catch (error) {
      firstError ??= error;
      const sourceA = id === "B" ? alternatives.find((alternative) => alternative.id === "A") : null;
      if (sourceA) {
        try {
          const reflected = reflectValidatedAlternativeAcrossAoiCenter(aoiCoordinates, program, sourceA.massing);
          const hasDistinctFootprints = conceptFootprintSignature(reflected) !== conceptFootprintSignature(sourceA.massing);
          const duplicatesExisting = alternatives.some((alternative) =>
            conceptGeometrySignature(alternative.massing) === conceptGeometrySignature(reflected));
          if (hasDistinctFootprints && !duplicatesExisting) {
            alternatives.push({
              id: "B",
              label: locale === "ru" ? "Вариант B" : "Alternative B",
              massing: reflected
            });
          }
        } catch {
          // A non-symmetric or concave AOI may invalidate the transform; keep the one-valid-alternative fallback.
        }
      }
    }
  }
  if (alternatives.length === 0) {
    if (firstError instanceof Error) throw firstError;
    throw new ConceptMassingError("programme_does_not_fit", "No valid concept alternative fits inside this AOI.");
  }
  return alternatives;
}
