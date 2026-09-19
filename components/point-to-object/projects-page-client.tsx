"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { readPointObjectAnalysis, readPointObjectSelection, writePointObjectAnalysis, writePointObjectQuestion, writePointObjectSelection } from "@/components/point-to-object/live-session";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import { ReliableSelect } from "@/components/point-to-object/reliable-select";
import { usePointObjectCloudSync } from "@/components/point-to-object/use-point-object-cloud-sync";
import {
  createPointObjectProject,
  POINT_OBJECT_PROJECTS_EVENT,
  pointObjectProjectIdentity,
  queuePointObjectAnalysisRestore,
  queuePointObjectProjectOverview,
  queuePointObjectProjectRestore,
  readVerifiedPointObjectProjects,
  reconcilePointObjectBrowserIdentity,
  renamePointObjectProject,
  selectPointObjectProject,
  verifySavedPointObjectArtifact,
  type PointObjectProjectEventDetail,
  type PointObjectProjectStoreReadResult,
  type PointObjectProjectStore,
  type SavedPointObjectArtifact
} from "@/src/lib/prototype/point-object-projects";
import { readPointObjectFindSession, writePointObjectFindSession } from "@/src/lib/prototype/point-to-object-find-session";
import type { PointObjectLocale } from "@/src/lib/prototype/point-to-object-i18n";
import { pointObjectSelectionLabel } from "@/src/lib/prototype/point-to-object-trusted-identity";

const KINDS = ["analyse", "find", "create"] as const;
type ResultFilter = "all" | SavedPointObjectArtifact["kind"];
type ResultSort = "newest" | "oldest" | "name";
const CONTROL = "min-h-11 rounded-xl border border-line bg-white px-3 text-base text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]";

function artifactKindLabel(kind: SavedPointObjectArtifact["kind"], locale: PointObjectLocale): string {
  const labels = locale === "ru"
    ? { analyse: "Анализ", find: "Поиск", create: "Концепция" }
    : { analyse: "Analysis", find: "Find", create: "Concept" };
  return labels[kind];
}

function artifactEvidence(artifact: SavedPointObjectArtifact, locale: PointObjectLocale): string {
  if (artifact.kind === "analyse") return `${artifact.payload.analysis.telemetry.model} · ${new Date(artifact.payload.analysis.generatedAt).toLocaleString(locale)}`;
  if (artifact.kind === "find") return `${artifact.payload.session.result.source.name} · ${new Date(artifact.payload.session.result.source.acquiredAt).toLocaleString(locale)}`;
  return `${artifact.payload.generated.promptVersion} · ${new Date(artifact.payload.generated.generatedAt).toLocaleString(locale)}`;
}

function artifactDisplayTitle(artifact: SavedPointObjectArtifact): string {
  if (artifact.kind !== "analyse" || !/^(?:Selected object analysis|Анализ выбранного объекта)$/.test(artifact.label)) return artifact.label;
  return pointObjectSelectionLabel(artifact.payload.selection, artifact.payload.analysis.subject, artifact.label);
}

