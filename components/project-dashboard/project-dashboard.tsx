"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sourceReadinessMatrix } from "@/src/data/data-maturity";
import { dataSourceRegistry } from "@/src/data/data-source-registry";
import { demoProjects, getDemoProject } from "@/src/data/demo-projects";
import { deriveDecisionPosture } from "@/src/lib/decision-posture";
import type { GeoAIProject } from "@/src/lib/db/types";
import type { AnalysisHistoryItem, AnalysisScenarioId, ExpressAnalysis } from "@/src/types/geo";

const activeProjectStorageKey = "geoai-active-project-key-v1";
const analysisHistoryStorageKey = "geoai-analysis-history-v1";

type DbHealth = {
  configured: boolean;
  status: "connected" | "configured_unavailable" | "local_only";
  message: string;
  sources_count: number | null;
};

type MarketMetricsSummary = {
  sourceMode: string;
  count: number;
  availableAreaNames: string[];
  fallbackStatus: string;
};

type PersistedAnalysisRun = {
  id?: string;
  run_key?: string;
  scenario_id?: AnalysisScenarioId;
  selected_name?: string;
  selected_type?: string;
  decision_posture?: string | null;
  confidence_level?: ExpressAnalysis["confidenceLevel"];
  data_confidence_level?: string | null;
  analysis_mode?: ExpressAnalysis["analysisMode"];
  created_at?: string;
  project_key?: string | null;
  project_name?: string | null;
};

type RecentAnalysisRow = {
  id: string;
  title: string;
  scenarioLabel: string;
  timestamp: string;
  decisionPosture: string;
  confidence: string;
  dataConfidence: string;
  source: "local" | "DB";
};

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimestamp(value?: string) {
  if (!value) return "Current session";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function readActiveProjectKey() {
  try {
    return window.localStorage.getItem(activeProjectStorageKey) || demoProjects[0].projectKey;
  } catch {
    return demoProjects[0].projectKey;
  }
}

function writeActiveProjectKey(projectKey: string) {
  try {
    window.localStorage.setItem(activeProjectStorageKey, projectKey);
  } catch {
    // Dashboard still works in-memory if localStorage is unavailable.
  }
}

function readLocalHistory() {
  try {
    const raw = window.localStorage.getItem(analysisHistoryStorageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalysisHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function localHistoryToRows(items: AnalysisHistoryItem[], projectKey: string): RecentAnalysisRow[] {
  const scoped = items.filter((item) => item.projectKey === projectKey || item.project?.projectKey === projectKey);
  const fallback = scoped.length > 0 ? scoped : items;

  return fallback.slice(0, 6).map((item) => ({
    id: item.id,
    title: item.title,
    scenarioLabel: item.scenarioLabel,
    timestamp: item.timestamp,
    decisionPosture: item.recommendation || deriveDecisionPosture(item.analysis),
    confidence: item.confidenceLevel ?? item.analysis.confidenceLevel ?? "medium",
    dataConfidence: item.dataConfidenceLevel ?? "Demo-normalized",
    source: item.source ?? "local"
  }));
}

function persistedRowsToRecent(items: PersistedAnalysisRun[]): RecentAnalysisRow[] {
  return items.slice(0, 6).map((item) => ({
    id: item.id ?? item.run_key ?? `${item.selected_name}-${item.created_at}`,
    title: item.selected_name ?? "Saved analysis run",
    scenarioLabel: item.scenario_id ? formatLabel(item.scenario_id) : "Scenario analysis",
    timestamp: item.created_at ?? new Date().toISOString(),
    decisionPosture: item.decision_posture ?? "Requires official validation",
    confidence: item.confidence_level ?? "medium",
    dataConfidence: item.data_confidence_level ?? "Demo-normalized",
    source: "DB"
  }));
}

function ProjectBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#eaf3f1] px-3 py-1 text-xs font-semibold capitalize text-brand">
      {children}
    </span>
  );
}

function KpiCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-2 text-sm leading-5 text-muted">{note}</p>
    </div>
  );
}

