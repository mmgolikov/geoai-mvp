import { DEVKIT_CAVEAT, type DevkitProject, type DesignVersion } from "./contracts";
import { conceptSiteDefaults, conceptTemplate, validatePointObjectCreateAoiVertices, type PointObjectCreateAoi } from "../prototype/point-to-object-create";
import { parseSavedPointObjectArtifact, type SavedPointObjectProject } from "../prototype/point-object-projects-contract";
import type { PointObjectLocale, PointObjectMarketKey } from "../prototype/point-to-object-markets";

export type DevkitBridgeResult =
  | { ok: true; project: DevkitProject; sourceArtifactId: string; sourcePayloadHash: string }
  | { ok: false; code: "confirmation_required" | "missing_artifact" | "invalid_aoi" | "invalid_identity"; message: string };

/** AOI transfer is explicit and read-only. The caller must first use the existing
 * owner-scoped readVerifiedPointObjectProjects() and discard results after an
 * identity change. This adapter does not migrate/overwrite legacy saves, refresh
 * sources, import paid output or turn a drawn AOI into a legal parcel. */
export function bridgeSavedCreateAoi(input: {
  sourceProject: SavedPointObjectProject;
  sourceArtifactId: string;
  publicInputConfirmed: boolean;
  projectId: string;
  now: string;
  locale: PointObjectLocale;
}): DevkitBridgeResult {
  if (input.publicInputConfirmed !== true) return { ok: false, code: "confirmation_required", message: "Confirm that this input is public and non-confidential before copying it." };
  if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(input.projectId) || !Number.isFinite(Date.parse(input.now))) {
    return { ok: false, code: "invalid_identity", message: "The new project identity or date is invalid." };
  }
  const source = input.sourceProject.artifacts.find((item) => item.artifactId === input.sourceArtifactId);
  const artifact = parseSavedPointObjectArtifact(source);
  if (!artifact || artifact.kind !== "create") return { ok: false, code: "missing_artifact", message: "The selected saved Create result is unavailable or invalid." };
  const original = artifact.payload.aoi;
  const ring = original.coordinates[0];
  if (original.coordinates.length !== 1 || !ring || ring.length < 4) return { ok: false, code: "invalid_aoi", message: "The saved area is not supported." };
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const vertices = closed ? ring.slice(0, -1) : ring;
  const checked = validatePointObjectCreateAoiVertices(vertices);
  if (!checked.ok) return { ok: false, code: "invalid_aoi", message: checked.message };
  const aoi: PointObjectCreateAoi = {
    id: original.id,
    coordinates: structuredClone(original.coordinates),
    areaSqM: checked.measurements.areaSqM,
    perimeterM: checked.measurements.perimeterM,
    vertexCount: vertices.length
  };
  const project = createDevkitProjectForAoi({
    id: input.projectId, aoi, marketKey: artifact.marketKey, locale: input.locale,
    title: input.sourceProject.name, now: input.now
  });
  project.evidence = [{
    id: "input-drawn-aoi", subjectId: aoi.id,
    label: input.locale === "ru" ? "Контур из сохранённого проекта" : "Area from a saved project",
    sourceId: `local-create:${artifact.artifactId}`, sourceUrl: null,
    excerpt: input.locale === "ru" ? "Скопирован только пользовательский контур. Исходный результат и источники не изменены." : "Only the user-drawn area was copied. The original result and sources are unchanged.",
    acquiredAt: null, validAt: null, responseHash: artifact.payloadHash,
    trust: "user_provided", status: "available",
    rights: { licence: null, attribution: "User-confirmed public input; no official parcel claim", permittedUse: "public_demo", redistribution: "unknown" }
  }];
  return { ok: true, project, sourceArtifactId: artifact.artifactId, sourcePayloadHash: artifact.payloadHash };
}

/** Two editable programme seeds, not generated geometry or acquired market facts. */
export function createDevkitProjectForAoi(input: {
  id: string; aoi: PointObjectCreateAoi; marketKey: PointObjectMarketKey;
  locale: PointObjectLocale; title: string; now: string;
}): DevkitProject {
  const ru = input.locale === "ru";
  const aoi = { ...structuredClone(input.aoi), revision: 1, crs: "EPSG:4326" as const, provenance: "user_provided" as const };
  const programA = conceptSiteDefaults(conceptTemplate("residential_mixed_use", input.locale), aoi.coordinates);
  const programB = conceptSiteDefaults(conceptTemplate("civic_green", input.locale), aoi.coordinates);
  const seed = (variant: "A" | "B", program: typeof programA): DesignVersion => ({
    id: `design-${variant.toLowerCase()}`, revision: 1, scenarioId: variant,
    label: `${variant} · ${program.title}`, createdAt: input.now,
    inputRevision: 1, aoiId: aoi.id, aoiRevision: 1, program,
    buildings: [], retainedObjectIds: [], exclusionConstraintIds: [],
    assumptions: [ru ? "Программа — редактируемая гипотеза, геометрия ещё не построена." : "The programme is an editable hypothesis; geometry has not been generated."],
    status: "draft"
  });
  return {
    schemaVersion: 1, id: input.id, revision: 0, inputRevision: 1,
    createdAt: input.now, updatedAt: input.now, storageMode: "browser_local_on_this_device", dataClass: "public_demo",
    brief: {
      title: input.title.slice(0, 200), objective: ru ? "Сравнить варианты развития выбранной территории" : "Compare development scenarios for the selected area",
      marketKey: input.marketKey, locale: input.locale, strategy: ru ? "Предварительная оценка" : "Development screening",
      budget: { amount: null, currency: input.marketKey === "moscow" ? "RUB" : input.marketKey === "dubai" || input.marketKey === "abu_dhabi" ? "AED" : "USD", includesLand: null },
      requirements: [], assumptions: [ru ? "Контур пользователя не подтверждает границы участка, права или допустимость строительства." : "A user-drawn area does not establish parcel boundaries, rights or permission to develop."]
    },
    aoi, objects: [], evidence: [],
    claims: [{ id: "planning-status", subjectId: aoi.id, field: "permitted_development", value: null, unit: null, status: "unknown", evidenceIds: [], explanation: ru ? "Документы о допустимом использовании не представлены." : "Permitted-use documents have not been supplied." }],
    constraints: [],
    scenarios: [{ id: "A", label: ru ? "Жилой квартал" : "Residential quarter", objective: programA.summary }, { id: "B", label: ru ? "Общественный кампус" : "Public campus", objective: programB.summary }],
    designVersions: [seed("A", programA), seed("B", programB)], activeDesignVersionId: "design-a",
    derivedArtifacts: [], procedures: [], caveat: DEVKIT_CAVEAT
  };
}
