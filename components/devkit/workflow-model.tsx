import type { DerivedArtifact, DesignVersion, DevkitProject, ProjectBrief, VersionRef } from "@/src/lib/devkit/contracts";

export const WORKFLOW_STAGES = ["brief", "evidence", "concepts", "finance", "kit"] as const;
export type WorkflowStage = typeof WORKFLOW_STAGES[number];
export type WorkflowScope = Pick<DevkitProject, "id" | "revision" | "inputRevision">;
export type WorkflowArtifactState = "current" | "draft" | "stale" | "blocked" | "missing";
export type WorkflowCommand = { type: "open"; stage: WorkflowStage } | { type: "select"; designId: string };
export type WorkflowChangeResult = { ok: true; project: DevkitProject } | { ok: false; reason: "scope_changed" | "invalid_brief" | "missing_design" | "stale_design" };

export function workflowScope(project: DevkitProject): WorkflowScope {
  return { id: project.id, revision: project.revision, inputRevision: project.inputRevision };
}

function scopeMatches(project: DevkitProject, expected: WorkflowScope): boolean {
  return project.id === expected.id && project.revision === expected.revision && project.inputRevision === expected.inputRevision;
}

export function activeWorkflowDesign(project: DevkitProject): DesignVersion | null {
  return project.designVersions.filter((design) => design.id === project.activeDesignVersionId)
    .sort((a, b) => b.revision - a.revision)[0] ?? null;
}

export function latestWorkflowDesigns(project: DevkitProject): DesignVersion[] {
  const latest = new Map<string, DesignVersion>();
  for (const design of project.designVersions) {
    const previous = latest.get(design.scenarioId);
    if (!previous || design.revision > previous.revision || (design.revision === previous.revision && design.createdAt > previous.createdAt)) latest.set(design.scenarioId, design);
  }
  return [...latest.values()];
}

export function isWorkflowDesignCurrent(project: DevkitProject, design: DesignVersion): boolean {
  return Boolean(project.aoi && design.inputRevision === project.inputRevision && design.aoiId === project.aoi.id && design.aoiRevision === project.aoi.revision && !project.designVersions.some((other) => other.id === design.id && other.revision > design.revision));
}

function findArtifact(project: DevkitProject, ref: VersionRef): DerivedArtifact | undefined {
  return project.derivedArtifacts.find((artifact) => artifact.kind === ref.kind && artifact.id === ref.id && artifact.revision === ref.revision);
}

function refCurrent(project: DevkitProject, ref: VersionRef, seen: Set<string>): boolean {
  if (ref.kind === "design") {
    const design = project.designVersions.find((item) => item.id === ref.id && item.revision === ref.revision);
    return Boolean(design && isWorkflowDesignCurrent(project, design));
  }
  const artifact = findArtifact(project, ref);
  return Boolean(artifact && workflowArtifactState(project, artifact, seen) === "current");
}

/** UI freshness only. Geometry, financial arithmetic and export checks belong to their modules. */
export function workflowArtifactState(project: DevkitProject, artifact: DerivedArtifact | null, seen = new Set<string>()): WorkflowArtifactState {
  if (!artifact) return "missing";
  if (artifact.status === "blocked") return "blocked";
  const key = `${artifact.kind}:${artifact.id}:${artifact.revision}`;
  if (seen.has(key)) return "blocked";
  const branch = new Set(seen).add(key);
  const required = artifact.kind === "areas" ? ["design"] : artifact.kind === "finance" ? ["areas"] : ["design", "areas", "finance"];
  if (required.some((kind) => !artifact.inputs.some((ref) => ref.kind === kind))) return "blocked";
  if (artifact.inputRevision !== project.inputRevision || artifact.status === "stale" || project.derivedArtifacts.some((other) => other.kind === artifact.kind && other.id === artifact.id && other.revision > artifact.revision)) return "stale";
  if (artifact.inputs.some((ref) => !refCurrent(project, ref, branch))) return "stale";
  if (artifactDesignRefs(project, artifact).size !== 1) return "blocked";
  if (artifact.missingInputs.length) return "blocked";
  return artifact.status === "current" ? "current" : "draft";
}

