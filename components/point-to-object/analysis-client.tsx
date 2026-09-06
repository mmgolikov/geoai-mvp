"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import { ReliableSelect } from "@/components/point-to-object/reliable-select";
import { PointObjectHeader } from "@/components/point-to-object/prototype-header";
import {
  parsePointObjectAiResponse,
  readPointObjectAnalysis,
  readPointObjectQuestion,
  readPointObjectSelection,
  writePointObjectAnalysis,
  writePointObjectQuestion
} from "@/components/point-to-object/live-session";
import { POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION } from "@/components/point-to-object/live-types";
import type {
  GroundedClaim,
  LiveMapSelection,
  PointObjectAiResponse,
  PointObjectAnalysisDepth,
  PointObjectAnalysisGoal,
  PointObjectAnalysisHorizon,
  PointObjectAnalysisPerspective
} from "@/components/point-to-object/live-types";
import type { ExploreRole, ExploreScenarioId } from "@/src/lib/explore/types";
import { readPointObjectFindSession } from "@/src/lib/prototype/point-to-object-find-session";

type AnalysisSettings = {
  depth: PointObjectAnalysisDepth;
  goal: PointObjectAnalysisGoal;
  perspective: PointObjectAnalysisPerspective;
  horizon: PointObjectAnalysisHorizon;
};

const DEFAULT_SETTINGS: AnalysisSettings = {
  depth: "standard",
  goal: "development_screening",
  perspective: "developer",
  horizon: "current"
};

function settingsForFindIntent(role: ExploreRole, scenario: ExploreScenarioId): AnalysisSettings {
  const perspective: PointObjectAnalysisPerspective = [
    "real_estate_fund", "bank_lender", "investor_buyer", "family_office"
  ].includes(role)
    ? "investor"
    : ["developer", "government_urban_authority", "infrastructure_operator", "consultant_broker"].includes(role)
      ? "developer"
      : "asset_owner";
  const goal: PointObjectAnalysisGoal = scenario.startsWith("b2b_redevelopment_")
    ? "redevelopment"
    : scenario === "b2c_point_context" || scenario === "b2c_tourist_objects_route" || scenario === "b2c_interest_routes"
      ? "object_profile"
      : scenario === "b2c_residential_context"
        ? "due_diligence"
        : "development_screening";
  const horizon: PointObjectAnalysisHorizon = scenario === "b2c_point_context" || scenario === "b2c_tourist_objects_route" || scenario === "b2c_interest_routes"
    ? "current"
    : scenario === "b2b_redevelopment_100ha"
      ? "long_term"
      : "one_to_three_years";
  return { depth: "standard", goal, perspective, horizon };
}

