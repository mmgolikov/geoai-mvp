import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import { buildClientDataRoom } from "@/src/lib/data-room/data-room-summary";
import {
  createPilotClientInput,
  createPilotDeliverable,
  createPilotWorkflow,
  listPilotClientInputs,
  listPilotDeliverables,
  listPilotWorkflows
} from "@/src/lib/repositories/pilot-workflow-repository";
import { listValidationEvidence } from "@/src/lib/repositories/validation-repository";
import type { GeoAIProject, ProjectClientType } from "@/src/lib/db/types";
import {
  pilotWorkflowCaveat,
  pilotWorkflowReadinessCaveat,
  pilotWorkflowStorageCaveat,
  type ClientInputItem,
  type ClientInputStatus,
  type ClientInputType,
  type PilotClientType,
  type PilotDeliverableStatus,
  type PilotDeliverableType,
  type PilotDeliverableWorkflowStatus,
  type PilotReadinessDriver,
  type PilotReadinessLabel,
  type PilotReadinessSummary,
  type PilotUseCase,
  type PilotWorkflow,
  type PilotWorkflowDataHonesty,
  type PilotWorkflowSummary
} from "@/src/types/pilot-workflow";

const dataHonesty: PilotWorkflowDataHonesty = {
  caveat: pilotWorkflowCaveat,
  readinessCaveat: pilotWorkflowReadinessCaveat,
  storageCaveat: pilotWorkflowStorageCaveat,
  forbiddenClaims: [
    "pilot-ready product",
    "investment-ready",
    "legally ready",
    "planning-approved",
    "valuation-ready",
    "secure data room",
    "enterprise data room",
    "production-ready storage",
    "verified ownership",
    "official parcel proof",
    "zoning approval",
    "official validation completed"
  ]
};

type TemplateInput = {
  title: string;
  inputType: ClientInputType;
  required?: boolean;
  priority?: "high" | "medium" | "low";
  notes?: string;
};

type TemplateDeliverable = {
  title: string;
  deliverableType: PilotDeliverableType;
  nextAction: string;
};

type ProjectTemplate = {
  title: string;
  clientType: PilotClientType;
  useCase: PilotUseCase;
  decisionQuestion: string;
  inputs: TemplateInput[];
  deliverables: TemplateDeliverable[];
};

function nowIso() {
  return new Date().toISOString();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "item";
}

function mapClientType(clientType: ProjectClientType): PilotClientType {
  if (clientType === "fund" || clientType === "family_office") return "fund";
  if (clientType === "developer") return "developer";
  if (clientType === "bank") return "bank";
  if (clientType === "government") return "government";
  return "other";
}

