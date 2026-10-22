"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { DerivedArtifact, DevkitProject, DesignVersion, ProjectBrief } from "@/src/lib/devkit/contracts";
import {
  WORKFLOW_STAGES, activeWorkflowDesign, applyWorkflowBrief, isWorkflowDesignCurrent, latestWorkflowDesigns,
  parseWorkflowCommand, selectWorkflowDesign, matchWorkflowSavedSnapshot, workflowArtifactForDesign, workflowArtifactState, workflowCriticalGaps,
  workflowScope, type WorkflowArtifactState, type WorkflowStage
} from "./workflow-model";
import "./workflow.css";

export type { WorkflowStage } from "./workflow-model";
export type WorkflowActionResult = { ok: boolean; message?: string };
export type DevkitWorkflowContext = {
  project: DevkitProject;
  locale: "en" | "ru";
  activeDesign: DesignVersion | null;
  onProjectChange: (project: DevkitProject) => void;
  navigate: (stage: WorkflowStage) => void;
  hasUnappliedBrief: boolean;
  savedSnapshot: DevkitProject | null;
};
export type DevkitWorkflowProps = {
  project: DevkitProject;
  locale: "en" | "ru";
  onProjectChange: (project: DevkitProject) => void;
  savedSnapshot?: DevkitProject | null;
  initialStage?: WorkflowStage;
  onStageChange?: (stage: WorkflowStage) => void;
  slots?: Partial<Record<Exclude<WorkflowStage, "brief">, (context: DevkitWorkflowContext) => ReactNode>>;
  onSave?: (project: DevkitProject) => WorkflowActionResult | Promise<WorkflowActionResult>;
  onReopen?: (projectId: string) => WorkflowActionResult | Promise<WorkflowActionResult>;
  onExport?: (project: DevkitProject) => WorkflowActionResult | Promise<WorkflowActionResult>;
  saveState?: "unsaved" | "saved" | "saving" | "error" | "conflict";
  /** A current snapshot supplied by Control, never an implicit synthetic replacement. */
  onChooseAoi?: () => void;
  onUnappliedBriefChange?: (pending: boolean) => void;
};

const STAGE_NAMES = {
  en: { brief: "Brief & site", evidence: "Evidence", concepts: "Concepts", finance: "Areas & finance", kit: "Review & kit" },
  ru: { brief: "Бриф и зона", evidence: "Доказательства", concepts: "Концепции", finance: "Площади и финансы", kit: "Review и комплект" }
};

/** Owns screen state only. Project selection, persistence, calculations and route wiring stay with their owners. */
export function DevkitWorkflow(props: DevkitWorkflowProps) {
  return <WorkflowSession key={props.project.id} {...props} />;
}

