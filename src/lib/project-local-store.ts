import type { GeoAIProject, ProjectClientType, ProjectInput } from "@/src/lib/db/types";
import type { ExploreAudience, ExploreRole, ExploreScenarioId } from "@/src/lib/explore/types";

export const localProjectsStorageKey = "geoai-local-projects-v1";

export type LocalProjectInput = {
  name: string;
  audience: ExploreAudience;
  role: ExploreRole;
  scenarioId?: ExploreScenarioId | string;
  geography?: string;
};

function slugifyProjectName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 56);

  return slug || "pilot-project";
}

export function projectClientTypeFromRole(role: ExploreRole, audience: ExploreAudience): ProjectClientType {
  if (audience === "b2c") {
    return "demo";
  }

  if (role === "developer") return "developer";
  if (role === "bank_lender") return "bank";
  if (role === "government_urban_authority") return "government";
  if (role === "family_office") return "family_office";
  if (role === "real_estate_fund" || role === "asset_manager") return "fund";

  return "demo";
}

export function createLocalProject(input: LocalProjectInput): GeoAIProject {
  const timestamp = new Date().toISOString();
  const baseKey = slugifyProjectName(input.name);

  return {
    id: null,
    projectKey: `${baseKey}-${Date.now().toString(36)}`,
    name: input.name.trim(),
    description: `${input.audience.toUpperCase()} pilot screening workspace for ${input.geography?.trim() || "Dubai / UAE"}.`,
    geography: input.geography?.trim() || "Dubai / UAE",
    clientType: projectClientTypeFromRole(input.role, input.audience),
    primaryScenario: input.scenarioId ?? "investmentSiteSelection",
    status: "active",
    dataMode: "sample_open_context",
    metadata: {
      audience: input.audience,
      role: input.role,
      createdLocally: true,
      caveat: "Screening hypothesis; official validation required."
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function projectToInput(project: GeoAIProject): ProjectInput {
  return {
    projectKey: project.projectKey,
    name: project.name,
    description: project.description,
    geography: project.geography,
    clientType: project.clientType,
    primaryScenario: project.primaryScenario,
    status: project.status,
    dataMode: project.dataMode,
    metadata: project.metadata
  };
}

export function readLocalProjects() {
  if (typeof window === "undefined") {
    return [] as GeoAIProject[];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(localProjectsStorageKey) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((project): project is GeoAIProject =>
      typeof project === "object" &&
      project !== null &&
      typeof project.projectKey === "string" &&
      typeof project.name === "string"
    );
  } catch {
    return [];
  }
}

export function writeLocalProjects(projects: GeoAIProject[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(localProjectsStorageKey, JSON.stringify(projects));
  } catch {
    // Browser storage is optional; the in-memory project still works for this session.
  }
}

export function mergeProjectsWithLocal(projects: GeoAIProject[]) {
  const byKey = new Map<string, GeoAIProject>();

  for (const project of projects) {
    byKey.set(project.projectKey, project);
  }

  for (const project of readLocalProjects()) {
    byKey.set(project.projectKey, project);
  }

  return Array.from(byKey.values());
}

export function saveLocalProject(project: GeoAIProject) {
  const nextProjects = [
    project,
    ...readLocalProjects().filter((item) => item.projectKey !== project.projectKey)
  ].slice(0, 20);

  writeLocalProjects(nextProjects);
}