function templateForProject(project: GeoAIProject): ProjectTemplate {
  if (project.projectKey === "developer-land-pipeline-demo" || project.clientType === "developer") {
    return {
      title: "Developer Land Pipeline Pilot",
      clientType: "developer",
      useCase: "development_site_selection",
      decisionQuestion: "Which land plots or districts should be prioritized for development feasibility review?",
      inputs: [
        { title: "Target land shortlist", inputType: "target_aoi", priority: "high" },
        { title: "Development brief", inputType: "development_brief", priority: "high" },
        { title: "Intended use / typology", inputType: "development_brief", priority: "high" },
        { title: "Planning assumptions", inputType: "planning_documents", priority: "high" },
        { title: "Infrastructure requirements", inputType: "other", priority: "medium" },
        { title: "Market demand assumptions", inputType: "market_comps", priority: "medium" },
        { title: "Known constraints", inputType: "planning_documents", priority: "medium" },
        { title: "Required board memo fields", inputType: "report_template", priority: "low" }
      ],
      deliverables: [
        { title: "Development site screening dashboard", deliverableType: "workspace_dashboard", nextAction: "Run site screening from the workspace." },
        { title: "AOI Library", deliverableType: "aoi_library", nextAction: "Save or import target land AOIs." },
        { title: "Development feasibility memo", deliverableType: "development_memo", nextAction: "Generate a report after analysis." },
        { title: "Constraint validation checklist", deliverableType: "validation_checklist", nextAction: "Review official planning and infrastructure validation items." },
        { title: "Infrastructure context summary", deliverableType: "source_lineage_pack", nextAction: "Attach supporting infrastructure context and caveats." },
        { title: "Source lineage pack", deliverableType: "source_lineage_pack", nextAction: "Review source confidence and validation gaps." },
        { title: "Data Room summary", deliverableType: "client_data_room_summary", nextAction: "Add client evidence metadata to the Data Room." }
      ]
    };
  }

  if (project.projectKey === "bank-asset-review-demo" || project.clientType === "bank") {
    return {
      title: "Bank Asset Review Pilot",
      clientType: "bank",
      useCase: "asset_portfolio_review",
      decisionQuestion: "Which collateral or portfolio assets require deeper risk review or monitoring?",
      inputs: [
        { title: "Asset list", inputType: "asset_list", priority: "high" },
        { title: "Collateral attributes", inputType: "asset_list", priority: "high" },
        { title: "Valuation references", inputType: "other", priority: "high", notes: "References remain unvalidated screening context." },
        { title: "Risk policy", inputType: "risk_policy", priority: "high" },
        { title: "Monitoring priorities", inputType: "risk_policy", priority: "medium" },
        { title: "Construction/progress evidence", inputType: "construction_schedule", priority: "medium", required: false },
        { title: "Required credit committee output fields", inputType: "report_template", priority: "medium" }
      ],
      deliverables: [
        { title: "Portfolio screening dashboard", deliverableType: "workspace_dashboard", nextAction: "Run screening on the portfolio shortlist." },
        { title: "Asset risk summary", deliverableType: "screening_analysis", nextAction: "Generate asset-level analysis." },
        { title: "Priority review list", deliverableType: "executive_summary", nextAction: "Compare assets and flag deeper review candidates." },
        { title: "Validation checklist", deliverableType: "validation_checklist", nextAction: "Review credit, title, valuation and risk validation gaps." },
        { title: "Report/memo package", deliverableType: "investment_memo", nextAction: "Generate memo outputs for review." },
        { title: "Source lineage pack", deliverableType: "source_lineage_pack", nextAction: "Review evidence confidence and source caveats." },
        { title: "Data Room summary", deliverableType: "client_data_room_summary", nextAction: "Attach client evidence metadata." }
      ]
    };
  }

  return {
    title: "Fund Investment Screening Pilot",
    clientType: mapClientType(project.clientType),
    useCase: "investment_screening",
    decisionQuestion: "Which Dubai locations deserve deeper underwriting before capital is committed?",
    inputs: [
      { title: "Target AOIs or shortlist areas", inputType: "target_aoi", priority: "high" },
      { title: "Investment thesis", inputType: "investment_thesis", priority: "high" },
      { title: "Target asset class", inputType: "investment_thesis", priority: "high" },
      { title: "Budget / return assumptions", inputType: "other", priority: "medium" },
      { title: "Preferred comparison geography", inputType: "other", priority: "medium" },
      { title: "Market comparable evidence", inputType: "market_comps", priority: "high" },
      { title: "Required investment committee report fields", inputType: "report_template", priority: "medium" },
      { title: "Validation source preferences", inputType: "other", priority: "medium" }
    ],
    deliverables: [
      { title: "Screening dashboard", deliverableType: "workspace_dashboard", nextAction: "Run Express Analysis on the selected target." },
      { title: "AOI Library", deliverableType: "aoi_library", nextAction: "Save or import the target AOIs." },
      { title: "Risk-adjusted comparison dashboard", deliverableType: "comparison_dashboard", nextAction: "Compare two or three shortlist locations." },
      { title: "Investment screening memo", deliverableType: "investment_memo", nextAction: "Export a report after analysis." },
      { title: "Source lineage pack", deliverableType: "source_lineage_pack", nextAction: "Review source cards and validation gaps." },
      { title: "Validation checklist", deliverableType: "validation_checklist", nextAction: "Complete official/client validation tasks." },
      { title: "Data Room summary", deliverableType: "client_data_room_summary", nextAction: "Register client evidence metadata." }
    ]
  };
}

function defaultWorkflow(project: GeoAIProject, template = templateForProject(project)): PilotWorkflow {
  const timestamp = project.createdAt ?? nowIso();
  return {
    id: `pilot-workflow-${project.projectKey}`,
    projectId: project.id,
    projectKey: project.projectKey,
    title: template.title,
    clientType: template.clientType,
    useCase: template.useCase,
    geography: project.geography,
    decisionQuestion: template.decisionQuestion,
    pilotStage: "data_collection",
    startedAt: timestamp,
    updatedAt: project.updatedAt ?? timestamp,
    targetDecisionDate: null,
    owner: null,
    caveat: pilotWorkflowCaveat
  };
}