function humanizeAttribute(key: string): string {
  return key.replace(/^tag\./, "").replace(/^classification\./, "").replaceAll("_", " ").replaceAll(":", " · ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function friendlyEvidenceLabel(reference: string, t: ReturnType<typeof usePointObjectLocale>["t"], locale: "en" | "ru"): string {
  const labels: Record<string, string> = {
    "EVD-COORDINATES": t("evidence.point"),
    "EVD-OBJECT": t("evidence.object"),
    "EVD-OSM-OBJECT": t("evidence.osmObject"),
    "EVD-CLASSIFICATION": t("evidence.classification"),
    "EVD-ADDRESS": t("evidence.address"),
    "EVD-GEOMETRY": t("evidence.geometry"),
    "EVD-ALLOWED-FIELDS": t("evidence.fields"),
    "EVD-SOURCE": t("evidence.source"),
    "EVD-SNAPSHOT": t("evidence.snapshot"),
    "EVD-RIGHTS": t("evidence.rights")
  };
  if (/^EVD-CONTEXT-\d+$/.test(reference)) return locale === "ru" ? `Объект окружения · ${reference}` : `Nearby place · ${reference}`;
  if (reference === "EVD-CONTEXT-SUMMARY") return locale === "ru" ? "Сводка окружения" : "Surroundings summary";
  if (reference === "EVD-DISTRICT-PROFILE") return locale === "ru" ? "Расчётный профиль окружения" : "Derived context profile";
  if (reference === "EVD-WIKIDATA-ENTITY") return locale === "ru" ? "Wikidata · связанный комплекс" : "Wikidata · linked complex";
  if (/^EVD-WIKIDATA-P\d+$/.test(reference)) return locale === "ru" ? `Wikidata · факт связанного комплекса ${reference.replace("EVD-WIKIDATA-", "")}` : `Wikidata · linked-complex fact ${reference.replace("EVD-WIKIDATA-", "")}`;
  return locale === "ru" ? `Запись источника · ${reference}` : `Source receipt · ${reference}`;
}

function EvidenceRefs({ references }: { references: string[] }) {
  const { locale, t } = usePointObjectLocale();
  return <details className="mt-2 text-[11px] leading-4 text-muted"><summary className="cursor-pointer select-none font-semibold">{t("analysis.evidence")} {references.length}</summary><p className="mt-1 break-words">{[...new Set(references.map((reference) => friendlyEvidenceLabel(reference, t, locale)))].join(" · ")}</p></details>;
}

function ClaimList({ items }: { items: GroundedClaim[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {items.map((item, index) => (
        <li key={`${item.statement}-${index}`} className="border-l-2 border-[#b9c9d5] pl-3 text-sm leading-6 text-[#344054]">
          <p>{item.statement}</p>
          <EvidenceRefs references={item.evidenceRefs} />
        </li>
      ))}
    </ul>
  );
}

function LoadingAnalysis({ depth }: { depth: PointObjectAnalysisDepth }) {
  const { t } = usePointObjectLocale();
  return (
    <div className="rounded-[20px] border border-line bg-white p-7 shadow-soft" role="status">
      <div className="h-3 w-28 animate-pulse rounded-full bg-[#dbe3ea]" />
      <div className="mt-5 h-8 w-4/5 animate-pulse rounded-lg bg-[#e9eef2]" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-[#eef2f5]" />
      <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-[#eef2f5]" />
      <p className="mt-6 text-sm font-semibold text-muted">{depth === "deep" ? t("analysis.loading.deep") : t("analysis.loading.standard")}</p>
    </div>
  );
}

function dispositionStyle(value: "continue_screening" | "hold" | "insufficient_evidence"): string {
  if (value === "continue_screening") return "border-[#aad4c2] bg-[#eef9f4] text-[#176548]";
  if (value === "hold") return "border-[#efc47b] bg-[#fff8e9] text-[#80530d]";
  return "border-[#cbd5e1] bg-[#f5f7f9] text-[#475467]";
}

function evidenceClassStyle(value: "observed" | "derived" | "hypothesis"): string {
  if (value === "observed") return "bg-[#edf7f2] text-[#176548]";
  if (value === "derived") return "bg-[#edf4ff] text-[#175cd3]";
  return "bg-[#fff5e8] text-[#8a4b08]";
}

export function PointToObjectAnalysis() {
  const { locale, t } = usePointObjectLocale();
  const [selection, setSelection] = useState<LiveMapSelection | null>(null);
  const [analysis, setAnalysis] = useState<PointObjectAiResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<PointObjectAnalysisDepth>(DEFAULT_SETTINGS.depth);
  const [goal, setGoal] = useState<PointObjectAnalysisGoal>(DEFAULT_SETTINGS.goal);
  const [perspective, setPerspective] = useState<PointObjectAnalysisPerspective>(DEFAULT_SETTINGS.perspective);
  const [horizon, setHorizon] = useState<PointObjectAnalysisHorizon>(DEFAULT_SETTINGS.horizon);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [missingSelection, setMissingSelection] = useState(false);
  const analysisRef = useRef<PointObjectAiResponse | null>(null);
  const requestSequenceRef = useRef(0);
  const activeRequestRef = useRef<AbortController | null>(null);
  const localeRef = useRef(locale);
  const translationRef = useRef(t);
  const localeRefreshAttemptRef = useRef<string | null>(null);
  localeRef.current = locale;
  translationRef.current = t;

  const focusedAnalyses: Array<{ goal: PointObjectAnalysisGoal; label: string; question: string }> = [
    { goal: "object_profile", label: t("focus.object.label"), question: t("focus.object.question") },
    { goal: "development_screening", label: t("focus.development.label"), question: t("focus.development.question") },
    { goal: "redevelopment", label: t("focus.redevelopment.label"), question: t("focus.redevelopment.question") },
    { goal: "due_diligence", label: t("focus.diligence.label"), question: t("focus.diligence.question") }
  ];
  const depthOptions: Array<{ value: PointObjectAnalysisDepth; label: string; description: string }> = [
    { value: "quick", label: t("analysis.quick"), description: t("analysis.quickHelp") },
    { value: "standard", label: t("analysis.standard"), description: t("analysis.standardHelp") },
    { value: "deep", label: t("analysis.deep"), description: t("analysis.deepHelp") }
  ];

  const commitAnalysis = useCallback((nextAnalysis: PointObjectAiResponse, activeSelection: LiveMapSelection) => {
    analysisRef.current = nextAnalysis;
    setAnalysis(nextAnalysis);
    writePointObjectAnalysis(nextAnalysis, activeSelection);
  }, []);

  const requestAnalysis = useCallback(async (activeSelection: LiveMapSelection, activeQuestion: string, settings: AnalysisSettings) => {
    activeRequestRef.current?.abort();
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const isCurrent = () => !controller.signal.aborted && requestSequenceRef.current === requestId;
    setLoading(true);
    setRequestError(null);
    setAnnouncement("");
    const preserveExisting = analysisRef.current?.mode === "openai";
    try {
      const challengeResponse = await fetch("/api/prototype/point-to-object/ai", { method: "GET", cache: "no-store", signal: controller.signal });
      const challengePayload = await challengeResponse.json() as { mode: "ready" | "unavailable"; challenge?: string; error?: string };
      if (!isCurrent()) return;
      if (!challengeResponse.ok || challengePayload.mode !== "ready" || !challengePayload.challenge) {
        const unavailable: PointObjectAiResponse = { mode: "unavailable", error: challengePayload.error ?? translationRef.current("analysis.unavailable.body"), retryable: true };
        if (preserveExisting) setRequestError(unavailable.error ?? translationRef.current("analysis.unavailable.body"));
        else commitAnalysis(unavailable, activeSelection);
        return;
      }

      const response = await fetch("/api/prototype/point-to-object/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          caseKey: activeSelection.locationKey,
          longitude: activeSelection.longitude,
          latitude: activeSelection.latitude,
          locale: localeRef.current,
          question: activeQuestion.trim() || null,
          depth: settings.depth,
          goal: settings.goal,
          perspective: settings.perspective,
          horizon: settings.horizon,
          expectedSourceFeatureId: activeSelection.resolvedObject?.sourceFeatureId ?? null,
          consent: true,
          challenge: challengePayload.challenge
        })
      });
      const rawPayload: unknown = await response.json();
      if (!isCurrent()) return;
      const payload = parsePointObjectAiResponse(rawPayload);
      if (!payload) {
        const unavailable: PointObjectAiResponse = {
          mode: "unavailable",
          error: translationRef.current("analysis.unavailable.body"),
          retryable: true
        };
        if (preserveExisting) setRequestError(unavailable.error ?? translationRef.current("analysis.unavailable.body"));
        else commitAnalysis(unavailable, activeSelection);
        return;
      }
      const normalized: PointObjectAiResponse = payload.mode === "openai" ? payload : {
        mode: "unavailable",
        error: payload.error ?? translationRef.current("analysis.unavailable.body"),
        retryable: payload.retryable ?? response.status >= 500
      };
      if (normalized.mode === "openai") {
        commitAnalysis(normalized, activeSelection);
        setQuestion("");
        writePointObjectQuestion("");
        setAnnouncement(preserveExisting ? translationRef.current("analysis.updated") : translationRef.current("analysis.complete"));
      } else if (preserveExisting) {
        setRequestError(normalized.error ?? translationRef.current("analysis.unavailable.body"));
      } else {
        commitAnalysis(normalized, activeSelection);
      }
    } catch (error) {
      if (!isCurrent() || (error instanceof DOMException && error.name === "AbortError")) return;
      const unavailable: PointObjectAiResponse = { mode: "unavailable", error: translationRef.current("analysis.unavailable.body"), retryable: true };
      if (preserveExisting) setRequestError(unavailable.error ?? translationRef.current("analysis.unavailable.body"));
      else commitAnalysis(unavailable, activeSelection);
    } finally {
      if (isCurrent()) {
        activeRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [commitAnalysis]);

  useEffect(() => {
    const restoredSelection = readPointObjectSelection();
    if (!restoredSelection) {
      setMissingSelection(true);
    } else {
      const restoredQuestion = readPointObjectQuestion();
      const restoredAnalysis = readPointObjectAnalysis(restoredSelection);
      setMissingSelection(false);
      setSelection(restoredSelection);
      setQuestion(restoredQuestion);
      if (restoredAnalysis?.mode === "openai") {
        analysisRef.current = restoredAnalysis;
        setAnalysis(restoredAnalysis);
        setDepth(restoredAnalysis.request.depth);
        setGoal(restoredAnalysis.request.goal);
        setPerspective(restoredAnalysis.request.perspective);
        setHorizon(restoredAnalysis.request.horizon);
        setAnnouncement(translationRef.current("analysis.saved"));
      } else if (restoredAnalysis) {
        analysisRef.current = restoredAnalysis;
        setAnalysis(restoredAnalysis);
      } else {
        const findSession = readPointObjectFindSession();
        const selectedSourceFeatureId = restoredSelection.resolvedObject?.sourceFeatureId ?? restoredSelection.object.sourceFeatureId;
        const intentSettings = findSession?.analysisTargetSourceFeatureId === selectedSourceFeatureId
          ? settingsForFindIntent(findSession.role, findSession.scenario)
          : DEFAULT_SETTINGS;
        const restoredSettings = restoredQuestion.trim()
          ? { ...intentSettings, goal: "custom" as const }
          : intentSettings;
        setDepth(restoredSettings.depth);
        setGoal(restoredSettings.goal);
        setPerspective(restoredSettings.perspective);
        setHorizon(restoredSettings.horizon);
        void requestAnalysis(restoredSelection, restoredQuestion, restoredSettings);
      }
    }
    return () => {
      requestSequenceRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
    };
  }, [requestAnalysis]);

  useEffect(() => {
    if (!selection || analysis?.mode !== "openai" || loading) return;
    if (analysis.schemaVersion !== POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION) return;
    if (analysis.request.locale === locale) {
      localeRefreshAttemptRef.current = null;
      return;
    }
    const refreshKey = `${selection.clickedAt}:${locale}`;
    if (localeRefreshAttemptRef.current === refreshKey) return;
    localeRefreshAttemptRef.current = refreshKey;
    void requestAnalysis(selection, analysis.request.question ?? "", {
      depth: analysis.request.depth,
      goal: analysis.request.goal,
      perspective: analysis.request.perspective,
      horizon: analysis.request.horizon
    });
  }, [analysis, loading, locale, requestAnalysis, selection]);

  function currentSettings(overrides: Partial<AnalysisSettings> = {}): AnalysisSettings {
    return { depth, goal, perspective, horizon, ...overrides };
  }

  function submitFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || !question.trim() || loading) return;
    writePointObjectQuestion(question.trim());
    void requestAnalysis(selection, question.trim(), currentSettings());
  }

  function selectFocusedAnalysis(focusedGoal: PointObjectAnalysisGoal, focusedQuestion: string) {
    if (loading) return;
    setGoal(focusedGoal);
    setQuestion(focusedQuestion);
    writePointObjectQuestion(focusedQuestion);
  }

  if (missingSelection) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-ink">
        <PointObjectHeader backToMap />
        <section className="mx-auto mt-24 w-[calc(100%-2rem)] max-w-lg rounded-[22px] border border-line bg-white p-7 text-center shadow-soft">
          <h1 className="text-2xl font-bold tracking-[-0.03em]">{t("analysis.missing.title")}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{t("analysis.missing.body")}</p>
          <Link href="/prototype/point-to-object" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-control bg-[#087f8c] px-5 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2">{t("analysis.missing.action")}</Link>
        </section>
      </main>
    );
  }

  const content = analysis?.mode === "openai" ? analysis.content : null;
  const semanticBrief = analysis?.mode === "openai" && analysis.schemaVersion === POINT_OBJECT_ANALYSIS_RESULT_SCHEMA_VERSION
    ? analysis.content.initialSemanticBrief
    : null;
  const subject = analysis?.mode === "openai" ? analysis.subject : null;
  const sourceGeometryContainsPoint = subject?.coordinateAssociation === "open_map_geometry_contains_point";
  const sourceIdentityTrusted = subject?.coordinateAssociation === "trusted_open_map_identity";
  const title = subject && !sourceGeometryContainsPoint && !sourceIdentityTrusted
    ? t("analysis.nearestTitle")
    : subject?.name ?? selection?.object.name ?? t("analysis.selectedTitle");
  const resolvedName = subject?.name && subject.name !== title ? subject.name : null;
  const contextRelation = subject
    ? sourceGeometryContainsPoint
      ? t("selection.relation.containing")
      : sourceIdentityTrusted
        ? t("selection.relation.exact")
        : t("selection.relation.nearest", { distance: Math.round(subject.resultCentroidDistanceM) })
    : null;
  const completedDepth = analysis?.mode === "openai" ? analysis.request.depth : depth;
  const localizedDepth = completedDepth === "quick" ? t("analysis.quick") : completedDepth === "deep" ? t("analysis.deep") : t("analysis.standard");
  const dispositionText = content?.decisionBrief.disposition === "continue_screening" ? t("analysis.continue") : content?.decisionBrief.disposition === "hold" ? t("analysis.hold") : t("analysis.insufficient");
  const localizedConfidence = (value: string) => locale === "ru" ? (value === "medium" ? "средняя" : value === "low" ? "низкая" : value) : value;
  const confidenceLabel = (value: string) => t("analysis.confidence", { value: localizedConfidence(value) });
  const localizedPerspective = (value: PointObjectAnalysisPerspective) => value === "developer" ? t("analysis.developer") : value === "investor" ? t("analysis.investor") : t("analysis.assetOwner");
  const localizedHorizon = (value: PointObjectAnalysisHorizon) => value === "current" ? t("analysis.current") : value === "one_to_three_years" ? t("analysis.oneToThree") : t("analysis.longTerm");
  const localizedAnswerStatus = (value: "answered" | "partial" | "unsupported") => locale === "ru" ? (value === "answered" ? "Ответ сформирован" : value === "partial" ? "Частичный ответ" : "Нет достаточных данных") : value;
  const localizedSeverity = (value: "low" | "medium" | "high") => locale === "ru" ? (value === "high" ? "Высокий" : value === "medium" ? "Средний" : "Низкий") : value;
  const localizedPriority = (value: "critical" | "high" | "medium") => locale === "ru" ? (value === "critical" ? "Критический" : value === "high" ? "Высокий" : "Средний") : value;
  const evidenceClassLabel = (value: "observed" | "derived" | "hypothesis") => value === "observed" ? t("analysis.observed") : value === "derived" ? t("analysis.derived") : t("analysis.hypothesis");
  const geoContext = content?.geoContext ?? subject?.geoContext ?? null;
  const lowValueStandaloneReceipts = new Set([
    "EVD-OSM-OBJECT", "EVD-OBJECT", "EVD-CLASSIFICATION", "EVD-ADDRESS", "EVD-GEOMETRY",
    "EVD-CONTEXT-SUMMARY", "EVD-DISTRICT-PROFILE", "EVD-SOURCE", "EVD-SNAPSHOT", "EVD-RIGHTS"
  ]);
  const factPriority = (item: GroundedClaim) => item.evidenceRefs.includes("EVD-ALLOWED-FIELDS") ? 0
    : item.evidenceRefs.includes("EVD-OBJECT-METRICS") ? 1
      : item.evidenceRefs.some((reference) => reference.startsWith("EVD-WIKIDATA-")) ? 2
        : item.evidenceRefs.some((reference) => /^EVD-CONTEXT-\d+$/.test(reference)) ? 3 : 4;
  const mergedLocationContext = content
    ? [...content.sourceFacts, ...content.locationContext]
      .filter((item) => item.evidenceRefs.length === 0 || !item.evidenceRefs.every((reference) => lowValueStandaloneReceipts.has(reference)))
      .filter((item, index, items) => items.findIndex((candidate) => candidate.statement === item.statement) === index)
      .sort((left, right) => factPriority(left) - factPriority(right))
    : [];
  const contextGroupLabels: Record<string, string> = locale === "ru" ? {
    residential: "Жильё", commercial: "Деловые объекты", hospitality: "Гостиницы", retail_daily_needs: "Торговля и услуги", education: "Образование", healthcare: "Здравоохранение", civic_culture: "Общественные и культурные объекты", transport: "Транспорт", access: "Дорожная доступность", open_space: "Открытые пространства", industrial: "Промышленность", construction: "Строительство", other_built: "Прочая застройка"
  } : {
    residential: "Residential", commercial: "Commercial", hospitality: "Hospitality", retail_daily_needs: "Retail & daily needs", education: "Education", healthcare: "Healthcare", civic_culture: "Civic & culture", transport: "Transport", access: "Road access", open_space: "Open space", industrial: "Industrial", construction: "Construction", other_built: "Other built"
  };
  const districtLabels: Record<string, string> = locale === "ru" ? {
    hospitality_tourism: "Туристско-гостиничная зона", commercial_business: "Деловая зона", residential: "Жилая зона", mixed_use_urban: "Смешанная городская зона", civic_institutional: "Общественно-институциональная зона", industrial_logistics: "Промышленно-логистическая зона", open_space_recreation: "Рекреационная зона", low_signal: "Недостаточно данных для типологии"
  } : {
    hospitality_tourism: "Hospitality & tourism district", commercial_business: "Commercial business district", residential: "Residential district", mixed_use_urban: "Mixed-use urban district", civic_institutional: "Civic & institutional district", industrial_logistics: "Industrial & logistics district", open_space_recreation: "Open-space & recreation district", low_signal: "Insufficient signal for district type"
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-ink">
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <PointObjectHeader backToMap />

      <div className="grid w-full gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0">
          <div className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{t("panel.eyebrow")}</p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] sm:text-3xl">{title}</h1>
            {resolvedName ? <p className="mt-2 text-base font-semibold text-[#344054]">{resolvedName}</p> : null}
            {contextRelation ? <p className="mt-2 text-xs font-semibold text-[#087f8c]">{contextRelation}</p> : null}
            {subject?.address ? <p className="mt-2 text-sm leading-6 text-muted">{subject.address}</p> : null}
            {subject && Object.keys(subject.tags).length ? (
              <div className="mt-4 flex flex-wrap gap-2" aria-label={t("selection.attributes")}>
                {Object.entries(subject.tags).slice(0, 6).map(([key, value]) => <span key={key} className="rounded-full bg-[#f3f6f8] px-2.5 py-1 text-[11px] font-semibold text-[#475467]">{humanizeAttribute(key)} · {value}</span>)}
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            {loading && !content ? <LoadingAnalysis depth={depth} /> : null}
            {loading && content ? <div className="mb-5 rounded-xl border border-[#a8d8d5] bg-[#eefaf8] px-4 py-3 text-sm font-semibold text-[#087f8c]" role="status">{t("analysis.loading.preserve", { depth: localizedDepth })}</div> : null}
            {requestError && content ? <div className="mb-5 rounded-xl border border-[#e7c47e] bg-[#fffaf0] px-4 py-3 text-sm text-[#6b4b16]" role="alert">{requestError} {t("analysis.previous")}</div> : null}
            {!loading && analysis?.mode === "unavailable" ? (
              <section className="rounded-[20px] border border-[#e7c47e] bg-[#fffaf0] p-6 shadow-soft" role="alert">
                <h2 className="text-lg font-bold">{t("analysis.unavailable.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-[#6b4b16]">{analysis.error ?? t("analysis.unavailable.body")}</p>
                {selection && analysis.retryable !== false ? <button type="button" onClick={() => void requestAnalysis(selection, question, currentSettings())} className="mt-5 min-h-11 rounded-control bg-[#087f8c] px-5 text-sm font-bold text-white">{t("analysis.tryAgain")}</button> : null}
              </section>
            ) : null}

            {content ? (
              <div className="space-y-5" data-testid="ai-success">
                <section className="rounded-[20px] border border-[#c8d9ec] bg-white p-5 shadow-soft sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#087f8c]">{t("analysis.decisionBrief")}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${dispositionStyle(content.decisionBrief.disposition)}`}>{dispositionText}</span>
                    <span className="rounded-full bg-[#f3f6f8] px-2.5 py-1 text-[11px] font-semibold text-[#475467]">{confidenceLabel(content.decisionBrief.confidence)}</span>
                  </div>
                  <h2 className="mt-4 text-xl font-bold leading-8 tracking-[-0.025em] text-[#172b4d]">{content.decisionBrief.headline}</h2>
                  <p className="mt-3 text-base leading-7 text-[#344054]">{content.decisionBrief.summary}</p>
                  {semanticBrief ? <div className="mt-5 rounded-2xl border border-[#d6e4e1] bg-[#f5faf8] p-4">
                    <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#176548]">{locale === "ru" ? "Контекст решения" : "Decision context"}</p><span className="text-[10px] font-semibold text-[#536963]">{confidenceLabel(semanticBrief.confidence)}</span></div>
                    <ClaimList items={[semanticBrief.subject, semanticBrief.context, semanticBrief.access, semanticBrief.implication]} />
                  </div> : null}
                  <ClaimList items={content.decisionBrief.reasons} />
                  {content.answerToQuestion && analysis?.mode === "openai" && Boolean(analysis.request.question) ? (
                    <div className="mt-6 rounded-2xl border border-[#cfe0f7] bg-[#eef6ff] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#087f8c]">{t("analysis.answer")}</p>
                      {analysis?.mode === "openai" && analysis.request.question ? <p className="mt-2 text-xs leading-5 text-[#52657a]">{analysis.request.question}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[#087f8c]">{localizedAnswerStatus(content.answerToQuestion.status)}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#52657a]">{localizedPerspective(content.answerToQuestion.perspective)}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#52657a]">{localizedHorizon(content.answerToQuestion.horizon)}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#52657a]">{confidenceLabel(content.answerToQuestion.confidence)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#243447]">{content.answerToQuestion.statement}</p>
                      {content.answerToQuestion.missingEvidence.length > 0 ? <p className="mt-3 text-xs leading-5 text-[#52657a]"><span className="font-bold">{t("analysis.strengthen")}</span> {content.answerToQuestion.missingEvidence.join("; ")}.</p> : null}
                      <EvidenceRefs references={content.answerToQuestion.evidenceRefs} />
                    </div>
                  ) : null}
                  <p className="mt-5 border-t border-line pt-4 text-[11px] leading-5 text-muted" data-testid="analysis-caveat">{content.caveat}</p>
                </section>

                {geoContext ? <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h2 className="text-base font-bold">{locale === "ru" ? "Окружение в радиусе 400 м" : "Surroundings within 400 m"}</h2><p className="mt-1 text-xs leading-5 text-muted">{locale === "ru" ? "Объекты, найденные в открытой карте вокруг выбранной точки; расстояния рассчитаны по прямой." : "Features returned by the open map around the selected point; distances are straight-line."}</p></div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${geoContext.coverage === "available" ? "bg-[#edf7f2] text-[#176548]" : "bg-[#fff5e8] text-[#8a4b08]"}`}>{geoContext.coverage === "available" ? (locale === "ru" ? "Данные доступны" : "Coverage available") : (locale === "ru" ? "Данные недоступны" : "Coverage unavailable")}</span>
                  </div>
                  {geoContext.coverage === "available" ? <>
                    <div className="mt-4 rounded-2xl bg-[#f2f8f5] p-4"><p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#176548]">{locale === "ru" ? "Характер окружения" : "District character"}</p><p className="mt-1 text-lg font-bold text-[#173b35]">{districtLabels[geoContext.districtCharacter.code] ?? humanizeAttribute(geoContext.districtCharacter.code)}</p><p className="mt-1 text-xs leading-5 text-[#536963]">{locale === "ru" ? "Определяющие группы:" : "Primary drivers:"} {geoContext.districtCharacter.driverGroups.map((group) => contextGroupLabels[group] ?? group).join(", ") || (locale === "ru" ? "сигнал недостаточен" : "insufficient signal")} · {confidenceLabel(geoContext.districtCharacter.confidence)}</p></div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-line p-3"><dt className="text-[10px] font-bold uppercase text-muted">{locale === "ru" ? "Объекты выборки" : "Returned features"}</dt><dd className="mt-1 text-lg font-bold">{geoContext.sampleSize}</dd></div>
                      <div className="rounded-xl border border-line p-3"><dt className="text-[10px] font-bold uppercase text-muted">{locale === "ru" ? "Здания в выборке" : "Returned buildings"}</dt><dd className="mt-1 text-lg font-bold">{geoContext.mappedBuildingCount}</dd></div>
                      <div className="rounded-xl border border-line p-3"><dt className="text-[10px] font-bold uppercase text-muted">{locale === "ru" ? "Медиана этажей" : "Median levels"}</dt><dd className="mt-1 text-lg font-bold">{geoContext.medianMappedLevels ?? "—"}</dd><p className="mt-1 text-[10px] text-muted">{geoContext.mappedLevelsKnownCount}/{geoContext.mappedBuildingCount} {locale === "ru" ? "с этажностью" : "known"}</p></div>
                      <div className="rounded-xl border border-line p-3"><dt className="text-[10px] font-bold uppercase text-muted">{locale === "ru" ? "Доступность" : "Access"}</dt><dd className="mt-1 text-xs font-bold">{locale === "ru" ? "Транспорт" : "Transit"}: {geoContext.nearestTransitM === null ? "—" : `${geoContext.nearestTransitM} m`}</dd><p className="mt-1 text-[10px] text-muted">{locale === "ru" ? "Магистраль" : "Major road"}: {geoContext.nearestMajorRoadM === null ? "—" : `${geoContext.nearestMajorRoadM} m`}</p></div>
                    </dl>
                    {geoContext.groups.some((group) => group.count > 0) ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{geoContext.groups.filter((group) => group.count > 0).slice(0, 8).map((group) => <div key={group.group} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fafc] px-3 py-2 text-xs"><span className="font-semibold text-[#344054]">{contextGroupLabels[group.group] ?? group.group}</span><span className="shrink-0 tabular-nums text-muted">{group.count} · {group.sharePct}%{group.nearestDistanceM === null ? "" : ` · ${group.nearestDistanceM} m`}</span></div>)}</div> : null}
                    {geoContext.capReached ? <p className="mt-3 rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-3 py-2 text-[11px] text-[#79520d]">{locale === "ru" ? "Достигнут лимит выборки: доли относятся только к найденным объектам, а не ко всему окружению." : "The sample cap was reached: shares describe only the returned features, not the full surroundings."}</p> : null}
                    {subject?.metrics ? <p className="mt-3 text-[11px] leading-5 text-muted">{locale === "ru" ? "Приближённая геометрия объекта" : "Approximate object geometry"}: {Math.round(subject.metrics.footprintAreaSqM).toLocaleString(locale)} {locale === "ru" ? "м²" : "m²"} · {Math.round(subject.metrics.footprintPerimeterM).toLocaleString(locale)} {locale === "ru" ? "м по периметру. Расчёт выполнен локально по генерализованной геометрии WGS84." : "m perimeter. Locally calculated from generalized WGS84 geometry."}</p> : null}
                  </> : <p className="mt-4 text-sm leading-6 text-muted">{locale === "ru" ? "Для этой точки выборка окружающих объектов не получена. Выводы о типе района не формируются." : "No surrounding-feature sample was returned for this point. No district-type inference is shown."}</p>}
                </section> : null}

                <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div><h2 className="text-base font-bold">{t("analysis.signals")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("analysis.signalsHelp")}</p></div>
                    <span className="text-[11px] font-semibold text-muted">{t("analysis.depthLabel", { depth: localizedDepth })}</span>
                  </div>
                  <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                    {content.signals.map((item, index) => (
                      <li key={`${item.title}-${index}`} className="rounded-2xl border border-line bg-[#fbfcfd] p-4">
                        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${evidenceClassStyle(item.evidenceClass)}`}>{evidenceClassLabel(item.evidenceClass)}</span><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">{confidenceLabel(item.confidence)}</span></div>
                        <h3 className="mt-3 text-sm font-bold text-[#243447]">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#475467]">{item.observation}</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-[#243447]">{t("analysis.why")} {item.implication}</p>
                        <EvidenceRefs references={item.evidenceRefs} />
                      </li>
                    ))}
                  </ul>
                </section>

                {mergedLocationContext.length > 0 ? <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                  <h2 className="text-base font-bold">{t("analysis.locationContext")}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted">{t("analysis.locationContextHelp")}</p>
                  <ClaimList items={mergedLocationContext} />
                </section> : null}

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                    <h2 className="text-base font-bold">{t("analysis.opportunities")}</h2>
                    <ul className="mt-4 space-y-3">
                      {content.opportunities.map((item, index) => (
                        <li key={`${item.title}-${index}`} className="rounded-2xl bg-[#f2f8f5] p-4">
                          <h3 className="text-sm font-bold text-[#175c45]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#344054]">{item.hypothesis}</p><p className="mt-2 text-xs leading-5 text-[#475467]">{item.rationale}</p><p className="mt-2 text-xs font-semibold leading-5 text-[#175c45]">{t("analysis.potentialValue")} {item.potentialValue}</p><p className="mt-2 text-[11px] leading-4 text-muted">{t("analysis.evidenceNeeded")} {item.evidenceNeeded.join("; ")}</p><EvidenceRefs references={item.evidenceRefs} />
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                    <h2 className="text-base font-bold">{t("analysis.risks")}</h2>
                    <ul className="mt-4 space-y-3">
                      {content.risks.map((item, index) => (
                        <li key={`${item.title}-${index}`} className="rounded-2xl bg-[#fff8ee] p-4">
                          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-[#7a4a0c]">{item.title}</h3><span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#8a4b08]">{localizedSeverity(item.severity)}</span></div><p className="mt-2 text-sm leading-6 text-[#344054]">{item.statement}</p><p className="mt-2 text-xs font-semibold leading-5 text-[#6b4b16]">{t("analysis.decisionImpact")} {item.decisionImpact}</p><EvidenceRefs references={item.evidenceRefs} />
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-7">
                  <h2 className="text-base font-bold">{t("analysis.next")}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted">{t("analysis.nextHelp")}</p>
                  <ol className="mt-4 space-y-3">
                    {content.nextValidation.map((item, index) => (
                      <li key={`${item.title}-${index}`} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[32px_minmax(0,1fr)]">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e5fafa] text-xs font-bold text-[#087f8c]">{index + 1}</span>
                        <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#243447]">{item.title}</h3><span className="rounded-full bg-[#f3f6f8] px-2 py-0.5 text-[10px] font-bold uppercase text-[#475467]">{localizedPriority(item.priority)}</span></div><p className="mt-2 text-sm leading-6 text-[#344054]">{item.action}</p><p className="mt-2 text-xs leading-5 text-muted"><span className="font-semibold text-[#475467]">{t("analysis.check")}</span> {item.source}</p><p className="mt-1 text-xs leading-5 text-muted"><span className="font-semibold text-[#475467]">{t("analysis.decisionImpact")}</span> {item.decisionImpact}</p></div>
                      </li>
                    ))}
                  </ol>
                </section>

              </div>
            ) : null}
          </div>
        </section>

        <aside className="min-w-0"><div className="space-y-5 xl:sticky xl:top-6">
          <form onSubmit={submitFollowUp} className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
            <label className="text-base font-bold" htmlFor="analysis-follow-up">{t("analysis.focused")}</label>
            <p className="mt-2 text-xs leading-5 text-muted">{t("analysis.focusedHelp")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2" aria-label={t("analysis.focusedOptions")}>
              {focusedAnalyses.map((item) => <button key={item.goal} type="button" onClick={() => selectFocusedAnalysis(item.goal, item.question)} disabled={loading} aria-pressed={goal === item.goal} className={`min-h-11 rounded-xl border px-3 text-left text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${goal === item.goal ? "border-[#087f8c] bg-[#e5fafa] text-[#087f8c]" : "border-line bg-[#f8fafc] text-[#344054] hover:border-[#76bfc1] hover:bg-white"}`}>{item.label}</button>)}
            </div>
            <textarea id="analysis-follow-up" value={question} onChange={(event) => { setQuestion(event.target.value.slice(0, 500)); setGoal("custom"); }} rows={5} placeholder={t("analysis.followUpPlaceholder")} className="mt-4 w-full resize-y rounded-xl border border-line p-3 text-sm leading-6 outline-none focus:border-[#087f8c] focus:ring-2 focus:ring-[#a8d8d5]" />
            <fieldset className="mt-4">
              <legend className="text-xs font-bold text-[#344054]">{t("analysis.depth")}</legend>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-[#f2f5f8] p-1">
                {depthOptions.map((option) => <button key={option.value} type="button" onClick={() => setDepth(option.value)} aria-pressed={depth === option.value} className={`min-h-10 rounded-lg px-2 text-xs font-bold transition ${depth === option.value ? "bg-white text-[#087f8c] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}>{option.label}</button>)}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted">{depthOptions.find((option) => option.value === depth)?.description}</p>
            </fieldset>
            <details className="mt-4 rounded-xl border border-line bg-[#fbfcfd] p-3">
              <summary className="cursor-pointer text-xs font-bold text-[#475467]">{t("analysis.settings")}</summary>
              <div className="mt-3 grid gap-3">
                <label className="text-xs font-semibold text-[#475467]">{t("analysis.perspective")}<ReliableSelect value={perspective} onChange={(event) => setPerspective(event.target.value as PointObjectAnalysisPerspective)} data-testid="point-object-analysis-perspective-select" wrapperClassName="mt-1" className="min-h-10 rounded-lg border border-line bg-white pl-3 text-sm text-[#344054] outline-none focus:border-[#087f8c] focus-visible:ring-2 focus-visible:ring-[#bfe4e2]"><option value="developer">{t("analysis.developer")}</option><option value="investor">{t("analysis.investor")}</option><option value="asset_owner">{t("analysis.assetOwner")}</option></ReliableSelect></label>
                <label className="text-xs font-semibold text-[#475467]">{t("analysis.horizon")}<ReliableSelect value={horizon} onChange={(event) => setHorizon(event.target.value as PointObjectAnalysisHorizon)} data-testid="point-object-analysis-horizon-select" wrapperClassName="mt-1" className="min-h-10 rounded-lg border border-line bg-white pl-3 text-sm text-[#344054] outline-none focus:border-[#087f8c] focus-visible:ring-2 focus-visible:ring-[#bfe4e2]"><option value="current">{t("analysis.current")}</option><option value="one_to_three_years">{t("analysis.oneToThree")}</option><option value="long_term">{t("analysis.longTerm")}</option></ReliableSelect></label>
              </div>
            </details>
            <button type="submit" disabled={!question.trim() || loading} className="mt-4 min-h-12 w-full rounded-control bg-[#087f8c] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#b7c4d7]">{loading ? t("analysis.running", { depth: localizedDepth }) : t("analysis.run")}</button>
          </form>
        </div></aside>
      </div>
    </main>
  );
}
