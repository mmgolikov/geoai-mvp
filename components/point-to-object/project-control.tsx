"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import { ReliableSelect } from "@/components/point-to-object/reliable-select";
import {
  createPointObjectProject,
  POINT_OBJECT_PROJECTS_EVENT,
  pointObjectProjectIdentity,
  readPointObjectProjects,
  reconcilePointObjectBrowserIdentity,
  retryPendingPointObjectOperation,
  selectPointObjectProject,
  type PointObjectProjectEventDetail,
  type PointObjectProjectStore
} from "@/src/lib/prototype/point-object-projects";

export function PointObjectProjectControl() {
  const { locale } = usePointObjectLocale();
  const { user, isSessionResolved } = useAuth();
  const identityKey = useMemo(() => pointObjectProjectIdentity(user), [user]);
  const [store, setStore] = useState<PointObjectProjectStore | null>(null);
  const [receipt, setReceipt] = useState<PointObjectProjectEventDetail | null>(null);

  const refresh = useCallback(() => {
    setStore(identityKey ? readPointObjectProjects(identityKey) : null);
  }, [identityKey]);

  useEffect(() => {
    if (!isSessionResolved) return;
    reconcilePointObjectBrowserIdentity(identityKey);
    refresh();
    const update = (event: Event) => {
      const detail = (event as CustomEvent<PointObjectProjectEventDetail>).detail;
      if (detail?.identityKey !== identityKey) return;
      setReceipt(detail);
      refresh();
    };
    const storage = () => refresh();
    window.addEventListener(POINT_OBJECT_PROJECTS_EVENT, update);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(POINT_OBJECT_PROJECTS_EVENT, update);
      window.removeEventListener("storage", storage);
    };
  }, [identityKey, isSessionResolved, refresh]);

  function createProject() {
    if (!identityKey) return;
    try {
      createPointObjectProject(identityKey, locale);
      refresh();
    } catch (error) {
      setReceipt({
        identityKey,
        status: "failed",
        message: error instanceof Error ? error.message : locale === "ru" ? "Не удалось создать проект." : "Project could not be created."
      });
    }
  }

  const statusLabel = receipt?.status === "saving"
    ? (locale === "ru" ? "Сохраняем…" : "Saving…")
    : receipt?.status === "saved"
      ? (locale === "ru" ? "На этом устройстве" : "On this device")
      : receipt?.status === "failed" || receipt?.status === "conflict"
        ? (locale === "ru" ? "Ошибка сохранения" : "Save failed")
        : null;

  return (
    <div className="flex min-w-0 items-center gap-1.5" data-testid="point-object-project-control">
      <Link
        href="/projects?view=spatial"
        aria-label={locale === "ru" ? "Проекты" : "Projects"}
        title={locale === "ru" ? "Проекты" : "Projects"}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-2 text-[11px] font-bold text-[#345c54] hover:border-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:px-3"
      >
        <span aria-hidden="true" className="sm:hidden">P</span>
        <span className="hidden sm:inline">{locale === "ru" ? "Проекты" : "Projects"}</span>
      </Link>
      {identityKey && store?.projects.length ? (
        <ReliableSelect
          aria-label={locale === "ru" ? "Активный проект" : "Active project"}
          value={store.activeProjectId ?? ""}
          onChange={(event) => { selectPointObjectProject(identityKey, event.target.value); refresh(); }}
          wrapperClassName="hidden max-w-[170px] lg:block"
          className="h-10 rounded-lg border border-line bg-white pl-2 text-[11px] font-semibold text-[#344054] outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"
        >
          {store.projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.name}</option>)}
        </ReliableSelect>
      ) : null}
      {identityKey ? <button type="button" onClick={createProject} className="hidden h-10 rounded-lg border border-line bg-white px-2 text-[11px] font-bold text-[#345c54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:inline-flex sm:items-center">{locale === "ru" ? "+ Новый" : "+ New"}</button> : null}
      {statusLabel ? <span className={`hidden max-w-28 text-[10px] font-semibold xl:inline ${receipt?.status === "failed" || receipt?.status === "conflict" ? "text-[#b54708]" : "text-[#176548]"}`} role="status" title={receipt?.message}>{statusLabel}</span> : null}
      {identityKey && receipt?.status === "failed" ? <button type="button" onClick={() => void retryPendingPointObjectOperation(identityKey)} className="hidden h-10 rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-2 text-[10px] font-bold text-[#79520d] xl:inline-flex xl:items-center">{locale === "ru" ? "Повторить" : "Retry"}</button> : null}
    </div>
  );
}
