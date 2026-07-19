import { seededDemoReportRecords } from "@/src/data/demo-report-seeds";
import { demoProjects } from "@/src/data/demo-projects";
import { knownLimitations } from "@/src/data/known-limitations";
import { getDataSourceById } from "@/src/data/data-source-registry";
import { buildClientDataRoom } from "@/src/lib/data-room/data-room-summary";
import { listReports } from "@/src/lib/db/repositories/reports";
import { getExternalDataReadiness } from "@/src/lib/external-data/data-manifest";
import { normalizeSourceDataMode } from "@/src/lib/external-data/source-modes";
import { getExternalDataSource } from "@/src/lib/external-data/source-registry";
import { buildPilotWorkflowSummary } from "@/src/lib/pilot-workflow/pilot-workflow-summary";
import { listEvidenceReviews, buildEvidenceReviewSummaries } from "@/src/lib/repositories/evidence-review-repository";
import { listEvidenceFileAssets } from "@/src/lib/repositories/evidence-file-repository";
import { createDemoValidationEvidence, listValidationEvidence } from "@/src/lib/repositories/validation-repository";
import { buildValidationSummary } from "@/src/lib/validation/validation-summary";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { DataRoomAsset } from "@/src/types/data-room";
import type {
  ReportExportManifest,
  ReportPackage,
  ReportPackageBuildInput,
  ReportPackageEvidenceReviewSummary,
  ReportPackageSection,
  ReportPackageSectionStatus,
  ReportPackageSourceLineageItem,
  ReportPackageType,
  ReportPackageValidationSummary
} from "@/src/types/report-package";
import {
  reportPackageDecisionSupportCaveat,
  reportPackagePdfWorkflowCaveat,
  reportPackageRequiredCaveat
} from "@/src/types/report-package";

type UnknownRecord = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readStringArray(value: unknown) {
  return asArray(value).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "package";
}

function sectionId(type: string, order: number) {
  return `${String(order).padStart(2, "0")}-${type}`;
}

function projectPackageType(project: GeoAIProject, requested?: ReportPackageType): ReportPackageType {
  if (requested) return requested;
  if (project.clientType === "developer") return "development_feasibility";
  if (project.clientType === "bank") return "bank_asset_review";
  return "investment_screening";
}

function decisionQuestion(type: ReportPackageType) {
  if (type === "development_feasibility") return "Should this site move to feasibility validation?";
  if (type === "bank_asset_review") return "Should this asset move to deeper collateral/risk review?";
  if (type === "comparison_memo") return "Which candidate should be prioritized for validation?";
  return "Should this location move to deeper underwriting?";
}

function normalizeReport(record: unknown) {
  const item = asRecord(record);
  const payload = asRecord(item.reportPayload ?? item.report_json ?? item.payload ?? item.reportJson);
  return {
    id: readString(item.id) || readString(item.report_key),
    title: readString(item.title, "GeoAI report"),
    reportType: readString(item.reportType) || readString(item.report_type, "analysis"),
    scenario: readString(item.scenario) || readString(payload.scenario, "Screening analysis"),
    targetLabel: readString(item.targetLabel) || readString(item.target_label) || readString(payload.selectedSite, "Selected area"),
    payload,
    sourceLineage: asRecord(item.sourceLineage ?? item.source_lineage),
    evidenceAuthority: readString(item.evidenceAuthority) || readString(item.evidence_authority) || readString(payload.evidenceAuthority, "unverified_client_assertion"),
    sourceSummary: readString(item.sourceSummary, "Saved with sample/local source lineage; official validation required."),
    createdAt: readString(item.createdAt) || readString(item.created_at) || readString(item.generated_at)
  };
}

function extractScoreRows(report: ReturnType<typeof normalizeReport>) {
  const scoreOverview = report.payload.scoreOverview;
  if (Array.isArray(scoreOverview)) {
    return scoreOverview.slice(0, 8).map((item) => {
      const row = asRecord(item);
      return {
        label: readString(row.label) || readString(row.name) || readString(row.itemName, "Score"),
        value: readNumber(row.value) || readNumber(row.overallScore) || null,
        note: readString(row.description) || readString(row.note)
      };
    });
  }

  const memo = asRecord(report.payload.memoJson);
  const scores = asRecord(memo.scores);
  return Object.entries(scores).slice(0, 8).map(([label, value]) => ({
    label,
    value: readNumber(value, 0),
    note: "Deterministic sample score; official validation required."
  }));
}