function EmptyState({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-surface p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
      <Link href={href} className="mt-3 inline-flex h-9 items-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand">
        {action}
      </Link>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function getNextActions(project: GeoAIProject, importedMetricsCount: number) {
  const scenario = project.primaryScenario;
  const common = [
    "Confirm Dubai Municipality / GeoDubai planning constraints.",
    "Compare 2-3 alternative sites before underwriting.",
    "Export an investment memo after official evidence gaps are reviewed."
  ];

  if (scenario === "investmentSiteSelection") {
    return [
      "Validate official DLD transaction and rental comps for the shortlist area.",
      "Review pipeline / absorption risk against imported sample metrics.",
      ...common
    ];
  }

  if (scenario === "realEstateDevelopment") {
    return [
      "Request land-use and permitted development confirmation.",
      "Validate infrastructure readiness and access constraints.",
      ...common
    ];
  }

  if (scenario === "climateRisk") {
    return [
      "Validate flood, coastal and heat exposure with official or licensed layers.",
      "Add resilience requirements to the pilot data checklist.",
      ...common
    ];
  }

  return [
    importedMetricsCount > 0
      ? "Review imported market areas and flag which can be validated with official sources."
      : "Run DLD / Dubai Pulse ingestion fixtures or connect validated market inputs.",
    "Prepare pilot data requirements for customer assets and official source access.",
    ...common
  ];
}

export function ProjectDashboard() {
  const [projects, setProjects] = useState<GeoAIProject[]>(demoProjects);
  const [projectsMode, setProjectsMode] = useState<"db" | "local_demo">("local_demo");
  const [activeProjectKey, setActiveProjectKey] = useState(demoProjects[0].projectKey);
  const [localHistory, setLocalHistory] = useState<AnalysisHistoryItem[]>([]);
  const [dbHistory, setDbHistory] = useState<RecentAnalysisRow[]>([]);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [marketMetrics, setMarketMetrics] = useState<MarketMetricsSummary | null>(null);

  useEffect(() => {
    setActiveProjectKey(readActiveProjectKey());
    setLocalHistory(readLocalHistory());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectData() {
      const results = await Promise.allSettled([
        fetch("/api/projects").then((response) => response.json()),
        fetch("/api/db/health").then((response) => response.json()),
        fetch("/api/market-metrics").then((response) => response.json())
      ]);

      if (cancelled) return;

      const projectsResult = results[0];
      if (projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value.items) && projectsResult.value.items.length > 0) {
        setProjects(projectsResult.value.items);
        setProjectsMode(projectsResult.value.mode === "db" ? "db" : "local_demo");
      }

      const dbResult = results[1];
      if (dbResult.status === "fulfilled") {
        setDbHealth(dbResult.value as DbHealth);
      }

      const marketResult = results[2];
      if (marketResult.status === "fulfilled") {
        setMarketMetrics(marketResult.value as MarketMetricsSummary);
      }
    }

    void loadProjectData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDbHistory() {
      try {
        const response = await fetch(`/api/analysis-runs?limit=8&projectKey=${encodeURIComponent(activeProjectKey)}`);
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload.items)) {
          setDbHistory(persistedRowsToRecent(payload.items));
        }
      } catch {
        if (!cancelled) {
          setDbHistory([]);
        }
      }
    }

    void loadDbHistory();

    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  const activeProject = useMemo(
    () => projects.find((project) => project.projectKey === activeProjectKey) ?? getDemoProject(activeProjectKey),
    [activeProjectKey, projects]
  );
  const localRows = useMemo(() => localHistoryToRows(localHistory, activeProject.projectKey), [activeProject.projectKey, localHistory]);
  const recentRows = dbHistory.length > 0 ? dbHistory : localRows;
  const importedAreas = marketMetrics?.count ?? 0;
  const dataConfidence = importedAreas > 0 ? "Demo-normalized / low sample" : "Seed fallback";
  const persistenceMode = dbHealth?.status === "connected" ? "Supabase/PostGIS connected" : "Local fallback";
  const nextActions = getNextActions(activeProject, importedAreas);
  const openWorkspaceHref = "/workspace";

  function changeProject(projectKey: string) {
    setActiveProjectKey(projectKey);
    writeActiveProjectKey(projectKey);
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Project workspace</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-ink">{activeProject.name}</h1>
                <ProjectBadge>{activeProject.clientType.replace(/_/g, " ")}</ProjectBadge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{activeProject.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  {activeProject.geography}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Scenario: {formatLabel(activeProject.primaryScenario)}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Data: {activeProject.dataMode.replace(/_/g, "-")}
                </span>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  Persistence: {persistenceMode}
                </span>
              </div>
            </div>

            <div className="grid min-w-[260px] gap-3">
              <label htmlFor="project-dashboard-selector" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Active project
              </label>
              <select
                id="project-dashboard-selector"
                value={activeProject.projectKey}
                onChange={(event) => changeProject(event.target.value)}
                className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              >
                {projects.map((project) => (
                  <option key={project.projectKey} value={project.projectKey}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={openWorkspaceHref}
                  onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#113f50]"
                >
                  Open workspace
                </Link>
                <Link
                  href={openWorkspaceHref}
                  onClick={() => writeActiveProjectKey(activeProject.projectKey)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand"
                >
                  Run new analysis
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Analyses" value={recentRows.length} note={recentRows.length > 0 ? "Recent runs available for this project context." : "Run an analysis from the workspace."} />
          <KpiCard label="Reports" value="0" note="Report library is planned; print memos are generated from workspace results." />
          <KpiCard label="Compared sites" value="0" note="Comparison sets are workspace-local in v0.1." />
          <KpiCard label="Data sources" value={dataSourceRegistry.length} note="Registry sources include demo, planned official, open and commercial sources." />
          <KpiCard label="Market areas" value={importedAreas} note={marketMetrics?.sourceMode ?? "seed_static fallback"} />
          <KpiCard label="Data confidence" value={dataConfidence} note="Official validation required before pilot decisions." />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="grid gap-5">
            <Panel title="Project Activity / Recent Analyses" subtitle="Analysis runs are scoped to the active project when project metadata is available.">
              {recentRows.length > 0 ? (
                <div className="grid gap-3">
                  {recentRows.map((item) => (
                    <article key={item.id} className="rounded-md border border-line bg-surface p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-ink">{item.title}</h3>
                          <p className="mt-1 text-sm leading-5 text-muted">{item.scenarioLabel} / {formatTimestamp(item.timestamp)}</p>
                        </div>
                        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand">
                          {item.source}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                        <div className="rounded-md bg-white p-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Posture</span>
                          <p className="mt-1 font-semibold text-ink">{item.decisionPosture}</p>
                        </div>
                        <div className="rounded-md bg-white p-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Confidence</span>
                          <p className="mt-1 font-semibold capitalize text-ink">{item.confidence}</p>
                        </div>
                        <div className="rounded-md bg-white p-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Data basis</span>
                          <p className="mt-1 font-semibold text-ink">{item.dataConfidence}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No analyses yet"
                  text="Run Express Analysis in the workspace to populate this project activity feed."
                  href={openWorkspaceHref}
                  action="Open workspace"
                />
              )}
            </Panel>

            <Panel title="Reports / Memos" subtitle="Client-ready memo generation remains connected to the workspace result and report preview flow.">
              <EmptyState
                title="No saved report library yet"
                text="Exported memos are currently screen/print based. A persistent report library is planned for the next project workflow iteration."
                href={openWorkspaceHref}
                action="Generate new memo"
              />
            </Panel>
          </div>

          <div className="grid content-start gap-5">
            <Panel title="Data Readiness" subtitle="Current source maturity and persistence posture for this project.">
              <div className="grid gap-3">
                <div className="rounded-md border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">DLD / Dubai Pulse ingestion</p>
                      <p className="mt-1 text-sm leading-5 text-muted">
                        {importedAreas > 0
                          ? `${importedAreas} imported sample market areas available.`
                          : "No imported metrics found; seed fallback remains available."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
                      sample
                    </span>
                  </div>
                </div>
                <div className="rounded-md border border-line bg-surface p-4">
                  <p className="font-semibold text-ink">Supabase / PostGIS</p>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    {dbHealth?.message ?? "Status unavailable; dashboard is using local/demo fallback."}
                  </p>
                </div>
                <div className="grid gap-2">
                  {sourceReadinessMatrix.slice(0, 5).map((source) => (
                    <div key={source.sourceId} className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-sm">
                      <span className="min-w-0 truncate font-medium text-ink">{source.source}</span>
                      <span className="shrink-0 text-xs font-semibold text-muted">{source.currentStatus}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-5 text-muted">
                  Official validation is required before treating any dashboard output as decision-grade.
                </p>
              </div>
            </Panel>

            <Panel title="Comparison Shortlist" subtitle="Shortlists are still managed in the map workspace for v0.1.">
              <EmptyState
                title="No sites added to comparison yet"
                text="Open the workspace, select 2-3 points or demo objects, then compare selected sites."
                href={openWorkspaceHref}
                action="Compare sites"
              />
            </Panel>

            <Panel title="Recommended Next Actions">
              <ol className="grid gap-2">
                {nextActions.slice(0, 5).map((action, index) => (
                  <li key={action} className="flex gap-3 rounded-md bg-surface p-3 text-sm leading-6 text-muted">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand">
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
