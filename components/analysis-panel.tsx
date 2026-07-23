"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import ingestionReport from "@/data/normalized/ingestion_report.json";
import { DataReadinessCard } from "@/components/data-readiness";
import { getScenarioDataSources } from "@/src/data/data-source-registry";
import {
  getExploreRole,
  getExploreRolesByAudience,
  getExploreScenario,
  getExploreScenariosByRole
} from "@/src/lib/explore/scenarios";
import {
  type CandidateSearchStatus,
  type ExploreAudience,
  type ExploreCandidate,
  type ExploreFilterConfig,
  type ExploreFilters,
  type ExploreRole,
  type ExploreScenarioId,
  type InteractionMode
} from "@/src/lib/explore/types";
import {
  getExploreCandidateSourceLabel,
  getExploreModeLabel,
  getExploreModeSummary
} from "@/src/lib/explore/workspace-bridge";
import { sourceStatusToLabel } from "@/src/lib/external-data/source-status";
import { sourceTypeLabel, validationStatusLabel } from "@/src/lib/aoi-library";
import { formatArea } from "@/src/lib/polygon-aoi";
import { getPilotPackageForProject } from "@/src/lib/pilot/pilot-packages";
import type { LocalProjectInput } from "@/src/lib/project-local-store";
import type { RepositoryMode } from "@/src/lib/repositories/repository-mode";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { MarketMetricsMatch } from "@/src/lib/market-metrics/types";
import type { MarketContext } from "@/src/types/market-context";
import type {
  AnalysisScenarioId,
  AnalysisHistoryItem,
  ComparisonItem,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint,
  UserDrawnAoi
} from "@/src/types/geo";
import type { UploadedDataset } from "@/src/types/uploaded-data";
import type { ProjectAoi } from "@/src/types/aoi";
import type { ClientDataRoom, DataRoomAssetType } from "@/src/types/data-room";
import type { EvidenceFileAsset } from "@/src/types/storage";
import type { EvidenceReviewSummary } from "@/src/types/evidence-review";
import type {
  ClientInputItem,
  ClientInputStatus,
  PilotDeliverableStatus,
  PilotDeliverableWorkflowStatus,
  PilotWorkflowSummary
} from "@/src/types/pilot-workflow";

type AnalysisPanelProps = {
  selectedPoint: SelectedPoint | null;
  selectedObject: SelectedDemoObject | null;
  selectedAoi: UserDrawnAoi | null;
  projects: GeoAIProject[];
  activeProject: GeoAIProject;
  selectedScenario: AnalysisScenarioId;
  customQuery: string;
  isAnalyzing: boolean;
  analysisError: string | null;
  comparisonItems: ComparisonItem[];
  comparisonMessage: string | null;
  analysisHistory: AnalysisHistoryItem[];
  analysisHistorySource: "DB" | "local";
  hasResult: boolean;
  currentAnalysis: ExpressAnalysis | null;
  analysisMode?: ExpressAnalysis["analysisMode"];
  marketMetricsMatch?: MarketMetricsMatch;
  backendStatus: {
    configured: boolean;
    status: "connected" | "configured_unavailable" | "not_configured";
    repositoryMode: RepositoryMode;
    mode: RepositoryMode;
    caveat: string;
    message: string;
    sources_count: number | null;
  } | null;
  marketContext: MarketContext | null;
  isMarketContextLoading: boolean;
  uploadedDatasets: UploadedDataset[];
  uploadedDataMessage: string | null;
  projectAois: ProjectAoi[];
  aoiDraftName: string;
  aoiMessage: string | null;
  exploreAudience: ExploreAudience;
  exploreRole: ExploreRole;
  exploreScenarioId: ExploreScenarioId;
  exploreInteractionMode: InteractionMode;
  exploreFilters: ExploreFilters;
  exploreCandidates: ExploreCandidate[];
  candidateSearchStatus: CandidateSearchStatus;
  selectedExploreCandidateId: string | null;
  exploreSetupDefaultOpen?: boolean;
  workspaceHeading: string;
  onProjectChange: (projectKey: string) => void;
  onCustomQueryChange: (query: string) => void;
  onExploreAudienceChange: (audience: ExploreAudience) => void;
  onExploreRoleChange: (role: ExploreRole) => void;
  onExploreScenarioChange: (scenarioId: ExploreScenarioId) => void;
  onExploreInteractionModeChange: (mode: InteractionMode) => void;
  onExploreFilterChange: (id: string, value: ExploreFilters[string]) => void;
  onExploreCandidateSelect: (candidateId: string) => void;
  onCreateProject: (input: LocalProjectInput) => Promise<void> | void;
  primaryCtaLabel: string;
  primaryCtaDisabled: boolean;
  onPrimaryCta: () => void;
  onAddToComparison: () => void;
  onRemoveComparisonItem: (itemId: string) => void;
  onRunComparison: () => void;
  onOpenHistoryItem: (item: AnalysisHistoryItem) => void;
  onClearAnalysisHistory: () => void;
  onUploadDataset: (file: File) => Promise<void> | void;
  onImportAoiGeojson: (file: File) => Promise<void> | void;
  onAoiDraftNameChange: (name: string) => void;
  onSaveSelectedAoi: () => void;
  onOpenSavedAoi: (aoi: ProjectAoi) => void;
  onRenameSavedAoi: (aoi: ProjectAoi, name: string) => void;
  onDeleteSavedAoi: (aoiId: string) => void;
  onExportSelectedAoi: () => void;
  onExportSavedAoi: (aoi: ProjectAoi) => void;
  onRemoveUploadedDataset: (datasetId: string) => void;
  onClearUploadedDatasets: () => void;
  onToggleUploadedDataset: (datasetId: string) => void;
  onOpenMap: () => void;
};

type ExternalDataStatusResponse = {
  sources?: Array<{
    id: string;
    name: string;
    status: string;
    sourceType: string;
    confidence: string;
    disclaimer: string;
  }>;
  readiness?: Array<{
    sourceId: string;
    status: string;
    recordCount?: number;
    coverageArea: string;
    confidence: string;
    caveat: string;
  }>;
  manifest?: {
    generatedAt: string | null;
    sources?: Array<{
      id: string;
      status: string;
      rowCount?: number;
      featureCount?: number;
      usedInAnalysis?: boolean;
    }>;
  };
  availableFiles?: {
    dldMarketMetrics?: boolean;
    osmBaseline?: boolean;
  };
};

