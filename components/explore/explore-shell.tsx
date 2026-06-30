"use client";

import { useEffect, useMemo, useState } from "react";
import { ExploreMap } from "@/components/explore/explore-map";
import { SafeBadge } from "@/components/ui/safe-badge";
import { SafeCard } from "@/components/ui/safe-card";
import {
  generateExploreCandidates,
  getCandidateAnchor,
  getSourceTypeLabel
} from "@/src/lib/explore/candidates";
import {
  getDefaultFilters,
  getDefaultRoleForAudience,
  getDefaultScenarioForAudience,
  getExploreRole,
  getExploreRolesByAudience,
  getExploreScenario,
  getExploreScenariosByAudience
} from "@/src/lib/explore/scenarios";
import {
  exploreRequiredCaveat,
  type ExploreAudience,
  type ExploreCandidate,
  type ExploreFilterConfig,
  type ExploreFilters,
  type ExploreRole,
  type ExploreScenario,
  type ExploreScenarioId,
  type ExploreState,
  type InteractionMode
} from "@/src/lib/explore/types";

const savedCandidatesStorageKey = "geoai-explore-saved-candidates-v1";
const workspaceBridgeStorageKey = "geoai-explore-workspace-context-v1";

function formatIdLabel(value: string) {
  return value
    .split("_")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function getDefaultSelection(scenario: ExploreScenario) {
  if (scenario.defaultInteractionMode === "map_first") {
    return {
      label: scenario.audience === "b2c" ? "Dubai Marina sample point" : "Selected Dubai AOI hypothesis",
      coordinates: scenario.audience === "b2c" ? [55.1412, 25.0781] as [number, number] : [55.235, 25.12] as [number, number],
      areaHint: scenario.audience === "b2c" ? "1 km context lens" : "Sample screening AOI"
    };
  }

  return {
    label: scenario.audience === "b2c" ? "Dubai criteria search" : "Dubai investment criteria search",
    areaHint: "Criteria-first search area"
  };
}

function createInitialState(audience: ExploreAudience = "b2b"): ExploreState {
  const selectedScenario = getDefaultScenarioForAudience(audience);
  const scenario = getExploreScenario(selectedScenario);
  const selectedRole = getDefaultRoleForAudience(audience);
  const filters = getDefaultFilters(scenario.inputSchema);
  const selectedPointOrArea = getDefaultSelection(scenario);
  const candidates = generateExploreCandidates({
    audience,
    role: selectedRole,
    scenarioId: selectedScenario,
    interactionMode: scenario.defaultInteractionMode,
    naturalLanguageQuery: scenario.sampleQueries[0],
    filters,
    selectedPointOrArea
  });

  return {
    selectedAudience: audience,
    selectedRole,
    selectedScenario,
    interactionMode: scenario.defaultInteractionMode,
    naturalLanguageQuery: scenario.sampleQueries[0],
    filters,
    selectedPointOrArea,
    candidates,
    selectedCandidate: candidates[0] ?? null,
    compareList: []
  };
}

function getInteractionModeLabel(mode: InteractionMode) {
  return mode === "map_first" ? "Map-first" : "Criteria-first";
}

function getModeSummary(modes: InteractionMode[]) {
  return modes.length === 2 ? "Both" : getInteractionModeLabel(modes[0]);
}

function getCandidateTypeLabel(candidate: ExploreCandidate) {
  return formatIdLabel(candidate.candidateType);
}

function getWorkspaceUrl(candidate: ExploreCandidate) {
  const [lng, lat] = getCandidateAnchor(candidate);
  return `/workspace?source=explore&candidateId=${encodeURIComponent(candidate.id)}&scenarioId=${encodeURIComponent(candidate.scenarioId)}&lng=${lng.toFixed(6)}&lat=${lat.toFixed(6)}`;
}

function FieldLabel({
  label,
  value
}: {
  label: string;
  value?: string | number | boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <label className="safe-line-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      {value !== undefined ? (
        <span className="shrink-0 text-xs font-semibold text-brand">{String(value)}</span>
      ) : null}
    </div>
  );
}

