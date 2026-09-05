"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  conceptTemplates,
  type ConceptMassingAlternative,
  type ConceptMassingResult,
  type ConceptTemplateId,
  type PointObjectCreateAoi,
  type RedevelopmentProgramInput,
  type ValidatedRedevelopmentProgram
} from "@/src/lib/prototype/point-to-object-create";
import {
  createPointObjectCreateDraftKey,
  createPointObjectCreateEditorScopeKey,
  POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS,
  restorePointObjectCreateEditorSnapshot,
  type PointObjectCreateEditorControlKey,
  type PointObjectCreateEditorControls,
  type PointObjectCreateEditorSnapshot
} from "@/src/lib/prototype/point-to-object-create-editor";
import {
  POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT,
  type PointObjectCreateCoverageSuggestion
} from "@/src/lib/prototype/point-to-object-create-orchestration";

export type { PointObjectCreateEditorSnapshot } from "@/src/lib/prototype/point-to-object-create-editor";

type CreateDepth = "quick" | "standard" | "deep";

export type PointObjectGeneratedConcept = {
  program: ValidatedRedevelopmentProgram;
  massing: ConceptMassingResult;
  alternatives?: ConceptMassingAlternative[];
  telemetry: {
    model: string;
    reasoningEffort: string;
    latencyMs: number;
    attempts: number;
    estimatedCostUsd: number | null;
  };
  caveat: string;
};

type CreatePanelProps = {
  locale: "en" | "ru";
  marketKey: string;
  aoi: PointObjectCreateAoi;
  depth: CreateDepth;
  generated: PointObjectGeneratedConcept | null;
  activeAlternativeId: "A" | "B";
  onGenerated: (concept: PointObjectGeneratedConcept) => void;
  onAlternativeChange: (id: "A" | "B") => void;
  onReset: () => void;
  editorSnapshot?: PointObjectCreateEditorSnapshot | null;
  onEditorSnapshotChange?: (snapshot: PointObjectCreateEditorSnapshot) => void;
};

type Controls = PointObjectCreateEditorControls;
type ControlKey = PointObjectCreateEditorControlKey;

const COPY = {
  en: {
    eyebrow: "CREATE",
    title: "Generate concept massing",
    intro: "Choose a programme, adjust its spatial parameters and generate a conceptual 3D option inside the selected area.",
    area: "Selected area",
    blocks: "Blocks",
    levelsMin: "Minimum levels",
    levelsMax: "Maximum levels",
    coverage: "Site coverage",
    openSpace: "Open space",
    setback: "Setback",
    prompt: "Custom direction",
    placeholder: "For example: prioritize shaded pedestrian space and active ground floors.",
    generate: "Generate concept",
    regenerate: "Update concept",
    generating: "Generating concept…",
    upToDate: "Already generated",
    reset: "Clear generated result",
    draft: "Draft settings",
    draftChanged: "Changes not applied",
    errorPreserved: "The previous valid result remains available.",
    resetParameters: "Reset parameters",
    applySuggestedCoverage: "Apply suggested coverage",
    option: "Option",
    generatedBlocks: "Generated blocks",
    levels: "Levels",
    targetCoverage: "Target coverage",
    achievedCoverage: "Achieved coverage",
    estimatedArea: "Estimated floor area",
    error: "The concept could not be generated. Please try again.",
  },
  ru: {
    eyebrow: "СОЗДАНИЕ",
    title: "Создать объёмную концепцию",
    intro: "Выберите программу, настройте пространственные параметры и создайте концептуальный 3D-вариант внутри выбранной зоны.",
    area: "Выбранная зона",
    blocks: "Корпуса",
    levelsMin: "Минимум этажей",
    levelsMax: "Максимум этажей",
    coverage: "Плотность застройки",
    openSpace: "Открытые пространства",
    setback: "Отступ",
    prompt: "Дополнительное задание",
    placeholder: "Например: сделай приоритетом затенённые пешеходные зоны и активные первые этажи.",
    generate: "Создать концепцию",
    regenerate: "Обновить концепцию",
    generating: "Создаём концепцию…",
    upToDate: "Уже создано",
    reset: "Удалить созданный результат",
    draft: "Настройки черновика",
    draftChanged: "Изменения не применены",
    errorPreserved: "Предыдущий корректный результат остаётся доступен.",
    resetParameters: "Сбросить параметры",
    applySuggestedCoverage: "Применить предложенную застройку",
    option: "Вариант",
    generatedBlocks: "Создано корпусов",
    levels: "Этажность",
    targetCoverage: "Целевая застройка",
    achievedCoverage: "Полученная застройка",
    estimatedArea: "Расчётная площадь этажей",
    error: "Не удалось создать концепцию. Попробуйте ещё раз.",
  }
} as const;