type ValidationGovernanceResponse = {
  evidence?: Array<{
    id: string;
    title: string;
    validationStatus: string;
    allowedClaimLevel: string;
    linkedAoiIds?: string[];
  }>;
  summary?: {
    totalEvidence: number;
    officialValidatedCount: number;
    clientValidatedCount: number;
    inReviewCount: number;
    requiredValidationGaps: string[];
    highestAllowedClaimLevel: string;
    caveat: string;
  };
  reviewSummaries?: EvidenceReviewSummary[];
};

type StorageHealthResponse = {
  provider: "supabase_storage" | "local_metadata_only" | "disabled";
  storageReady: boolean;
  bucketReady: boolean;
  maxFileSizeBytes: number;
  caveat: string;
};

type EvidenceFilesResponse = {
  items?: EvidenceFileAsset[];
};

type ReportPackageSummary = {
  id: string;
  packageKey: string;
  projectKey: string;
  title: string;
  packageType: string;
  status: string;
  generatedAt: string;
  printablePath: string;
  jsonPath: string;
  caveat: string;
};

const canonicalInteractionModeOrder: InteractionMode[] = ["criteria_first", "map_first"];
// Project Dashboard owns these server-backed summaries. Keep the public workspace panel
// free of the legacy seven-request prefetch fan-out until authenticated access is enabled.
const enableLegacyPanelServerFanout = false;

function formatHistoryTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatIngestionTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatUploadedDatasetDetail(dataset: UploadedDataset) {
  if (dataset.type === "geojson") {
    return `${dataset.featureCount ?? 0} features`;
  }

  return `${dataset.rowCount ?? 0} rows`;
}

function formatDataRoomLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function CollapsedSection({
  title,
  badge,
  children
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="w-full max-w-full overflow-hidden rounded-md border border-line bg-white px-3">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        <span className="min-w-0 whitespace-normal break-words leading-4">{title}</span>
        <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold normal-case tracking-normal text-brand">
          {badge ?? "Open"}
        </span>
      </summary>
      <div className="min-w-0 max-w-full overflow-x-hidden break-words border-t border-line py-3">
        <div className="min-w-0 max-w-full">{children}</div>
      </div>
    </details>
  );
}