function artifactDesignRefs(project: DevkitProject, artifact: DerivedArtifact, seen = new Set<string>()): Set<string> {
  const key = `${artifact.kind}:${artifact.id}:${artifact.revision}`;
  if (seen.has(key)) return new Set();
  const branch = new Set(seen).add(key);
  const refs = new Set<string>();
  for (const ref of artifact.inputs) {
    if (ref.kind === "design") refs.add(`${ref.id}:${ref.revision}`);
    else {
      const input = findArtifact(project, ref);
      if (input) for (const designRef of artifactDesignRefs(project, input, branch)) refs.add(designRef);
    }
  }
  return refs;
}

function referencesDesign(project: DevkitProject, artifact: DerivedArtifact, design: DesignVersion, seen = new Set<string>()): boolean {
  const key = `${artifact.kind}:${artifact.id}:${artifact.revision}`;
  if (seen.has(key)) return false;
  const branch = new Set(seen).add(key);
  return artifact.inputs.some((ref) => ref.kind === "design"
    ? ref.id === design.id && ref.revision === design.revision
    : Boolean(findArtifact(project, ref) && referencesDesign(project, findArtifact(project, ref)!, design, branch)));
}

/** Never substitute a different option's newest calculation for the selected option. */
export function workflowArtifactForDesign(project: DevkitProject, kind: DerivedArtifact["kind"], design = activeWorkflowDesign(project)): DerivedArtifact | null {
  if (!design) return null;
  return project.derivedArtifacts.filter((artifact) => artifact.kind === kind && referencesDesign(project, artifact, design))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.revision - a.revision)[0] ?? null;
}

export function workflowCriticalGaps(project: DevkitProject) {
  return project.constraints.filter((constraint) => constraint.severity === "critical" && constraint.status !== "source_backed");
}

export function applyWorkflowBrief(project: DevkitProject, expected: WorkflowScope, brief: ProjectBrief, updatedAt: string): WorkflowChangeResult {
  if (!scopeMatches(project, expected)) return { ok: false, reason: "scope_changed" };
  if (!brief.title.trim() || brief.title.length > 240 || !brief.objective.trim() || brief.objective.length > 2000 || brief.strategy.length > 1000 ||
      (brief.budget.amount !== null && (!Number.isFinite(brief.budget.amount) || brief.budget.amount < 0 || brief.budget.amount > 1e15)) ||
      brief.requirements.length > 40 || brief.requirements.some((item) => item.length > 1000)) return { ok: false, reason: "invalid_brief" };
  const nextBrief = { ...brief, title: brief.title.trim(), objective: brief.objective.trim(), strategy: brief.strategy.trim(), requirements: brief.requirements.map((item) => item.trim()).filter(Boolean) };
  if (JSON.stringify(project.brief) === JSON.stringify(nextBrief)) return { ok: true, project };
  return { ok: true, project: {
    ...project, brief: structuredClone(nextBrief), inputRevision: project.inputRevision + 1, updatedAt,
    derivedArtifacts: project.derivedArtifacts.map((artifact) => artifact.status === "blocked" ? artifact : { ...artifact, status: "stale" })
  } };
}

export function selectWorkflowDesign(project: DevkitProject, expected: WorkflowScope, designId: string, updatedAt: string): WorkflowChangeResult {
  if (!scopeMatches(project, expected)) return { ok: false, reason: "scope_changed" };
  const design = project.designVersions.filter((item) => item.id === designId).sort((a, b) => b.revision - a.revision)[0];
  if (!design) return { ok: false, reason: "missing_design" };
  if (!isWorkflowDesignCurrent(project, design)) return { ok: false, reason: "stale_design" };
  return { ok: true, project: project.activeDesignVersionId === designId ? project : { ...project, activeDesignVersionId: designId, updatedAt } };
}

/** Finite local command vocabulary; text cannot execute code or start an external action. */
export function parseWorkflowCommand(text: string): WorkflowCommand | null {
  const input = text.trim();
  if (input.length > 240) return null;
  const open = /^\/(?:open|открыть)\s+(.+)$/iu.exec(input);
  if (open) {
    const aliases: Record<string, WorkflowStage> = { brief: "brief", бриф: "brief", evidence: "evidence", данные: "evidence", ограничения: "evidence", concepts: "concepts", концепции: "concepts", finance: "finance", экономика: "finance", kit: "kit", комплект: "kit", review: "kit" };
    const key = open[1].toLocaleLowerCase();
    const stage = Object.hasOwn(aliases, key) ? aliases[key] : undefined;
    return stage ? { type: "open", stage } : null;
  }
  const select = /^\/(?:select|выбрать)\s+([^\s]+)$/iu.exec(input);
  return select ? { type: "select", designId: select[1] } : null;
}