export function PointObjectProjectsPageClient() {
  const router = useRouter();
  const { user, isSessionResolved } = useAuth();
  const { locale, setLocale } = usePointObjectLocale();
  const identityKey = useMemo(() => pointObjectProjectIdentity(user), [user]);
  const cloudSync = usePointObjectCloudSync({
    identityKey,
    isSessionResolved,
    isDemoUser: user?.isDemoUser !== false
  });
  const [store, setStore] = useState<PointObjectProjectStore | null>(null);
  const [readStatus, setReadStatus] = useState<PointObjectProjectStoreReadResult["status"]>("missing");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ResultFilter>("all");
  const [sort, setSort] = useState<ResultSort>("newest");
  const [openingArtifactId, setOpeningArtifactId] = useState<string | null>(null);
  const [navigationPending, setNavigationPending] = useState(false);
  const [renaming, setRenaming] = useState<{ projectId: string; originalName: string; name: string } | null>(null);
  const [renamePending, setRenamePending] = useState(false);
  const [cloudSavingProjectId, setCloudSavingProjectId] = useState<string | null>(null);
  const [cloudActionMessage, setCloudActionMessage] = useState<string | null>(null);
  const renamePendingRef = useRef(false);
  const refreshSequence = useRef(0);
  const cloudActionErrorRevision = useRef(0);
  const identityRef = useRef(identityKey);
  identityRef.current = identityKey;
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const errorRevision = cloudActionErrorRevision.current;
    if (!identityKey) {
      setStore(null);
      setReadStatus("missing");
      return;
    }
    const result = await readVerifiedPointObjectProjects(identityKey);
    if (identityRef.current !== identityKey || refreshSequence.current !== sequence) return;
    setReadStatus(result.status);
    setStore(result.store);
    if (cloudActionErrorRevision.current === errorRevision) setError(result.store ? null : result.message);
  }, [identityKey]);

  useEffect(() => {
    if (!isSessionResolved) return;
    setRenaming(null);
    setCloudSavingProjectId(null);
    setCloudActionMessage(null);
    reconcilePointObjectBrowserIdentity(identityKey);
    void refresh();
    const update = (event: Event) => {
      if ((event as CustomEvent<PointObjectProjectEventDetail>).detail?.identityKey === identityKey) void refresh();
    };
    window.addEventListener(POINT_OBJECT_PROJECTS_EVENT, update);
    const storage = () => void refresh();
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(POINT_OBJECT_PROJECTS_EVENT, update);
      window.removeEventListener("storage", storage);
    };
  }, [identityKey, isSessionResolved, refresh]);

  // Never render a previous identity's results while its successor is loading.
  const visibleStore = store?.identityKey === identityKey ? store : null;
  const unavailable = readStatus === "damaged" || readStatus === "inaccessible";
  const cloudCanSave = cloudSync.status === "ready" || cloudSync.status === "local_ahead";
  const cloudMessage = user?.isDemoUser === false
    ? cloudSync.status === "syncing"
      ? (locale === "ru" ? "Синхронизируем облачные проекты…" : "Syncing cloud projects…")
      : cloudSync.status === "ready"
        ? (locale === "ru" ? "Облачные проекты доступны на этом устройстве." : "Cloud projects are available on this device.")
        : cloudSync.status === "local_ahead"
          ? (locale === "ru" ? "На этом устройстве есть локальные изменения, ещё не сохранённые в облаке." : "This device has local changes that have not been saved to cloud yet.")
          : cloudSync.status === "conflict"
            ? (locale === "ru" ? "Облачная версия отличается; локальная запись сохранена без изменений." : "The cloud copy differs; existing local bytes were preserved.")
            : cloudSync.status === "capacity"
              ? (locale === "ru" ? "На этом устройстве достигнут лимит локальных проектов. Освободите место и перезагрузите страницу; исходные данные сохранены." : "This device reached its local project limit. Free space and reload; existing bytes were preserved.")
              : cloudSync.status === "failed"
                ? (locale === "ru" ? "Облачная синхронизация временно недоступна; локальная запись сохранена." : "Cloud sync is temporarily unavailable; the local copy is preserved.")
                : cloudSync.status === "denied"
                  ? (locale === "ru" ? "Для этого проекта нет доступа к облачной синхронизации." : "Cloud sync is not authorized for this project.")
                  : cloudSync.status === "unavailable"
                    ? (locale === "ru" ? "Облачная синхронизация не включена в этой среде; локальная копия сохранена на устройстве." : "Cloud sync is not enabled in this environment; the local copy remains on this device.")
                    : null
    : null;
  const counts = { analyse: 0, find: 0, create: 0 };
  for (const project of visibleStore?.projects ?? []) {
    for (const artifact of project.artifacts) counts[artifact.kind] += 1;
  }
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const compareDates = (a: string, b: string) => (sort === "oldest" ? 1 : -1) * (Date.parse(a) - Date.parse(b));
  const visibleProjects = (visibleStore?.projects ?? []).map((project) => ({
    ...project,
    artifacts: project.artifacts.filter((artifact) =>
      (kindFilter === "all" || artifact.kind === kindFilter) &&
      (!normalizedQuery || `${project.name} ${artifactDisplayTitle(artifact)} ${artifact.label} ${artifactKindLabel(artifact.kind, locale)} ${artifact.kind} ${artifact.marketKey}`.toLocaleLowerCase(locale).includes(normalizedQuery))
    ).sort((a, b) => sort === "name" ? artifactDisplayTitle(a).localeCompare(artifactDisplayTitle(b), locale) : compareDates(a.completedAt, b.completedAt))
  })).filter((project) => project.artifacts.length > 0 || (
    kindFilter === "all" && !project.artifacts.length &&
    (visibleStore?.projects.find((item) => item.projectId === project.projectId)?.artifacts.length ?? 0) === 0 &&
    (!normalizedQuery || project.name.toLocaleLowerCase(locale).includes(normalizedQuery))
  )).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, locale) : compareDates(a.updatedAt, b.updatedAt));

  async function saveProjectName() {
    if (!identityKey || !renaming || renamePendingRef.current) return;
    const initiatingIdentity = identityKey;
    renamePendingRef.current = true;
    setRenamePending(true);
    setError(null);
    try {
      await renamePointObjectProject(identityKey, renaming.projectId, renaming.name, renaming.originalName, locale);
      if (identityRef.current !== initiatingIdentity) return;
      setRenaming(null);
      await refresh();
    } catch (caught) {
      if (identityRef.current === initiatingIdentity) {
        // A verification started by an earlier storage event must not erase
        // the conflict that this rename has just detected.
        refreshSequence.current += 1;
        setError(caught instanceof Error ? caught.message : locale === "ru" ? "Название не сохранено." : "The name was not saved.");
      }
    } finally {
      renamePendingRef.current = false;
      setRenamePending(false);
    }
  }

  async function newProject() {
    if (!identityKey) return;
    try {
      await createPointObjectProject(identityKey, locale);
      setError(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : locale === "ru" ? "Не удалось создать проект." : "Project could not be created.");
    }
  }

  async function saveSelectedProjectToCloud(projectId: string) {
    if (!identityKey || identityRef.current !== identityKey || user?.isDemoUser !== false ||
        visibleStore?.activeProjectId !== projectId || !cloudCanSave || cloudSavingProjectId) return;
    const initiatingIdentity = identityKey;
    setCloudSavingProjectId(projectId);
    setCloudActionMessage(null);
    setError(null);
    try {
      const current = await readVerifiedPointObjectProjects(initiatingIdentity);
      if (identityRef.current !== initiatingIdentity) return;
      const project = current.store?.projects.find((candidate) => candidate.projectId === projectId);
      if (!project || current.store?.activeProjectId !== projectId || !project.artifacts.length) {
        throw new Error(locale === "ru"
          ? "Выбранный проект изменился до сохранения в облаке. Обновите страницу и повторите действие."
          : "The selected project changed before cloud save. Refresh the page and try again.");
      }
      const artifacts = [...project.artifacts].sort((left, right) =>
        left.completedAt.localeCompare(right.completedAt) || left.artifactId.localeCompare(right.artifactId));
      for (const artifact of artifacts) {
        const result = await cloudSync.persist(project, artifact);
        if (identityRef.current !== initiatingIdentity) return;
        if (result?.status === "conflict" && result.reason === "local_project_identity") {
          throw new Error(locale === "ru"
            ? "Название локального проекта отличается от исходной облачной записи. Верните исходное название или создайте новый проект; локальные данные не изменены."
            : "The local project name differs from its original cloud receipt. Restore the original name or create a new project; local data was not changed.");
        }
        if (result?.status !== "saved") {
          throw new Error(locale === "ru"
            ? "Облачная копия не сохранена полностью. Локальный проект не изменён."
            : "The cloud copy was not saved completely. The local project was not changed.");
        }
      }
      setCloudActionMessage(locale === "ru"
        ? "Выбранный проект сохранён в защищённой облачной среде тестирования и доступен в ней после входа с другого устройства."
        : "The selected project is saved to the protected cloud test environment and can be reopened there after signing in on another device.");
    } catch (caught) {
      if (identityRef.current === initiatingIdentity) {
        // A verification started by an earlier cloud-import event may still
        // update the store, but must not erase this newer action error.
        cloudActionErrorRevision.current += 1;
        setError(caught instanceof Error ? caught.message : locale === "ru"
          ? "Не удалось сохранить выбранный проект в облаке. Локальная копия сохранена."
          : "The selected project could not be saved to cloud. The local copy is preserved.");
      }
    } finally {
      if (identityRef.current === initiatingIdentity) setCloudSavingProjectId(null);
    }
  }

  async function reopen(projectId: string, artifact: SavedPointObjectArtifact) {
    if (!identityKey) return;
    const initiatingIdentity = identityKey;
    setOpeningArtifactId(artifact.artifactId);
    setError(null);
    let navigationStarted = false;
    try {
    let integrityVerified = false;
    try {
      integrityVerified = await verifySavedPointObjectArtifact(artifact);
    } catch {
      if (identityRef.current === initiatingIdentity) {
        setError(locale === "ru"
          ? "Проверка целостности временно недоступна. Сохранённые данные не изменены; попробуйте открыть ещё раз."
          : "Integrity verification is temporarily unavailable. Saved data was not changed; try reopening.");
      }
      return;
    }
    if (!integrityVerified) {
      setError(locale === "ru" ? "Локальная запись повреждена или изменена; открытие заблокировано." : "The local record is damaged or changed; reopen is blocked.");
      return;
    }
    if (identityRef.current !== initiatingIdentity) {
      setError(locale === "ru" ? "Пользователь изменился во время открытия; действие отменено." : "The browser identity changed during reopen; the action was cancelled.");
      return;
    }
    try {
      if (!await selectPointObjectProject(initiatingIdentity, projectId)) throw new Error("The saved project is no longer available.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : locale === "ru" ? "Не удалось выбрать проект." : "The project could not be selected.");
      return;
    }
    if (identityRef.current !== initiatingIdentity) return;
    setLocale(artifact.locale);
    if (artifact.kind === "analyse") {
      writePointObjectSelection(artifact.payload.selection);
      writePointObjectAnalysis(artifact.payload.analysis, artifact.payload.selection);
      writePointObjectQuestion(artifact.payload.analysis.request.question ?? "");
      const restoredSelection = readPointObjectSelection();
      const restoredAnalysis = restoredSelection ? readPointObjectAnalysis(restoredSelection) : null;
      if (!restoredSelection || !restoredAnalysis || restoredAnalysis.mode !== "openai" ||
          restoredAnalysis.evidencePackHash !== artifact.payload.analysis.evidencePackHash ||
          !queuePointObjectAnalysisRestore(initiatingIdentity, artifact)) {
        setError(locale === "ru" ? "Не удалось подготовить безопасное локальное открытие." : "The saved result could not be prepared for a safe reopen.");
        return;
      }
      navigationStarted = true;
      router.push("/prototype/point-to-object/analysis");
      return;
    }
    if (artifact.kind === "find") {
      const { version: _version, updatedAt: _updatedAt, ...session } = artifact.payload.session;
      writePointObjectFindSession(session);
      const restored = readPointObjectFindSession();
      if (!restored?.result || restored.result.source.sourceResponseHash !== artifact.payload.session.result.source.sourceResponseHash) {
        setError(locale === "ru" ? "Не удалось подготовить безопасное локальное открытие." : "The saved result could not be prepared for a safe reopen.");
        return;
      }
    }
    if (!queuePointObjectProjectRestore(initiatingIdentity, artifact)) {
      setError(locale === "ru" ? "Не удалось подготовить безопасное локальное открытие." : "The saved result could not be prepared for a safe reopen.");
      return;
    }
    navigationStarted = true;
    router.push("/prototype/point-to-object");
    } finally {
      if (!navigationStarted) setOpeningArtifactId(null);
    }
  }

  async function openProjectOverview() {
    if (!identityKey) return;
    setNavigationPending(true);
    setError(null);
    if (!await queuePointObjectProjectOverview(identityKey)) {
      setNavigationPending(false);
      setError(locale === "ru" ? "Не удалось безопасно подготовить обзор сохранённых объектов." : "The saved-location overview could not be prepared safely.");
      return;
    }
    router.push("/prototype/point-to-object");
  }

  if (!isSessionResolved) return <main className="mx-auto max-w-6xl p-6" role="status">{locale === "ru" ? "Загружаем проекты…" : "Loading projects…"}</main>;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" data-testid="point-object-projects-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#076b73]">{locale === "ru" ? "СОХРАНЁННЫЕ ПРОЕКТЫ" : "SAVED PROJECTS"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">{locale === "ru" ? "Центр проектов" : "Project Hub"}</h1>
          {cloudMessage ? <p className="mt-2 text-xs text-muted" role="status">{cloudMessage}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-line bg-white p-1" aria-label={locale === "ru" ? "Язык" : "Language"} role="group">
            {(["en", "ru"] as const).map((item) => <button key={item} type="button" onClick={() => setLocale(item)} aria-pressed={locale === item} className={`h-11 min-w-11 rounded-lg px-2 text-xs font-bold uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] ${locale === item ? "bg-[#087f8c] text-white" : "text-[#667085]"}`}>{item}</button>)}
          </div>
          <button type="button" onClick={() => void openProjectOverview()} disabled={!visibleStore || unavailable || navigationPending} className={`${CONTROL} inline-flex items-center text-sm font-bold disabled:cursor-wait disabled:opacity-60`}>{locale === "ru" ? "Открыть карту" : "Open map"}</button>
          <button type="button" onClick={() => void newProject()} disabled={!visibleStore || unavailable} className="min-h-11 rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2 disabled:bg-[#b7c4c4]">{locale === "ru" ? "+ Новый проект" : "+ New project"}</button>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-3 gap-2 sm:gap-4" aria-label={locale === "ru" ? "Сохранённые результаты по типу" : "Saved results by type"} data-testid="hub-summary">
        {KINDS.map((kind) => <button key={kind} type="button" disabled={!visibleStore} onClick={() => setKindFilter(kindFilter === kind ? "all" : kind)} aria-pressed={kindFilter === kind} data-testid={`hub-count-${kind}`} className={`min-w-0 rounded-2xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:p-5 ${kindFilter === kind ? "border-[#087f8c] bg-[#eefaf8]" : "border-line bg-white hover:border-[#087f8c]"}`}>
          <span className="block text-sm font-bold text-[#087f8c] sm:text-base">{locale === "ru" ? { analyse: "Анализ", find: "Поиск", create: "Генерация" }[kind] : { analyse: "Analyse", find: "Find", create: "Create" }[kind]}</span>
          <span className="mt-2 block text-3xl font-bold tabular-nums" data-testid="hub-count-value">{visibleStore ? counts[kind] : "—"}</span>
          <span className="mt-1 block text-xs leading-5 text-muted">{locale === "ru" ? "сохранено" : "saved results"}</span>
        </button>)}
      </section>
      {error ? <div className="mt-4 rounded-xl border border-[#e6bd74] bg-[#fff9ed] px-4 py-3 text-sm text-[#79520d]" role="alert"><p>{unavailable ? (locale === "ru" ? "Не удалось проверить сохранённые проекты. Исходные данные не изменены." : "Saved projects could not be verified. Original data was not changed.") : error}</p>{unavailable ? <button type="button" onClick={() => void refresh()} className={`${CONTROL} mt-3 font-bold`}>{locale === "ru" ? "Повторить проверку" : "Retry verification"}</button> : null}</div> : null}
      {cloudActionMessage ? <p className="mt-4 rounded-xl border border-[#b9d8d1] bg-[#edf7f3] px-4 py-3 text-sm text-[#176548]" role="status">{cloudActionMessage}</p> : null}

      {identityKey && !visibleStore && !unavailable ? <p className="mt-6 text-sm text-muted" role="status">{locale === "ru" ? "Проверяем сохранённые проекты…" : "Verifying saved projects…"}</p> : null}
      <section className="mt-8" aria-labelledby="hub-results-heading">
        <h2 id="hub-results-heading" className="text-xl font-bold">{locale === "ru" ? "Проекты и результаты" : "Projects and results"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-muted">{locale === "ru" ? "Поиск" : "Search"}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "ru" ? "Название проекта или результата" : "Project or result name"} className={`${CONTROL} w-full`} /></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-muted">{locale === "ru" ? "Тип результата" : "Result type"}<ReliableSelect value={kindFilter} onChange={(event) => setKindFilter(event.target.value as ResultFilter)} className={`${CONTROL} h-11`}><option value="all">{locale === "ru" ? "Все типы" : "All types"}</option>{KINDS.map((kind) => <option key={kind} value={kind}>{artifactKindLabel(kind, locale)}</option>)}</ReliableSelect></label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-muted">{locale === "ru" ? "Сортировка" : "Sort"}<ReliableSelect value={sort} onChange={(event) => setSort(event.target.value as ResultSort)} className={`${CONTROL} h-11`}><option value="newest">{locale === "ru" ? "Сначала новые" : "Newest first"}</option><option value="oldest">{locale === "ru" ? "Сначала старые" : "Oldest first"}</option><option value="name">{locale === "ru" ? "По названию" : "Name A–Z"}</option></ReliableSelect></label>
        </div>
      </section>

      {!identityKey ? <section className="mt-6 rounded-2xl border border-line bg-white p-6"><h2 className="text-lg font-bold">{locale === "ru" ? "Войдите, чтобы открыть локальное пространство проектов" : "Sign in to open your local project space"}</h2></section> : null}
      {visibleStore && !visibleStore.projects.length ? <section className="mt-6 rounded-2xl border border-dashed border-[#aabbb7] bg-white p-8 text-center"><h2 className="text-xl font-bold">{locale === "ru" ? "Сохранённых проектов пока нет" : "No saved projects yet"}</h2><p className="mt-2 text-sm text-muted">{locale === "ru" ? "Первый успешный Analyse, Find или Create создаст проект автоматически — либо начните новый сейчас." : "The first successful Analyse, Find or Create operation will start one automatically, or create one now."}</p></section> : null}
      {visibleStore && visibleStore.projects.length > 0 ? <p className="mt-4 text-sm text-muted" role="status">{locale === "ru" ? `Найдено проектов: ${visibleProjects.length}` : `Projects found: ${visibleProjects.length}`}</p> : null}
      {visibleStore && visibleStore.projects.length > 0 && !visibleProjects.length ? <section className="mt-4 rounded-2xl border border-dashed border-line p-6"><h3 className="font-bold">{locale === "ru" ? "Ничего не найдено" : "No matching results"}</h3><button type="button" onClick={() => { setQuery(""); setKindFilter("all"); }} className={`${CONTROL} mt-3 font-bold`}>{locale === "ru" ? "Сбросить фильтры" : "Clear filters"}</button></section> : null}

      <div className="mt-6 grid gap-4">
        {visibleProjects.map((project) => (
          <section key={project.projectId} className={`min-w-0 rounded-2xl border bg-white p-5 shadow-soft ${visibleStore?.activeProjectId === project.projectId ? "border-[#69aaa0]" : "border-line"}`} data-testid="saved-project-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {renaming?.projectId === project.projectId ? <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void saveProjectName(); }}>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold text-muted">{locale === "ru" ? "Название проекта" : "Project name"}<input autoFocus maxLength={120} required value={renaming.name} disabled={renamePending} onChange={(event) => setRenaming({ ...renaming, name: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape" && !renamePending) setRenaming(null); }} className={`${CONTROL} w-full`} /></label>
                  <button type="submit" disabled={renamePending || !renaming.name.trim()} className="min-h-11 rounded-xl bg-[#087f8c] px-3 text-sm font-bold text-white disabled:opacity-50">{renamePending ? (locale === "ru" ? "Сохраняем…" : "Saving…") : (locale === "ru" ? "Сохранить" : "Save")}</button>
                  <button type="button" disabled={renamePending} onClick={() => setRenaming(null)} className={`${CONTROL} text-sm`}>{locale === "ru" ? "Отмена" : "Cancel"}</button>
                </form> : <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="break-words text-lg font-bold">{project.name}</h3><button type="button" disabled={renamePending} aria-label={locale === "ru" ? `Переименовать ${project.name}` : `Rename ${project.name}`} onClick={() => { setError(null); setRenaming({ projectId: project.projectId, originalName: project.name, name: project.name }); }} className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-[#087f8c] hover:bg-[#eefaf8] focus-visible:ring-2 focus-visible:ring-[#087f8c]">{locale === "ru" ? "Переименовать" : "Rename"}</button></div>}
                <p className="mt-1 text-xs text-muted">{locale === "ru" ? "Показано результатов" : "Results shown"}: {project.artifacts.length}</p>
              </div>
              {visibleStore?.activeProjectId === project.projectId ? <div className="flex flex-wrap items-center justify-end gap-2"><span className="rounded-full bg-[#e8f7f2] px-3 py-1 text-[11px] font-bold text-[#176548]">{locale === "ru" ? "Активный" : "Active"}</span>{user?.isDemoUser === false ? <button type="button" onClick={() => void saveSelectedProjectToCloud(project.projectId)} disabled={!(visibleStore.projects.find((candidate) => candidate.projectId === project.projectId)?.artifacts.length) || cloudSavingProjectId !== null || !cloudCanSave} className={`${CONTROL} text-xs font-bold disabled:cursor-wait disabled:opacity-60`}>{cloudSavingProjectId === project.projectId ? (locale === "ru" ? "Сохраняем в облаке…" : "Saving to cloud…") : (locale === "ru" ? "Сохранить в облаке" : "Save to cloud")}</button> : null}</div> : <button type="button" onClick={() => { if (identityKey) void selectPointObjectProject(identityKey, project.projectId).then(() => refresh()).catch((caught) => setError(caught instanceof Error ? caught.message : "Project selection failed.")); }} className={`${CONTROL} text-xs font-bold`}>{locale === "ru" ? "Выбрать" : "Select"}</button>}
            </div>
            {project.artifacts.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{project.artifacts.map((artifact) => (
              <article key={artifact.artifactId} data-testid="saved-result-card" className="flex min-w-0 flex-col rounded-xl border border-line bg-[#fbfcfd] p-4">
                <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[#e8f7f2] px-2.5 py-1 text-[10px] font-bold uppercase text-[#176548]">{artifactKindLabel(artifact.kind, locale)}</span><time className="text-[10px] text-muted">{new Date(artifact.completedAt).toLocaleDateString(locale)}</time></div>
                <h4 className="mt-3 break-words text-sm font-bold">{artifactDisplayTitle(artifact)}</h4>
                <p className="mt-2 break-words text-[11px] leading-5 text-muted">{artifactEvidence(artifact, locale)}</p>
                <p className="mt-2 text-[10px] font-semibold text-[#667085]">{locale === "ru" ? `Версия просмотра ${artifact.viewRevision + 1}` : `View revision ${artifact.viewRevision + 1}`}</p>
                <button type="button" onClick={() => void reopen(project.projectId, artifact)} disabled={openingArtifactId === artifact.artifactId} title={locale === "ru" ? "Без повторного запроса к источнику" : "Without rerunning a source request"} className="mt-4 min-h-11 rounded-xl bg-[#087f8c] px-3 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-[#9cb8b9]">{openingArtifactId === artifact.artifactId ? (locale === "ru" ? "Открываем…" : "Opening…") : artifact.kind === "analyse" ? (locale === "ru" ? "Открыть результат" : "Open result") : (locale === "ru" ? "Показать на карте" : "Show on map")}</button>
              </article>
            ))}</div> : <p className="mt-4 text-sm text-muted">{locale === "ru" ? "Результатов пока нет. Выберите проект и завершите Analyse, Find или Create, чтобы добавить первый результат." : "No results yet. Select this project and complete Analyse, Find or Create to add its first result."}</p>}
          </section>
        ))}
      </div>
      {navigationPending ? <span className="sr-only" role="status">{locale === "ru" ? "Открываем карту…" : "Opening map…"}</span> : null}
      <p className="mt-8 border-t border-line pt-4 text-xs text-muted">{locale === "ru" ? "Сохранено на этом устройстве" : "Saved on this device"}</p>
    </main>
  );
}