function defaultClientInputs(project: GeoAIProject, template = templateForProject(project), dataRoom = { aois: 0, uploads: 0, marketEvidence: 0 }): ClientInputItem[] {
  return template.inputs.map((item, index) => {
    const id = `pilot-input-${project.projectKey}-${slug(item.title)}`;
    let status: ClientInputStatus = "missing";
    if (item.inputType === "target_aoi" && dataRoom.aois > 0) status = "provided_unvalidated";
    if (["market_comps", "planning_documents", "ownership_documents", "asset_list"].includes(item.inputType) && dataRoom.uploads > 0) {
      status = "provided_unvalidated";
    }
    if (item.inputType === "market_comps" && dataRoom.marketEvidence > 0) status = "provided_unvalidated";

    return {
      id,
      projectId: project.id,
      projectKey: project.projectKey,
      title: item.title,
      inputType: item.inputType,
      required: item.required ?? true,
      status,
      priority: item.priority ?? (index < 3 ? "high" : "medium"),
      linkedDataRoomAssetIds: [],
      linkedAoiIds: [],
      notes: item.notes,
      caveat: pilotWorkflowCaveat
    };
  });
}

function deliverableStatus(type: PilotDeliverableType, dataRoom: { aois: number; analyses: number; reports: number; comparisons: number; validationTotal: number; validationCompleted: number; assets: number }): PilotDeliverableWorkflowStatus {
  if (type === "aoi_library") return dataRoom.aois > 0 ? "generated" : "planned";
  if (type === "screening_analysis" || type === "workspace_dashboard") return dataRoom.analyses > 0 ? "generated" : "planned";
  if (type === "comparison_dashboard") return dataRoom.comparisons > 0 ? "generated" : "planned";
  if (type === "investment_memo" || type === "development_memo" || type === "executive_summary") return dataRoom.reports > 0 ? "ready_for_review" : "planned";
  if (type === "validation_checklist") return dataRoom.validationCompleted >= dataRoom.validationTotal && dataRoom.validationTotal > 0 ? "ready_for_review" : "validation_required";
  if (type === "source_lineage_pack" || type === "client_data_room_summary") return dataRoom.assets > 0 ? "generated" : "planned";
  return "planned";
}

function defaultDeliverables(project: GeoAIProject, template = templateForProject(project), dataRoom: { aois: number; analyses: number; reports: number; comparisons: number; validationTotal: number; validationCompleted: number; assets: number }): PilotDeliverableStatus[] {
  return template.deliverables.map((item) => ({
    id: `pilot-deliverable-${project.projectKey}-${slug(item.title)}`,
    projectId: project.id,
    projectKey: project.projectKey,
    title: item.title,
    deliverableType: item.deliverableType,
    status: deliverableStatus(item.deliverableType, dataRoom),
    linkedAnalysisIds: [],
    linkedReportIds: [],
    linkedComparisonIds: [],
    linkedAoiIds: [],
    linkedDataRoomAssetIds: [],
    nextAction: item.nextAction,
    caveat: pilotWorkflowCaveat
  }));
}

function mergeById<T extends { id: string }>(defaults: T[], overrides: T[]) {
  const byId = new Map(defaults.map((item) => [item.id, item]));
  for (const item of overrides) {
    byId.set(item.id, { ...(byId.get(item.id) ?? {}), ...item });
  }
  return Array.from(byId.values());
}

function progress<T>(items: T[], predicate: (item: T) => boolean) {
  return items.length === 0 ? 0 : items.filter(predicate).length / items.length;
}

function readinessLabel(score: number): PilotReadinessLabel {
  if (score <= 25) return "setup_required";
  if (score <= 50) return "data_required";
  if (score <= 70) return "analysis_ready";
  if (score <= 85) return "validation_required";
  return "review_ready_with_caveats";
}

