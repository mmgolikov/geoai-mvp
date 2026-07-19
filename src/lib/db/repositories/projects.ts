import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import type {
  DbRepositoryResult,
  GeoAIProject,
  ProjectInput
} from "@/src/lib/db/types";

type ProjectRow = {
  id: string;
  project_key: string;
  name: string;
  description: string | null;
  geography: string | null;
  client_type: GeoAIProject["clientType"] | null;
  primary_scenario: string | null;
  status: GeoAIProject["status"] | null;
  data_mode: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function toProject(row: ProjectRow): GeoAIProject {
  return {
    id: row.id,
    projectKey: row.project_key,
    name: row.name,
    description: row.description ?? "",
    geography: row.geography ?? "Dubai / UAE",
    clientType: row.client_type ?? "demo",
    primaryScenario: row.primary_scenario ?? "investmentSiteSelection",
    status: row.status ?? "active",
    dataMode: row.data_mode ?? "demo_normalized",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toProjectRow(input: ProjectInput) {
  const projectKey =
    input.projectKey ??
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return {
    project_key: projectKey,
    name: input.name,
    description: input.description ?? null,
    geography: input.geography ?? "Dubai / UAE",
    client_type: input.clientType ?? "demo",
    primary_scenario: input.primaryScenario ?? "investmentSiteSelection",
    status: input.status ?? "active",
    data_mode: input.dataMode ?? "demo_normalized",
    metadata: input.metadata ?? {}
  };
}

export function getLocalDemoProject(projectKey?: string | null) {
  return getDemoProject(projectKey);
}

export async function listProjects(): Promise<DbRepositoryResult<GeoAIProject[]>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { ok: true, mode: "demo_seed", data: demoProjects, error: null };
  }

  try {
    const query = client.from("projects").select("*") as {
      order: (column: string, options?: unknown) => Promise<{ data: ProjectRow[] | null; error?: unknown }>;
    };
    const response = await query.order("created_at", { ascending: true });

    if (response.error) {
      return { ok: false, mode: "demo_seed", data: demoProjects, error: "Unable to load DB projects." };
    }

    const projects = (response.data ?? []).map(toProject);
    return { ok: true, mode: "supabase", data: projects.length > 0 ? projects : demoProjects, error: null };
  } catch (error) {
    return {
      ok: false,
      mode: "demo_seed",
      data: demoProjects,
      error: error instanceof Error ? error.message : "Unable to load projects."
    };
  }
}

export async function getProjectByKey(projectKey: string): Promise<DbRepositoryResult<GeoAIProject | null>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { ok: true, mode: "demo_seed", data: getLocalDemoProject(projectKey), error: null };
  }

  try {
    const query = client.from("projects").select("*") as {
      eq: (column: string, value: string) => { limit: (count: number) => Promise<{ data: ProjectRow[] | null; error?: unknown }> };
    };
    const response = await query.eq("project_key", projectKey).limit(1);
    const project = response.data?.[0] ? toProject(response.data[0]) : getLocalDemoProject(projectKey);

    return {
      ok: !response.error,
      mode: response.data?.[0] ? "supabase" : "demo_seed",
      data: project,
      error: response.error ? "Unable to load project." : null
    };
  } catch (error) {
    return {
      ok: false,
      mode: "demo_seed",
      data: getLocalDemoProject(projectKey),
      error: error instanceof Error ? error.message : "Unable to load project."
    };
  }
}

export async function getDefaultProject() {
  return getProjectByKey(demoProjects[0].projectKey);
}

export async function createProject(input: ProjectInput): Promise<DbRepositoryResult<GeoAIProject>> {
  const client = await getSupabaseServerClient();
  const localProject: GeoAIProject = {
    id: null,
    projectKey: input.projectKey ?? toProjectRow(input).project_key,
    name: input.name,
    description: input.description ?? "",
    geography: input.geography ?? "Dubai / UAE",
    clientType: input.clientType ?? "demo",
    primaryScenario: input.primaryScenario ?? "investmentSiteSelection",
    status: input.status ?? "active",
    dataMode: input.dataMode ?? "demo_normalized",
    metadata: input.metadata ?? {}
  };

  if (!client) {
    return { ok: true, mode: "demo_seed", data: localProject, error: null };
  }

  try {
    const query = client.from("projects").upsert(toProjectRow(input), { onConflict: "project_key" }) as Promise<{
      data?: ProjectRow[] | null;
      error?: unknown;
    }>;
    const response = await query;

    if (response.error) {
      return { ok: false, mode: "demo_seed", data: localProject, error: "Unable to create project." };
    }

    return { ok: true, mode: "supabase", data: response.data?.[0] ? toProject(response.data[0]) : localProject, error: null };
  } catch (error) {
    return {
      ok: false,
      mode: "demo_seed",
      data: localProject,
      error: error instanceof Error ? error.message : "Unable to create project."
    };
  }
}

export async function updateProject(projectId: string, input: Partial<ProjectInput>): Promise<DbRepositoryResult<GeoAIProject | null>> {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { ok: true, mode: "demo_seed", data: null, error: null };
  }

  try {
    const query = client.from("projects").update(toProjectRow({ name: "Updated Project", ...input })) as {
      eq: (column: string, value: string) => Promise<{ data?: ProjectRow[] | null; error?: unknown }>;
    };
    const response = await query.eq("id", projectId);

    if (response.error) {
      return { ok: false, mode: "demo_seed", data: null, error: "Unable to update project." };
    }

    return { ok: true, mode: "supabase", data: response.data?.[0] ? toProject(response.data[0]) : null, error: null };
  } catch (error) {
    return {
      ok: false,
      mode: "demo_seed",
      data: null,
      error: error instanceof Error ? error.message : "Unable to update project."
    };
  }
}

export async function listProjectAnalysisRuns(projectId: string, limit = 10) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { ok: true, mode: "demo_seed" as const, data: [], error: null };
  }

  try {
    const query = client.from("analysis_runs").select("*") as {
      eq: (column: string, value: string) => { order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> } };
    };
    const response = await query.eq("project_id", projectId).order("created_at", { ascending: false }).limit(limit);
    return { ok: !response.error, mode: "supabase" as const, data: response.data ?? [], error: response.error ? "Unable to load project analyses." : null };
  } catch (error) {
    return { ok: false, mode: "demo_seed" as const, data: [], error: error instanceof Error ? error.message : "Unable to load project analyses." };
  }
}

export async function listProjectReports(projectId: string, limit = 10) {
  const client = await getSupabaseServerClient();
  if (!client) {
    return { ok: true, mode: "demo_seed" as const, data: [], error: null };
  }

  try {
    const query = client.from("reports").select("*") as {
      eq: (column: string, value: string) => { order: (column: string, options?: unknown) => { limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> } };
    };
    const response = await query.eq("project_id", projectId).order("created_at", { ascending: false }).limit(limit);
    return { ok: !response.error, mode: "supabase" as const, data: response.data ?? [], error: response.error ? "Unable to load project reports." : null };
  } catch (error) {
    return { ok: false, mode: "demo_seed" as const, data: [], error: error instanceof Error ? error.message : "Unable to load project reports." };
  }
}