function WorkflowSession({ project, locale, onProjectChange, initialStage = "brief", onStageChange, slots, onSave, onReopen, onExport, saveState = "unsaved", onChooseAoi, onUnappliedBriefChange, savedSnapshot = null }: DevkitWorkflowProps) {
  const t = (en: string, ru: string) => locale === "ru" ? ru : en;
  const uid = useId();
  const [stage, setStage] = useState<WorkflowStage>(initialStage);
  const [brief, setBrief] = useState<ProjectBrief>(() => structuredClone(project.brief));
  const [budgetText, setBudgetText] = useState(project.brief.budget.amount === null ? "" : String(project.brief.budget.amount));
  const [command, setCommand] = useState("");
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "reopen" | "export" | null>(null);
  const busyRef = useRef(false);
  const projectRef = useRef(project);
  projectRef.current = project;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const activeDesign = activeWorkflowDesign(project);
  const designs = latestWorkflowDesigns(project);
  const gaps = workflowCriticalGaps(project);
  const areas = workflowArtifactForDesign(project, "areas");
  const finance = workflowArtifactForDesign(project, "finance");
  const kit = workflowArtifactForDesign(project, "kit");
  const areaState = workflowArtifactState(project, areas);
  const financeState = workflowArtifactState(project, finance);
  const kitState = workflowArtifactState(project, kit);
  const unknownClaims = project.claims.filter((claim) => claim.status === "unknown" || claim.status === "conflicting" || claim.value === null);
  const sourceIssues = project.evidence.filter((item) => item.status !== "available" || item.rights.permittedUse === "unknown" || item.rights.redistribution !== "allowed");
  const currentDesign = Boolean(activeDesign && isWorkflowDesignCurrent(project, activeDesign));
  const draftKit = gaps.length > 0 || sourceIssues.length > 0 || unknownClaims.length > 0 || !project.evidence.length || !currentDesign || areaState !== "current" || financeState !== "current" || kitState !== "current";
  const stageIndex = WORKFLOW_STAGES.indexOf(stage);
  const briefDirty = JSON.stringify({ ...brief, budget: { ...brief.budget, amount: budgetText.trim() === "" ? null : Number(budgetText) } }) !== JSON.stringify(project.brief);

  const exportSnapshot = matchWorkflowSavedSnapshot(project, savedSnapshot, saveState !== "saved", briefDirty);

  useEffect(() => { onUnappliedBriefChange?.(briefDirty); }, [briefDirty, onUnappliedBriefChange]);
  useEffect(() => () => { onUnappliedBriefChange?.(false); }, [onUnappliedBriefChange]);

  useEffect(() => {
    setBrief(structuredClone(project.brief));
    setBudgetText(project.brief.budget.amount === null ? "" : String(project.brief.budget.amount));
  }, [project.brief, project.inputRevision]);

  function navigate(next: WorkflowStage) {
    setStage(next);
    setError(null);
    onStageChange?.(next);
    // Focus is moved after React replaces the stage heading.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function commitProject(next: DevkitProject) {
    if (projectRef.current !== project || next.id !== project.id || next.schemaVersion !== project.schemaVersion) {
      setError(t("The project changed. Reopen the current project and try again.", "Проект изменился. Откройте текущий проект и повторите действие."));
      return;
    }
    onProjectChange(next);
  }

  function chooseDesign(designId: string): boolean {
    const result = selectWorkflowDesign(projectRef.current, workflowScope(project), designId, new Date().toISOString());
    if (!result.ok) {
      setError(result.reason === "stale_design"
        ? t("This concept uses earlier inputs. Update it before selecting it for a new calculation.", "Концепция использует прежние данные. Обновите её перед новым расчётом.")
        : t("The selected concept is no longer available in this snapshot.", "Выбранной концепции нет в текущем снимке."));
      return false;
    }
    commitProject(result.project);
    setError(null);
    setNotice(t("Concept selected. Existing versions are preserved.", "Концепция выбрана. Прежние версии сохранены."));
    return true;
  }

  function applyBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = budgetText.trim() === "" ? null : Number(budgetText);
    const result = applyWorkflowBrief(projectRef.current, workflowScope(project), { ...brief, budget: { ...brief.budget, amount } }, new Date().toISOString());
    if (!result.ok) {
      setError(t("Check the title, objective and budget. Leave unknown budget empty.", "Проверьте название, цель и бюджет. Неизвестный бюджет оставьте пустым."));
      return;
    }
    commitProject(result.project);
    setError(null);
    setNotice(result.project === project
      ? t("Brief is unchanged.", "Бриф не изменён.")
      : t("Brief applied. Dependent concepts and calculations now need an update.", "Бриф применён. Зависимые концепции и расчёты требуют обновления."));
  }

  async function runAction(kind: "save" | "reopen" | "export") {
    if (briefDirty) { setError(t("Apply or discard the brief edits first.", "Сначала примените или отмените правки брифа.")); return; }
    if (kind === "export" && !exportSnapshot) { setError(t("Save and reopen the current snapshot before export.", "Перед экспортом сохраните и откройте текущий снимок.")); return; }
    if (busyRef.current) return;
    const action = kind === "save" ? onSave : kind === "export" ? onExport : onReopen;
    if (!action) return;
    busyRef.current = true;
    setBusy(kind);
    setError(null);
    setNotice(null);
    const requestedProject = project;
    const requested = kind === "export" ? exportSnapshot! : project;
    try {
      const result = kind === "reopen" ? await onReopen!(requested.id) : await (kind === "save" ? onSave! : onExport!)(requested);
      if (projectRef.current !== requestedProject) return;
      if (!result.ok) setError(result.message ?? t("The action failed. The previous valid snapshot remains available.", "Действие не выполнено. Предыдущий корректный снимок сохранён."));
      else setNotice(result.message ?? (kind === "save"
        ? t("Requested snapshot saved on this device.", "Запрошенный снимок сохранён на этом устройстве.")
        : kind === "reopen" ? t("Saved snapshot reopened.", "Сохранённый снимок открыт.") : t("Draft exported. Review its listed gaps before use.", "Черновик экспортирован. Перед использованием проверьте указанные пробелы.")));
    } catch {
      if (projectRef.current === requestedProject) setError(t("The action could not finish. Your current project remains open.", "Не удалось завершить действие. Текущий проект остаётся открыт."));
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function executeCommand(value: string) {
    const parsed = parseWorkflowCommand(value);
    if (!parsed) {
      setCommandResult(t("Use /open evidence, /open concepts, /open kit or /select followed by a concept ID from this project.", "Используйте /открыть данные, /открыть концепции, /открыть комплект или /выбрать и ID концепции этого проекта."));
      return;
    }
    if (parsed.type === "open") {
      navigate(parsed.stage);
      setCommandResult(t("Opened: ", "Открыто: ") + STAGE_NAMES[locale][parsed.stage]);
    } else if (chooseDesign(parsed.designId)) {
      setCommandResult(t("Selected concept in this project.", "Концепция выбрана в этом проекте."));
    } else setCommandResult(t("No change applied. Use a current concept from this project.", "Изменения не применены. Выберите актуальную концепцию этого проекта."));
    setCommand("");
  }

  const stateLabel = (state: WorkflowArtifactState) => ({
    en: { current: "Calculated", draft: "Draft", stale: "Out of date", blocked: "Needs inputs", missing: "Not calculated" },
    ru: { current: "Рассчитано", draft: "Черновик", stale: "Устарело", blocked: "Нужны данные", missing: "Не рассчитано" }
  }[locale][state]);
  const statusLabel = (value: string) => ({
    available: t("Available", "Доступно"), partial: t("Partial", "Частично"), unavailable: t("Unavailable", "Недоступно"),
    source_backed: t("Source context", "По источнику"), assumption: t("Assumption", "Допущение"), assumed: t("Assumed", "Предполагается"),
    proposed: t("Proposed", "Предложено"), unknown: t("Unknown", "Неизвестно"), conflicting: t("Conflict", "Противоречие"),
    derived: t("Calculated", "Расчёт"), generated: t("Generated", "Сгенерировано"), synthetic: t("Synthetic", "Синтетика"),
    public_source: t("Public source", "Публичный источник"), user_provided: t("User supplied", "Данные пользователя"),
    draft: t("Draft", "Черновик"), review_required: t("Review required", "Нужен review"), hypothesis: t("Hypothesis", "Гипотеза")
  } as Record<string, string>)[value] ?? value;
  const formatNumber = (value: number | null | undefined) => value === null || value === undefined || !Number.isFinite(value)
    ? t("Unknown", "Неизвестно") : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const stageStatus: Record<WorkflowStage, string> = {
    brief: project.brief.objective && project.aoi ? t("Defined", "Задано") : t("Needs brief / AOI", "Нужны бриф / зона"),
    evidence: !project.evidence.length ? t("Not checked", "Не проверено") : gaps.length || sourceIssues.length || unknownClaims.length ? t("Needs review", "Нужна проверка") : t("Source context", "Контекст источников"),
    concepts: !currentDesign ? t("Update needed", "Нужно обновить") : designs.length >= 2 ? t("Two drafts", "Два черновика") : t("Needs alternative", "Нужна альтернатива"),
    finance: stateLabel(financeState), kit: draftKit ? t("Draft / gaps", "Черновик / пробелы") : t("Draft for review", "Черновик для review")
  };
  const descriptions: Record<WorkflowStage, string> = {
    brief: t("Define the next decision and the area being studied.", "Задайте следующее решение и исследуемую зону."),
    evidence: t("Keep facts, assumptions and unresolved constraints visible.", "Отделите факты от допущений и нерешённых ограничений."),
    concepts: t("Compare programme alternatives for this area. Each option keeps its own edits.", "Сравните программы для этой зоны. Правки каждого варианта независимы."),
    finance: t("Use areas and conditional monthly finance from the same concept version.", "Используйте площади и условную помесячную экономику одной версии концепции."),
    kit: t("Review the selected snapshot and prepare a draft decision package.", "Проверьте выбранный снимок и подготовьте черновой комплект для решения.")
  };
  const context: DevkitWorkflowContext = { project, locale, activeDesign, onProjectChange: commitProject, navigate, hasUnappliedBrief: briefDirty, savedSnapshot: exportSnapshot };

  function artifactCard(artifact: DerivedArtifact | null, label: string) {
    const state = workflowArtifactState(project, artifact);
    return <article className="dk-list-item">
      <div className="dk-list-item-head"><h3>{label}</h3><span className="dk-pill" data-tone={state === "current" ? "good" : "warning"}>{stateLabel(state)}</span></div>
      {artifact ? <><p className="dk-small">{t("Method", "Методика")}: {artifact.methodVersion} · {t("Revision", "Версия")} {artifact.revision}</p>
        {artifact.missingInputs.length > 0 && <p className="dk-small">{t("Missing", "Не хватает")}: {artifact.missingInputs.join(" · ")}</p>}
        {state === "stale" && <p className="dk-small">{t("Earlier result is preserved. Update its inputs before relying on it.", "Прежний результат сохранён. Обновите входные данные перед использованием.")}</p>}</>
        : <p className="dk-small">{t("No calculation is linked to the selected concept yet.", "К выбранной концепции пока не привязан расчёт.")}</p>}
    </article>;
  }

  function defaultEvidence() {
    return <div className="dk-stack">
      <dl className="dk-metrics"><div className="dk-metric"><dt>{t("Evidence records", "Доказательства")}</dt><dd>{project.evidence.length}</dd></div>
        <div className="dk-metric"><dt>{t("Unknown / conflicting claims", "Неизвестные / спорные факты")}</dt><dd>{unknownClaims.length}</dd></div>
        <div className="dk-metric"><dt>{t("Critical gaps", "Критические пробелы")}</dt><dd>{gaps.length}</dd></div></dl>
      {gaps.length > 0 && <p className="dk-callout">{t("The affected decision is on hold. Conditional concept work may continue with these gaps visible.", "Затронутое решение на hold. Сценарную концепцию можно продолжить с явным указанием пробелов.")}</p>}
      <div><h3>{t("Constraints & next actions", "Ограничения и следующие действия")}</h3><div style={{ marginTop: 12 }}>
        {project.constraints.length === 0 ? <p className="dk-empty">{t("Constraints have not been checked. An empty list does not establish absence of restrictions.", "Ограничения ещё не проверены. Пустой список не подтверждает их отсутствие.")}</p>
          : <ul className="dk-list">{project.constraints.map((item) => <li className="dk-list-item" key={item.id}>
            <div className="dk-list-item-head"><strong>{item.label}</strong><span className="dk-pill" data-tone={item.status === "unknown" || item.status === "conflicting" ? "warning" : undefined}>{statusLabel(item.status)}</span></div>
            <p>{item.impact}</p><p className="dk-small">{t("Next", "Далее")}: {item.nextAction}</p>
          </li>)}</ul>}
      </div></div>
      <details><summary>{t("Claims and source records", "Факты и источники")} ({project.claims.length} / {project.evidence.length})</summary><div className="dk-stack" style={{ marginTop: 14 }}>
        {project.claims.map((claim) => <article className="dk-list-item" key={claim.id}>
          <div className="dk-list-item-head"><strong>{claim.field}</strong><span className="dk-pill">{statusLabel(claim.status)}</span></div>
          <p>{claim.value === null ? t("Unknown", "Неизвестно") : String(claim.value)}{claim.value !== null && claim.unit ? ` ${claim.unit}` : ""}</p>
          <p className="dk-small">{claim.explanation}</p>
          <p className="dk-small">{t("Scope", "Охват")}: {typeof claim.scope?.radiusM === "number" ? `${formatNumber(claim.scope.radiusM)} m` : claim.scope?.kind === "aoi_interior" ? t("Inside AOI", "Внутри AOI") : claim.scope?.kind === "subject" ? t("This object", "Этот объект") : t("Not supplied", "Не указан")}{claim.scope?.completeInventory === false ? t(" · Source records; not a complete inventory", " · Записи источника; не полный перечень объектов") : ""}</p>
          <p className="dk-small">{t("Subject", "Объект")}: {claim.subjectId} · {t("Evidence", "Доказательства")}: {claim.evidenceIds.join(", ") || t("Not linked", "Не привязаны")}</p>
        </article>)}
        {project.evidence.map((item) => <article className="dk-list-item" key={item.id}>
          <div className="dk-list-item-head"><strong>{item.label}</strong><span className="dk-pill">{statusLabel(item.status)}</span></div>
          <p className="dk-small">{statusLabel(item.trust)} · {item.sourceId}</p>
          {item.excerpt && <p>{item.excerpt}</p>}
          <p className="dk-small">{t("Valid at", "Действует на")}: {item.validAt ?? t("Unknown", "Неизвестно")} · {t("Acquired", "Получено")}: {item.acquiredAt ?? t("Unknown", "Неизвестно")}</p>
          <p className="dk-small">{t("Licence", "Лицензия")}: {item.rights.licence ?? t("Unknown", "Неизвестно")} · {item.rights.attribution}</p>
          <p className="dk-small">{t("Redistribution", "Распространение")}: {item.rights.redistribution === "allowed" ? t("Allowed within source terms", "В пределах условий источника") : item.rights.redistribution === "not_allowed" ? t("Not allowed", "Не разрешено") : t("Unknown", "Неизвестно")}</p>
          {item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl) && <p><a href={item.sourceUrl} target="_blank" rel="noreferrer">{t("Open source", "Открыть источник")}</a></p>}
        </article>)}
      </div></details>
    </div>;
  }

  function defaultConcepts() {
    return <div className="dk-stack">
      {!project.aoi && <div className="dk-callout">{t("Select or draw an AOI before creating concepts. A point or a POI does not define a parcel boundary.", "Выберите или нарисуйте AOI до создания концепций. Точка или POI не задают границу участка.")}{onChooseAoi && <div style={{ marginTop: 10 }}><button type="button" className="dk-button" onClick={onChooseAoi} disabled={briefDirty}>{t("Choose area", "Выбрать зону")}</button></div>}</div>}
      {!designs.length ? <p className="dk-empty">{t("No concepts in this snapshot yet. The concept editor will use this project's area and constraints.", "В этом снимке пока нет концепций. Редактор использует зону и ограничения этого проекта.")}</p> : <div className="dk-concepts">{designs.map((design) => {
        const current = isWorkflowDesignCurrent(project, design);
        return <article className="dk-concept" key={`${design.id}:${design.revision}`} data-selected={activeDesign?.id === design.id}>
          <div className="dk-list-item-head"><h3>{design.label}</h3><span className="dk-pill" data-tone="concept">{current ? t("Concept draft", "Черновая концепция") : t("Out of date", "Устарело")}</span></div>
          <p className="dk-muted">{design.program.summary}</p>
          <dl className="dk-definitions"><dt>{t("Buildings", "Корпуса")}</dt><dd>{design.buildings.length}</dd><dt>{t("Programme levels", "Этажи программы")}</dt><dd>{design.program.levelsMin}–{design.program.levelsMax}</dd><dt>{t("Target coverage", "Целевая застройка")}</dt><dd>{formatNumber(design.program.targetSiteCoveragePct)}%</dd><dt>{t("Retained objects", "Сохраняемые объекты")}</dt><dd>{design.retainedObjectIds.length}</dd></dl>
          {design.assumptions.length > 0 && <details><summary>{t("Assumptions", "Допущения")} ({design.assumptions.length})</summary><ul>{design.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
          <button type="button" className="dk-button" disabled={!current || activeDesign?.id === design.id} onClick={() => chooseDesign(design.id)}>{activeDesign?.id === design.id ? t("Selected", "Выбрано") : t("Select concept", "Выбрать концепцию")}</button>
          <details className="dk-small"><summary>{t("Version details", "Данные версии")}</summary><p>{design.id} · r{design.revision} · {t("Input", "Вход")} {design.inputRevision}</p></details>
        </article>;
      })}</div>}
      {designs.length < 2 && <p className="dk-callout">{t("Two materially different editable alternatives are still required for the full comparison.", "Для полного сравнения нужны две содержательно разные редактируемые альтернативы.")}</p>}
    </div>;
  }

  function defaultFinance() {
    return <div className="dk-stack">
      {!currentDesign && <p className="dk-callout">{t("Select a current concept before recalculating areas or finance. Earlier outputs remain readable.", "Перед пересчётом площадей и экономики выберите актуальную концепцию. Прежние результаты доступны.")}</p>}
      {artifactCard(areas, t("Area schedule", "Ведомость площадей"))}
      {artifactCard(finance, t("Monthly finance", "Помесячная экономика"))}
      <p className="dk-small">{t("The finance module supplies calculations and assumptions. Missing price, cost or timing stays unknown. A concept does not establish permitted or registered area.", "Финансовый модуль передаёт расчёты и допущения. Неизвестные цены, затраты и сроки остаются неизвестными. Концепция не подтверждает разрешённую или зарегистрированную площадь.")}</p>
    </div>;
  }

  function defaultKit() {
    return <div className="dk-stack">
      <p className="dk-callout" data-tone="info">{t("This package is a draft for professional review. Export does not submit an application or approve a project.", "Это черновик для профессионального review. Экспорт не подаёт заявление и не согласовывает проект.")}</p>
      {artifactCard(kit, t("Decision package", "Комплект для решения"))}
      <ul className="dk-list"><li className="dk-list-item"><strong>{t("1. Resolve evidence gaps", "1. Разобрать пробелы доказательств")}</strong><p className="dk-small">{gaps.length ? `${t("Critical gaps", "Критические пробелы")}: ${gaps.length}` : t("Check document completeness and source applicability with the reviewer.", "Проверьте комплектность документов и применимость источников с reviewer.")}</p></li>
        <li className="dk-list-item"><strong>{t("2. Reconcile versions", "2. Сверить версии")}</strong><p className="dk-small">{t("Areas", "Площади")}: {stateLabel(areaState)} · {t("Finance", "Экономика")}: {stateLabel(financeState)}</p></li>
        <li className="dk-list-item"><strong>{t("3. Record professional review", "3. Получить профессиональный review")}</strong><p className="dk-small">{t("Review is not recorded by a navigation click. Applicant, authority and required documents remain procedure-specific.", "Переход по экрану не фиксирует review. Заявитель, орган и документы определяются отдельно для каждой процедуры.")}</p></li></ul>
      {project.procedures.length > 0 && <div><h3>{t("Next procedure drafts", "Черновики следующих процедур")}</h3><ul className="dk-list" style={{ marginTop: 12 }}>{project.procedures.map((procedure) => <li className="dk-list-item" key={procedure.id}><div className="dk-list-item-head"><strong>{procedure.label}</strong><span className="dk-pill">{statusLabel(procedure.status)}</span></div><p className="dk-small">{t("Authority", "Орган")}: {procedure.authority ?? t("Unknown", "Неизвестно")} · {t("Applicant", "Заявитель")}: {procedure.applicant ?? t("Unknown", "Неизвестно")}</p>{procedure.missingInputs.length > 0 && <p className="dk-small">{t("Missing", "Не хватает")}: {procedure.missingInputs.join(" · ")}</p>}</li>)}</ul></div>}
      <button type="button" className="dk-button dk-button-primary" onClick={() => void runAction("export")} disabled={!onExport || Boolean(busy) || briefDirty || !exportSnapshot}>{t("Export draft package", "Экспорт чернового комплекта")}</button>
    </div>;
  }

  return <section className="devkit-workflow" lang={locale} aria-label={t("Development Kit workspace", "Рабочее пространство Development Kit")} data-testid="devkit-workflow">
    <header className="dk-header"><div className="dk-header-main"><p className="dk-eyebrow">GeoAI · Development Kit E1</p><h1>{project.brief.title}</h1><p className="dk-subtitle">{t("One project, from brief to a decision package.", "Один проект — от брифа до комплекта для решения.")}</p><div className="dk-inline" style={{ marginTop: 12 }}><span className="dk-pill">{project.dataClass === "synthetic_demo" ? t("Synthetic example", "Синтетический пример") : t("Public / user-supplied context", "Публичный / пользовательский контекст")}</span><span className="dk-pill" data-tone={saveState === "error" || saveState === "conflict" ? "danger" : undefined}>{saveState === "saved" ? t("Saved on this device", "Сохранено на этом устройстве") : saveState === "saving" ? t("Saving locally…", "Локальное сохранение…") : saveState === "error" ? t("Local save failed", "Ошибка локального сохранения") : saveState === "conflict" ? t("Saved copy changed · reopen", "Сохранённая копия изменилась · откройте заново") : t("Local draft · not saved", "Локальный черновик · не сохранён")}</span></div></div>
      <div className="dk-actions"><button type="button" className="dk-button" disabled={!onReopen || Boolean(busy) || briefDirty} onClick={() => void runAction("reopen")}>{busy === "reopen" ? t("Opening…", "Открываем…") : t("Reopen saved", "Открыть сохранённое")}</button><button type="button" className="dk-button dk-button-primary" disabled={!onSave || Boolean(busy) || saveState === "saving" || briefDirty} onClick={() => void runAction("save")}>{busy === "save" ? t("Saving…", "Сохраняем…") : t("Save on device", "Сохранить на устройстве")}</button></div>
    </header>
    <nav aria-label={t("Project stages", "Этапы проекта")}><ol className="dk-stage-nav">{WORKFLOW_STAGES.map((item, index) => <li key={item}><button type="button" className="dk-stage-link" aria-current={stage === item ? "step" : undefined} aria-controls={`${uid}-stage`} onClick={() => navigate(item)} data-testid={`devkit-stage-${item}`}><span className="dk-stage-number" aria-hidden="true">{index + 1}</span><span className="dk-stage-name">{STAGE_NAMES[locale][item]}</span><span className="dk-stage-status">{stageStatus[item]}</span></button></li>)}</ol></nav>
    {briefDirty && <div className="dk-callout" style={{ marginBottom: 16 }}><p>{t("Unapplied brief edits. Apply or discard them before saving or switching projects.", "Есть неприменённые правки брифа. Примените или отмените их перед сохранением или сменой проекта.")}</p><div className="dk-actions" style={{ marginTop: 10 }}>{stage !== "brief" && <button type="button" className="dk-button" onClick={() => navigate("brief")}>{t("Open brief", "Открыть бриф")}</button>}<button type="button" className="dk-button" onClick={() => { setBrief(structuredClone(project.brief)); setBudgetText(project.brief.budget.amount === null ? "" : String(project.brief.budget.amount)); setError(null); }}>{t("Discard brief edits", "Отменить правки брифа")}</button></div></div>}
    {error && <p className="dk-callout" data-tone="danger" role="alert" style={{ marginBottom: 16 }}>{error}</p>}
    <div className="dk-grid"><div className="dk-main"><section className="dk-panel" id={`${uid}-stage`} aria-labelledby={`${uid}-heading`}>
      <div className="dk-panel-head"><div><p className="dk-eyebrow">{t("Stage", "Этап")} {stageIndex + 1} / 5</p><h2 id={`${uid}-heading`} ref={headingRef} tabIndex={-1}>{STAGE_NAMES[locale][stage]}</h2><p>{descriptions[stage]}</p></div><span className="dk-pill" data-tone={stage === "concepts" ? "concept" : undefined}>{stageStatus[stage]}</span></div>
      {stage === "brief" ? <form className="dk-stack" onSubmit={applyBrief}>
        <div className="dk-fields"><label className="dk-field dk-field-wide">{t("Project title", "Название проекта")}<input required maxLength={240} value={brief.title} onChange={(event) => setBrief({ ...brief, title: event.target.value })} /></label>
          <label className="dk-field dk-field-wide">{t("Next decision / objective", "Следующее решение / цель")}<textarea required maxLength={2000} value={brief.objective} onChange={(event) => setBrief({ ...brief, objective: event.target.value })} placeholder={t("What should the next decision package help you decide?", "Какое решение должен поддержать следующий комплект?")} /></label>
          <label className="dk-field dk-field-wide">{t("Development strategy", "Стратегия проекта")}<input maxLength={1000} value={brief.strategy} onChange={(event) => setBrief({ ...brief, strategy: event.target.value })} /></label>
          <label className="dk-field">{t("Project budget, if known", "Бюджет проекта, если известен")}<input inputMode="decimal" type="number" min="0" step="any" value={budgetText} onChange={(event) => setBudgetText(event.target.value)} placeholder={t("Unknown", "Неизвестно")} /><span className="dk-small">{t("Project budget is separate from available equity and GeoAI spend.", "Бюджет проекта отличается от собственного капитала и расходов GeoAI.")}</span></label>
          <label className="dk-field">{t("Currency", "Валюта")}<select value={brief.budget.currency} onChange={(event) => setBrief({ ...brief, budget: { ...brief.budget, currency: event.target.value as ProjectBrief["budget"]["currency"] } })}><option>AED</option><option>RUB</option><option>USD</option></select></label>
          <label className="dk-field dk-field-wide">{t("Does the budget include land?", "Земля входит в бюджет?")}<select value={brief.budget.includesLand === null ? "unknown" : String(brief.budget.includesLand)} onChange={(event) => setBrief({ ...brief, budget: { ...brief.budget, includesLand: event.target.value === "unknown" ? null : event.target.value === "true" } })}><option value="unknown">{t("Unknown", "Неизвестно")}</option><option value="true">{t("Yes", "Да")}</option><option value="false">{t("No", "Нет")}</option></select></label>
          <label className="dk-field dk-field-wide">{t("Requirements · one per line", "Требования · по одному в строке")}<textarea maxLength={12000} value={brief.requirements.join("\n")} onChange={(event) => setBrief({ ...brief, requirements: event.target.value.split("\n") })} /></label></div>
        <div className="dk-list-item"><div className="dk-list-item-head"><h3>{t("Study area", "Исследуемая зона")}</h3><span className="dk-pill">{project.aoi ? t("AOI · drawn / supplied", "AOI · заданная зона") : t("No AOI", "AOI не задана")}</span></div><p className="dk-small">{project.aoi ? `${formatNumber(project.aoi.areaSqM)} m² · EPSG:4326` : t("Select an area through the existing map. No parcel is inferred from a point.", "Выберите зону на существующей карте. Участок не выводится из точки.")}</p><p className="dk-small">{t("Separate mapped objects", "Отдельные объекты")}: {t("parcels", "участки")} {project.objects.filter((item) => item.kind === "land_parcel").length} · {t("buildings", "здания")} {project.objects.filter((item) => item.kind === "building").length} · POI {project.objects.filter((item) => item.kind === "poi").length}</p>{onChooseAoi && <button type="button" className="dk-button dk-button-quiet" onClick={onChooseAoi} disabled={briefDirty}>{t("Choose / inspect area on map", "Выбрать / проверить зону на карте")}</button>}</div>
        <div className="dk-actions"><button type="submit" data-testid="devkit-brief-apply" className="dk-button dk-button-primary">{t("Apply brief", "Применить бриф")}</button><span className="dk-small">{t("Changing inputs makes dependent results out of date.", "Правка входных данных делает зависимые результаты устаревшими.")}</span></div>
      </form> : stage === "kit" && !exportSnapshot ? <div className="dk-stack" data-testid="devkit-kit-save-gate"><p className="dk-callout">{t("Save and reopen this project's current snapshot before preparing a kit. A saved revision number does not include later edits.", "Перед подготовкой комплекта сохраните и откройте текущий снимок проекта. Номер сохранённой версии не включает последующие правки.")}</p><div className="dk-actions"><button type="button" className="dk-button dk-button-primary" disabled={!onSave || Boolean(busy) || briefDirty} onClick={() => void runAction("save")}>{t("Save current snapshot", "Сохранить текущий снимок")}</button><button type="button" className="dk-button" disabled={!onReopen || Boolean(busy) || briefDirty} onClick={() => void runAction("reopen")}>{t("Reopen saved", "Открыть сохранённое")}</button></div></div> : slots?.[stage] ? slots[stage]!(context) : stage === "evidence" ? defaultEvidence() : stage === "concepts" ? defaultConcepts() : stage === "finance" ? defaultFinance() : defaultKit()}
      <footer className="dk-footer"><button type="button" className="dk-button" disabled={stageIndex === 0} onClick={() => navigate(WORKFLOW_STAGES[stageIndex - 1])}>{t("← Previous", "← Назад")}</button><span className="dk-small">{t("Stage navigation does not approve a decision.", "Переход не подтверждает решение.")}</span><button type="button" className="dk-button dk-button-primary" disabled={stageIndex === WORKFLOW_STAGES.length - 1} onClick={() => navigate(WORKFLOW_STAGES[stageIndex + 1])}>{t("Next →", "Далее →")}</button></footer>
    </section>{notice && <p className="dk-status-message" role="status">{notice}</p>}</div>
    <aside className="dk-aside" aria-label={t("Project context", "Контекст проекта")}>
      <section className="dk-panel"><p className="dk-eyebrow">{t("Next action", "Следующее действие")}</p><h3>{gaps.length ? t("Resolve the critical gap", "Уточнить критический пробел") : (!currentDesign || !activeDesign?.buildings.length) ? t("Prepare current concepts", "Подготовить актуальные концепции") : financeState !== "current" ? t("Reconcile areas & finance", "Сверить площади и экономику") : t("Prepare professional review", "Подготовить профессиональный review")}</h3><p className="dk-small">{gaps[0]?.nextAction ?? (project.aoi ? t("Keep assumptions visible and use the selected version for the next step.", "Сохраните явные допущения и используйте выбранную версию на следующем шаге.") : t("Select a study area before creating a spatial concept.", "Выберите исследуемую зону перед созданием пространственной концепции."))}</p>{gaps.length > 0 && <button type="button" className="dk-button dk-button-quiet" onClick={() => navigate("evidence")}>{t("Inspect gaps", "Показать пробелы")} ({gaps.length})</button>}</section>
      <section className="dk-panel"><h3>{t("Selected snapshot", "Выбранный снимок")}</h3><dl className="dk-definitions"><dt>{t("Storage", "Хранение")}</dt><dd>{t("This device", "Это устройство")}</dd><dt>{t("Concept", "Концепция")}</dt><dd>{activeDesign?.label ?? t("Not selected", "Не выбрана")}</dd><dt>{t("Areas", "Площади")}</dt><dd>{stateLabel(areaState)}</dd><dt>{t("Finance", "Экономика")}</dt><dd>{stateLabel(financeState)}</dd></dl><details className="dk-small" style={{ marginTop: 14 }}><summary>{t("Version references", "Ссылки версий")}</summary><p>{project.id} · r{project.revision} · {t("Input", "Вход")} {project.inputRevision}</p>{activeDesign && <p>{activeDesign.id} · r{activeDesign.revision}</p>}</details><p className="dk-small" style={{ marginTop: 12 }}>{t("Local storage is not cloud synchronization.", "Локальное хранение не означает облачную синхронизацию.")}</p></section>
      <section className="dk-panel"><h3>{t("Project commands", "Команды проекта")}</h3><form className="dk-command-form" onSubmit={(event) => { event.preventDefault(); executeCommand(command); }}><label htmlFor={`${uid}-command`}>{t("Open a stage or select a concept", "Открыть этап или выбрать концепцию")}</label><input id={`${uid}-command`} maxLength={240} value={command} onChange={(event) => setCommand(event.target.value)} placeholder={t("/open evidence", "/открыть данные")} autoComplete="off" /><button type="submit" className="dk-button" disabled={!command.trim()}>{t("Run command", "Выполнить команду")}</button></form><div className="dk-suggestions">{(["evidence", "concepts", "kit"] as const).map((item) => <button type="button" key={item} onClick={() => executeCommand(`/open ${item}`)}>{STAGE_NAMES[locale][item]}</button>)}</div>{commandResult && <p className="dk-command-result" role="status">{commandResult}</p>}<p className="dk-small" style={{ marginTop: 12 }}>{t("Commands affect this project's navigation and selection. They do not call paid services.", "Команды меняют навигацию и выбор в этом проекте. Платные сервисы не вызываются.")}</p></section>
    </aside></div>
    <p className="dk-caveat">{locale === "ru" && <>{"Сценарная гипотеза. Требуется официальная проверка; не является правовым, кадастровым, градостроительным или оценочным заключением. "}</>}{project.caveat}</p>
  </section>;
}