function calculateReadiness(input: {
  workflow: PilotWorkflow;
  clientInputs: ClientInputItem[];
  deliverables: PilotDeliverableStatus[];
  dataRoomCounts: {
    aois: number;
    assets: number;
    analyses: number;
    reports: number;
    comparisons: number;
    validationTotal: number;
    validationCompleted: number;
    validationBlocked: number;
    validationEvidenceProgress: number;
  };
}): PilotReadinessSummary {
  const requiredInputs = input.clientInputs.filter((item) => item.required);
  const providedInputs = requiredInputs.filter((item) =>
    ["provided_unvalidated", "in_review", "accepted_for_screening", "not_applicable"].includes(item.status)
  );
  const outputProgress = progress(input.deliverables, (item) =>
    ["generated", "ready_for_review", "validation_required"].includes(item.status)
  );
  const validationProgress = Math.max(
    input.dataRoomCounts.validationTotal > 0
      ? input.dataRoomCounts.validationCompleted / input.dataRoomCounts.validationTotal
      : 0,
    input.dataRoomCounts.validationEvidenceProgress
  );
  const drivers: PilotReadinessDriver[] = [
    {
      id: "configured-workflow",
      label: "Configured workflow",
      maxScore: 10,
      score: input.workflow.pilotStage !== "draft" ? 10 : 4,
      note: input.workflow.pilotStage !== "draft" ? "Pilot workflow is configured for this project." : "Pilot workflow still needs configuration."
    },
    {
      id: "aoi-availability",
      label: "AOIs available",
      maxScore: 15,
      score: input.dataRoomCounts.aois > 0 ? 15 : 6,
      note: input.dataRoomCounts.aois > 0 ? `${input.dataRoomCounts.aois} AOI evidence item(s) available.` : "No saved AOI evidence yet."
    },
    {
      id: "client-inputs",
      label: "Client inputs provided",
      maxScore: 20,
      score: Math.round(20 * (requiredInputs.length ? providedInputs.length / requiredInputs.length : 0)),
      note: `${providedInputs.length}/${requiredInputs.length} required inputs provided or in review.`
    },
    {
      id: "analysis-reports",
      label: "Analyses and reports",
      maxScore: 20,
      score: Math.round(20 * Math.min(1, (input.dataRoomCounts.analyses + input.dataRoomCounts.reports + input.dataRoomCounts.comparisons) / 4)),
      note: `${input.dataRoomCounts.analyses} analyses, ${input.dataRoomCounts.reports} reports, ${input.dataRoomCounts.comparisons} comparisons.`
    },
    {
      id: "data-room-assets",
      label: "Data Room evidence",
      maxScore: 15,
      score: Math.round(15 * Math.min(1, input.dataRoomCounts.assets / 8)),
      note: `${input.dataRoomCounts.assets} project evidence metadata item(s).`
    },
    {
      id: "validation-progress",
      label: "Validation checklist progress",
      maxScore: 20,
      score: Math.round(20 * validationProgress),
      note: `${input.dataRoomCounts.validationCompleted}/${input.dataRoomCounts.validationTotal} checklist items completed; reviewed evidence progress ${Math.round(input.dataRoomCounts.validationEvidenceProgress * 100)}%.`
    }
  ];
  let score = drivers.reduce((sum, item) => sum + item.score, 0);
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (input.dataRoomCounts.aois === 0) {
    score = Math.min(score, 55);
    blockers.push("Add or save target AOIs / shortlist locations.");
    nextActions.push("Add target AOIs or shortlist areas to the project.");
  }
  if (providedInputs.length === 0) {
    score = Math.min(score, 45);
    blockers.push("Client input checklist has no provided items yet.");
    nextActions.push("Request the highest-priority client inputs.");
  }
  if (input.dataRoomCounts.validationCompleted < input.dataRoomCounts.validationTotal) {
    blockers.push("Official/client validation checklist remains incomplete.");
    nextActions.push("Review validation checklist and mark items in review only after evidence is checked.");
  }
  if (input.dataRoomCounts.validationBlocked > 0) {
    blockers.push(`${input.dataRoomCounts.validationBlocked} validation item(s) are blocked.`);
  }
  if (input.dataRoomCounts.reports === 0) {
    nextActions.push("Generate a memo/report package after analysis.");
  }
  if (input.deliverables.some((item) => item.status === "planned")) {
    nextActions.push(input.deliverables.find((item) => item.status === "planned")?.nextAction ?? "Advance the next planned deliverable.");
  }

  const label = input.dataRoomCounts.validationCompleted < input.dataRoomCounts.validationTotal
    ? score <= 70 ? readinessLabel(score) : "validation_required"
    : readinessLabel(score);

  return {
    score: Math.max(0, Math.min(100, score)),
    label,
    drivers,
    blockers: Array.from(new Set(blockers)).slice(0, 5),
    nextActions: Array.from(new Set(nextActions)).slice(0, 5),
    caveat: pilotWorkflowReadinessCaveat,
    storageCaveat: pilotWorkflowStorageCaveat
  };
}