function controlsFrom(program: RedevelopmentProgramInput): Controls {
  return {
    blockCount: program.blockCount,
    levelsMin: program.levelsMin,
    levelsMax: program.levelsMax,
    targetSiteCoveragePct: program.targetSiteCoveragePct,
    openSpacePct: program.openSpacePct,
    setbackM: program.setbackM
  };
}

function templateLabel(templateId: ConceptTemplateId, locale: "en" | "ru"): string {
  const labels: Record<ConceptTemplateId, Record<"en" | "ru", string>> = {
    residential_mixed_use: { en: "Residential courtyard", ru: "Жилой квартал с двором" },
    commercial_hub: { en: "Business towers", ru: "Деловой комплекс" },
    civic_green: { en: "Public campus", ru: "Общественный кампус" }
  };
  return labels[templateId][locale];
}

function isGeneratedConcept(value: unknown): value is PointObjectGeneratedConcept {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<PointObjectGeneratedConcept> & { mode?: unknown };
  const alternativesAreValid = candidate.alternatives === undefined || (
    Array.isArray(candidate.alternatives) &&
    candidate.alternatives.length >= 1 &&
    candidate.alternatives.every((alternative) => typeof alternative === "object" && alternative !== null &&
      ((alternative as { id?: unknown }).id === "A" || (alternative as { id?: unknown }).id === "B") &&
      typeof (alternative as { label?: unknown }).label === "string" &&
      typeof (alternative as { massing?: unknown }).massing === "object" &&
      (alternative as { massing?: unknown }).massing !== null)
  );
  return candidate.mode === undefined &&
    typeof candidate.program === "object" && candidate.program !== null &&
    typeof candidate.massing === "object" && candidate.massing !== null &&
    typeof candidate.telemetry === "object" && candidate.telemetry !== null &&
    typeof candidate.caveat === "string" &&
    alternativesAreValid;
}

function coverageSuggestionResponse(value: unknown): {
  error: string;
  suggestion: PointObjectCreateCoverageSuggestion;
} | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const response = value as { mode?: unknown; error?: unknown; suggestion?: unknown };
  if (response.mode !== "programme_adjustment_required" || typeof response.error !== "string" ||
      typeof response.suggestion !== "object" || response.suggestion === null || Array.isArray(response.suggestion)) return null;
  const suggestion = response.suggestion as Partial<PointObjectCreateCoverageSuggestion>;
  if (suggestion.control !== "targetSiteCoveragePct" || suggestion.basis !== "bounded_validated_geometry_candidate" ||
      typeof suggestion.requestedValue !== "number" || typeof suggestion.suggestedValue !== "number" ||
      typeof suggestion.validatedAchievedValue !== "number" || !Number.isInteger(suggestion.searchAttempts) ||
      !Number.isFinite(suggestion.requestedValue) || !Number.isFinite(suggestion.suggestedValue) ||
      !Number.isFinite(suggestion.validatedAchievedValue) || !Number.isInteger(suggestion.requestedValue) ||
      !Number.isInteger(suggestion.suggestedValue) ||
      suggestion.requestedValue < 8 || suggestion.requestedValue > 60 || suggestion.suggestedValue < 8 ||
      suggestion.suggestedValue >= suggestion.requestedValue || suggestion.validatedAchievedValue < 0 ||
      suggestion.validatedAchievedValue > 60 || Math.abs(suggestion.validatedAchievedValue - suggestion.suggestedValue) > 1 ||
      (suggestion.searchAttempts ?? 0) < 2 ||
      (suggestion.searchAttempts ?? 0) > POINT_OBJECT_CREATE_COVERAGE_TOTAL_ATTEMPT_LIMIT) return null;
  return { error: response.error, suggestion: suggestion as PointObjectCreateCoverageSuggestion };
}