type ReportEvidenceReference = {
  sourceId: string;
  label: string;
  description: string;
  sourceStatus: string;
  sourceType: string;
  confidence: string;
  runtimeObserved: boolean;
};

type LineageClassification = {
  evidence: ReportPackageSourceLineageItem[];
  candidates: ReportPackageSourceLineageItem[];
};

function sourceModeFromReference(reference: ReportEvidenceReference) {
  if (reference.sourceStatus === "mock") return "demo_seed" as const;
  if (reference.sourceStatus === "planned" || reference.sourceStatus === "unavailable") return "planned_validation" as const;
  if (reference.sourceType === "customer") return "permission_required" as const;
  if (reference.sourceType === "mock" || reference.sourceType === "demo") return "demo_seed" as const;
  return normalizeSourceDataMode(reference.sourceStatus);
}

function reportEvidenceReferences(report: ReturnType<typeof normalizeReport> | null): ReportEvidenceReference[] {
  if (!report) return [];
  const payload = report.payload;
  const memo = asRecord(payload.memoJson);
  const comparison = asRecord(payload.comparisonJson);
  const sourceLineage = report.sourceLineage;
  const references = new Map<string, ReportEvidenceReference>();
  const evidenceRows = [
    ...asArray(payload.evidenceSourceReadiness),
    ...asArray(memo.evidence),
    ...asArray(comparison.evidence)
  ];

  for (const value of evidenceRows) {
    const item = asRecord(value);
    const sourceId = readString(item.sourceId);
    if (!sourceId || references.has(sourceId)) continue;
    references.set(sourceId, {
      sourceId,
      label: readString(item.label, sourceId.replace(/-/g, " ")),
      description: readString(item.description),
      sourceStatus: readString(item.sourceStatus, "unavailable"),
      sourceType: readString(item.sourceType, "unknown"),
      confidence: readString(item.confidence, "requires-validation"),
      runtimeObserved: false
    });
  }

  for (const value of asArray(sourceLineage.externalSources)) {
    const item = asRecord(value);
    const sourceId = readString(item.id);
    if (!sourceId) continue;
    const existing = references.get(sourceId);
    references.set(sourceId, {
      sourceId,
      label: existing?.label ?? readString(item.name, sourceId.replace(/-/g, " ")),
      description: existing?.description ?? readString(item.disclaimer),
      sourceStatus: readString(item.status, existing?.sourceStatus ?? "unavailable"),
      sourceType: existing?.sourceType ?? "external_data",
      confidence: readString(item.confidence, existing?.confidence ?? "requires-validation"),
      runtimeObserved: Boolean(readString(item.queriedAt) || readString(item.sourceObservedAt))
    });
  }

  const aiEvidenceIds = [
    ...readStringArray(asRecord(memo.aiDecisionScore).evidenceUsed),
    ...readStringArray(asRecord(comparison.aiDecisionScore).evidenceUsed),
    ...readStringArray(asRecord(payload.aiDecisionScore).evidenceUsed)
  ];
  for (const sourceId of aiEvidenceIds) {
    if (references.has(sourceId)) continue;
    references.set(sourceId, {
      sourceId,
      label: sourceId.replace(/-/g, " "),
      description: "Explicitly referenced by the selected report; acquisition evidence is still required.",
      sourceStatus: "unavailable",
      sourceType: "unknown",
      confidence: "requires-validation",
      runtimeObserved: false
    });
  }

  return [...references.values()];
}