function AudienceSelector({
  selectedAudience,
  onChange
}: {
  selectedAudience: ExploreAudience;
  onChange: (audience: ExploreAudience) => void;
}) {
  const options: Array<{ id: ExploreAudience; label: string; text: string }> = [
    { id: "b2b", label: "B2B", text: "Investment, development and institutional screening." },
    { id: "b2c", label: "B2C", text: "Tourism, residential and consumer discovery." }
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const selected = selectedAudience === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`min-w-0 rounded-md border p-4 text-left transition ${
              selected
                ? "border-brand bg-[#eaf3f1] text-ink"
                : "border-line bg-white text-muted hover:border-brand hover:text-ink"
            }`}
          >
            <span className="block text-sm font-bold text-ink">{option.label}</span>
            <span className="safe-line-2 mt-1 block text-xs leading-5">{option.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function RoleSelector({
  audience,
  selectedRole,
  onChange
}: {
  audience: ExploreAudience;
  selectedRole: ExploreRole;
  onChange: (role: ExploreRole) => void;
}) {
  const roles = getExploreRolesByAudience(audience);

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const selected = selectedRole === role.id;

        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
              selected
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-muted hover:border-brand hover:text-ink"
            }`}
            title={role.description}
          >
            {role.label}
          </button>
        );
      })}
    </div>
  );
}

function ScenarioCard({
  scenario,
  selected,
  onSelect
}: {
  scenario: ExploreScenario;
  selected: boolean;
  onSelect: (scenarioId: ExploreScenarioId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(scenario.id)}
      className={`flex min-h-[230px] min-w-0 flex-col justify-between rounded-lg border bg-white p-4 text-left shadow-sm transition ${
        selected ? "border-brand ring-2 ring-[#b8d0cc]" : "border-line hover:border-brand"
      }`}
    >
      <span>
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <SafeBadge variant={selected ? "active" : "demo"} className="normal-case">
            {getModeSummary(scenario.interactionModes)}
          </SafeBadge>
          <SafeBadge variant="validation" className="normal-case">
            {scenario.audience.toUpperCase()}
          </SafeBadge>
        </span>
        <span className="safe-line-2 mt-3 block text-base font-bold text-ink">
          {scenario.title}
        </span>
        <span className="safe-line-3 mt-2 block text-sm leading-6 text-muted">
          {scenario.subtitle}
        </span>
      </span>
      <span className="mt-4 block space-y-2">
        <span className="safe-line-1 block text-xs font-semibold text-muted">
          {scenario.resultCardSchemaLabel}
        </span>
        <span className="safe-line-2 block rounded-md bg-surface px-3 py-2 text-xs font-medium text-ink">
          {scenario.sampleQueries[0]}
        </span>
      </span>
    </button>
  );
}

function FilterControl({
  config,
  value,
  onChange
}: {
  config: ExploreFilterConfig;
  value: ExploreFilters[string] | undefined;
  onChange: (value: ExploreFilters[string]) => void;
}) {
  if (config.type === "select") {
    return (
      <div className="space-y-2">
        <FieldLabel label={config.label} />
        <select
          value={typeof value === "string" ? value : String(config.defaultValue)}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand"
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
      <div className="space-y-2">
        <FieldLabel label={config.label} value={`${numericValue}${config.unit ? ` ${config.unit}` : ""}`} />
        <input
          type="range"
          value={numericValue}
          min={config.min}
          max={config.max}
          step={config.step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-brand"
        />
      </div>
    );
  }

  if (config.type === "toggle") {
    const checked = typeof value === "boolean" ? value : Boolean(config.defaultValue);

    return (
      <label className="flex min-w-0 items-center gap-3 rounded-md border border-line bg-white px-3 py-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        <span className="safe-line-2 text-sm font-semibold text-ink">{config.label}</span>
      </label>
    );
  }

  const selectedValues = Array.isArray(value)
    ? value
    : Array.isArray(config.defaultValue)
      ? config.defaultValue
      : [];

  return (
    <div className="space-y-2">
      <FieldLabel label={config.label} />
      <div className="flex flex-wrap gap-2">
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
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                selected
                  ? "border-brand bg-[#eaf3f1] text-brand"
                  : "border-line bg-white text-muted hover:border-brand hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchPanel({
  state,
  scenario,
  onModeChange,
  onQueryChange,
  onFilterChange,
  onSelectedPointOrAreaChange
}: {
  state: ExploreState;
  scenario: ExploreScenario;
  onModeChange: (mode: InteractionMode) => void;
  onQueryChange: (query: string) => void;
  onFilterChange: (id: string, value: ExploreFilters[string]) => void;
  onSelectedPointOrAreaChange: (label: string) => void;
}) {
  return (
    <SafeCard className="gap-5">
      <div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Search and criteria
            </p>
            <h2 className="safe-line-2 mt-1 text-xl font-bold text-ink">
              {scenario.title}
            </h2>
          </div>
          <SafeBadge variant="active" className="normal-case">
            {scenario.primaryCTA}
          </SafeBadge>
        </div>
        <p className="safe-line-3 mt-2 text-sm leading-6 text-muted">
          {scenario.purpose}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {scenario.interactionModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={`rounded-md border px-3 py-3 text-sm font-semibold transition ${
              state.interactionMode === mode
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-muted hover:border-brand hover:text-ink"
            }`}
          >
            {getInteractionModeLabel(mode)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <FieldLabel label="Natural language query" />
        <textarea
          value={state.naturalLanguageQuery}
          onChange={(event) => onQueryChange(event.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-line bg-white px-3 py-3 text-sm font-medium leading-6 text-ink outline-none transition placeholder:text-muted focus:border-brand"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel label={state.interactionMode === "map_first" ? "Selected point or area" : "Search area"} />
        <input
          value={state.selectedPointOrArea?.label ?? ""}
          onChange={(event) => onSelectedPointOrAreaChange(event.target.value)}
          className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition placeholder:text-muted focus:border-brand"
        />
      </div>

      <div className="grid gap-4">
        {scenario.inputSchema.map((config) => (
          <FilterControl
            key={config.id}
            config={config}
            value={state.filters[config.id]}
            onChange={(value) => onFilterChange(config.id, value)}
          />
        ))}
      </div>
    </SafeCard>
  );
}

function CandidateCard({
  candidate,
  selected,
  isCompared,
  isSaved,
  onSelect,
  onToggleCompare,
  onSave
}: {
  candidate: ExploreCandidate;
  selected: boolean;
  isCompared: boolean;
  isSaved: boolean;
  onSelect: (candidate: ExploreCandidate) => void;
  onToggleCompare: (candidate: ExploreCandidate) => void;
  onSave: (candidate: ExploreCandidate) => void;
}) {
  return (
    <article
      className={`min-w-0 rounded-lg border bg-white p-4 shadow-sm transition ${
        selected ? "border-brand ring-2 ring-[#b8d0cc]" : "border-line"
      }`}
    >
      <button type="button" onClick={() => onSelect(candidate)} className="block w-full min-w-0 text-left">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="safe-line-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {candidate.locationLabel}
            </p>
            <h3 className="safe-line-2 mt-1 text-base font-bold text-ink">
              {candidate.title}
            </h3>
          </div>
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-[#eaf3f1] text-brand">
            <span className="text-lg font-black leading-5">{candidate.score}</span>
            <span className="text-[10px] font-semibold uppercase">Score</span>
          </div>
        </div>
        <p className="safe-line-2 mt-2 text-sm leading-6 text-muted">{candidate.subtitle}</p>
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <SafeBadge variant="demo" className="normal-case">
            {getSourceTypeLabel(candidate.sourceType)}
          </SafeBadge>
          <SafeBadge variant={candidate.confidence === "low" ? "validation" : "active"} className="normal-case">
            {candidate.confidence} confidence
          </SafeBadge>
          <SafeBadge variant="planned" className="normal-case">
            {getCandidateTypeLabel(candidate)}
          </SafeBadge>
        </div>
        <p className="safe-line-2 mt-3 rounded-md bg-[#fff9e8] px-3 py-2 text-xs font-medium leading-5 text-[#6f5817]">
          {exploreRequiredCaveat}
        </p>
      </button>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onToggleCompare(candidate)}
          className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
            isCompared
              ? "border-brand bg-[#eaf3f1] text-brand"
              : "border-line bg-white text-muted hover:border-brand hover:text-ink"
          }`}
        >
          {isCompared ? "In Compare" : "Compare"}
        </button>
        <button
          type="button"
          onClick={() => onSave(candidate)}
          className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
            isSaved
              ? "border-brand bg-[#eaf3f1] text-brand"
              : "border-line bg-white text-muted hover:border-brand hover:text-ink"
          }`}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}

function CandidateDetails({
  candidate,
  isCompared,
  isSaved,
  analyzed,
  onAnalyze,
  onToggleCompare,
  onSave,
  onOpenWorkspace
}: {
  candidate: ExploreCandidate | null;
  isCompared: boolean;
  isSaved: boolean;
  analyzed: boolean;
  onAnalyze: (candidate: ExploreCandidate) => void;
  onToggleCompare: (candidate: ExploreCandidate) => void;
  onSave: (candidate: ExploreCandidate) => void;
  onOpenWorkspace: (candidate: ExploreCandidate) => void;
}) {
  if (!candidate) {
    return (
      <SafeCard className="justify-center">
        <p className="text-sm font-semibold text-muted">No candidate selected.</p>
      </SafeCard>
    );
  }

  return (
    <SafeCard className="gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Selected candidate
        </p>
        <h2 className="safe-line-2 mt-1 text-xl font-bold text-ink">{candidate.title}</h2>
        <p className="safe-line-2 mt-2 text-sm leading-6 text-muted">{candidate.subtitle}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-line bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Score</p>
          <p className="mt-1 text-xl font-black text-ink">{candidate.score}</p>
        </div>
        <div className="rounded-md border border-line bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Confidence</p>
          <p className="safe-line-1 mt-1 text-sm font-bold text-ink">{candidate.confidence}</p>
        </div>
        <div className="rounded-md border border-line bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Source</p>
          <p className="safe-line-1 mt-1 text-sm font-bold text-ink">{getSourceTypeLabel(candidate.sourceType)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-ink">Score breakdown</h3>
        {candidate.scoreBreakdown.map((item) => (
          <div key={item.label} className="min-w-0 rounded-md border border-line bg-white p-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="safe-line-1 text-sm font-semibold text-ink">{item.label}</p>
              <span className="shrink-0 text-sm font-bold text-brand">{item.value}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-brand" style={{ width: `${item.value}%` }} />
            </div>
            <p className="safe-line-2 mt-2 text-xs leading-5 text-muted">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-ink">Evidence snapshot</h3>
        {candidate.evidence.map((item) => (
          <div key={`${item.label}-${item.sourceType}`} className="min-w-0 rounded-md border border-line bg-white p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="safe-line-1 text-sm font-semibold text-ink">{item.label}</p>
              <SafeBadge variant={item.confidence === "low" ? "validation" : "demo"} className="normal-case">
                {getSourceTypeLabel(item.sourceType)}
              </SafeBadge>
            </div>
            <p className="safe-line-3 mt-2 text-xs leading-5 text-muted">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-ink">Validation required</h3>
        <ul className="space-y-2">
          {candidate.validationRequired.map((item) => (
            <li key={item} className="rounded-md bg-[#fff9e8] px-3 py-2 text-xs font-semibold leading-5 text-[#6f5817]">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {analyzed ? (
        <div className="rounded-md border border-[#b8d0cc] bg-[#eaf3f1] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Local analysis preview
          </p>
          <p className="safe-line-4 mt-2 text-sm leading-6 text-ink">
            {candidate.title} ranks as a {candidate.confidence}-confidence sample candidate with a score of {candidate.score}. The next action is to validate evidence before using it in a workspace, comparison or report workflow.
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => onAnalyze(candidate)}
          className="h-11 rounded-md bg-brand px-4 text-sm font-bold text-white transition hover:bg-[#113f50]"
        >
          Analyze
        </button>
        <button
          type="button"
          onClick={() => onToggleCompare(candidate)}
          className="h-11 rounded-md border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-brand"
        >
          {isCompared ? "Remove from Compare" : "Add to Compare"}
        </button>
        <button
          type="button"
          onClick={() => onSave(candidate)}
          className="h-11 rounded-md border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-brand"
        >
          {isSaved ? "Candidate Saved" : "Save Candidate"}
        </button>
        <button
          type="button"
          onClick={() => onOpenWorkspace(candidate)}
          className="h-11 rounded-md border border-brand bg-white px-4 text-sm font-bold text-brand transition hover:bg-[#eaf3f1]"
        >
          Open in Workspace
        </button>
        <button
          type="button"
          disabled
          className="h-11 cursor-not-allowed rounded-md border border-line bg-surface px-4 text-sm font-bold text-muted"
          title="Report package creation needs a saved project and Data Room context in this sprint."
        >
          Create Report Package
        </button>
        <p className="safe-line-2 text-xs leading-5 text-muted">
          Report package creation is disabled here until a candidate is attached to a saved project/Data Room workflow.
        </p>
      </div>
    </SafeCard>
  );
}

function CompareTray({
  compareList,
  onRemove,
  onClear
}: {
  compareList: ExploreCandidate[];
  onRemove: (candidateId: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Compare tray</p>
          <h2 className="safe-line-1 mt-1 text-xl font-bold text-ink">
            {compareList.length} candidate{compareList.length === 1 ? "" : "s"} selected
          </h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={compareList.length === 0}
          className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-muted transition hover:border-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      </div>
      {compareList.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {compareList.map((candidate) => (
            <div key={candidate.id} className="min-w-0 rounded-md border border-line bg-surface p-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="safe-line-1 text-xs font-semibold text-muted">{candidate.locationLabel}</p>
                  <h3 className="safe-line-2 mt-1 text-sm font-bold text-ink">{candidate.title}</h3>
                </div>
                <span className="shrink-0 rounded-md bg-white px-2 py-1 text-sm font-black text-brand">
                  {candidate.score}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(candidate.id)}
                className="mt-3 h-9 rounded-md border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-surface px-3 py-3 text-sm font-medium text-muted">
          Add candidates from the result list to compare locally.
        </p>
      )}
    </section>
  );
}

export function ExploreShell() {
  const [state, setState] = useState<ExploreState>(() => createInitialState());
  const [savedCandidateIds, setSavedCandidateIds] = useState<string[]>([]);
  const [analyzedCandidateId, setAnalyzedCandidateId] = useState<string | null>(null);
  const selectedScenario = getExploreScenario(state.selectedScenario);
  const selectedRole = getExploreRole(state.selectedRole);
  const scenarios = useMemo(
    () => getExploreScenariosByAudience(state.selectedAudience),
    [state.selectedAudience]
  );
  const comparedIds = new Set(state.compareList.map((candidate) => candidate.id));
  const savedIds = new Set(savedCandidateIds);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(savedCandidatesStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setSavedCandidateIds(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
      }
    } catch {
      setSavedCandidateIds([]);
    }
  }, []);

  useEffect(() => {
    const candidates = generateExploreCandidates({
      audience: state.selectedAudience,
      role: state.selectedRole,
      scenarioId: state.selectedScenario,
      interactionMode: state.interactionMode,
      naturalLanguageQuery: state.naturalLanguageQuery,
      filters: state.filters,
      selectedPointOrArea: state.selectedPointOrArea
    });

    setState((current) => {
      const selectedCandidate =
        candidates.find((candidate) => candidate.id === current.selectedCandidate?.id) ??
        candidates[0] ??
        null;

      return {
        ...current,
        candidates,
        selectedCandidate,
        compareList: current.compareList.filter((candidate) =>
          candidates.some((nextCandidate) => nextCandidate.id === candidate.id)
        )
      };
    });
  }, [
    state.selectedAudience,
    state.selectedRole,
    state.selectedScenario,
    state.interactionMode,
    state.naturalLanguageQuery,
    state.filters,
    state.selectedPointOrArea
  ]);

  function selectAudience(audience: ExploreAudience) {
    const nextScenarioId = getDefaultScenarioForAudience(audience);
    const scenario = getExploreScenario(nextScenarioId);

    setAnalyzedCandidateId(null);
    setState((current) => ({
      ...current,
      selectedAudience: audience,
      selectedRole: getDefaultRoleForAudience(audience),
      selectedScenario: nextScenarioId,
      interactionMode: scenario.defaultInteractionMode,
      naturalLanguageQuery: scenario.sampleQueries[0],
      filters: getDefaultFilters(scenario.inputSchema),
      selectedPointOrArea: getDefaultSelection(scenario),
      selectedCandidate: null,
      compareList: []
    }));
  }

  function selectScenario(scenarioId: ExploreScenarioId) {
    const scenario = getExploreScenario(scenarioId);

    setAnalyzedCandidateId(null);
    setState((current) => ({
      ...current,
      selectedScenario: scenarioId,
      selectedRole: scenario.defaultRoleHints.includes(current.selectedRole)
        ? current.selectedRole
        : scenario.defaultRoleHints[0],
      interactionMode: scenario.defaultInteractionMode,
      naturalLanguageQuery: scenario.sampleQueries[0],
      filters: getDefaultFilters(scenario.inputSchema),
      selectedPointOrArea: getDefaultSelection(scenario),
      selectedCandidate: null,
      compareList: []
    }));
  }

  function updateFilter(id: string, value: ExploreFilters[string]) {
    setState((current) => ({
      ...current,
      filters: {
        ...current.filters,
        [id]: value
      }
    }));
  }

  function selectCandidate(candidate: ExploreCandidate) {
    setState((current) => ({
      ...current,
      selectedCandidate: candidate
    }));
  }

  function selectCandidateById(candidateId: string) {
    const candidate = state.candidates.find((item) => item.id === candidateId);
    if (candidate) {
      selectCandidate(candidate);
    }
  }

  function toggleCompare(candidate: ExploreCandidate) {
    setState((current) => {
      const exists = current.compareList.some((item) => item.id === candidate.id);
      return {
        ...current,
        compareList: exists
          ? current.compareList.filter((item) => item.id !== candidate.id)
          : [...current.compareList, candidate].slice(-3)
      };
    });
  }

  function saveCandidate(candidate: ExploreCandidate) {
    const nextIds = savedCandidateIds.includes(candidate.id)
      ? savedCandidateIds
      : [...savedCandidateIds, candidate.id];
    setSavedCandidateIds(nextIds);

    try {
      window.localStorage.setItem(savedCandidatesStorageKey, JSON.stringify(nextIds));
    } catch {
      // Local save is best-effort in the MVP shell.
    }
  }

  function openWorkspace(candidate: ExploreCandidate) {
    const [lng, lat] = getCandidateAnchor(candidate);
    const bridgePayload = {
      source: "geoai-explore-v1",
      candidateId: candidate.id,
      scenarioId: candidate.scenarioId,
      audience: candidate.audience,
      title: candidate.title,
      locationLabel: candidate.locationLabel,
      lng,
      lat,
      caveat: exploreRequiredCaveat
    };

    try {
      window.sessionStorage.setItem(workspaceBridgeStorageKey, JSON.stringify(bridgePayload));
    } catch {
      // Query params still carry non-sensitive context if session storage is unavailable.
    }

    window.location.assign(getWorkspaceUrl(candidate));
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <SafeBadge variant="active" className="normal-case">
              Explore v1
            </SafeBadge>
            <SafeBadge variant="validation" className="normal-case">
              Sample context
            </SafeBadge>
          </div>
          <h1 className="safe-line-2 mt-4 text-4xl font-black tracking-normal text-ink sm:text-5xl">
            GeoAI Explore
          </h1>
          <p className="safe-line-3 mt-3 max-w-3xl text-base leading-7 text-muted">
            Scenario-first spatial decision intelligence for Dubai, built as a search and criteria shell over the current GeoAI MVP.
          </p>
        </div>
        <div className="rounded-lg border border-[#eadca8] bg-[#fff9e8] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f5817]">
            Required caveat
          </p>
          <p className="safe-line-4 mt-2 text-sm font-semibold leading-6 text-[#6f5817]">
            {exploreRequiredCaveat}
          </p>
        </div>
      </section>

      <SafeCard className="gap-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Audience and onboarding foundation
            </p>
            <h2 className="safe-line-2 mt-1 text-xl font-bold text-ink">
              Role personalization is ready for onboarding
            </h2>
            <p className="safe-line-2 mt-2 text-sm leading-6 text-muted">
              Current role lens: {selectedRole.label}. Registration is not required in this sprint.
            </p>
          </div>
          <SafeBadge variant="ready" className="normal-case">
            Onboarding-ready
          </SafeBadge>
        </div>
        <AudienceSelector selectedAudience={state.selectedAudience} onChange={selectAudience} />
        <RoleSelector
          audience={state.selectedAudience}
          selectedRole={state.selectedRole}
          onChange={(role) =>
            setState((current) => ({
              ...current,
              selectedRole: role
            }))
          }
        />
      </SafeCard>

      <section className="space-y-4">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Scenario registry
            </p>
            <h2 className="safe-line-2 mt-1 text-2xl font-black text-ink">
              {state.selectedAudience.toUpperCase()} scenarios
            </h2>
          </div>
          <p className="text-sm font-semibold text-muted">
            {scenarios.length} of 10 active
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              selected={state.selectedScenario === scenario.id}
              onSelect={selectScenario}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SearchPanel
            state={state}
            scenario={selectedScenario}
            onModeChange={(interactionMode) =>
              setState((current) => ({
                ...current,
                interactionMode
              }))
            }
            onQueryChange={(naturalLanguageQuery) =>
              setState((current) => ({
                ...current,
                naturalLanguageQuery
              }))
            }
            onFilterChange={updateFilter}
            onSelectedPointOrAreaChange={(label) =>
              setState((current) => ({
                ...current,
                selectedPointOrArea: {
                  ...(current.selectedPointOrArea ?? {}),
                  label
                }
              }))
            }
          />
          <div className="space-y-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h2 className="safe-line-1 text-lg font-black text-ink">Results</h2>
              <span className="text-sm font-semibold text-muted">
                {state.candidates.length} cards
              </span>
            </div>
            {state.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                selected={state.selectedCandidate?.id === candidate.id}
                isCompared={comparedIds.has(candidate.id)}
                isSaved={savedIds.has(candidate.id)}
                onSelect={selectCandidate}
                onToggleCompare={toggleCompare}
                onSave={saveCandidate}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <ExploreMap
            candidates={state.candidates}
            selectedCandidateId={state.selectedCandidate?.id ?? null}
            onCandidateSelect={selectCandidateById}
          />
          <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Scoring model
                </p>
                <p className="safe-line-2 mt-1 text-sm font-bold text-ink">
                  {selectedScenario.scoringModelLabel}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Prompt context
                </p>
                <p className="safe-line-2 mt-1 text-sm font-bold text-ink">
                  {selectedScenario.openAiPromptContextLabel}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Output card
                </p>
                <p className="safe-line-2 mt-1 text-sm font-bold text-ink">
                  {selectedScenario.resultCardSchemaLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <CandidateDetails
          candidate={state.selectedCandidate}
          isCompared={state.selectedCandidate ? comparedIds.has(state.selectedCandidate.id) : false}
          isSaved={state.selectedCandidate ? savedIds.has(state.selectedCandidate.id) : false}
          analyzed={state.selectedCandidate?.id === analyzedCandidateId}
          onAnalyze={(candidate) => setAnalyzedCandidateId(candidate.id)}
          onToggleCompare={toggleCompare}
          onSave={saveCandidate}
          onOpenWorkspace={openWorkspace}
        />
      </section>

      <CompareTray
        compareList={state.compareList}
        onRemove={(candidateId) =>
          setState((current) => ({
            ...current,
            compareList: current.compareList.filter((candidate) => candidate.id !== candidateId)
          }))
        }
        onClear={() =>
          setState((current) => ({
            ...current,
            compareList: []
          }))
        }
      />
    </div>
  );
}
