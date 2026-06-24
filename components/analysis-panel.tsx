"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import ingestionReport from "@/data/normalized/ingestion_report.json";
import { DataReadinessCard } from "@/components/data-readiness";
import { getScenarioDataSources } from "@/src/data/data-source-registry";
import type { DemoNarrative } from "@/src/data/demo-narratives";
import { sourceStatusToLabel } from "@/src/lib/external-data/source-status";
import { sourceTypeLabel, validationStatusLabel } from "@/src/lib/aoi-library";
import { formatArea, formatPerimeter } from "@/src/lib/polygon-aoi";
import { getPilotPackageForProject } from "@/src/lib/pilot/pilot-packages";
import { repositoryModeToLabel, type RepositoryMode } from "@/src/lib/repositories/repository-mode";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { MarketMetricsMatch } from "@/src/lib/market-metrics/types";
import type { MarketContext } from "@/src/types/market-context";
import type {
  AnalysisScenario,
  AnalysisScenarioId,
  AnalysisHistoryItem,
  ComparisonItem,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint,
  UserDrawnAoi
} from "@/src/types/geo";
import type { GuidedDemoPreset } from "@/src/data/guided-demo";
import type { UploadedDataset } from "@/src/types/uploaded-data";
import type { ProjectAoi } from "@/src/types/aoi";
import type { ClientDataRoom, DataRoomAssetType } from "@/src/types/data-room";
import type { EvidenceFileAsset } from "@/src/types/storage";
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
  projectsMode: "supabase" | "demo_seed";
  activeProject: GeoAIProject;
  scenarios: AnalysisScenario[];
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
  guidedDemoPresets: GuidedDemoPreset[];
  activeGuidedDemoId: string | null;
  activeDemoNarrative: DemoNarrative | null;
  onProjectChange: (projectKey: string) => void;
  onScenarioChange: (scenario: AnalysisScenarioId) => void;
  onCustomQueryChange: (query: string) => void;
  primaryCtaLabel: string;
  primaryCtaDisabled: boolean;
  onPrimaryCta: () => void;
  onAddToComparison: () => void;
  onLoadGuidedDemo: (presetId: string) => void;
  onLoadGuidedDemoComparison: (presetId: string) => void;
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

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

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
      <div className="min-w-0 max-w-full overflow-y-auto overflow-x-hidden break-words border-t border-line py-3 [scrollbar-width:thin]">
        <div className="max-h-[260px] min-w-0 max-w-full overflow-y-auto overflow-x-hidden pr-1">
          {children}
        </div>
      </div>
    </details>
  );
}