function classifyReportSources(report: ReturnType<typeof normalizeReport> | null): LineageClassification {
  const readinessById = new Map(getExternalDataReadiness().map((item) => [item.sourceId, item]));
  const evidence: ReportPackageSourceLineageItem[] = [];
  const candidates: ReportPackageSourceLineageItem[] = [];
  const trustedEvidenceAuthority = report?.evidenceAuthority === "committed_demo_seed" ||
    report?.evidenceAuthority === "server_verified_analysis_receipt_v1";

  for (const reference of reportEvidenceReferences(report)) {
    const readiness = readinessById.get(reference.sourceId);
    const registrySource = getDataSourceById(reference.sourceId);
    const externalSource = getExternalDataSource(reference.sourceId);
    const status = readiness?.status ?? registrySource?.status ?? reference.sourceStatus;
    const dataMode = readiness
      ? normalizeSourceDataMode(readiness.sourceMode ?? readiness.status)
      : registrySource?.status === "mock" || (registrySource?.status === "connected" && ["mock", "demo"].includes(registrySource.sourceType))
        ? "demo_seed"
        : sourceModeFromReference(reference);
    const recordCount = readiness?.recordCount ?? null;
    const hasRecords = typeof recordCount === "number" && recordCount > 0;
    const acquiredSnapshot = hasRecords && ["real_snapshot", "imported_snapshot", "sample_fallback", "demo_seed"].includes(dataMode);
    const acquiredApiContext = dataMode === "api_context" && reference.runtimeObserved;
    const acquiredDemo = dataMode === "demo_seed" && (
      registrySource?.status === "mock" ||
      (reference.sourceStatus === "mock" && reference.sourceType === "mock")
    );
    const isEvidence = trustedEvidenceAuthority && (acquiredSnapshot || acquiredApiContext || acquiredDemo);
    const caveat = readiness?.caveat
      ?? externalSource?.disclaimer
      ?? registrySource?.limitations
      ?? "Source is referenced by the report but requires acquisition and validation evidence.";
    const item: ReportPackageSourceLineageItem = {
      id: reference.sourceId,
      name: externalSource?.name ?? registrySource?.name ?? reference.label,
      category: registrySource?.category ?? externalSource?.category ?? "external_data",
      status,
      dataMode,
      mode: dataMode,
      evidenceRole: isEvidence ? "used" : "candidate_validation_required",
      recordCount,
      confidence: readiness?.confidence ?? registrySource?.reliabilityLevel ?? reference.confidence,
      limitation: reference.description || caveat,
      caveat: trustedEvidenceAuthority
        ? caveat
        : `Client-supplied source assertions are not evidence receipts. ${caveat}`
    };

    (isEvidence ? evidence : candidates).push(item);
  }

  return { evidence, candidates };
}

function reportLinkContext(report: ReturnType<typeof normalizeReport> | null, input: ReportPackageBuildInput) {
  const payload = report?.payload ?? {};
  const memo = asRecord(payload.memoJson);
  const analysisIds = new Set([
    readString(input.analysisId),
    readString(payload.analysisRunId),
    readString(payload.runKey),
    readString(memo.id)
  ].filter(Boolean));
  const uploadedIds = new Set<string>();
  const uploadedNames = new Set<string>();
  const uploadedContext = asRecord(payload.uploadedDataContext);

  for (const value of asArray(uploadedContext.datasets)) {
    const item = asRecord(value);
    const id = readString(item.id);
    const name = readString(item.name) || readString(item.fileName);
    if (id) uploadedIds.add(id);
    if (name) uploadedNames.add(name);
  }
  for (const value of asArray(report?.sourceLineage.uploadedSources)) {
    const item = asRecord(value);
    const id = readString(item.id);
    const name = readString(item.name);
    if (id) uploadedIds.add(id);
    if (name) uploadedNames.add(name);
  }

  return {
    reportId: report?.id ?? null,
    analysisIds,
    uploadedIds,
    uploadedNames
  };
}

function isLinkedDataRoomAsset(asset: DataRoomAsset, context: ReturnType<typeof reportLinkContext>) {
  if (context.reportId && asset.linkedReportIds?.includes(context.reportId)) return true;
  if (asset.linkedAnalysisIds?.some((id) => context.analysisIds.has(id))) return true;
  if (context.uploadedIds.has(asset.id) || [...context.uploadedIds].some((id) => asset.id === `derived-upload-${id}`)) return true;
  return context.uploadedNames.has(asset.name) || Boolean(asset.fileName && context.uploadedNames.has(asset.fileName));
}

