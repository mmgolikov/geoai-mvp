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
};

type Controls = Pick<RedevelopmentProgramInput,
  "blockCount" | "levelsMin" | "levelsMax" | "targetSiteCoveragePct" | "openSpacePct" | "setbackM">;
type ControlKey = keyof Controls;

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
    generating: "Generating concept…",
    reset: "Reset concept",
    edited: "Edited",
    resetParameters: "Reset edited values",
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
    generating: "Создаём концепцию…",
    reset: "Сбросить концепцию",
    edited: "Изменено",
    resetParameters: "Сбросить изменения",
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

function RangeControl({
  label,
  value,
  minimum,
  maximum,
  suffix,
  edited,
  editedLabel,
  onChange
}: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  suffix?: string;
  edited: boolean;
  editedLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-xl border border-[#d7e0dd] bg-white p-3 text-xs font-semibold text-[#344054]">
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2"><span>{label}</span>{edited ? <span className="rounded-full bg-[#e6f5f1] px-2 py-0.5 text-[10px] font-bold text-[#176548]">{editedLabel}</span> : null}</span>
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

export function PointObjectCreatePanel({ locale, marketKey, aoi, depth, generated, activeAlternativeId, onGenerated, onAlternativeChange, onReset }: CreatePanelProps) {
  const templates = useMemo(() => conceptTemplates(locale), [locale]);
  const [templateId, setTemplateId] = useState<ConceptTemplateId>("residential_mixed_use");
  const activeTemplate = templates.find((item) => item.templateId === templateId) ?? templates[0];
  const [controls, setControls] = useState<Controls>(() => controlsFrom(activeTemplate));
  const [lockedControlKeys, setLockedControlKeys] = useState<Set<ControlKey>>(() => new Set());
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const copy = COPY[locale];

  useEffect(() => {
    requestIdRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError(null);
    return () => {
      requestIdRef.current += 1;
      requestRef.current?.abort();
    };
  }, [aoi.id, depth, locale, marketKey]);

  function invalidateGeneration() {
    requestIdRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setError(null);
    if (generated) onReset();
  }

  function selectTemplate(nextId: ConceptTemplateId) {
    const template = templates.find((item) => item.templateId === nextId);
    if (!template) return;
    invalidateGeneration();
    setTemplateId(nextId);
    setControls(controlsFrom(template));
    setLockedControlKeys(new Set());
  }

  function updateControl<Key extends keyof Controls>(key: Key, value: Controls[Key]) {
    invalidateGeneration();
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
    invalidateGeneration();
    setControls(controlsFrom(activeTemplate));
    setLockedControlKeys(new Set());
  }

  async function generate() {
    if (loading) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
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
      if (!response.ok || typeof payload !== "object" || payload === null || (payload as { mode?: unknown }).mode !== "openai_concept") {
        const message = typeof payload === "object" && payload !== null && typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : copy.error;
        throw new Error(message);
      }
      const { mode: _mode, generatedAt: _generatedAt, promptVersion: _promptVersion, ...concept } = payload as PointObjectGeneratedConcept & { mode: string; generatedAt: string; promptVersion: string };
      if (!isGeneratedConcept(concept)) throw new Error(copy.error);
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
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
    onReset();
  }

  const activeAlternative = generated?.alternatives?.find((alternative) => alternative.id === activeAlternativeId) ?? null;
  const activeMassing = activeAlternative?.massing ?? generated?.massing ?? null;
  const generatedBlocks = activeMassing?.generatedBlockCount ?? 0;
  const generatedLevelsMin = activeMassing?.minGeneratedLevels ?? generated?.program.levelsMin ?? 0;
  const generatedLevelsMax = activeMassing?.maxGeneratedLevels ?? generated?.program.levelsMax ?? 0;
  const generatedLevels = generatedLevelsMin === generatedLevelsMax ? String(generatedLevelsMin) : `${generatedLevelsMin}–${generatedLevelsMax}`;

  return (
    <section className="rounded-[18px] border border-[#cfe0da] bg-[#f4faf7] p-4" aria-labelledby="create-panel-title">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#087f70]">{copy.eyebrow}</p>
      <h2 id="create-panel-title" className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#173b35]">{copy.title}</h2>
      <p className="mt-2 text-xs leading-5 text-[#536963]">{copy.intro}</p>
      <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-[#345c54]">
        {copy.area}: {aoi.areaSqM >= 10_000 ? `${(aoi.areaSqM / 10_000).toFixed(2)} ${locale === "ru" ? "га" : "ha"}` : `${Math.round(aoi.areaSqM).toLocaleString(locale)} ${locale === "ru" ? "м²" : "m²"}`}
      </p>

      <div className="mt-4 grid gap-2" aria-label={copy.title}>
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
        {lockedControlKeys.size > 0 ? <div className="mt-3 flex justify-end"><button type="button" onClick={resetEditedControls} className="min-h-11 rounded-lg px-2 text-[11px] font-bold text-[#087f70] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70]" data-testid="reset-edited-create-controls">{copy.resetParameters}</button></div> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <RangeControl label={copy.blocks} value={controls.blockCount} minimum={1} maximum={12} edited={lockedControlKeys.has("blockCount")} editedLabel={copy.edited} onChange={(value) => updateControl("blockCount", value)} />
          <RangeControl label={copy.coverage} value={controls.targetSiteCoveragePct} minimum={8} maximum={60} suffix="%" edited={lockedControlKeys.has("targetSiteCoveragePct")} editedLabel={copy.edited} onChange={(value) => updateControl("targetSiteCoveragePct", value)} />
          <RangeControl label={copy.levelsMin} value={controls.levelsMin} minimum={1} maximum={40} edited={lockedControlKeys.has("levelsMin")} editedLabel={copy.edited} onChange={(value) => updateControl("levelsMin", value)} />
          <RangeControl label={copy.levelsMax} value={controls.levelsMax} minimum={1} maximum={80} edited={lockedControlKeys.has("levelsMax")} editedLabel={copy.edited} onChange={(value) => updateControl("levelsMax", value)} />
          <RangeControl label={copy.openSpace} value={controls.openSpacePct} minimum={15} maximum={75} suffix="%" edited={lockedControlKeys.has("openSpacePct")} editedLabel={copy.edited} onChange={(value) => updateControl("openSpacePct", value)} />
          <RangeControl label={copy.setback} value={controls.setbackM} minimum={2} maximum={30} suffix={locale === "ru" ? " м" : " m"} edited={lockedControlKeys.has("setbackM")} editedLabel={copy.edited} onChange={(value) => updateControl("setbackM", value)} />
        </div>
      </details>

      <label className="mt-4 block text-xs font-bold text-[#344054]" htmlFor="point-object-create-prompt">{copy.prompt}</label>
      <textarea
        id="point-object-create-prompt"
        value={customPrompt}
        onChange={(event) => {
          invalidateGeneration();
          setCustomPrompt(event.target.value.slice(0, 600));
        }}
        rows={3}
        placeholder={copy.placeholder}
        className="mt-2 w-full resize-none rounded-xl border border-[#cbd8d4] bg-white p-3 text-sm leading-5 outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#bde7df]"
      />

      {error ? <p className="mt-3 rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-3 py-2 text-xs leading-5 text-[#79520d]" role="alert">{error}</p> : null}
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
          disabled={loading}
          className="min-h-11 rounded-xl bg-[#087f70] px-4 text-sm font-bold text-white transition hover:bg-[#06695e] disabled:cursor-not-allowed disabled:bg-[#a8c7c0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] focus-visible:ring-offset-2"
        >
          {loading ? copy.generating : copy.generate}
        </button>
        {generated ? <button type="button" onClick={resetGeneratedConcept} className="min-h-11 rounded-xl border border-[#b8cbc6] bg-white px-3 text-xs font-bold text-[#345c54]">{copy.reset}</button> : null}
      </div>
    </section>
  );
}