function ExploreSetupControl({
  config,
  value,
  onChange
}: {
  config: ExploreFilterConfig;
  value: ExploreFilters[string] | undefined;
  onChange: (value: ExploreFilters[string]) => void;
}) {
  const controlId = useId();
  const valueId = `${controlId}-value`;

  if (config.type === "select") {
    return (
      <div className="min-w-0">
        <label htmlFor={controlId} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {config.label}
        </label>
        <select
          id={controlId}
          value={typeof value === "string" ? value : String(config.defaultValue)}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
        >
          {config.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (config.type === "range") {
    const numericValue = typeof value === "number" ? value : Number(config.defaultValue);

    return (
      <div className="min-w-0 rounded-md border border-line bg-white p-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={controlId} className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {config.label}
          </label>
          <span id={valueId} className="shrink-0 text-[11px] font-semibold text-brand">
            {numericValue}{config.unit ? ` ${config.unit}` : ""}
          </span>
        </div>
        <input
          id={controlId}
          type="range"
          aria-describedby={valueId}
          aria-valuetext={`${numericValue}${config.unit ? ` ${config.unit}` : ""}`}
          value={numericValue}
          min={config.min}
          max={config.max}
          step={config.step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-2 h-6 w-full accent-brand"
        />
      </div>
    );
  }

  if (config.type === "toggle") {
    const checked = typeof value === "boolean" ? value : Boolean(config.defaultValue);

    return (
      <label className="flex min-w-0 items-center gap-2 rounded-md border border-line bg-white px-2 py-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        <span className="min-w-0 truncate text-xs font-semibold text-ink">{config.label}</span>
      </label>
    );
  }

  const selectedValues = Array.isArray(value)
    ? value
    : Array.isArray(config.defaultValue)
      ? config.defaultValue
      : [];

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {config.label}
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {config.options?.map((option) => {
          const selected = selectedValues.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(
                  selected
                    ? selectedValues.filter((item) => item !== option.value)
                    : [...selectedValues, option.value]
                );
              }}
              className={`max-w-full rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                selected
                  ? "border-brand bg-[#eaf3f1] text-brand"
                  : "border-line bg-white text-muted hover:border-brand hover:text-ink"
              }`}
            >
              <span className="block max-w-[128px] truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AnalysisPanel({
  selectedPoint,
  selectedObject,
  selectedAoi,
  projects,
  activeProject,
  selectedScenario,
  customQuery,
  isAnalyzing,
  analysisError,
  comparisonItems,
  comparisonMessage,
  analysisHistory,
  analysisHistorySource,
  hasResult,
  currentAnalysis,
  marketMetricsMatch,
  backendStatus,
  marketContext,
  isMarketContextLoading,
  uploadedDatasets,
  uploadedDataMessage,
  projectAois,
  aoiDraftName,
  aoiMessage,
  exploreAudience,
  exploreRole,
  exploreScenarioId,
  exploreInteractionMode,
  exploreFilters,
  exploreCandidates,
  candidateSearchStatus,
  selectedExploreCandidateId,
  exploreSetupDefaultOpen = false,
  workspaceHeading,
  onProjectChange,
  onCustomQueryChange,
  onExploreAudienceChange,
  onExploreRoleChange,
  onExploreScenarioChange,
  onExploreInteractionModeChange,
  onExploreFilterChange,
  onExploreCandidateSelect,
  onCreateProject,
  primaryCtaLabel,
  primaryCtaDisabled,
  onPrimaryCta,
  onAddToComparison,
  onRemoveComparisonItem,
  onRunComparison,
  onOpenHistoryItem,
  onClearAnalysisHistory,
  onUploadDataset,
  onImportAoiGeojson,
  onAoiDraftNameChange,
  onSaveSelectedAoi,
  onOpenSavedAoi,
  onRenameSavedAoi,
  onDeleteSavedAoi,
  onExportSelectedAoi,
  onExportSavedAoi,
  onRemoveUploadedDataset,
  onClearUploadedDatasets,
  onToggleUploadedDataset,
  onOpenMap
}: AnalysisPanelProps) {
  const { authStatus, roleLabel, isAuthenticated, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const aoiFileInputRef = useRef<HTMLInputElement | null>(null);
  const evidenceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [externalDataStatus, setExternalDataStatus] = useState<ExternalDataStatusResponse | null>(null);
  const [dataRoom, setDataRoom] = useState<ClientDataRoom | null>(null);
  const [dataRoomMessage, setDataRoomMessage] = useState<string | null>(null);
  const [pilotWorkflow, setPilotWorkflow] = useState<PilotWorkflowSummary | null>(null);
  const [pilotWorkflowMessage, setPilotWorkflowMessage] = useState<string | null>(null);
  const [reportPackages, setReportPackages] = useState<ReportPackageSummary[]>([]);
  const [reportPackageMessage, setReportPackageMessage] = useState<string | null>(null);
  const [validationGovernance, setValidationGovernance] = useState<ValidationGovernanceResponse | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [storageHealth, setStorageHealth] = useState<StorageHealthResponse | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileAsset[]>([]);
  const [isAoiSaveOpen, setIsAoiSaveOpen] = useState(false);
  const [isExploreSetupOpen, setIsExploreSetupOpen] = useState(() => exploreSetupDefaultOpen);
  const [isProjectCreateOpen, setIsProjectCreateOpen] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [projectMarketDraft, setProjectMarketDraft] = useState(activeProject.geography || "Dubai / UAE");
  const hasSelectedPoint = selectedPoint !== null;
  const hasSelectedObject = selectedObject !== null;
  const hasSelectedAoi = selectedAoi !== null;
  const exploreScenario = getExploreScenario(exploreScenarioId);
  const orderedInteractionModes = canonicalInteractionModeOrder.filter((mode) =>
    exploreScenario.interactionModes.includes(mode)
  );
  const exploreScenarios = getExploreScenariosByRole(exploreAudience, exploreRole);
  const exploreRoles = getExploreRolesByAudience(exploreAudience);
  const selectedExploreRole = getExploreRole(exploreRole);
  const selectedExploreCandidate = exploreCandidates.find((candidate) => candidate.id === selectedExploreCandidateId) ?? null;
  const hasValidWorkflowTarget = hasSelectedPoint || hasSelectedObject || hasSelectedAoi || selectedExploreCandidate !== null;
  const topExploreCandidates = exploreCandidates.slice(0, 3);
  const isCriteriaFirstMode = exploreInteractionMode === "criteria_first";
  const hasSearchedCandidates = isCriteriaFirstMode && candidateSearchStatus === "searched" && exploreCandidates.length > 0;
  const candidateSearchStateLabel =
    candidateSearchStatus === "searched"
      ? "Results updated"
      : candidateSearchStatus === "stale"
        ? "Criteria changed — update search"
        : "No search run yet";
  const candidateSearchEmptyMessage =
    candidateSearchStatus === "stale"
      ? "Criteria changed — update search"
      : isCriteriaFirstMode
        ? "No search run yet"
        : "Switch to Criteria-first to search candidate zones.";
  const availableSources = getScenarioDataSources(selectedScenario).slice(0, 3);
  const parsedUploads = uploadedDatasets.filter((dataset) => dataset.status === "parsed");
  const hasComparisonReady = comparisonItems.length >= 2;
  const contextStatus = marketContext?.isGeneralContext
    ? "demo"
    : marketContext
      ? "seed"
      : "real-ready";
  const analysisHistoryStatus =
    analysisHistorySource === "DB" ? "Supabase-backed" : "Local fallback";
  const projectAccessLabel =
    authStatus.effectiveMode === "supabase_auth"
      ? isAuthenticated
        ? `Authenticated / ${roleLabel}`
        : "Public preview / sign-in available"
      : `${authStatus.label} / ${roleLabel}`;
  const pilotWorkflowBadge = pilotWorkflow?.readiness ? formatDataRoomLabel(pilotWorkflow.readiness.label) : "workflow";
  const pilotInputsProvided = pilotWorkflow?.clientInputs.filter((item) =>
    ["provided_unvalidated", "in_review", "accepted_for_screening", "not_applicable"].includes(item.status)
  ).length ?? 0;
  const pilotInputsTotal = pilotWorkflow?.clientInputs.filter((item) => item.required).length ?? 0;
  const pilotDeliverablesReady = pilotWorkflow?.deliverables.filter((item) =>
    ["generated", "ready_for_review", "validation_required"].includes(item.status)
  ).length ?? 0;
  const pilotDeliverablesTotal = pilotWorkflow?.deliverables.length ?? 0;
  const validationSummary = validationGovernance?.summary;
  const reviewSummaries = validationGovernance?.reviewSummaries ?? [];
  const reviewBlockedCount = reviewSummaries.filter((item) =>
    ["needs_more_evidence", "rejected", "expired"].includes(item.latestStatus)
  ).length;
  const validationBadge = validationSummary?.officialValidatedCount
    ? "official evidence"
    : validationSummary?.clientValidatedCount || validationSummary?.inReviewCount
      ? "client review"
      : "screening only";
  const actionUnavailableMessage = "Select a map point, AOI, object, or candidate preview to begin.";
  const visiblePrimaryCtaLabel = primaryCtaDisabled && !hasValidWorkflowTarget ? "Run Express Analysis" : primaryCtaLabel;
  const pilotPackage = getPilotPackageForProject(activeProject.projectKey, activeProject.clientType);
  const pilotChecklist = [
    { label: "Select client type", status: activeProject.clientType ? "Done" : "Needed" },
    { label: "Choose pilot package", status: pilotPackage ? "Done" : "Needed" },
    { label: "Upload client CSV/GeoJSON", status: parsedUploads.length > 0 ? "Done" : "Needed" },
    { label: "Run analysis on 3-10 sites", status: analysisHistory.length >= 3 ? "Done" : "Needed" },
    { label: "Generate reports", status: hasResult ? "Done" : "Needed" },
    { label: "Compare shortlisted sites", status: hasComparisonReady ? "Done" : "Needed" },
    { label: "Validate official sources", status: "Needed" },
    { label: "Export pilot deliverables", status: hasResult ? "Optional" : "Needed" }
  ];

  useEffect(() => {
    if (exploreInteractionMode === "map_first") {
      setIsExploreSetupOpen(false);
      return;
    }

    setIsExploreSetupOpen(candidateSearchStatus !== "searched");
  }, [candidateSearchStatus, exploreInteractionMode, exploreScenarioId]);

  useEffect(() => {
    if (!enableLegacyPanelServerFanout) return;
    let isMounted = true;

    fetch("/api/external-data/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ExternalDataStatusResponse | null) => {
        if (isMounted) {
          setExternalDataStatus(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setExternalDataStatus(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!enableLegacyPanelServerFanout) return;
    let isMounted = true;

    fetch(`/api/data-room?projectKey=${encodeURIComponent(activeProject.projectKey)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ClientDataRoom | null) => {
        if (isMounted) {
          setDataRoom(payload);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDataRoom(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeProject.projectKey, hasResult, projectAois.length, uploadedDatasets.length]);

  useEffect(() => {
    if (!enableLegacyPanelServerFanout) return;
    let isMounted = true;

    fetch(`/api/validation?projectKey=${encodeURIComponent(activeProject.projectKey)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ValidationGovernanceResponse | null) => {
        if (isMounted) setValidationGovernance(payload);
      })
      .catch(() => {
        if (isMounted) setValidationGovernance(null);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProject.projectKey, selectedAoi?.id, hasResult]);

  useEffect(() => {
    if (!enableLegacyPanelServerFanout) return;
    let isMounted = true;

    Promise.all([
      fetch("/api/storage/health").then((response) => (response.ok ? response.json() : null)),
      fetch(`/api/storage/evidence-files?projectKey=${encodeURIComponent(activeProject.projectKey)}`).then((response) => (response.ok ? response.json() : null))
    ])
      .then(([storagePayload, filesPayload]: [StorageHealthResponse | null, EvidenceFilesResponse | null]) => {
        if (!isMounted) return;
        setStorageHealth(storagePayload);
        setEvidenceFiles(Array.isArray(filesPayload?.items) ? filesPayload.items : []);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setStorageHealth(null);
        setEvidenceFiles([]);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProject.projectKey, selectedAoi?.id, hasResult]);

  useEffect(() => {
    if (!enableLegacyPanelServerFanout) return;
    let isMounted = true;

    fetch(`/api/pilot-workflow?projectKey=${encodeURIComponent(activeProject.projectKey)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: PilotWorkflowSummary | null) => {
        if (isMounted) {
          setPilotWorkflow(payload);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPilotWorkflow(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeProject.projectKey, hasResult, projectAois.length, uploadedDatasets.length]);

  useEffect(() => {
    if (!enableLegacyPanelServerFanout) return;
    let isMounted = true;

    fetch(`/api/report-packages?projectKey=${encodeURIComponent(activeProject.projectKey)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { summaries?: ReportPackageSummary[] } | null) => {
        if (isMounted) {
          setReportPackages(Array.isArray(payload?.summaries) ? payload.summaries : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReportPackages([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeProject.projectKey, hasResult]);

  useEffect(() => {
    setIsAoiSaveOpen(false);
  }, [selectedAoi?.id]);

  async function refreshDataRoom() {
    try {
      const response = await fetch(`/api/data-room?projectKey=${encodeURIComponent(activeProject.projectKey)}`);
      if (response.ok) {
        setDataRoom(await response.json() as ClientDataRoom);
      }
    } catch {
      setDataRoomMessage("Data room summary unavailable.");
    }
  }

  async function refreshPilotWorkflow() {
    try {
      const response = await fetch(`/api/pilot-workflow?projectKey=${encodeURIComponent(activeProject.projectKey)}`);
      if (response.ok) {
        setPilotWorkflow(await response.json() as PilotWorkflowSummary);
      }
    } catch {
      setPilotWorkflowMessage("Pilot workflow summary unavailable.");
    }
  }

  async function refreshReportPackages() {
    try {
      const response = await fetch(`/api/report-packages?projectKey=${encodeURIComponent(activeProject.projectKey)}`);
      const payload = response.ok ? await response.json() as { summaries?: ReportPackageSummary[] } : null;
      setReportPackages(Array.isArray(payload?.summaries) ? payload.summaries : []);
    } catch {
      setReportPackageMessage("Report packages are temporarily unavailable.");
    }
  }

  async function createWorkspaceReportPackage() {
    if (!currentAnalysis) {
      setReportPackageMessage("Run analysis before creating a report package.");
      return;
    }

    setReportPackageMessage("Creating report package...");
    const response = await fetch("/api/report-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectKey: activeProject.projectKey,
        packageType: activeProject.clientType === "developer"
          ? "development_feasibility"
          : activeProject.clientType === "bank"
            ? "bank_asset_review"
            : "investment_screening",
        analysisId: currentAnalysis.id,
        reportId: currentAnalysis.id.endsWith("-report") ? currentAnalysis.id : `${currentAnalysis.id}-report`,
        aoiId: selectedAoi?.savedAoiId ?? selectedAoi?.id ?? null,
        includeDataRoom: true,
        includeValidation: true,
        includeEvidenceReview: true,
        includePilotWorkflow: true
      })
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };

    if (!response.ok || payload.ok === false) {
      setReportPackageMessage(payload.message ?? "Report package could not be created.");
      return;
    }

    setReportPackageMessage("Report package created. Browser Print / Save as PDF remains the PDF workflow.");
    await refreshReportPackages();
    await refreshDataRoom();
    await refreshPilotWorkflow();
  }

  async function refreshValidationGovernance() {
    try {
      const response = await fetch(`/api/validation?projectKey=${encodeURIComponent(activeProject.projectKey)}`);
      if (response.ok) {
        setValidationGovernance(await response.json() as ValidationGovernanceResponse);
      }
    } catch {
      setValidationMessage("Validation governance summary unavailable.");
    }
  }

  async function refreshEvidenceFiles() {
    try {
      const response = await fetch(`/api/storage/evidence-files?projectKey=${encodeURIComponent(activeProject.projectKey)}`);
      if (!response.ok) return;
      const payload = await response.json() as EvidenceFilesResponse;
      setEvidenceFiles(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setValidationMessage("Evidence file summary unavailable.");
    }
  }

  async function attachEvidenceFile(file: File) {
    const maxFileSize = storageHealth?.maxFileSizeBytes ?? 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setValidationMessage("Keep evidence uploads under the 5 MB MVP limit.");
      return;
    }

    const linkedAoiId = selectedAoi?.savedAoiId ?? selectedAoi?.id;
    const preferredEvidence = validationGovernance?.evidence?.find((item) =>
      linkedAoiId ? item.linkedAoiIds?.includes(linkedAoiId) : true
    );
    const formData = new FormData();
    formData.append("projectId", activeProject.id ?? "");
    formData.append("projectKey", activeProject.projectKey);
    formData.append("notes", linkedAoiId ? "Attached from Workspace selected AOI." : "Attached from Workspace validation evidence block.");
    if (preferredEvidence?.id) formData.append("validationEvidenceId", preferredEvidence.id);
    if (linkedAoiId) formData.append("aoiId", linkedAoiId);
    if (currentAnalysis?.id) formData.append("reportId", currentAnalysis.id);
    formData.append("file", file);

    const response = await fetch("/api/storage/evidence-files", { method: "POST", body: formData });
    const payload = await response.json() as { ok?: boolean; message?: string; dataHonesty?: string };
    setValidationMessage(payload.ok === false
      ? payload.message ?? "Evidence file could not be attached."
      : storageHealth?.storageReady
        ? "Evidence file attached. Review is required before changing validation posture."
        : "Evidence file metadata attached. Binary storage is not configured.");
    await refreshEvidenceFiles();
    await refreshValidationGovernance();
    await refreshDataRoom();
    await refreshPilotWorkflow();
  }

  async function addValidationEvidenceForSelection() {
    const linkedAoiId = selectedAoi?.savedAoiId ?? selectedAoi?.id;
    setValidationMessage(null);
    const response = await fetch("/api/validation/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectKey: activeProject.projectKey,
        title: linkedAoiId ? `Validation evidence requested for ${selectedAoi?.name ?? "selected AOI"}` : "Validation evidence requested for selected site",
        sourceCategory: "client_uploaded_document",
        sourceName: "Client provided evidence placeholder",
        accessMode: "client_provided",
        validationStatus: "evidence_requested",
        confidence: "unknown",
        linkedAoiIds: linkedAoiId ? [linkedAoiId] : [],
        linkedAnalysisIds: currentAnalysis?.id ? [currentAnalysis.id] : [],
        description: "Metadata placeholder for client/official validation evidence. No secure file upload is connected yet."
      })
    });

    if (!response.ok) {
      setValidationMessage("Validation evidence metadata could not be created.");
      return;
    }

    setValidationMessage(linkedAoiId ? "Validation evidence metadata linked to the selected AOI." : "Validation evidence metadata registered for this project.");
    await refreshValidationGovernance();
    await refreshDataRoom();
    await refreshPilotWorkflow();
  }

  async function createWorkspaceReviewDecision(decision: string) {
    const linkedAoiId = selectedAoi?.savedAoiId ?? selectedAoi?.id;
    const target = validationGovernance?.evidence?.find((item) =>
      linkedAoiId ? item.linkedAoiIds?.includes(linkedAoiId) : false
    ) ?? validationGovernance?.evidence?.[0];

    if (!target) {
      setValidationMessage("Create validation evidence before adding a review note.");
      return;
    }

    const linkedFile = evidenceFiles.find((file) => file.linkedValidationEvidenceIds?.includes(target.id));
    const response = await fetch(`/api/validation/evidence/${encodeURIComponent(target.id)}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectKey: activeProject.projectKey,
        decision,
        evidenceFileId: linkedFile?.id,
        reviewerName: user?.name ?? "GeoAI reviewer",
        reviewerRole: "screening reviewer",
        notes: decision === "request_more_evidence"
          ? "Additional client or official evidence is required before this item can support a claim."
          : "Evidence moved into review for screening workflow only. Official validation remains required."
      })
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };

    if (!response.ok || payload.ok === false) {
      setValidationMessage(payload.message ?? "Review note could not be recorded.");
      return;
    }

    setValidationMessage("Review note recorded. Evidence remains caveated.");
    await refreshValidationGovernance();
    await refreshEvidenceFiles();
    await refreshDataRoom();
    await refreshPilotWorkflow();
  }

  async function addCurrentEvidenceToDataRoom() {
    const selectedSavedAoi = selectedAoi
      ? projectAois.find((aoi) => aoi.id === selectedAoi.savedAoiId || aoi.id === selectedAoi.id)
      : null;
    const assetType: DataRoomAssetType = currentAnalysis ? "analysis" : "aoi";

    if (selectedAoi && !selectedSavedAoi && !currentAnalysis) {
      setDataRoomMessage("Save AOI before adding it to the data room.");
      return;
    }

    if (!selectedAoi && !currentAnalysis) {
      setDataRoomMessage("Select an AOI or run analysis before adding evidence.");
      return;
    }

    const payload = currentAnalysis
      ? {
          id: `analysis-evidence-${activeProject.projectKey}-${currentAnalysis.id}`,
          projectId: activeProject.id,
          projectKey: activeProject.projectKey,
          name: currentAnalysis.selectedAoi?.name ?? currentAnalysis.selectedObject?.name ?? currentAnalysis.title,
          description: "GeoAI generated screening analysis; official validation required.",
          assetType,
          sourceType: "generated_by_geoai",
          linkedAoiIds: currentAnalysis.selectedAoi?.savedAoiId ? [currentAnalysis.selectedAoi.savedAoiId] : currentAnalysis.selectedAoi?.id ? [currentAnalysis.selectedAoi.id] : [],
          linkedAnalysisIds: [currentAnalysis.id],
          validationStatus: "ready_for_review"
        }
      : {
          id: `aoi-evidence-${activeProject.projectKey}-${selectedSavedAoi?.id ?? selectedAoi?.id}`,
          projectId: activeProject.id,
          projectKey: activeProject.projectKey,
          name: selectedSavedAoi?.name ?? selectedAoi?.name ?? "Selected AOI",
          description: "User-provided AOI screening geometry; official validation required.",
          assetType,
          sourceType: selectedAoi?.sourceType === "uploaded_geojson" ? "user_uploaded" : "user_drawn",
          linkedAoiIds: [selectedSavedAoi?.id ?? selectedAoi?.id ?? ""].filter(Boolean),
          validationStatus: "validation_required"
        };

    const response = await fetch("/api/data-room/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json() as { ok?: boolean; message?: string };
    setDataRoomMessage(result.ok === false
      ? result.message ?? "Unable to add evidence item."
      : currentAnalysis
        ? "Analysis added as a data room evidence item."
        : "AOI available in the data room.");
    await refreshDataRoom();
    await refreshPilotWorkflow();
  }

  async function updatePilotInputStatus(item: ClientInputItem, status: ClientInputStatus) {
    const response = await fetch(`/api/pilot-workflow/client-inputs/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status })
    });

    if (!response.ok) {
      setPilotWorkflowMessage("Client input status could not be saved locally.");
      return;
    }

    setPilotWorkflowMessage("Client input status updated locally. Official validation remains required.");
    await refreshPilotWorkflow();
  }

  async function updatePilotDeliverableStatus(item: PilotDeliverableStatus, status: PilotDeliverableWorkflowStatus) {
    const response = await fetch(`/api/pilot-workflow/deliverables/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status })
    });

    if (!response.ok) {
      setPilotWorkflowMessage("Deliverable status could not be saved locally.");
      return;
    }

    setPilotWorkflowMessage("Deliverable status updated locally. Review readiness remains caveated.");
    await refreshPilotWorkflow();
  }

  const externalSources = externalDataStatus?.sources ?? [];
  const externalReadiness = externalDataStatus?.readiness ?? [];
  const externalSourceStatus = (id: string) => externalSources.find((source) => source.id === id);
  const externalReadinessStatus = (id: string) => externalReadiness.find((source) => source.sourceId === id);
  const externalManifestSource = (id: string) => externalDataStatus?.manifest?.sources?.find((source) => source.id === id);
  const formatSourceStatus = (status?: string, fallback = "planned") => sourceStatusToLabel(status ?? fallback);
  const externalStatusRows = [
    {
      label: "DLD / Dubai Pulse",
      value: formatSourceStatus(externalReadinessStatus("dld-dubai-pulse-transactions")?.status, "sample_fallback"),
      detail: externalReadinessStatus("dld-dubai-pulse-transactions")?.caveat ??
        externalSourceStatus("dld-dubai-pulse-transactions")?.disclaimer
    },
    {
      label: "OSM / Geofabrik",
      value: formatSourceStatus(externalReadinessStatus("osm-geofabrik-baseline")?.status, "sample_fallback"),
      detail: externalReadinessStatus("osm-geofabrik-baseline")?.caveat ??
        externalSourceStatus("osm-geofabrik-baseline")?.disclaimer
    },
    {
      label: "Overture Maps",
      value: formatSourceStatus(externalReadinessStatus("overture-maps-open-buildings")?.status, "manual_import_ready"),
      detail: externalReadinessStatus("overture-maps-open-buildings")?.caveat ??
        externalSourceStatus("overture-maps-open-buildings")?.disclaimer
    },
    {
      label: "Open-Meteo",
      value: formatSourceStatus(externalReadinessStatus("open-meteo-climate")?.status, "connected"),
      detail: externalReadinessStatus("open-meteo-climate")?.caveat ??
        externalSourceStatus("open-meteo-climate")?.disclaimer
    },
    {
      label: "NASA POWER / OpenAQ",
      value: `${formatSourceStatus(externalReadinessStatus("nasa-power-solar-energy")?.status, "connected")} / ${formatSourceStatus(externalReadinessStatus("openaq-air-quality")?.status, "sample_fallback")}`,
      detail: externalReadinessStatus("nasa-power-solar-energy")?.caveat ??
        externalSourceStatus("nasa-power-solar-energy")?.disclaimer
    },
    {
      label: "WorldPop",
      value: formatSourceStatus(externalReadinessStatus("worldpop-demographics")?.status, "sample_fallback"),
      detail: externalReadinessStatus("worldpop-demographics")?.caveat ??
        externalSourceStatus("worldpop-demographics")?.disclaimer
    },
    {
      label: "Copernicus / Sentinel",
      value: formatSourceStatus(externalReadinessStatus("copernicus-sentinel-metadata")?.status, "token_required"),
      detail: externalReadinessStatus("copernicus-sentinel-metadata")?.caveat ??
        externalSourceStatus("copernicus-sentinel-metadata")?.disclaimer
    },
    {
      label: "GeoDubai / Municipality",
      value: "Planned validation / not connected",
      detail: externalSourceStatus("geodubai-municipality-validation")?.disclaimer
    }
  ];
  async function handleDatasetFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    try {
      if (file) {
        await onUploadDataset(file);
      }
    } finally {
      input.value = "";
      input.blur();
    }
  }

  async function handleAoiFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    try {
      if (file) {
        await onImportAoiGeojson(file);
      }
    } finally {
      input.value = "";
      input.blur();
    }
  }

  async function handleProjectCreate() {
    const name = projectNameDraft.trim();
    if (!name) {
      return;
    }

    await onCreateProject({
      name,
      audience: exploreAudience,
      role: exploreRole,
      scenarioId: exploreScenarioId,
      geography: projectMarketDraft.trim() || "Dubai / UAE"
    });
    setProjectNameDraft("");
    setProjectMarketDraft("Dubai / UAE");
    setIsProjectCreateOpen(false);
  }

  return (
    <aside className="flex min-h-0 max-w-full flex-col border-line bg-white max-lg:border-t lg:h-full lg:w-[380px] lg:overflow-hidden lg:border-l">
      <section className="min-w-0 max-w-full overflow-x-hidden p-3 pb-5 [scrollbar-width:thin] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {!hasResult ? <h1 className="sr-only">{workspaceHeading}</h1> : null}
        <div className="grid min-w-0 gap-2">
          <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-2">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-surface p-1">
              {(["b2b", "b2c"] as ExploreAudience[]).map((audience) => (
                <button
                  key={audience}
                  type="button"
                  aria-pressed={exploreAudience === audience}
                  onClick={() => onExploreAudienceChange(audience)}
                  className={`h-10 rounded-md px-2 text-xs font-semibold transition sm:h-8 ${
                    exploreAudience === audience
                      ? "bg-brand text-white shadow-sm"
                      : "text-muted hover:bg-white hover:text-ink"
                  }`}
                >
                  {audience.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-surface p-2">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="active-project"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-muted"
              >
                Project
              </label>
              <Link href="/projects" className="text-xs font-semibold text-brand transition hover:text-[#113f50]">
                Projects
              </Link>
            </div>
            <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select
                id="active-project"
                value={activeProject.projectKey}
                onChange={(event) => onProjectChange(event.target.value)}
                className="h-10 min-w-0 rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand sm:h-9"
              >
                {projects.map((project) => (
                  <option key={project.projectKey} value={project.projectKey}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setProjectMarketDraft(activeProject.geography || "Dubai / UAE");
                  setIsProjectCreateOpen((value) => !value);
                }}
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50] sm:h-9"
              >
                Create
              </button>
            </div>
            {isProjectCreateOpen ? (
              <div className="mt-3 grid gap-2 rounded-md border border-line bg-white p-2">
                <label className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Project name
                  </span>
                  <input
                    value={projectNameDraft}
                    onChange={(event) => setProjectNameDraft(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand sm:h-8"
                    placeholder="Pilot screening project"
                  />
                </label>
                <label className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Location / market
                  </span>
                  <input
                    value={projectMarketDraft}
                    onChange={(event) => setProjectMarketDraft(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand sm:h-8"
                    placeholder="Dubai / UAE"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-surface px-2 py-1.5 text-[11px] text-muted">
                    <span className="font-semibold text-ink">{exploreAudience.toUpperCase()}</span> / {selectedExploreRole.label}
                  </div>
                  <button
                    type="button"
                    disabled={projectNameDraft.trim().length === 0}
                    onClick={() => {
                      void handleProjectCreate();
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:bg-[#c9d2d7] sm:h-8"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section
            data-workspace-screening-setup
            className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-2.5"
          >
            <div className="grid grid-cols-1 gap-2">
              <label className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Role
                </span>
                <select
                  value={exploreRole}
                  onChange={(event) => onExploreRoleChange(event.target.value as ExploreRole)}
                  className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 pr-10 text-[13px] font-semibold text-ink outline-none transition focus:border-brand sm:h-10"
                >
                  {exploreRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Scenario
                </span>
                <select
                  value={exploreScenarioId}
                  onChange={(event) => onExploreScenarioChange(event.target.value as ExploreScenarioId)}
                  className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 pr-10 text-[13px] font-semibold text-ink outline-none transition focus:border-brand sm:h-10"
                >
                  {exploreScenarios.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              data-scenario-context
              className="mt-2 rounded-md border border-[#b9dfe3] bg-[#eefafa] px-3 py-2.5"
            >
              <p
                data-scenario-primary-copy
                className="whitespace-normal break-words text-sm font-semibold leading-5 text-ink"
              >
                {exploreScenario.primaryCTA}
              </p>
              <p
                data-scenario-summary-copy
                className="mt-1 whitespace-normal break-words text-[13px] leading-5 text-muted"
              >
                {exploreScenario.subtitle}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand">
                  {selectedExploreRole.label}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Interaction Mode
                </p>
                <button
                  type="button"
                  onClick={onOpenMap}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-2 text-[10px] font-semibold text-ink transition hover:border-brand min-[1367px]:hidden"
                >
                  Open map
                </button>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {orderedInteractionModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    data-interaction-mode={mode}
                    aria-pressed={exploreInteractionMode === mode}
                    onClick={() => onExploreInteractionModeChange(mode)}
                    className={`h-10 rounded-md border px-2 text-[11px] font-semibold transition sm:h-8 ${
                      exploreInteractionMode === mode
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-surface text-muted hover:border-brand hover:text-ink"
                    }`}
                  >
                    {getExploreModeLabel(mode)}
                  </button>
                ))}
              </div>
            </div>

            <details
              className="mt-2 rounded-md border border-line bg-surface px-2"
              open={isExploreSetupOpen}
              onToggle={(event) => setIsExploreSetupOpen(event.currentTarget.open)}
            >
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 py-1.5 text-xs font-semibold text-ink sm:min-h-8">
                <span>Scenario setup</span>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand">
                  {exploreScenario.inputSchema.length} controls
                </span>
              </summary>
              <div className="grid grid-cols-2 gap-2 border-t border-line py-2">
                {exploreScenario.inputSchema.map((config) => (
                  <div key={config.id} className={config.type === "multi_select" ? "order-last col-span-2" : "min-w-0"}>
                    <ExploreSetupControl
                      config={config}
                      value={exploreFilters[config.id]}
                      onChange={(value) => onExploreFilterChange(config.id, value)}
                    />
                  </div>
                ))}
              </div>
            </details>

            <div className="mt-2 rounded-md border border-line bg-surface p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Candidate Search
                </p>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand">
                    {candidateSearchStateLabel}
                  </span>
                  {hasSearchedCandidates ? (
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-muted">
                      {exploreCandidates.length}
                    </span>
                  ) : null}
                </div>
              </div>
              {hasSearchedCandidates ? (
                <>
                  <div className="mt-2 grid gap-2">
                    {topExploreCandidates.map((candidate, index) => {
                      const selected = candidate.id === selectedExploreCandidate?.id;

                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => onExploreCandidateSelect(candidate.id)}
                          className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-md border bg-white p-2 text-left transition ${
                            selected ? "border-brand ring-1 ring-[#b8d0cc]" : "border-line hover:border-brand"
                          }`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-[11px] font-bold text-brand">
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block whitespace-normal text-xs font-semibold leading-4 text-ink">{candidate.title}</span>
                            <span className="mt-0.5 block text-[11px] leading-4 text-muted">
                              {getExploreCandidateSourceLabel(candidate.sourceType)} / validation required
                            </span>
                          </span>
                          <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-xs font-black text-brand">
                            {candidate.score}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted">
                    Select a result to analyze it, or compare the shortlist.
                  </p>
                </>
              ) : (
                <div className="mt-2 rounded-md border border-dashed border-line bg-white px-2 py-2 text-[11px] leading-4 text-muted">
                  {candidateSearchEmptyMessage}
                </div>
              )}
            </div>

            <div className="mt-2 min-w-0">
              <label
                htmlFor="custom-query"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Custom Query
              </label>
              <textarea
                id="custom-query"
                rows={3}
                value={customQuery}
                onChange={(event) => onCustomQueryChange(event.target.value)}
                placeholder={
                  hasComparisonReady
                    ? "Refine this comparison"
                    : exploreScenario.sampleQueries[0] ?? "Ask a scenario-specific question"
                }
                className="mt-1 w-full resize-none rounded-md border border-line bg-surface px-2 py-2 text-xs text-ink outline-none transition placeholder:text-muted/70 focus:border-brand"
              />
            </div>
          </section>

          <details className="order-[20] min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white px-3">
            <summary className="flex min-h-[50px] cursor-pointer list-none items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">AOI tools</p>
                <h2 className="mt-1 truncate text-sm font-semibold text-ink">
                  {projectAois.length > 0 ? `${projectAois.length} saved for this project` : "AOI quick actions"}
                </h2>
                <p className="mt-1 truncate text-xs leading-5 text-muted">
                  {hasSelectedAoi ? (selectedAoi.savedAoiId ? "Saved AOI selected" : "AOI not saved") : "Draw or import an AOI to start."}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
                Open
              </span>
            </summary>

            <div className="border-t border-line py-3">

            {hasSelectedAoi ? (
              <div className="mt-2 rounded-md border border-line bg-surface p-2">
                {isAoiSaveOpen ? (
                  <div className="grid gap-2">
                    <label htmlFor="aoi-name" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      AOI name
                    </label>
                    <input
                      id="aoi-name"
                      value={aoiDraftName}
                      onChange={(event) => onAoiDraftNameChange(event.target.value)}
                      className="h-8 w-full rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
                      placeholder="AOI name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSaveSelectedAoi();
                          setIsAoiSaveOpen(false);
                        }}
                        className="inline-flex h-8 items-center justify-center rounded-md bg-brand px-2 text-[11px] font-semibold text-white transition hover:bg-[#113f50]"
                      >
                        Confirm Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAoiSaveOpen(false)}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink">
                        {selectedAoi.savedAoiId ? "AOI saved" : "AOI not saved"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {selectedAoi.sourceType === "uploaded_geojson" ? "Uploaded GeoJSON AOI" : "User-drawn AOI"} / validation required
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAoiSaveOpen(true)}
                        className="inline-flex h-8 items-center justify-center rounded-md bg-brand px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#113f50]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={onExportSelectedAoi}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-2.5 text-[11px] font-semibold text-ink transition hover:border-brand"
                      >
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => aoiFileInputRef.current?.click()}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-2.5 text-[11px] font-semibold text-ink transition hover:border-brand"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-line bg-surface p-2">
                <p className="min-w-0 truncate text-xs text-muted">Draw or import an AOI to start.</p>
                <button
                  type="button"
                  onClick={() => aoiFileInputRef.current?.click()}
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand"
                >
                  Import
                </button>
              </div>
            )}

            <input
              ref={aoiFileInputRef}
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              className="hidden"
              onChange={(event) => {
                void handleAoiFileChange(event);
              }}
            />

            {aoiMessage ? (
              <p className="mt-2 rounded-md bg-surface px-2 py-2 text-xs leading-5 text-muted">{aoiMessage}</p>
            ) : null}

            <details className="mt-2 rounded-md border border-line bg-surface px-2">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 py-1.5 text-xs font-semibold text-ink">
                <span>Saved AOIs</span>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] text-brand">{projectAois.length}</span>
              </summary>
              <div className="grid gap-2 border-t border-line py-2">
                {projectAois.length === 0 ? (
                  <p className="rounded-md bg-white p-2 text-xs leading-5 text-muted">No saved AOIs yet.</p>
                ) : (
                  projectAois.map((aoi) => (
                    <div key={aoi.id} className="rounded-md bg-white p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">{aoi.name}</p>
                          <p className="mt-1 truncate text-[11px] text-muted">
                            {sourceTypeLabel(aoi.sourceType)} / {formatArea(aoi.measurements.areaSqM)}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-muted">{validationStatusLabel(aoi.validationStatus)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenSavedAoi(aoi)}
                          className="shrink-0 rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-brand"
                        >
                          Open
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const nextName = window.prompt("Rename AOI", aoi.name);
                            if (nextName?.trim()) onRenameSavedAoi(aoi, nextName.trim());
                          }}
                          className="rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-semibold text-muted"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => onExportSavedAoi(aoi)}
                          className="rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-semibold text-muted"
                        >
                          Export
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSavedAoi(aoi.id)}
                          className="rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-semibold text-muted"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>
            </div>
          </details>

          <details className="order-[25] min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white px-3">
            <summary className="flex min-h-[50px] cursor-pointer list-none items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Project data</p>
                <h2 className="mt-1 truncate text-sm font-semibold text-ink">
                  {uploadedDatasets.length > 0 ? `${uploadedDatasets.length} browser-local dataset${uploadedDatasets.length === 1 ? "" : "s"}` : "CSV / GeoJSON import"}
                </h2>
                <p className="mt-1 truncate text-xs leading-5 text-muted">Project-scoped prototype storage; official validation required.</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">Open</span>
            </summary>

            <div className="grid gap-3 border-t border-line py-3">
              <p id="browser-upload-warning" className="rounded-md border border-[#e5d7b2] bg-[#fff9e9] px-3 py-2 text-xs leading-5 text-[#6c5520]">
                Do not upload confidential, personal or regulated data. Files are parsed in this browser and persist unencrypted in this origin&apos;s local storage until you remove them.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50]"
                >
                  Import CSV / GeoJSON
                </button>
                {uploadedDatasets.length > 0 ? (
                  <button
                    type="button"
                    onClick={onClearUploadedDatasets}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink"
                  >
                    Remove all project files
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.geojson,.json,text/csv,application/geo+json,application/json"
                aria-describedby="browser-upload-warning"
                className="hidden"
                onChange={(event) => {
                  void handleDatasetFileChange(event);
                }}
              />

              {uploadedDatasets.length > 0 ? (
                <div className="grid gap-2">
                  {uploadedDatasets.map((dataset) => (
                    <div key={dataset.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-line bg-surface p-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-ink">{dataset.name}</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted">
                          {dataset.type.toUpperCase()} / {formatUploadedDatasetDetail(dataset)} / {dataset.officialStatus}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {dataset.type === "geojson" && dataset.status === "parsed" ? (
                          <button
                            type="button"
                            onClick={() => onToggleUploadedDataset(dataset.id)}
                            className="rounded-md border border-line bg-white px-2 py-1 text-[10px] font-semibold text-muted"
                          >
                            {dataset.visible === false ? "Show" : "Hide"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onRemoveUploadedDataset(dataset.id)}
                          className="rounded-md border border-line bg-white px-2 py-1 text-[10px] font-semibold text-muted"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md bg-surface px-3 py-2 text-xs leading-5 text-muted">No project data imported. Maximum file size: 5 MB.</p>
              )}

              {uploadedDataMessage ? <p className="rounded-md bg-surface px-3 py-2 text-xs leading-5 text-muted">{uploadedDataMessage}</p> : null}
            </div>
          </details>

          {comparisonItems.length > 0 ? (
            <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Comparison set</p>
                  <h2 className="mt-1 text-sm font-semibold text-ink">{comparisonItems.length}/3 selected</h2>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${hasComparisonReady ? "bg-[#edf4f2] text-brand" : "bg-surface text-muted"}`}>
                  {hasComparisonReady ? "Ready" : "Add one"}
                </span>
              </div>
              <div className="mt-2 grid gap-2">
                {comparisonItems.map((item) => (
                  <div key={item.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-surface px-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                      <p className="truncate text-[11px] text-muted">{item.itemType}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveComparisonItem(item.id)}
                      className="shrink-0 rounded-md border border-line bg-white px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-ink"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {comparisonMessage ? (
                <p className="mt-2 rounded-md bg-surface px-2 py-2 text-xs leading-5 text-muted">{comparisonMessage}</p>
              ) : null}
            </section>
          ) : null}
        </div>

      </section>

      <section className="sticky bottom-0 z-20 min-w-0 max-w-full flex-shrink-0 border-t border-line bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(15,23,42,0.06)] max-[639px]:static max-[639px]:shadow-none lg:static lg:pb-3 lg:shadow-none">
        {primaryCtaDisabled && !hasValidWorkflowTarget ? (
          <p className="mb-2 text-xs leading-5 text-muted">
            {actionUnavailableMessage}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!hasSelectedPoint}
          onClick={onAddToComparison}
          className="mb-2 inline-flex h-8 w-full max-w-full items-center justify-center rounded-md border border-line bg-white px-4 text-xs font-semibold text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
        >
          Add to compare
        </button>
        <button
          type="button"
          disabled={primaryCtaDisabled}
          onClick={onPrimaryCta}
          className="inline-flex h-10 w-full max-w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:bg-[#c9d2d7] disabled:text-white"
        >
          {visiblePrimaryCtaLabel}
        </button>

        {analysisError ? (
          <p className="mt-3 break-words rounded-md border border-[#f2c6bd] bg-[#fff4ed] px-3 py-2 text-sm leading-5 text-[#9f3412]">
            {analysisError}
          </p>
        ) : null}
      </section>
    </aside>
  );
}