function classifyDataRoomSources(
  dataRoom: Awaited<ReturnType<typeof buildClientDataRoom>>,
  report: ReturnType<typeof normalizeReport> | null,
  input: ReportPackageBuildInput
): LineageClassification {
  const context = reportLinkContext(report, input);
  const evidence: ReportPackageSourceLineageItem[] = [];
  const candidates: ReportPackageSourceLineageItem[] = [];

  for (const asset of dataRoom.assets ?? []) {
    if (!["uploaded_document", "uploaded_csv", "uploaded_geojson"].includes(asset.assetType)) continue;
    if (!isLinkedDataRoomAsset(asset, context)) continue;
    const acquired = (asset.assetType === "uploaded_csv" || asset.assetType === "uploaded_geojson")
      ? asset.sourceType === "user_uploaded"
      : asset.sourceType === "user_uploaded" && (asset.objectStatus === "available" || asset.downloadAvailable === true);
    const dataMode = asset.sourceType === "api_context"
      ? "api_context"
      : asset.sourceType === "public_snapshot"
        ? "imported_snapshot"
        : asset.sourceType === "sample_fallback"
          ? "sample_fallback"
          : "user_uploaded";
    const item: ReportPackageSourceLineageItem = {
      id: asset.id,
      name: asset.name,
      category: asset.assetType,
      status: asset.objectStatus ?? asset.validationStatus,
      dataMode,
      mode: dataMode,
      evidenceRole: acquired ? "used" : "candidate_validation_required",
      recordCount: null,
      confidence: asset.validationStatus,
      limitation: asset.description ?? asset.caveat,
      caveat: asset.caveat
    };
    (acquired ? evidence : candidates).push(item);
  }

  return { evidence, candidates };
}

function uniqueLineage(items: ReportPackageSourceLineageItem[], maximum: number) {
  return items
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, maximum);
}

function reportMatchesAnalysis(report: ReturnType<typeof normalizeReport>, analysisId: string) {
  const memo = asRecord(report.payload.memoJson);
  return [
    report.payload.analysisRunId,
    report.payload.runKey,
    memo.id,
    report.id.replace(/-report$/, "")
  ].some((value) => readString(value) === analysisId);
}

function reportMatchesComparison(report: ReturnType<typeof normalizeReport>, comparisonId: string) {
  const comparison = asRecord(report.payload.comparisonJson);
  return [
    report.payload.comparisonId,
    comparison.id,
    report.id.replace(/-report$/, "")
  ].some((value) => readString(value) === comparisonId);
}

function selectReport(
  reports: Array<ReturnType<typeof normalizeReport>>,
  input: ReportPackageBuildInput
) {
  if (input.reportId) return reports.find((report) => report.id === input.reportId) ?? null;
  if (input.analysisId) return reports.find((report) => reportMatchesAnalysis(report, input.analysisId as string)) ?? null;
  if (input.comparisonId) return reports.find((report) => reportMatchesComparison(report, input.comparisonId as string)) ?? null;
  return reports[0] ?? null;
}

function packageSection(input: Omit<ReportPackageSection, "id" | "order" | "caveat"> & {
  order: number;
  caveat?: string;
}): ReportPackageSection {
  return {
    id: sectionId(input.type, input.order),
    order: input.order,
    caveat: input.caveat ?? reportPackageRequiredCaveat,
    type: input.type,
    title: input.title,
    summary: input.summary,
    status: input.status,
    content: input.content,
    linkedEntityIds: input.linkedEntityIds
  };
}

function toPackageValidationSummary(summary: ReturnType<typeof buildValidationSummary>): ReportPackageValidationSummary {
  return {
    totalEvidence: summary.totalEvidence,
    officialValidatedCount: summary.officialValidatedCount,
    clientValidatedCount: summary.clientValidatedCount,
    inReviewCount: summary.inReviewCount,
    highestAllowedClaimLevel: summary.highestAllowedClaimLevel,
    blockers: summary.blockers,
    nextActions: summary.nextActions,
    caveat: summary.caveat
  };
}

function toEvidenceReviewSummary(summaries: ReturnType<typeof buildEvidenceReviewSummaries>): ReportPackageEvidenceReviewSummary {
  const reviewed = summaries.filter((item) => item.latestStatus !== "not_started");
  const blockers = summaries.filter((item) => ["rejected", "expired", "request_more_evidence"].includes(item.latestStatus));
  return {
    totalReviews: summaries.length,
    reviewedEvidenceCount: reviewed.length,
    blockerCount: blockers.length,
    latestStatus: reviewed[0]?.latestStatus ?? "not_started",
    reviewNotes: summaries.slice(0, 8).map((item) => ({
      validationEvidenceId: item.validationEvidenceId,
      status: item.latestStatus,
      decision: item.latestDecision ?? null,
      reviewer: item.latestReviewer ?? null,
      reviewedAt: item.latestReviewedAt ?? null,
      requiredNextAction: item.requiredNextAction
    })),
    caveat: summaries[0]?.caveat ?? "Evidence review is a screening workflow and not official validation."
  };
}