export async function buildPilotWorkflowSummary(input: { projectId?: string | null; projectKey?: string | null }): Promise<PilotWorkflowSummary> {
  const requestedProject = input.projectKey
    ? demoProjects.find((project) => project.projectKey === input.projectKey)
    : input.projectId
      ? demoProjects.find((project) => project.id === input.projectId || project.projectKey === input.projectId)
      : getDemoProject(null);

  if (!requestedProject) {
    return {
      ok: false,
      mode: "local_fallback",
      storageCaveat: pilotWorkflowStorageCaveat,
      projectId: input.projectId ?? null,
      projectKey: input.projectKey ?? "",
      workflow: null,
      clientInputs: [],
      deliverables: [],
      readiness: null,
      dataHonesty,
      error: "Unknown project. Pilot workflow is scoped to known GeoAI sample projects."
    };
  }

  const project = requestedProject;
  const dataRoom = await buildClientDataRoom({ projectId: project.id, projectKey: project.projectKey });
  const validationEvidence = await listValidationEvidence({ projectId: project.id, projectKey: project.projectKey, limit: 50 });
  const evidenceThatCanImproveReadiness = validationEvidence.data.filter((item) =>
    ["in_review", "client_validated", "official_validated"].includes(item.validationStatus)
  );
  const dataRoomCounts = {
    aois: dataRoom.summary.counts.aois,
    uploads: dataRoom.summary.counts.uploadedDatasets + dataRoom.summary.counts.uploadedDocuments,
    marketEvidence: dataRoom.assets.filter((asset) =>
      asset.assetType === "external_source" &&
      asset.sourceType === "public_snapshot" &&
      asset.validationStatus === "validation_required"
    ).length,
    assets: dataRoom.assets.length,
    analyses: dataRoom.summary.counts.analyses,
    reports: dataRoom.summary.counts.reports,
    comparisons: dataRoom.summary.counts.comparisons,
    validationTotal: dataRoom.summary.checklistStatus.total,
    validationCompleted: dataRoom.summary.checklistStatus.completed,
    validationBlocked: dataRoom.summary.checklistStatus.blocked,
    validationEvidenceProgress: Math.min(1, evidenceThatCanImproveReadiness.length / 4)
  };
  const template = templateForProject(project);
  const workflowDefaults = defaultWorkflow(project, template);
  const inputDefaults = defaultClientInputs(project, template, dataRoomCounts);
  const deliverableDefaults = defaultDeliverables(project, template, dataRoomCounts);
  const [storedWorkflows, storedInputs, storedDeliverables] = await Promise.all([
    listPilotWorkflows({ projectKey: project.projectKey }),
    listPilotClientInputs({ projectKey: project.projectKey }),
    listPilotDeliverables({ projectKey: project.projectKey })
  ]);
  const workflow = storedWorkflows.data[0] ? { ...workflowDefaults, ...storedWorkflows.data[0] } : workflowDefaults;
  const clientInputs = mergeById(inputDefaults, storedInputs.data);
  const deliverables = mergeById(deliverableDefaults, storedDeliverables.data);
  const readiness = calculateReadiness({ workflow, clientInputs, deliverables, dataRoomCounts });

  return {
    ok: true,
    mode: "local_fallback",
    storageCaveat: pilotWorkflowStorageCaveat,
    projectId: project.id,
    projectKey: project.projectKey,
    workflow,
    clientInputs,
    deliverables,
    readiness,
    dataHonesty,
    error: null
  };
}

export async function upsertPilotWorkflow(input: PilotWorkflow) {
  const existing = await listPilotWorkflows({ projectKey: input.projectKey });
  return existing.data.some((item) => item.id === input.id)
    ? createPilotWorkflow(input)
    : createPilotWorkflow(input);
}

export async function upsertPilotClientInput(input: ClientInputItem) {
  const result = await createPilotClientInput(input);
  return result;
}

export async function updatePilotClientInputStatus(input: ClientInputItem, status: ClientInputStatus) {
  const result = await createPilotClientInput({ ...input, status });
  return result;
}

export async function upsertPilotDeliverable(input: PilotDeliverableStatus) {
  const result = await createPilotDeliverable(input);
  return result;
}
