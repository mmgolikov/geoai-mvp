import { DEVKIT_CAVEAT, type DevkitProject, type DesignVersion } from "./contracts";
import { validatePointObjectCreateAoiVertices, validateRedevelopmentProgram, type RedevelopmentProgramInput } from "../prototype/point-to-object-create";

/** Synthetic seed only: no acquired source, generated scene or financial proof. */
export function createDevkitDemoProject(id = "devkit-synthetic-uae"): DevkitProject {
  const createdAt = "2026-10-22T14:30:00.000Z";
  const ring: [number, number][] = [[55.27, 25.2], [55.272, 25.2], [55.272, 25.202], [55.27, 25.202]];
  const validation = validatePointObjectCreateAoiVertices(ring);
  if (!validation.ok) throw new Error("Synthetic Devkit AOI is invalid");
  const aoi = { id: "create-aoi-devkit-synthetic", revision: 1, crs: "EPSG:4326" as const,
    provenance: "synthetic" as const, coordinates: [[...ring, ring[0]]], vertexCount: ring.length,
    areaSqM: validation.measurements.areaSqM, perimeterM: validation.measurements.perimeterM };
  const programA: RedevelopmentProgramInput = {
    templateId: "residential_mixed_use", title: "A · residential-led seed", summary: "Synthetic programme; geometry still to be generated.",
    massingStyle: "courtyard", blockCount: 4, levelsMin: 4, levelsMax: 8, targetSiteCoveragePct: 30,
    openSpacePct: 40, setbackM: 8, useMix: [{ use: "residential", sharePct: 50 }, { use: "retail", sharePct: 10 }, { use: "open_space", sharePct: 40 }],
    rationale: ["Illustrative programme, not a planning or demand conclusion."]
  };
  const programB: RedevelopmentProgramInput = {
    templateId: "commercial_hub", title: "B · office-led seed", summary: "A distinct synthetic alternative; not an acquired market finding.",
    massingStyle: "campus", blockCount: 3, levelsMin: 3, levelsMax: 6, targetSiteCoveragePct: 40,
    openSpacePct: 30, setbackM: 10, useMix: [{ use: "office", sharePct: 55 }, { use: "retail", sharePct: 15 }, { use: "open_space", sharePct: 30 }],
    rationale: ["Different mix, massing, heights and coverage for controlled comparison."]
  };
  for (const program of [programA, programB]) {
    const valid = validateRedevelopmentProgram(program);
    if (!valid.ok) throw new Error(`Synthetic Devkit programme is invalid: ${valid.errors.join("; ")}`);
  }
  const design = (variant: "A" | "B", program: RedevelopmentProgramInput): DesignVersion => ({
    id: `design-${variant.toLowerCase()}`, revision: 1, scenarioId: variant, label: program.title, createdAt,
    inputRevision: 1, aoiId: aoi.id, aoiRevision: 1, program, buildings: [], retainedObjectIds: [],
    exclusionConstraintIds: [], assumptions: ["Synthetic programme seed; no scene acceptance."], status: "draft"
  });
  return {
    schemaVersion: 1, id, revision: 0, inputRevision: 1, createdAt, updatedAt: createdAt,
    storageMode: "browser_local_on_this_device", dataClass: "synthetic_demo",
    brief: { title: "Synthetic UAE development screening", objective: "Compare two conditional development programmes",
      marketKey: "dubai", locale: "en", strategy: "Controlled concept comparison",
      budget: { amount: null, currency: "AED", includesLand: null }, requirements: ["Preserve explicit unknowns"],
      assumptions: ["No client data; no official parcel, title or development right is asserted."] },
    aoi, objects: [],
    evidence: [{ id: "evidence-synthetic-brief", subjectId: aoi.id, label: "Synthetic demonstration input",
      sourceId: "devkit-synthetic-fixture-v1", sourceUrl: null, excerpt: "Illustrative programme, not observed conditions.",
      acquiredAt: null, validAt: null, responseHash: null, trust: "synthetic", status: "available",
      rights: { licence: "synthetic-demo", attribution: "GeoAI synthetic demonstration", permittedUse: "synthetic_demo", redistribution: "allowed" } }],
    claims: [{ id: "claim-planning-unknown", subjectId: aoi.id, field: "permitted_development", value: null,
      unit: null, status: "unknown", evidenceIds: [], explanation: "Official validation is required; no planning document is supplied." }],
    constraints: [], scenarios: [{ id: "A", label: "Residential-led", objective: "Test a residential-led assumption" },
      { id: "B", label: "Office-led", objective: "Test a distinct office-led assumption" }],
    designVersions: [design("A", programA), design("B", programB)], activeDesignVersionId: "design-a",
    derivedArtifacts: [], procedures: [], caveat: DEVKIT_CAVEAT
  };
}

export function createDevkitCriticalGapProject(): DevkitProject {
  const project = createDevkitDemoProject("devkit-synthetic-critical-gap");
  project.brief.title = "Synthetic source failure / critical gap";
  project.evidence[0] = { ...project.evidence[0], status: "unavailable", trust: "unavailable",
    excerpt: null, rights: { licence: null, attribution: "Source unavailable; rights unverified", permittedUse: "unknown", redistribution: "unknown" } };
  project.constraints = [{ id: "constraint-missing-site-document", subjectId: project.aoi!.id,
    label: "Critical site evidence unavailable", status: "unknown", severity: "critical", geometry: null,
    evidenceIds: [project.evidence[0].id], impact: "Any programme remains an unvalidated hypothesis.",
    nextAction: "Obtain the applicable site/planning documents through an authorized path." }];
  return project;
}