function sectionStatus(hasData: boolean, fallback: ReportPackageSectionStatus = "validation_required"): ReportPackageSectionStatus {
  return hasData ? "generated" : fallback;
}

export async function buildReportPackage(
  input: ReportPackageBuildInput,
  options: { includeStoredState?: boolean } = {}
): Promise<ReportPackage> {
  const project = demoProjects.find((item) => item.projectKey === input.projectKey || item.id === input.projectId);
  if (!project) {
    throw new Error(`Unknown project '${input.projectKey}'; report package generation did not substitute a demo project.`);
  }
  const projectKey = project.projectKey;
  const packageType = projectPackageType(project, input.packageType);
  const generatedAt = nowIso();
  const stableBase = input.reportId ?? input.analysisId ?? input.comparisonId ?? projectKey;
  const packageKey = `report-package-${slug(projectKey)}-${slug(packageType)}-${slug(stableBase)}`;

  const includeStoredState = options.includeStoredState !== false;
  const [
    reportsResult,
    dataRoom,
    validationResult,
    reviewResult,
    evidenceFileResult,
    pilotWorkflow
  ] = includeStoredState
    ? await Promise.all([
        listReports({ projectId: project.id, projectKey, limit: 50 }),
        buildClientDataRoom({ projectId: project.id, projectKey, includeStoredState: true }),
        listValidationEvidence({ projectId: project.id, projectKey, limit: 80 }),
        listEvidenceReviews({ projectId: project.id, projectKey, limit: 80 }),
        listEvidenceFileAssets({ projectId: project.id, projectKey, limit: 80 }),
        buildPilotWorkflowSummary({ projectId: project.id, projectKey, includeStoredState: true })
      ])
    : await Promise.all([
        Promise.resolve({ ok: true, mode: "demo_seed" as const, data: [], error: null }),
        buildClientDataRoom({ projectId: project.id, projectKey, includeStoredState: false }),
        Promise.resolve({ ok: true, mode: "browser_local" as const, data: createDemoValidationEvidence(projectKey), error: null }),
        Promise.resolve({ ok: true, mode: "browser_local" as const, data: [], error: null }),
        Promise.resolve({ ok: true, mode: "browser_local" as const, data: [], error: null }),
        buildPilotWorkflowSummary({ projectId: project.id, projectKey, includeStoredState: false })
      ]);

  const reports = Array.isArray(reportsResult.data) && reportsResult.data.length > 0
    ? reportsResult.data
    : seededDemoReportRecords.filter((report) => report.projectKey === projectKey);
  const normalizedReports = reports.map(normalizeReport);
  // An explicit but unknown report/analysis/comparison id must never silently
  // substitute another report: that would attach unrelated claims and lineage.
  const selectedReport = selectReport(normalizedReports, input);
  const scoreRows = selectedReport ? extractScoreRows(selectedReport) : [];
  const validationSummary = toPackageValidationSummary(buildValidationSummary(validationResult.data ?? []));
  const reviewSummaries = buildEvidenceReviewSummaries((validationResult.data ?? []).map((item) => item.id), reviewResult.data ?? []);
  const evidenceReviewSummary = toEvidenceReviewSummary(reviewSummaries);
  const evidenceFiles = evidenceFileResult.data ?? [];
  const reportSources = classifyReportSources(selectedReport);
  const dataRoomSources = classifyDataRoomSources(dataRoom, selectedReport, input);
  const sourceEvidenceLineage = uniqueLineage([
    ...reportSources.evidence,
    ...dataRoomSources.evidence
  ], 14);
  const evidenceIds = new Set(sourceEvidenceLineage.map((item) => item.id));
  const sourceCandidateLineage = uniqueLineage([
    ...reportSources.candidates,
    ...dataRoomSources.candidates
  ].filter((item) => !evidenceIds.has(item.id)), 14);
  const sourceLineage = uniqueLineage([
    ...sourceEvidenceLineage,
    ...sourceCandidateLineage
  ], 14);
  const latestAssets = dataRoom.summary.latestAssets ?? [];
  const linkedReportIds = selectedReport?.id ? [selectedReport.id] : [];
  const linkedValidationEvidenceIds = (validationResult.data ?? []).map((item) => item.id);
  const linkedEvidenceFileIds = evidenceFiles.map((item) => item.id);
  const linkedDataRoomAssetIds = latestAssets.map((asset) => asset.id);
  const selectedAnalysisId = selectedReport
    ? readString(selectedReport.payload.analysisRunId) || readString(selectedReport.payload.runKey)
    : "";
  const selectedComparisonId = selectedReport
    ? readString(asRecord(selectedReport.payload.comparisonJson).id) || readString(selectedReport.payload.comparisonId)
    : "";
  const linkedAnalysisIds = selectedAnalysisId ? [selectedAnalysisId] : [];
  const linkedComparisonIds = selectedComparisonId ? [selectedComparisonId] : [];
  const linkedAoiIds = latestAssets.flatMap((asset) => asset.linkedAoiIds ?? []).slice(0, 8);

  const executiveDrivers = [
    selectedReport?.targetLabel ? `Screening target: ${selectedReport.targetLabel}` : "Project-scoped screening context available.",
    sourceEvidenceLineage.length > 0
      ? `${sourceEvidenceLineage.length} acquired source evidence item(s) are explicitly linked.`
      : "No acquired source evidence is explicitly linked.",
    sourceCandidateLineage.length > 0
      ? `${sourceCandidateLineage.length} referenced source candidate(s) still require acquisition or validation.`
      : "No unresolved source candidates are linked."
  ];
  const executiveRisks = [
    ...validationSummary.blockers.slice(0, 3),
    "No legal, cadastral, zoning, planning, ownership or valuation conclusion is produced."
  ].slice(0, 4);
  const sections: ReportPackageSection[] = [
    packageSection({
      order: 1,
      type: "executive_memo",
      title: "Executive Memo",
      summary: `${decisionQuestion(packageType)} Recommended posture: proceed only as a screening hypothesis with official validation required.`,
      status: "generated",
      linkedEntityIds: linkedReportIds,
      content: {
        decisionQuestion: decisionQuestion(packageType),
        recommendedPosture: "Proceed with conditions",
        scenario: selectedReport?.scenario ?? project.primaryScenario,
        selectedArea: selectedReport?.targetLabel ?? project.geography,
        summary: selectedReport?.sourceSummary ?? "Generated from project-scoped demo/local evidence and validation gaps.",
        topDrivers: executiveDrivers,
        topRisks: executiveRisks,
        validationRequirements: validationSummary.nextActions.slice(0, 3),
        nextAction: validationSummary.nextActions[0] ?? "Validate official source evidence before client decisions."
      }
    }),
    packageSection({
      order: 2,
      type: "aoi_factsheet",
      title: "AOI Factsheet",
      summary: linkedAoiIds.length > 0 ? "Project AOI screening metadata linked." : "No official AOI or parcel geometry is linked; selected point/object context is shown instead.",
      status: sectionStatus(linkedAoiIds.length > 0 || Boolean(selectedReport), "sample_fallback"),
      linkedEntityIds: linkedAoiIds,
      caveat: "AOI is screening geometry, not official parcel/cadastral/zoning boundary.",
      content: {
        name: latestAssets.find((asset) => asset.assetType === "aoi")?.name ?? selectedReport?.targetLabel ?? "Selected point/object",
        geometryType: latestAssets.find((asset) => asset.assetType === "aoi") ? "screening_aoi" : "point_or_demo_object",
        sourceType: latestAssets.find((asset) => asset.assetType === "aoi")?.sourceType ?? "demo_or_selected_context",
        validationStatus: latestAssets.find((asset) => asset.assetType === "aoi")?.validationStatus ?? "validation_required",
        linkedEvidenceFiles: linkedEvidenceFileIds.length,
        caveat: "AOI is screening geometry, not official parcel/cadastral/zoning boundary."
      }
    }),
    packageSection({
      order: 3,
      type: "ai_decision_memo",
      title: "AI Decision Memo",
      summary: "Decision-support hypothesis with deterministic fallback and validation guardrails.",
      status: selectedReport ? "generated" : "sample_fallback",
      linkedEntityIds: linkedAnalysisIds,
      content: {
        mode: readString(asRecord(selectedReport?.payload.memoJson).analysisMode, "deterministic fallback"),
        decisionPosture: readString(selectedReport?.payload.decisionPosture, "Proceed with conditions"),
        recommendedUse: readString(asRecord(selectedReport?.payload.memoJson).recommendedUse, "Further screening before underwriting."),
        confidence: readString(asRecord(selectedReport?.payload.memoJson).confidenceLevel, "medium"),
        evidenceUsed: sourceEvidenceLineage.slice(0, 5).map((source) => source.name),
        candidateSourcesRequiringValidation: sourceCandidateLineage.slice(0, 5).map((source) => source.name),
        unsupportedClaims: ["official parcel boundary", "zoning approval", "ownership verification", "certified valuation"],
        validationRequired: validationSummary.nextActions
      }
    }),
    packageSection({
      order: 4,
      type: "deterministic_scoring",
      title: "Deterministic Score Summary",
      summary: scoreRows.length > 0 ? "Existing score rows included for board-level context." : "No score rows available; generate analysis to populate this section.",
      status: sectionStatus(scoreRows.length > 0, "missing"),
      linkedEntityIds: linkedReportIds,
      content: { scores: scoreRows, caveat: "Scores are deterministic screening indicators, not validated valuation or suitability scores." }
    }),
    packageSection({
      order: 5,
      type: "market_context",
      title: "External Data / Market Context",
      summary: "Only explicitly linked, acquired source evidence is treated as used; candidates remain validation-required.",
      status: sourceEvidenceLineage.length > 0 ? "generated" : "validation_required",
      linkedEntityIds: sourceLineage.map((source) => source.id),
      content: {
        evidence: sourceEvidenceLineage.slice(0, 8),
        candidates: sourceCandidateLineage.slice(0, 8),
        caveat: "No live official integration claim is made; candidate sources are not evidence used."
      }
    }),
    packageSection({
      order: 6,
      type: "source_lineage",
      title: "Source Lineage Appendix",
      summary: "Source modes, evidence roles, record counts and limitations are included for diligence review.",
      status: sourceLineage.length > 0 ? "generated" : "validation_required",
      linkedEntityIds: sourceLineage.map((source) => source.id),
      content: {
        evidence: sourceEvidenceLineage,
        candidates: sourceCandidateLineage,
        lineage: sourceLineage
      }
    }),
    packageSection({
      order: 7,
      type: "validation_appendix",
      title: "Validation Governance Appendix",
      summary: `${validationSummary.totalEvidence} validation item(s); highest claim posture: ${validationSummary.highestAllowedClaimLevel}.`,
      status: validationSummary.totalEvidence > 0 ? "validation_required" : "missing",
      linkedEntityIds: linkedValidationEvidenceIds,
      content: { ...validationSummary }
    }),
    packageSection({
      order: 8,
      type: "evidence_review",
      title: "Evidence Review Appendix",
      summary: `${evidenceReviewSummary.reviewedEvidenceCount} evidence item(s) reviewed; ${evidenceFiles.length} file metadata item(s).`,
      status: evidenceReviewSummary.reviewedEvidenceCount > 0 || evidenceFiles.length > 0 ? "ready_for_review" : "validation_required",
      linkedEntityIds: [...linkedValidationEvidenceIds, ...linkedEvidenceFileIds],
      content: {
        ...evidenceReviewSummary,
        files: evidenceFiles.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          fileType: file.mimeType,
          fileSizeBytes: file.fileSizeBytes,
          storageProvider: file.storageProvider,
          objectStatus: file.objectStatus,
          signedUrlAvailability: file.storageProvider === "supabase_storage" && file.objectStatus === "available" ? "available_if_authorized" : "unavailable_in_current_mode",
          caveat: file.caveat
        }))
      }
    }),
    packageSection({
      order: 9,
      type: "data_room_summary",
      title: "Data Room Summary",
      summary: `${dataRoom.assets.length} data room metadata asset(s), local/API fallback mode.`,
      status: "generated",
      linkedEntityIds: linkedDataRoomAssetIds,
      content: {
        counts: dataRoom.summary.counts,
        latestAssets,
        storageMode: dataRoom.summary.storageMode,
        storageNote: dataRoom.summary.storageNote,
        caveat: dataRoom.dataHonesty.caveat
      }
    }),
    packageSection({
      order: 10,
      type: "pilot_workflow",
      title: "Pilot Workflow / Deliverables Summary",
      summary: pilotWorkflow.readiness
        ? `Workflow readiness ${pilotWorkflow.readiness.score}/100; ${pilotWorkflow.readiness.label}.`
        : "Pilot workflow summary requires setup.",
      status: pilotWorkflow.readiness ? "generated" : "validation_required",
      linkedEntityIds: pilotWorkflow.deliverables?.map((item) => item.id) ?? [],
      content: {
        stage: pilotWorkflow.workflow?.pilotStage ?? "data_collection",
        readiness: pilotWorkflow.readiness,
        clientInputs: pilotWorkflow.clientInputs?.slice(0, 8) ?? [],
        deliverables: pilotWorkflow.deliverables?.slice(0, 8) ?? [],
        caveat: pilotWorkflow.dataHonesty?.caveat
      }
    }),
    packageSection({
      order: 11,
      type: "comparison_memo",
      title: "Comparison Memo",
      summary: linkedComparisonIds.length > 0 ? "Comparison-linked memo included." : "No comparison selected; compare shortlisted options to populate this section.",
      status: linkedComparisonIds.length > 0 ? "generated" : "missing",
      linkedEntityIds: linkedComparisonIds,
      content: {
        comparedItems: Array.isArray(selectedReport?.payload.comparedItems) ? selectedReport?.payload.comparedItems : [],
        decisionPosture: readString(selectedReport?.payload.decisionPosture, "Comparison not linked.")
      }
    }),
    packageSection({
      order: 12,
      type: "limitations",
      title: "Known Limitations / Required Validation",
      summary: "Current production limitations and required validation caveats.",
      status: "validation_required",
      linkedEntityIds: knownLimitations.map((item) => item.id),
      content: {
        limitations: knownLimitations.map((item) => ({
          id: item.id,
          title: item.title,
          currentStatus: item.currentStatus,
          whatIsMissing: item.whatIsMissing,
          nextAction: item.nextAction,
          caveat: item.caveat
        })),
        requiredCaveats: [
          reportPackageRequiredCaveat,
          reportPackageDecisionSupportCaveat,
          reportPackagePdfWorkflowCaveat
        ]
      }
    })
  ];

  const exportManifest: ReportExportManifest = {
    packageKey,
    generatedAt,
    storageMode: "local_fallback",
    artifacts: [
      { label: "Printable report package", route: `/report-packages/${encodeURIComponent(packageKey)}/print`, type: "printable_route", caveat: reportPackagePdfWorkflowCaveat },
      { label: "JSON report package", route: `/api/report-packages/${encodeURIComponent(packageKey)}/json`, type: "json_route", caveat: "Safe metadata and section summaries only; no signed URLs or secrets." },
      ...linkedReportIds.map((id) => ({ label: "Linked report", route: `/reports/${encodeURIComponent(id)}/print`, id, type: "report_route" as const })),
      ...linkedEvidenceFileIds.slice(0, 6).map((id) => ({ label: "Evidence file metadata", id, type: "evidence_file" as const, caveat: "Raw files and signed URLs are not exported by default." }))
    ],
    caveats: [
      reportPackageRequiredCaveat,
      reportPackageDecisionSupportCaveat,
      reportPackagePdfWorkflowCaveat
    ]
  };

  const exportManifestSection = packageSection({
    order: 13,
    type: "export_manifest",
    title: "Export Manifest",
    summary: "Routes and linked metadata included in this browser-print package.",
    status: "generated",
    linkedEntityIds: exportManifest.artifacts.map((item) => item.id ?? item.route ?? item.label),
    content: exportManifest
  });

  return {
    id: packageKey,
    packageKey,
    projectId: project.id,
    projectKey,
    title: `${project.name} Enterprise Report Pack`,
    packageType,
    status: validationSummary.officialValidatedCount > 0 ? "ready_for_review" : "validation_required",
    version: "v2.8",
    generatedAt,
    generatedBy: input.generatedBy ?? "GeoAI local/API fallback",
    linkedAoiIds,
    linkedAnalysisIds,
    linkedReportIds,
    linkedComparisonIds,
    linkedValidationEvidenceIds,
    linkedEvidenceFileIds,
    linkedDataRoomAssetIds,
    sections: [...sections, exportManifestSection],
    sourceLineage,
    validationSummary,
    evidenceReviewSummary,
    exportManifest,
    caveat: reportPackageRequiredCaveat,
    createdAt: generatedAt,
    updatedAt: generatedAt
  };
}
