import { seededDemoReportRecords } from "@/src/data/demo-report-seeds";
import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import { knownLimitations } from "@/src/data/known-limitations";
import { buildClientDataRoom } from "@/src/lib/data-room/data-room-summary";
import { listReports } from "@/src/lib/db/repositories/reports";
import { getExternalDataReadiness } from "@/src/lib/external-data/data-manifest";
import { buildPilotWorkflowSummary } from "@/src/lib/pilot-workflow/pilot-workflow-summary";
import { listEvidenceReviews, buildEvidenceReviewSummaries } from "@/src/lib/repositories/evidence-review-repository";
import { listEvidenceFileAssets } from "@/src/lib/repositories/evidence-file-repository";
import { listValidationEvidence } from "@/src/lib/repositories/validation-repository";
import { buildValidationSummary } from "@/src/lib/validation/validation-summary";
import type { GeoAIProject } from "@/src/lib/db/types";
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
    sourceSummary: readString(item.sourceSummary, "Saved with demo/local source lineage; official validation required."),
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
    note: "Deterministic demo score; official validation required."
  }));
}

function externalSourceLineage(): ReportPackageSourceLineageItem[] {
  return getExternalDataReadiness().slice(0, 8).map((item) => ({
    id: item.sourceId,
    name: item.sourceId.replace(/-/g, " "),
    category: "external_data",
    mode: item.status === "snapshot_available" ? "imported_snapshot" : "sample_fallback",
    recordCount: item.recordCount ?? null,
    confidence: item.confidence,
    limitation: item.caveat,
    caveat: item.caveat
  }));
}

function dataRoomSourceLineage(dataRoom: Awaited<ReturnType<typeof buildClientDataRoom>>): ReportPackageSourceLineageItem[] {
  return (dataRoom.assets ?? [])
    .filter((asset) => asset.assetType === "external_source" || asset.assetType === "uploaded_document" || asset.assetType === "uploaded_csv" || asset.assetType === "uploaded_geojson")
    .slice(0, 10)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      category: asset.assetType,
      mode: asset.sourceType === "public_snapshot"
        ? "imported_snapshot"
        : asset.sourceType === "permission_required"
          ? "permission_required"
          : asset.sourceType === "planned_validation"
            ? "planned_validation"
            : asset.sourceType === "generated_by_geoai"
              ? "generated_by_geoai"
              : "sample_fallback",
      recordCount: null,
      confidence: asset.validationStatus,
      limitation: asset.description ?? asset.caveat,
      caveat: asset.caveat
    }));
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

export async function buildReportPackage(input: ReportPackageBuildInput): Promise<ReportPackage> {
  const project = demoProjects.find((item) => item.projectKey === input.projectKey || item.id === input.projectId)
    ?? getDemoProject(input.projectKey);
  const projectKey = project.projectKey;
  const packageType = projectPackageType(project, input.packageType);
  const generatedAt = nowIso();
  const stableBase = input.reportId ?? input.analysisId ?? input.comparisonId ?? projectKey;
  const packageKey = `report-package-${slug(projectKey)}-${slug(packageType)}-${slug(stableBase)}`;

  const [
    reportsResult,
    dataRoom,
    validationResult,
    reviewResult,
    evidenceFileResult,
    pilotWorkflow
  ] = await Promise.all([
    listReports({ projectId: project.id, projectKey, limit: 50 }),
    buildClientDataRoom({ projectId: project.id, projectKey }),
    listValidationEvidence({ projectId: project.id, projectKey, limit: 80 }),
    listEvidenceReviews({ projectId: project.id, projectKey, limit: 80 }),
    listEvidenceFileAssets({ projectId: project.id, projectKey, limit: 80 }),
    buildPilotWorkflowSummary({ projectId: project.id, projectKey })
  ]);

  const reports = Array.isArray(reportsResult.data) && reportsResult.data.length > 0
    ? reportsResult.data
    : seededDemoReportRecords.filter((report) => report.projectKey === projectKey);
  const normalizedReports = reports.map(normalizeReport);
  const selectedReport = normalizedReports.find((report) => report.id === input.reportId)
    ?? normalizedReports.find((report) => input.comparisonId && report.id.includes(input.comparisonId))
    ?? normalizedReports[0]
    ?? null;
  const scoreRows = selectedReport ? extractScoreRows(selectedReport) : [];
  const validationSummary = toPackageValidationSummary(buildValidationSummary(validationResult.data ?? []));
  const reviewSummaries = buildEvidenceReviewSummaries((validationResult.data ?? []).map((item) => item.id), reviewResult.data ?? []);
  const evidenceReviewSummary = toEvidenceReviewSummary(reviewSummaries);
  const evidenceFiles = evidenceFileResult.data ?? [];
  const sourceLineage = [
    ...externalSourceLineage(),
    ...dataRoomSourceLineage(dataRoom)
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 14);
  const latestAssets = dataRoom.summary.latestAssets ?? [];
  const linkedReportIds = selectedReport?.id ? [selectedReport.id] : normalizedReports.map((report) => report.id).filter(Boolean).slice(0, 4);
  const linkedValidationEvidenceIds = (validationResult.data ?? []).map((item) => item.id);
  const linkedEvidenceFileIds = evidenceFiles.map((item) => item.id);
  const linkedDataRoomAssetIds = latestAssets.map((asset) => asset.id);
  const linkedAnalysisIds = selectedReport?.id?.includes("analysis") ? [selectedReport.id.replace(/-report$/, "")] : [];
  const linkedComparisonIds = selectedReport?.id?.includes("comparison") ? [selectedReport.id.replace(/-report$/, "")] : [];
  const linkedAoiIds = latestAssets.flatMap((asset) => asset.linkedAoiIds ?? []).slice(0, 8);

  const executiveDrivers = [
    selectedReport?.targetLabel ? `Screening target: ${selectedReport.targetLabel}` : "Project-scoped screening context available.",
    sourceLineage.length > 0 ? `${sourceLineage.length} source lineage entries summarized.` : "Source lineage requires additional validated evidence.",
    dataRoom.assets.length > 0 ? `${dataRoom.assets.length} data room evidence metadata items linked.` : "Data room evidence needs client inputs."
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
        evidenceUsed: sourceLineage.slice(0, 5).map((source) => source.name),
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
      summary: "Snapshot/open/API context is summarized with caveats and confidence notes.",
      status: sourceLineage.length > 0 ? "generated" : "validation_required",
      linkedEntityIds: sourceLineage.map((source) => source.id),
      content: { sources: sourceLineage.slice(0, 8), caveat: "No live official integration claim is made." }
    }),
    packageSection({
      order: 6,
      type: "source_lineage",
      title: "Source Lineage Appendix",
      summary: "Source modes, record counts and limitations are included for diligence review.",
      status: sourceLineage.length > 0 ? "generated" : "validation_required",
      linkedEntityIds: sourceLineage.map((source) => source.id),
      content: { lineage: sourceLineage }
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