export function AnalysisPanel({
  selectedPoint,
  selectedObject,
  selectedAoi,
  projects,
  projectsMode,
  activeProject,
  scenarios,
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
  analysisMode,
  marketMetricsMatch,
  backendStatus,
  marketContext,
  isMarketContextLoading,
  uploadedDatasets,
  uploadedDataMessage,
  projectAois,
  aoiDraftName,
  aoiMessage,
  guidedDemoPresets,
  activeGuidedDemoId,
  activeDemoNarrative,
  onProjectChange,
  onScenarioChange,
  onCustomQueryChange,
  primaryCtaLabel,
  primaryCtaDisabled,
  onPrimaryCta,
  onAddToComparison,
  onLoadGuidedDemo,
  onLoadGuidedDemoComparison,
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
  onToggleUploadedDataset
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
  const [validationGovernance, setValidationGovernance] = useState<ValidationGovernanceResponse | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [storageHealth, setStorageHealth] = useState<StorageHealthResponse | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileAsset[]>([]);
  const [isAoiSaveOpen, setIsAoiSaveOpen] = useState(false);
  const hasSelectedPoint = selectedPoint !== null;
  const hasSelectedObject = selectedObject !== null;
  const hasSelectedAoi = selectedAoi !== null;
  const scenario = scenarios.find((item) => item.id === selectedScenario) ?? scenarios[0];
  const isCustomQuery = selectedScenario === "customQuery";
  const availableSources = getScenarioDataSources(selectedScenario).slice(0, 3);
  const parsedUploads = uploadedDatasets.filter((dataset) => dataset.status === "parsed");
  const activeGuidedDemo = guidedDemoPresets.find((preset) => preset.id === activeGuidedDemoId) ?? guidedDemoPresets[0];
  const demoGeojsonLoaded = uploadedDatasets.some((dataset) => dataset.id === "guided-demo-geojson-sites" && dataset.status === "parsed");
  const demoCsvLoaded = uploadedDatasets.some((dataset) => dataset.id === "guided-demo-csv-metrics" && dataset.status === "parsed");
  const hasComparisonReady = comparisonItems.length >= 2;
  const demoSteps = [
    { label: "Site selected", complete: hasSelectedPoint },
    { label: "Analysis ready", complete: hasResult },
    { label: "Comparison ready", complete: hasComparisonReady },
    { label: "Report ready", complete: hasResult }
  ];
  const modeStatus =
    analysisMode === "openai"
      ? "AI-powered"
      : analysisMode === "mock_fallback"
        ? "Demo fallback"
        : "Not run yet";
  const contextStatus = marketContext?.isGeneralContext
    ? "demo"
    : marketContext
      ? "seed"
      : "real-ready";
  const analysisHistoryStatus =
    analysisHistorySource === "DB" ? "Supabase-backed" : "Local fallback";
  const projectPersistenceStatus = repositoryModeToLabel(projectsMode);
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
  const validationBadge = validationSummary?.officialValidatedCount
    ? "official evidence"
    : validationSummary?.clientValidatedCount || validationSummary?.inReviewCount
      ? "client review"
      : "screening only";
  const isComparisonWorkflow = primaryCtaLabel === "Compare" || (hasComparisonReady && hasResult);
  const activeWorkflowLabel = isComparisonWorkflow
    ? "Comparison active"
    : hasResult
      ? "Analysis ready"
      : hasSelectedPoint
        ? "Ready to analyze"
        : "Select a site";
  const activeWorkflowNote = isComparisonWorkflow
    ? hasComparisonReady
      ? "Export the comparison or edit scenario/query to continue."
      : "Add another site to refresh comparison."
    : hasResult
      ? "Export the memo or edit scenario/query to continue."
      : hasSelectedPoint
        ? "Run analysis from the pinned footer."
        : "Use the map or guided demo to start.";
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

  return (
    <aside className="flex h-full max-w-full flex-col overflow-hidden border-l border-line bg-white lg:h-[calc(100vh-72px)] lg:w-[400px]">
      <section className="min-h-0 flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-4 pb-6 [scrollbar-width:thin]">
        <div className="grid min-w-0 gap-3">
          <section className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Command panel
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ink">GeoAI workspace</h1>
          </section>

          <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="active-project"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-muted"
              >
                Project workspace
              </label>
              <Link href="/projects" className="text-xs font-semibold text-brand transition hover:text-[#113f50]">
                Open dashboard
              </Link>
            </div>
            <select
              id="active-project"
              value={activeProject.projectKey}
              onChange={(event) => onProjectChange(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
            >
              {projects.map((project) => (
                <option key={project.projectKey} value={project.projectKey}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold capitalize text-brand">
                {activeProject.clientType.replace(/_/g, " ")}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                {activeProject.dataMode.replace(/_/g, "-")}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                {projectPersistenceStatus}
              </span>
              <span
                className="max-w-full truncate rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted"
                title={authStatus.caveat}
              >
                Access: {projectAccessLabel}
              </span>
            </div>
            <p className="mt-2 truncate text-[11px] leading-4 text-muted">
              {authStatus.effectiveMode === "supabase_auth" && user
                ? `Signed in as ${user.email}`
                : authStatus.caveat}
            </p>
          </section>

          <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {hasSelectedAoi ? "Selected AOI" : hasSelectedObject ? "Selected object" : "Selected point"}
                </p>
                <h2 className="mt-1 truncate text-base font-semibold text-ink">
                  {hasSelectedAoi
                    ? selectedAoi.name
                    : hasSelectedObject
                    ? selectedObject.name
                    : hasSelectedPoint
                      ? "Custom map selection"
                      : "No point selected"}
                </h2>
                <p className="mt-1 truncate text-xs leading-5 text-muted">
                  {hasSelectedAoi
                    ? `${selectedAoi.sourceType === "uploaded_geojson" ? "Uploaded GeoJSON AOI" : "User-drawn AOI"} / validation required`
                    : hasSelectedObject
                    ? selectedObject.spatialContext?.datasetName ?? selectedObject.layerName
                    : hasSelectedPoint
                      ? "Map point / user selection"
                      : "Select a point or demo object on the map"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                {hasSelectedAoi ? "AOI" : hasSelectedObject ? "Object" : "Point"}
              </span>
            </div>

            {hasSelectedAoi ? (
              <>
                <p className="mt-2 truncate text-xs leading-5 text-muted">
                  Centroid {formatCoordinate(selectedAoi.centroid.latitude)}, {formatCoordinate(selectedAoi.centroid.longitude)} · validation required
                </p>
                <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-muted">
                    Polygon AOI
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-muted">
                    {selectedAoi.sourceType === "uploaded_geojson" ? "Uploaded GeoJSON" : "User-drawn"}
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-4 gap-1.5 text-[11px]">
                  <div className="min-w-0 rounded-md bg-white px-2 py-1.5">
                    <dt className="text-muted">Area</dt>
                    <dd className="mt-0.5 truncate font-semibold text-ink">
                      {formatArea(selectedAoi.measurements.areaSqM)}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-md bg-white px-2 py-1.5">
                    <dt className="text-muted">Perimeter</dt>
                    <dd className="mt-0.5 truncate font-semibold text-ink">
                      {formatPerimeter(selectedAoi.measurements.perimeterM)}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-md bg-white px-2 py-1.5">
                    <dt className="text-muted">Vertices</dt>
                    <dd className="mt-0.5 truncate font-semibold text-ink">
                      {selectedAoi.measurements.vertexCount}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-md bg-white px-2 py-1.5">
                    <dt className="text-muted">Source</dt>
                    <dd className="mt-0.5 truncate font-semibold text-ink">
                      {selectedAoi.sourceType === "uploaded_geojson" ? "uploaded" : "drawn"}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="min-w-0 rounded-md bg-white px-2 py-2">
                  <dt className="text-muted">Lat</dt>
                  <dd className="mt-1 truncate font-semibold text-ink">
                    {selectedPoint ? formatCoordinate(selectedPoint.latitude) : "-"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-md bg-white px-2 py-2">
                  <dt className="text-muted">Lng</dt>
                  <dd className="mt-1 truncate font-semibold text-ink">
                    {selectedPoint ? formatCoordinate(selectedPoint.longitude) : "-"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-md bg-white px-2 py-2">
                  <dt className="text-muted">Type</dt>
                  <dd className="mt-1 truncate font-semibold text-ink">
                    {hasSelectedObject ? selectedObject.type : "Point"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-md bg-white px-2 py-2">
                  <dt className="text-muted">Confidence</dt>
                  <dd className="mt-1 truncate font-semibold text-ink">
                    {selectedObject?.analysisTarget?.type === "uploaded-feature"
                      ? "validation req."
                      : selectedObject?.spatialContext?.confidenceLevel ?? (hasSelectedPoint ? "user" : "-")}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {/* Secondary AOI tooling stays below Scenario/Custom Query so the command panel remains analysis-first. */}
          <section className="order-[20] min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">AOI Library</p>
                <h2 className="mt-1 truncate text-sm font-semibold text-ink">
                  {projectAois.length > 0 ? `${projectAois.length} saved for this project` : "AOI quick actions"}
                </h2>
                <p className="mt-1 truncate text-xs leading-5 text-muted">
                  {hasSelectedAoi ? (selectedAoi.savedAoiId ? "Saved AOI selected" : "AOI not saved") : "Draw or import an AOI to start."}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
                v1.8
              </span>
            </div>

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
              <div className="grid max-h-44 gap-2 overflow-y-auto border-t border-line py-2 [scrollbar-width:thin]">
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
          </section>

          <section className="grid min-w-0 max-w-full gap-2 overflow-hidden">
            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-line bg-white px-3 py-2">
            <label
              htmlFor="analysis-scenario"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Scenario
            </label>
            <select
              id="analysis-scenario"
              value={selectedScenario}
              onChange={(event) => onScenarioChange(event.target.value as AnalysisScenarioId)}
              className="mt-1 h-9 w-full rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
            >
              {scenarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs leading-5 text-muted">{scenario.description}</p>
          </div>

            <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-line bg-white px-3 py-2">
            <label
              htmlFor="custom-query"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Custom query
            </label>
            <textarea
              id="custom-query"
              rows={2}
              value={customQuery}
              onChange={(event) => onCustomQueryChange(event.target.value)}
              placeholder={
                isCustomQuery
                  ? "Enter the spatial question"
                  : hasComparisonReady
                    ? "Add context to refine comparison rationale"
                  : "Optional context"
              }
              className="mt-1 w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand"
            />
            {isCustomQuery ? (
              <p className="mt-1 text-xs leading-5 text-muted">
                Custom Query requires a question.
              </p>
            ) : null}
          </div>
          </section>

          {activeDemoNarrative ? (
            <details className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white px-3">
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Demo Script</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{activeDemoNarrative.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
                  v1.5
                </span>
              </summary>
              <div className="border-t border-line py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Decision question</p>
                <p className="mt-1 text-xs leading-5 text-ink">{activeDemoNarrative.decisionQuestion}</p>
                <ol className="mt-3 grid gap-2">
                  {activeDemoNarrative.steps.slice(0, 5).map((step) => (
                    <li key={`demo-script-${activeDemoNarrative.id}-${step.number}`} className="rounded-md bg-surface p-2">
                      <p className="text-xs font-semibold text-ink">
                        {step.number}. {step.userAction}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">{step.whatToSay}</p>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 rounded-md border border-line bg-white p-2">
                  <p className="text-xs font-semibold text-ink">What to say next</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted">{activeDemoNarrative.openingMessage}</p>
                </div>
                <p className="mt-3 text-[11px] leading-4 text-muted">{activeDemoNarrative.caveat}</p>
              </div>
            </details>
          ) : null}

          <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Guided demo
                </p>
                <h2 className="mt-1 truncate text-sm font-semibold text-ink">
                  {activeGuidedDemo.title}
                </h2>
                <p className="mt-1 truncate text-xs leading-5 text-muted">
                  {activeGuidedDemo.clientType} / local demo data
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
                v0.6
              </span>
            </div>
            <select
              value={activeGuidedDemo.id}
              onChange={(event) => onLoadGuidedDemo(event.target.value)}
              className="mt-2 h-8 w-full rounded-md border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none transition focus:border-brand"
              aria-label="Guided demo scenario"
            >
              {guidedDemoPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.title}
                </option>
              ))}
            </select>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onLoadGuidedDemo(activeGuidedDemo.id)}
                className="inline-flex h-8 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50]"
              >
                Load demo data
              </button>
              <button
                type="button"
                onClick={() => onLoadGuidedDemoComparison(activeGuidedDemo.id)}
                className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand"
              >
                Add demo sites
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {demoSteps.map((step, index) => (
                <div key={`guided-demo-step-${index}`} className="min-w-0 rounded-md bg-surface px-2 py-2 text-center">
                  <span className={`mx-auto flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold ${step.complete ? "bg-brand text-white" : "bg-white text-muted"}`}>
                    {step.complete ? "✓" : index + 1}
                  </span>
                  <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-3 text-muted">{step.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              {activeGuidedDemo.dataHonestyNote}
            </p>
          </section>

          <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Active workflow</p>
                <h2 className="mt-1 text-sm font-semibold text-ink">{activeWorkflowLabel}</h2>
                <p className="mt-1 text-xs leading-5 text-muted">{activeWorkflowNote}</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-brand">
                {primaryCtaLabel}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-surface p-2">
                <span className="text-muted">Mode</span>
                <p className="mt-1 font-semibold text-ink">{modeStatus}</p>
              </div>
              <div className="rounded-md bg-surface p-2">
                <span className="text-muted">Comparison</span>
                <p className="mt-1 font-semibold text-ink">{comparisonItems.length}/3 sites</p>
              </div>
            </div>
          </section>

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

        <div className="order-[30] mt-3 grid min-w-0 max-w-full gap-2 overflow-hidden">
          <CollapsedSection
            title="Market Context"
            badge={isMarketContextLoading ? "loading" : contextStatus}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {isMarketContextLoading
                    ? "Matching Dubai area..."
                    : marketContext?.areaName ?? "Select a point"}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-muted">
                  {marketContext
                    ? `Confidence: ${marketContext.confidenceLevel}`
                    : "Market context appears after selection"}
                </p>
              </div>
              {marketContext?.matchDistanceKm !== null && marketContext?.matchDistanceKm !== undefined ? (
                <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-muted">
                  {marketContext.matchDistanceKm.toFixed(1)} km
                </span>
              ) : null}
            </div>
            {marketContext ? (
              <p className="mt-2 break-words text-xs leading-5 text-muted">{marketContext.limitations[0]}</p>
            ) : null}
          </CollapsedSection>

          <CollapsedSection title="External Data Status" badge="v1.6">
            <div className="grid gap-2">
              {externalStatusRows.map((row) => (
                <div key={row.label} className="rounded-md border border-line bg-surface p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-ink">{row.label}</p>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand">
                      {row.value}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted">{row.detail}</p>
                </div>
              ))}
              <div className="rounded-md border border-line bg-white p-2.5 text-[11px] leading-4 text-muted">
                Real snapshot files: DLD {externalDataStatus?.availableFiles?.dldMarketMetrics ? "available" : "not loaded"} / OSM {externalDataStatus?.availableFiles?.osmBaseline ? "available" : "not loaded"}.
                {externalManifestSource("dld-dubai-pulse-transactions")?.rowCount
                  ? ` DLD areas: ${externalManifestSource("dld-dubai-pulse-transactions")?.rowCount}.`
                  : " Sample fallback remains active when snapshots are missing."}
              </div>
            </div>
          </CollapsedSection>

          <CollapsedSection title="Project Overview" badge={projectPersistenceStatus}>
            <div className="grid gap-2 text-sm">
              <div className="rounded-md border border-line bg-white p-3">
                <p className="font-semibold text-ink">{activeProject.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{activeProject.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-white p-3">
                  <span className="text-muted">Client type</span>
                  <p className="mt-1 font-semibold capitalize text-ink">{activeProject.clientType.replace(/_/g, " ")}</p>
                </div>
                <div className="rounded-md bg-white p-3">
                  <span className="text-muted">Primary scenario</span>
                  <p className="mt-1 font-semibold text-ink">{activeProject.primaryScenario}</p>
                </div>
                <div className="rounded-md bg-white p-3">
                  <span className="text-muted">Data mode</span>
                  <p className="mt-1 font-semibold text-ink">{activeProject.dataMode.replace(/_/g, "-")}</p>
                </div>
                <div className="rounded-md bg-white p-3">
                  <span className="text-muted">Recent analyses</span>
                  <p className="mt-1 font-semibold text-ink">{analysisHistory.length}</p>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted">
                Persistence: {projectPersistenceStatus}.
              </p>
            </div>
          </CollapsedSection>

          <CollapsedSection title="Validation Evidence" badge={validationBadge}>
            <div className="grid gap-2">
              <div className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {formatDataRoomLabel(validationSummary?.highestAllowedClaimLevel ?? "screening_only")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {validationSummary?.totalEvidence ?? 0} evidence item(s). Official validation remains required before decision-grade use.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                    v2.5
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Review</span>
                    <p className="mt-1 font-semibold text-ink">{validationSummary?.inReviewCount ?? 0}</p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Client</span>
                    <p className="mt-1 font-semibold text-ink">{validationSummary?.clientValidatedCount ?? 0}</p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Official</span>
                    <p className="mt-1 font-semibold text-ink">{validationSummary?.officialValidatedCount ?? 0}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-line bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Top gaps</p>
                <ul className="mt-2 grid gap-1 text-xs leading-5 text-muted">
                  {(validationSummary?.requiredValidationGaps ?? ["Ownership/title", "Zoning/planning", "Cadastral/parcel", "Valuation/comps"]).slice(0, 4).map((gap, index) => (
                    <li key={`workspace-validation-gap-${index}-${gap.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32)}`}>{gap}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  void addValidationEvidenceForSelection();
                }}
                className="inline-flex h-8 w-full items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50]"
              >
                {selectedAoi ? "Link evidence to selected AOI" : "Add validation evidence"}
              </button>
              <button
                type="button"
                onClick={() => evidenceFileInputRef.current?.click()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand"
              >
                Attach evidence file
              </button>
              <input
                ref={evidenceFileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.csv,.json,.geojson,.png,.jpg,.jpeg,.xlsx,.docx,application/pdf,text/csv,application/json,application/geo+json,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void attachEvidenceFile(file);
                  event.currentTarget.value = "";
                }}
              />
              <div className="rounded-md border border-line bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Evidence files</p>
                <div className="mt-2 grid gap-1">
                  {evidenceFiles.length > 0 ? (
                    evidenceFiles.slice(0, 3).map((file) => (
                      <div key={file.id} className="rounded-md bg-surface px-2 py-2">
                        <p className="truncate text-xs font-semibold text-ink">{file.fileName}</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted">
                          {formatDataRoomLabel(file.objectStatus)} / {formatDataRoomLabel(file.storageProvider)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs leading-5 text-muted">No evidence files attached yet.</p>
                  )}
                </div>
              </div>
              {validationMessage ? (
                <p className="rounded-md bg-surface px-2 py-2 text-xs leading-5 text-muted">{validationMessage}</p>
              ) : null}
              <p className="text-[11px] leading-4 text-muted">
                {storageHealth?.storageReady
                  ? "Uploaded evidence requires review before validation posture changes."
                  : "Metadata-only fallback; binary file storage not configured."}
                {" "}
                {validationSummary?.caveat ?? "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."}
              </p>
            </div>
          </CollapsedSection>

          <CollapsedSection
            title="Data Room / Pilot Evidence"
            badge={`${dataRoom?.assets.length ?? 0} assets`}
          >
            <div className="grid gap-2">
              <div className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Client Data Room</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {dataRoom?.summary.storageNote ?? "Local/demo fallback; durable storage not configured."}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                    v1.9
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">AOIs</span>
                    <p className="mt-1 font-semibold text-ink">{dataRoom?.summary.counts.aois ?? projectAois.length}</p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Uploads</span>
                    <p className="mt-1 font-semibold text-ink">{dataRoom?.summary.counts.uploadedDatasets ?? parsedUploads.length}</p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Reports</span>
                    <p className="mt-1 font-semibold text-ink">{dataRoom?.summary.counts.reports ?? (hasResult ? 1 : 0)}</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Checklist</span>
                    <p className="mt-1 font-semibold text-ink">
                      {dataRoom?.summary.checklistStatus.completed ?? 0}/{dataRoom?.summary.checklistStatus.total ?? 0} complete
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Analyses</span>
                    <p className="mt-1 font-semibold text-ink">{dataRoom?.summary.counts.analyses ?? analysisHistory.length}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void addCurrentEvidenceToDataRoom();
                  }}
                  className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50]"
                >
                  Add to data room
                </button>
                <p className="mt-2 text-[11px] leading-4 text-muted">
                  {selectedAoi && !projectAois.some((aoi) => aoi.id === selectedAoi.savedAoiId || aoi.id === selectedAoi.id) && !currentAnalysis
                    ? "Save AOI before adding to data room."
                    : currentAnalysis
                      ? "Analysis added as evidence item when saved here."
                      : "AOIs, reports and uploaded metadata remain local/demo evidence."}
                </p>
                {dataRoomMessage ? (
                  <p className="mt-2 rounded-md bg-white px-2 py-2 text-xs leading-5 text-muted">{dataRoomMessage}</p>
                ) : null}
              </div>
              {(dataRoom?.summary.latestAssets ?? []).slice(0, 3).map((asset) => (
                <div key={asset.id} className="rounded-md border border-line bg-white p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink">{asset.name}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">{asset.description ?? asset.caveat}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                      {formatDataRoomLabel(asset.assetType)}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-[11px] leading-4 text-muted">
                {dataRoom?.dataHonesty.caveat ?? "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."}
              </p>
            </div>
          </CollapsedSection>

          <CollapsedSection title="Pilot Context" badge={pilotWorkflowBadge}>
            <div className="grid gap-3">
              {pilotWorkflow?.workflow && pilotWorkflow.readiness ? (
                <>
                  <div className="rounded-md border border-line bg-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{pilotWorkflow.workflow.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{pilotWorkflow.workflow.decisionQuestion}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                        {pilotWorkflow.readiness.score}/100
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-white p-2">
                        <span className="text-muted">Stage</span>
                        <p className="mt-1 truncate font-semibold text-ink">{formatDataRoomLabel(pilotWorkflow.workflow.pilotStage)}</p>
                      </div>
                      <div className="rounded-md bg-white p-2">
                        <span className="text-muted">Inputs</span>
                        <p className="mt-1 font-semibold text-ink">{pilotInputsProvided}/{pilotInputsTotal}</p>
                      </div>
                      <div className="rounded-md bg-white p-2">
                        <span className="text-muted">Outputs</span>
                        <p className="mt-1 font-semibold text-ink">{pilotDeliverablesReady}/{pilotDeliverablesTotal}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-4 text-muted">{pilotWorkflow.readiness.caveat}</p>
                  </div>

                  <div className="rounded-md border border-line bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Next action</p>
                    <p className="mt-1 text-xs leading-5 text-ink">
                      {pilotWorkflow.readiness.nextActions[0] ?? "Review client input and validation gaps."}
                    </p>
                  </div>

                  <details className="rounded-md border border-line bg-surface px-2">
                    <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 py-2 text-xs font-semibold text-ink">
                      <span>Required client inputs</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] text-brand">{pilotInputsProvided}/{pilotInputsTotal}</span>
                    </summary>
                    <div className="grid max-h-44 gap-2 overflow-y-auto border-t border-line py-2 [scrollbar-width:thin]">
                      {pilotWorkflow.clientInputs.slice(0, 6).map((item) => (
                        <div key={item.id} className="rounded-md bg-white p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-ink">{item.title}</p>
                              <p className="mt-1 truncate text-[11px] text-muted">{formatDataRoomLabel(item.status)} / {item.priority}</p>
                            </div>
                            <select
                              value={item.status}
                              onChange={(event) => {
                                void updatePilotInputStatus(item, event.target.value as ClientInputStatus);
                              }}
                              className="h-7 shrink-0 rounded-md border border-line bg-surface px-1.5 text-[10px] font-semibold text-ink outline-none transition focus:border-brand"
                              aria-label={`Client input status for ${item.title}`}
                            >
                              {["missing", "requested", "provided_unvalidated", "in_review", "accepted_for_screening", "blocked", "not_applicable"].map((status) => (
                                <option key={status} value={status}>{formatDataRoomLabel(status)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>

                  <details className="rounded-md border border-line bg-surface px-2">
                    <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 py-2 text-xs font-semibold text-ink">
                      <span>Deliverables</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] text-brand">{pilotDeliverablesReady}/{pilotDeliverablesTotal}</span>
                    </summary>
                    <div className="grid max-h-44 gap-2 overflow-y-auto border-t border-line py-2 [scrollbar-width:thin]">
                      {pilotWorkflow.deliverables.slice(0, 6).map((item) => (
                        <div key={item.id} className="rounded-md bg-white p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-ink">{item.title}</p>
                              <p className="mt-1 truncate text-[11px] text-muted">{formatDataRoomLabel(item.deliverableType)}</p>
                            </div>
                            <select
                              value={item.status}
                              onChange={(event) => {
                                void updatePilotDeliverableStatus(item, event.target.value as PilotDeliverableWorkflowStatus);
                              }}
                              className="h-7 shrink-0 rounded-md border border-line bg-surface px-1.5 text-[10px] font-semibold text-ink outline-none transition focus:border-brand"
                              aria-label={`Deliverable status for ${item.title}`}
                            >
                              {["planned", "in_progress", "generated", "ready_for_review", "validation_required", "blocked"].map((status) => (
                                <option key={status} value={status}>{formatDataRoomLabel(status)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>

                  {pilotWorkflowMessage ? (
                    <p className="rounded-md bg-surface px-2 py-2 text-xs leading-5 text-muted">{pilotWorkflowMessage}</p>
                  ) : null}
                  <p className="text-[11px] leading-4 text-muted">{pilotWorkflow.dataHonesty.storageCaveat}</p>
                </>
              ) : (
                <p className="rounded-md border border-line bg-surface p-3 text-xs leading-5 text-muted">
                  Pilot workflow summary is unavailable. Workspace analysis and Data Room evidence remain usable.
                </p>
              )}
            </div>
          </CollapsedSection>

          <CollapsedSection title="Data Sources" badge={`${parsedUploads.length} local`}>
            <div className="mt-2 grid gap-2">
              <div className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">DLD / Dubai Pulse ingestion</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Prototype-ready / sample manual CSV. Live API not connected.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand">
                    ready
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Metrics</span>
                    <p className="mt-1 font-semibold text-ink">{ingestionReport.marketMetricCount} areas</p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Repository</span>
                    <p className="mt-1 font-semibold text-ink">
                      {backendStatus?.repositoryMode ? repositoryModeToLabel(backendStatus.repositoryMode) : "Local/API fallback"}
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Matched area</span>
                    <p className="mt-1 truncate font-semibold text-ink">
                      {marketMetricsMatch?.matchedAreaName ?? "not run"}
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-2">
                    <span className="text-muted">Market source</span>
                    <p className="mt-1 font-semibold text-ink">
                      {marketMetricsMatch?.sourceMode ?? "pending"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Latest local ingestion: {formatIngestionTimestamp(ingestionReport.generatedAt)}. Market comps, transaction activity, rental demand and pipeline validation support conservative scoring when matched.
                </p>
              </div>
              <div className="rounded-md border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Local dataset upload</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Upload CSV metrics or GeoJSON layers. Files stay in this browser and require official validation.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-muted">
                    local
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.geojson,.json,text/csv,application/geo+json,application/json"
                    className="hidden"
                    onChange={(event) => {
                      void handleDatasetFileChange(event);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#113f50]"
                  >
                    Add file
                  </button>
                  <button
                    type="button"
                    disabled={uploadedDatasets.length === 0}
                    onClick={onClearUploadedDatasets}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear local uploads
                  </button>
                </div>
                {uploadedDataMessage ? (
                  <p className="mt-2 rounded-md border border-line bg-white px-2 py-2 text-xs leading-5 text-muted">
                    {uploadedDataMessage}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2">
                  {uploadedDatasets.length === 0 ? (
                    <div className="rounded-md border border-dashed border-line bg-white px-3 py-3 text-xs leading-5 text-muted">
                      No local datasets uploaded. Try the sample CSV or GeoJSON in `data/upload-samples`.
                    </div>
                  ) : (
                    uploadedDatasets.map((dataset) => (
                      <div key={dataset.id} className="rounded-md border border-line bg-white p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">{dataset.name}</p>
                            <p className="mt-1 text-[11px] leading-4 text-muted">
                              {dataset.type.toUpperCase()} / {dataset.status} / {formatUploadedDatasetDetail(dataset)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                            {dataset.officialStatus.replace(/-/g, " ")}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted">{dataset.notes}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {dataset.type === "geojson" && dataset.status === "parsed" ? (
                            <button
                              type="button"
                              onClick={() => onToggleUploadedDataset(dataset.id)}
                              className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-ink"
                            >
                              {dataset.visible === false ? "Show layer" : "Hide layer"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onRemoveUploadedDataset(dataset.id)}
                            className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-ink"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {availableSources.map((source) => (
                <DataReadinessCard key={source.id} source={source} compact />
              ))}
            </div>
          </CollapsedSection>

          <CollapsedSection title="Pilot Setup Checklist" badge="v1.1">
            <div className="grid gap-2">
              <div className="rounded-md border border-line bg-surface p-3">
                <p className="text-sm font-semibold text-ink">{pilotPackage.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {pilotPackage.pilotDuration} / client data and official validation still required before decisions.
                </p>
              </div>
              {pilotChecklist.map((item, index) => (
                <div key={`pilot-checklist-${index}-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-ink">{item.label}</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 font-semibold ${
                    item.status === "Done"
                      ? "bg-[#eaf3f1] text-brand"
                      : item.status === "Optional"
                        ? "bg-surface text-muted"
                        : "bg-[#fff7ed] text-[#9f3412]"
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </CollapsedSection>

          <CollapsedSection title="Analysis History" badge={analysisHistoryStatus}>
            <div className="grid min-w-0 gap-2">
              {analysisHistory.length === 0 ? (
                <div className="rounded-md border border-line bg-white px-3 py-3 text-sm leading-5 text-muted">
                  Recent analysis runs will appear here after you run Express Analysis. Current mode: {analysisHistoryStatus}.
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Recent analyses / {analysisHistoryStatus}
                    </p>
                    <button
                      type="button"
                      onClick={onClearAnalysisHistory}
                      className="shrink-0 rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink"
                    >
                      Clear
                    </button>
                  </div>
                  {analysisHistory.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenHistoryItem(item)}
                      className="w-full max-w-full overflow-hidden rounded-md border border-line bg-white p-3 text-left transition hover:border-brand hover:bg-surface"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-ink">{item.title}</h3>
                          <p className="mt-1 break-words text-xs leading-5 text-muted">
                            {item.scenarioLabel} / {formatHistoryTimestamp(item.timestamp)}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted">{item.locationLabel}</p>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">
                            {item.recommendation}
                          </p>
                        </div>
                        <div className="grid shrink-0 gap-1 text-right">
                          <span className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold capitalize text-brand">
                            {item.source ?? analysisHistorySource}
                          </span>
                          <span className="text-[11px] font-semibold text-muted">
                            {item.analysis.scores.investmentAttractiveness}/100
                          </span>
                          <span className="text-[11px] font-semibold capitalize text-muted">
                            {item.confidenceLevel ?? "medium"}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </CollapsedSection>

        </div>
      </section>

      <section className="min-w-0 max-w-full flex-shrink-0 border-t border-line bg-white p-4">
        <p className="mb-2 text-xs leading-5 text-muted">
          {primaryCtaDisabled && !hasSelectedPoint
            ? "Select a map point or load the guided demo to begin."
            : activeWorkflowNote}
        </p>
        <button
          type="button"
          disabled={!hasSelectedPoint}
          onClick={onAddToComparison}
          className="mb-2 inline-flex h-9 w-full max-w-full items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
        >
          Add to compare
        </button>
        <button
          type="button"
          disabled={primaryCtaDisabled}
          onClick={onPrimaryCta}
          className="inline-flex h-11 w-full max-w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50] disabled:cursor-not-allowed disabled:bg-[#c9d2d7] disabled:text-white"
        >
          {primaryCtaLabel}
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
