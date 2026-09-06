"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { readPointObjectAnalysis, readPointObjectSelection, writePointObjectAnalysis, writePointObjectQuestion, writePointObjectSelection } from "@/components/point-to-object/live-session";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import {
  createPointObjectProject,
  POINT_OBJECT_PROJECTS_EVENT,
  pointObjectProjectIdentity,
  queuePointObjectAnalysisRestore,
  queuePointObjectProjectRestore,
  readVerifiedPointObjectProjects,
  reconcilePointObjectBrowserIdentity,
  selectPointObjectProject,
  verifySavedPointObjectArtifact,
  type PointObjectProjectEventDetail,
  type PointObjectProjectStoreReadResult,
  type PointObjectProjectStore,
  type SavedPointObjectArtifact
} from "@/src/lib/prototype/point-object-projects";
import { readPointObjectFindSession, writePointObjectFindSession } from "@/src/lib/prototype/point-to-object-find-session";
import type { PointObjectLocale } from "@/src/lib/prototype/point-to-object-i18n";

const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

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

export function PointObjectProjectsPageClient() {
  const router = useRouter();
  const { user, isSessionResolved } = useAuth();
  const { locale, setLocale } = usePointObjectLocale();
  const identityKey = useMemo(() => pointObjectProjectIdentity(user), [user]);
  const [store, setStore] = useState<PointObjectProjectStore | null>(null);
  const [readStatus, setReadStatus] = useState<PointObjectProjectStoreReadResult["status"]>("missing");
  const [error, setError] = useState<string | null>(null);
  const identityRef = useRef(identityKey);
  identityRef.current = identityKey;
  const refresh = useCallback(async () => {
    if (!identityKey) {
      setStore(null);
      setReadStatus("missing");
      return;
    }
    const result = await readVerifiedPointObjectProjects(identityKey);
    if (identityRef.current !== identityKey) return;
    setReadStatus(result.status);
    setStore(result.store);
    if (!result.store) setError(result.message);
  }, [identityKey]);

  useEffect(() => {
    if (!isSessionResolved) return;
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

  async function reopen(projectId: string, artifact: SavedPointObjectArtifact) {
    if (!identityKey) return;
    const initiatingIdentity = identityKey;
    setError(null);
    if (!await verifySavedPointObjectArtifact(artifact)) {
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
    router.push("/prototype/point-to-object");
  }

  if (!isSessionResolved) return <main className="mx-auto max-w-6xl p-6" role="status">Loading projects…</main>;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" data-testid="point-object-projects-page">
      <nav className="flex flex-wrap gap-2" aria-label={locale === "ru" ? "Разделы проектов" : "Project views"}>
        <Link href="/projects" className="min-h-10 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-[#475467]">{locale === "ru" ? "Готовность данных" : "Data readiness"}</Link>
        <Link href="/projects?view=spatial" aria-current="page" className="min-h-10 rounded-lg border border-[#087f8c] bg-[#eefaf8] px-3 py-2 text-xs font-bold text-[#087f8c]">{locale === "ru" ? "Сохранённая пространственная работа" : "Saved spatial work"}</Link>
      </nav>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.11em] text-[#087f8c]">{locale === "ru" ? "СОХРАНЁННЫЕ ПРОЕКТЫ" : "SAVED PROJECTS"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">{locale === "ru" ? "Проекты GeoAI" : "GeoAI Projects"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{locale === "ru" ? "Завершённые результаты Analyse, Find и Create хранятся только в этом браузере на этом устройстве." : "Completed Analyse, Find and Create results are stored only in this browser on this device."}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-10 rounded-xl border border-line bg-white p-1" aria-label={locale === "ru" ? "Язык" : "Language"} role="group">
            {(["en", "ru"] as const).map((item) => <button key={item} type="button" onClick={() => setLocale(item)} aria-pressed={locale === item} className={`h-8 min-w-9 rounded-lg px-2 text-[11px] font-bold uppercase ${locale === item ? "bg-[#087f8c] text-white" : "text-[#667085]"}`}>{item}</button>)}
          </div>
          <button type="button" onClick={() => void newProject()} disabled={!identityKey || readStatus === "damaged" || readStatus === "inaccessible"} className="min-h-11 rounded-xl bg-[#087f8c] px-4 text-sm font-bold text-white disabled:bg-[#b7c4c4]">{locale === "ru" ? "+ Новый проект" : "+ New project"}</button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-[#cfe0da] bg-[#f4faf7] p-4 text-xs leading-5 text-[#345c54]">
        <strong>{locale === "ru" ? "Режим хранения: на этом устройстве." : "Storage mode: on this device."}</strong>
        <span>{locale === "ru" ? "Облачная синхронизация и совместный доступ не активированы." : "Cloud sync and shared access are not activated."}</span>
        <Link href="/projects" className="font-bold underline underline-offset-2">{locale === "ru" ? "Открыть прежний обзор готовности данных" : "Open the existing data-readiness dashboard"}</Link>
      </div>
      {error ? <p className="mt-4 rounded-xl border border-[#e6bd74] bg-[#fff9ed] px-4 py-3 text-sm text-[#79520d]" role="alert">{error}</p> : null}

      {!identityKey ? <section className="mt-6 rounded-2xl border border-line bg-white p-6"><h2 className="text-lg font-bold">{locale === "ru" ? "Войдите, чтобы открыть локальное пространство проектов" : "Sign in to open your local project space"}</h2></section> : null}
      {identityKey && !store?.projects.length ? <section className="mt-6 rounded-2xl border border-dashed border-[#aabbb7] bg-white p-8 text-center"><h2 className="text-xl font-bold">{locale === "ru" ? "Завершённых проектов пока нет" : "No saved projects yet"}</h2><p className="mt-2 text-sm text-muted">{locale === "ru" ? "Первый успешный Analyse, Find или Create создаст проект автоматически — либо начните новый сейчас." : "The first successful Analyse, Find or Create operation will start one automatically, or create one now."}</p><Link href="/prototype/point-to-object" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-[#8ebdb4] bg-white px-4 text-sm font-bold text-[#176548]">{locale === "ru" ? "Открыть карту" : "Open map"}</Link></section> : null}

      <div className="mt-6 grid gap-4">
        {store?.projects.map((project) => (
          <section key={project.projectId} className={`rounded-2xl border bg-white p-5 shadow-soft ${store.activeProjectId === project.projectId ? "border-[#69aaa0]" : "border-line"}`} data-testid="saved-project-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-bold">{project.name}</h2><p className="mt-1 text-xs text-muted">{locale === "ru" ? "Хранится на этом устройстве" : "Stored on this device"} · {project.artifacts.length} {locale === "ru" ? "результатов" : "results"}</p></div>
              {store.activeProjectId === project.projectId ? <span className="rounded-full bg-[#e8f7f2] px-3 py-1 text-[11px] font-bold text-[#176548]">{locale === "ru" ? "Активный" : "Active"}</span> : <button type="button" onClick={() => { if (identityKey) void selectPointObjectProject(identityKey, project.projectId).then(() => refresh()).catch((caught) => setError(caught instanceof Error ? caught.message : "Project selection failed.")); }} className="min-h-11 rounded-lg border border-line px-3 text-xs font-bold">{locale === "ru" ? "Выбрать" : "Select"}</button>}
            </div>
            {project.artifacts.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{project.artifacts.map((artifact) => (
              <article key={artifact.artifactId} className="flex min-w-0 flex-col rounded-xl border border-line bg-[#fbfcfd] p-4">
                <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[#e8f7f2] px-2.5 py-1 text-[10px] font-bold uppercase text-[#176548]">{artifactKindLabel(artifact.kind, locale)}</span><time className="text-[10px] text-muted">{new Date(artifact.completedAt).toLocaleDateString(locale)}</time></div>
                <h3 className="mt-3 break-words text-sm font-bold">{artifact.label}</h3>
                <p className="mt-2 break-words text-[11px] leading-5 text-muted">{artifactEvidence(artifact, locale)}</p>
                <button type="button" onClick={() => void reopen(project.projectId, artifact)} className="mt-4 min-h-11 rounded-xl bg-[#087f8c] px-3 text-xs font-bold text-white">{locale === "ru" ? "Открыть без повторного запроса" : "Reopen without rerunning"}</button>
              </article>
            ))}</div> : <p className="mt-4 text-sm text-muted">{locale === "ru" ? "Проект выбран. Завершите Analyse, Find или Create, чтобы добавить первый результат." : "Project selected. Complete Analyse, Find or Create to add its first result."}</p>}
          </section>
        ))}
      </div>
      <p className="mt-8 border-t border-line pt-4 text-[11px] leading-5 text-muted">{CAVEAT}</p>
    </main>
  );
}