function RangeControl({
  label,
  value,
  minimum,
  maximum,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-xl border border-[#d7e0dd] bg-white p-3 text-xs font-semibold text-[#344054]">
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0">{label}</span>
        <span className="tabular-nums text-[#087f70]">{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={minimum}
        max={maximum}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-[#087f70]"
      />
    </label>
  );
}

export function PointObjectCreatePanel({ locale, marketKey, aoi, depth, generated, activeAlternativeId, onGenerated, onAlternativeChange, onReset, editorSnapshot = null, onEditorSnapshotChange }: CreatePanelProps) {
  const templates = useMemo(() => conceptTemplates(locale), [locale]);
  const editorScopeKey = createPointObjectCreateEditorScopeKey({ aoiId: aoi.id, marketKey, locale, depth });
  const restoredEditor = restorePointObjectCreateEditorSnapshot(editorSnapshot, editorScopeKey);
  const [templateId, setTemplateId] = useState<ConceptTemplateId>(() => restoredEditor?.templateId ?? "residential_mixed_use");
  const activeTemplate = templates.find((item) => item.templateId === templateId) ?? templates[0];
  const [controls, setControls] = useState<Controls>(() => restoredEditor?.controls ?? controlsFrom(activeTemplate));
  const [lockedControlKeys, setLockedControlKeys] = useState<Set<ControlKey>>(() => new Set(POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS));
  const [customPrompt, setCustomPrompt] = useState(() => restoredEditor?.customPrompt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverageSuggestion, setCoverageSuggestion] = useState<{
    error: string;
    suggestion: PointObjectCreateCoverageSuggestion;
  } | null>(null);
  const [committedDraftKey, setCommittedDraftKey] = useState<string | null>(() => restoredEditor?.committedDraftKey ?? null);
  const requestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const editorScopeKeyRef = useRef(editorScopeKey);
  const editorSnapshotCallbackRef = useRef(onEditorSnapshotChange);
  const editorScopeChanged = editorScopeKeyRef.current !== editorScopeKey;
  const copy = COPY[locale];
  const draftKey = useMemo(() => createPointObjectCreateDraftKey({
    scopeKey: editorScopeKey,
    templateId,
    customPrompt,
    controls,
    lockedControlKeys
  }), [controls, customPrompt, editorScopeKey, lockedControlKeys, templateId]);
  const generatedFromCurrentDraft = Boolean(generated && committedDraftKey === draftKey);
  const draftChangedAfterGeneration = Boolean(generated && !generatedFromCurrentDraft);

  useEffect(() => {
    editorSnapshotCallbackRef.current = onEditorSnapshotChange;
  }, [onEditorSnapshotChange]);

  useEffect(() => {
    requestIdRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError(null);
    if (editorScopeChanged) {
      const nextRestored = restorePointObjectCreateEditorSnapshot(editorSnapshot, editorScopeKey);
      const nextTemplateId = nextRestored?.templateId ?? "residential_mixed_use";
      const nextTemplate = templates.find((item) => item.templateId === nextTemplateId) ?? templates[0];
      setTemplateId(nextTemplateId);
      setControls(nextRestored?.controls ?? controlsFrom(nextTemplate));
      setLockedControlKeys(new Set(POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS));
      setCustomPrompt(nextRestored?.customPrompt ?? "");
      setCommittedDraftKey(nextRestored?.committedDraftKey ?? null);
      editorScopeKeyRef.current = editorScopeKey;
    }
    return () => {
      requestIdRef.current += 1;
      requestRef.current?.abort();
    };
  }, [editorScopeKey]);

  useEffect(() => {
    if (editorScopeChanged) return;
    editorSnapshotCallbackRef.current?.({
      version: 1,
      scopeKey: editorScopeKey,
      templateId,
      controls: { ...controls },
      lockedControlKeys: [...lockedControlKeys].sort(),
      customPrompt,
      committedDraftKey
    });
  }, [committedDraftKey, controls, customPrompt, editorScopeChanged, editorScopeKey, lockedControlKeys, templateId]);

  useEffect(() => {
    if (!generated) setCommittedDraftKey(null);
  }, [generated]);

  function invalidatePendingRequest() {
    requestIdRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError(null);
    setCoverageSuggestion(null);
  }

  function selectTemplate(nextId: ConceptTemplateId) {
    const template = templates.find((item) => item.templateId === nextId);
    if (!template) return;
    invalidatePendingRequest();
    setTemplateId(nextId);
    setControls(controlsFrom(template));
    setLockedControlKeys(new Set(POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS));
  }

  function updateControl<Key extends keyof Controls>(key: Key, value: Controls[Key]) {
    invalidatePendingRequest();
    const next = { ...controls, [key]: value };
    let correctedPair = false;
    if (key === "levelsMin" && next.levelsMax < next.levelsMin) {
      next.levelsMax = next.levelsMin;
      correctedPair = true;
    }
    if (key === "levelsMax" && next.levelsMin > next.levelsMax) {
      next.levelsMin = next.levelsMax;
      correctedPair = true;
    }
    setControls(next);
    setLockedControlKeys((current) => {
      const updated = new Set(current);
      updated.add(key);
      if (correctedPair) {
        updated.add("levelsMin");
        updated.add("levelsMax");
      }
      return updated;
    });
  }

  function resetEditedControls() {
    invalidatePendingRequest();
    setControls(controlsFrom(activeTemplate));
    setLockedControlKeys(new Set(POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS));
  }

  async function generate() {
    if (loading || generatedFromCurrentDraft) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const requestId = requestIdRef.current + 1;
    const requestDraftKey = draftKey;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setCoverageSuggestion(null);
    try {
      const challengeResponse = await fetch("/api/prototype/point-to-object/create", { method: "GET", cache: "no-store", signal: controller.signal });
      const challengePayload = await challengeResponse.json() as { mode?: unknown; challenge?: unknown; error?: unknown };
      if (!challengeResponse.ok || challengePayload.mode !== "ready" || typeof challengePayload.challenge !== "string") {
        throw new Error(typeof challengePayload.error === "string" ? challengePayload.error : copy.error);
      }
      const response = await fetch("/api/prototype/point-to-object/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          marketKey,
          locale,
          depth,
          templateId,
          customPrompt: customPrompt.trim() || null,
          controls,
          lockedControlKeys: [...lockedControlKeys],
          aoiCoordinates: aoi.coordinates,
          challenge: challengePayload.challenge
        })
      });
      const payload = await response.json() as unknown;
      const suggestion = coverageSuggestionResponse(payload);
      if (!response.ok && suggestion) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setCoverageSuggestion(suggestion);
        return;
      }
      if (!response.ok || typeof payload !== "object" || payload === null || (payload as { mode?: unknown }).mode !== "openai_concept") {
        const message = typeof payload === "object" && payload !== null && typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : copy.error;
        throw new Error(message);
      }
      const { mode: _mode, generatedAt: _generatedAt, promptVersion: _promptVersion, ...concept } = payload as PointObjectGeneratedConcept & { mode: string; generatedAt: string; promptVersion: string };
      if (!isGeneratedConcept(concept)) throw new Error(copy.error);
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setCommittedDraftKey(requestDraftKey);
      onGenerated(concept);
    } catch (requestError) {
      if (controller.signal.aborted || requestId !== requestIdRef.current || (requestError instanceof DOMException && requestError.name === "AbortError")) return;
      setError(requestError instanceof Error ? requestError.message : copy.error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        if (requestRef.current === controller) requestRef.current = null;
      }
    }
  }

  function resetGeneratedConcept() {
    requestIdRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError(null);
    setCoverageSuggestion(null);
    setCommittedDraftKey(null);
    onReset();
  }

  const activeAlternative = generated?.alternatives?.find((alternative) => alternative.id === activeAlternativeId) ?? null;
  const activeMassing = activeAlternative?.massing ?? generated?.massing ?? null;
  const generatedBlocks = activeMassing?.generatedBlockCount ?? 0;
  const generatedLevelsMin = activeMassing?.minGeneratedLevels ?? generated?.program.levelsMin ?? 0;
  const generatedLevelsMax = activeMassing?.maxGeneratedLevels ?? generated?.program.levelsMax ?? 0;
  const generatedLevels = generatedLevelsMin === generatedLevelsMax ? String(generatedLevelsMin) : `${generatedLevelsMin}–${generatedLevelsMax}`;
  const activeTemplateControls = controlsFrom(activeTemplate);
  const controlsDifferFromTemplate = POINT_OBJECT_CREATE_EDITOR_CONTROL_KEYS.some((key) => controls[key] !== activeTemplateControls[key]);

  function applySuggestedCoverage() {
    if (!coverageSuggestion) return;
    updateControl("targetSiteCoveragePct", coverageSuggestion.suggestion.suggestedValue);
  }

  return (
    <section className="rounded-[18px] border border-[#cfe0da] bg-[#f4faf7] p-4" aria-labelledby="create-panel-title">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#087f70]">{copy.eyebrow}</p>
      <h2 id="create-panel-title" className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#173b35]">{copy.title}</h2>
      <p className="mt-2 text-xs leading-5 text-[#536963]">{copy.intro}</p>
      <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-[#345c54]">
        {copy.area}: {aoi.areaSqM >= 10_000 ? `${(aoi.areaSqM / 10_000).toFixed(2)} ${locale === "ru" ? "га" : "ha"}` : `${Math.round(aoi.areaSqM).toLocaleString(locale)} ${locale === "ru" ? "м²" : "m²"}`}
      </p>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#536963]">{copy.draft}</p>

      <div className="mt-2 grid gap-2" aria-label={copy.title}>
        {templates.map((template) => (
          <button
            key={template.templateId}
            type="button"
            onClick={() => selectTemplate(template.templateId)}
            aria-pressed={templateId === template.templateId}
            className={`rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] ${templateId === template.templateId ? "border-[#48a99a] bg-white text-[#164b42] shadow-sm" : "border-[#d7e0dd] bg-white/70 text-[#475467] hover:border-[#8ebdb4]"}`}
          >
            <span className="block text-xs font-bold">{templateLabel(template.templateId, locale)}</span>
            <span className="mt-1 block text-[11px] leading-4 text-[#667085]">{template.summary}</span>
          </button>
        ))}
      </div>

      <details className="mt-4 rounded-xl border border-[#d7e0dd] bg-white/80 p-3">
        <summary className="cursor-pointer text-xs font-bold text-[#345c54]">{locale === "ru" ? "Параметры концепции" : "Concept parameters"}</summary>
        {controlsDifferFromTemplate ? <div className="mt-3 flex justify-end"><button type="button" onClick={resetEditedControls} className="min-h-11 rounded-lg px-2 text-[11px] font-bold text-[#087f70] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70]" data-testid="reset-edited-create-controls">{copy.resetParameters}</button></div> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <RangeControl label={copy.blocks} value={controls.blockCount} minimum={1} maximum={12} onChange={(value) => updateControl("blockCount", value)} />
          <RangeControl label={copy.coverage} value={controls.targetSiteCoveragePct} minimum={8} maximum={60} suffix="%" onChange={(value) => updateControl("targetSiteCoveragePct", value)} />
          <RangeControl label={copy.levelsMin} value={controls.levelsMin} minimum={1} maximum={40} onChange={(value) => updateControl("levelsMin", value)} />
          <RangeControl label={copy.levelsMax} value={controls.levelsMax} minimum={1} maximum={80} onChange={(value) => updateControl("levelsMax", value)} />
          <RangeControl label={copy.openSpace} value={controls.openSpacePct} minimum={15} maximum={75} suffix="%" onChange={(value) => updateControl("openSpacePct", value)} />
          <RangeControl label={copy.setback} value={controls.setbackM} minimum={2} maximum={30} suffix={locale === "ru" ? " м" : " m"} onChange={(value) => updateControl("setbackM", value)} />
        </div>
      </details>

      <label className="mt-4 block text-xs font-bold text-[#344054]" htmlFor="point-object-create-prompt">{copy.prompt}</label>
      <textarea
        id="point-object-create-prompt"
        value={customPrompt}
        onChange={(event) => {
          invalidatePendingRequest();
          setCustomPrompt(event.target.value.slice(0, 600));
        }}
        rows={3}
        placeholder={copy.placeholder}
        className="mt-2 w-full resize-none rounded-xl border border-[#cbd8d4] bg-white p-3 text-sm leading-5 outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#bde7df]"
      />

      {draftChangedAfterGeneration ? <p className="mt-3 text-[11px] font-bold text-[#79520d]" data-testid="create-draft-status">{copy.draftChanged}</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-3 py-2 text-xs leading-5 text-[#79520d]" role="alert" data-testid="create-generation-error">{error}{generated ? ` ${copy.errorPreserved}` : ""}</p> : null}
      {coverageSuggestion ? <div className="mt-3 rounded-lg border border-[#e6bd74] bg-[#fff9ed] p-3 text-xs leading-5 text-[#79520d]" role="alert" data-testid="create-coverage-suggestion"><p>{coverageSuggestion.error}{generated ? ` ${copy.errorPreserved}` : ""}</p><p className="mt-1 font-semibold tabular-nums">{coverageSuggestion.suggestion.requestedValue}% → {coverageSuggestion.suggestion.suggestedValue}%</p><button type="button" onClick={applySuggestedCoverage} className="mt-2 min-h-11 rounded-lg border border-[#d6b36e] bg-white px-3 font-bold text-[#65450f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70]" data-testid="create-apply-suggested-coverage">{copy.applySuggestedCoverage}</button></div> : null}
      {generated ? (
        <div className="mt-3 rounded-xl border border-[#98d1c4] bg-white p-3" data-testid="generated-concept-summary">
          {generated.alternatives && generated.alternatives.length > 1 ? <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-[#e8efed] p-1" role="tablist" aria-label={locale === "ru" ? "Варианты концепции" : "Concept options"}>{generated.alternatives.map((alternative) => <button key={alternative.id} type="button" role="tab" aria-selected={alternative.id === activeAlternativeId} data-testid={`create-alternative-${alternative.id.toLowerCase()}`} onClick={() => onAlternativeChange(alternative.id)} className={`min-h-11 rounded-lg px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] ${alternative.id === activeAlternativeId ? "bg-[#087f70] text-white shadow-sm" : "bg-transparent text-[#52606a] hover:bg-white"}`}>{alternative.label || `${copy.option} ${alternative.id}`}</button>)}</div> : null}
          <p className="text-xs leading-5 text-[#475467]">{generated.program.summary}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]" data-testid="generated-concept-metrics">
            <div className="rounded-lg bg-[#f4faf7] p-2"><dt className="text-[#667085]">{copy.generatedBlocks}</dt><dd className="mt-1 font-bold tabular-nums text-[#176548]">{generatedBlocks}</dd></div>
            <div className="rounded-lg bg-[#f4faf7] p-2"><dt className="text-[#667085]">{copy.levels}</dt><dd className="mt-1 font-bold tabular-nums text-[#176548]">{generatedLevels}</dd></div>
            <div className="rounded-lg bg-[#f4faf7] p-2"><dt className="text-[#667085]">{copy.targetCoverage}</dt><dd className="mt-1 font-bold tabular-nums text-[#176548]">{generated.program.targetSiteCoveragePct}%</dd></div>
            <div className="rounded-lg bg-[#f4faf7] p-2"><dt className="text-[#667085]">{copy.achievedCoverage}</dt><dd className="mt-1 font-bold tabular-nums text-[#176548]">{activeMassing?.achievedSiteCoveragePct ?? 0}%</dd></div>
            <div className="rounded-lg bg-[#f4faf7] p-2"><dt className="text-[#667085]">{copy.openSpace}</dt><dd className="mt-1 font-bold tabular-nums text-[#176548]">{generated.program.openSpacePct}%</dd></div>
            <div className="rounded-lg bg-[#f4faf7] p-2"><dt className="text-[#667085]">{copy.setback}</dt><dd className="mt-1 font-bold tabular-nums text-[#176548]">{generated.program.setbackM} {locale === "ru" ? "м" : "m"}</dd></div>
            {typeof activeMassing?.estimatedFloorAreaSqM === "number" ? <div className="col-span-2 rounded-lg bg-[#f4faf7] p-2"><dt className="text-[#667085]">{copy.estimatedArea}</dt><dd className="mt-1 font-bold tabular-nums text-[#176548]">{Math.round(activeMassing.estimatedFloorAreaSqM).toLocaleString(locale)} {locale === "ru" ? "м²" : "m²"}</dd></div> : null}
          </dl>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading || generatedFromCurrentDraft}
          data-testid="create-generate-action"
          className="min-h-11 rounded-xl bg-[#087f70] px-4 text-sm font-bold text-white transition hover:bg-[#06695e] disabled:cursor-not-allowed disabled:bg-[#a8c7c0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] focus-visible:ring-offset-2"
        >
          {loading ? copy.generating : generatedFromCurrentDraft ? copy.upToDate : generated ? copy.regenerate : copy.generate}
        </button>
        {generated ? <button type="button" onClick={resetGeneratedConcept} data-testid="create-clear-generated" className="min-h-11 rounded-xl border border-[#b8cbc6] bg-white px-3 text-xs font-bold text-[#345c54]">{copy.reset}</button> : null}
      </div>
    </section>
  );
}
