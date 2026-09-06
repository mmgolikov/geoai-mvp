"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import { ReliableSelect } from "@/components/point-to-object/reliable-select";
import {
  continuePendingPointObjectOperationInNewProject,
  createPointObjectProject,
  POINT_OBJECT_PROJECTS_EVENT,
  pointObjectProjectIdentity,
  readVerifiedPointObjectProjects,
  reconcilePointObjectBrowserIdentity,
  retryPendingPointObjectOperations,
  selectPointObjectProject,
  type PointObjectProjectEventDetail,
  type PointObjectProjectStore
} from "@/src/lib/prototype/point-object-projects";

export function PointObjectProjectControl() {
  const { locale } = usePointObjectLocale();
  const { user, isSessionResolved } = useAuth();
  const identityKey = useMemo(() => pointObjectProjectIdentity(user), [user]);
  const identityRef = useRef(identityKey);
  identityRef.current = identityKey;
  const [store, setStore] = useState<PointObjectProjectStore | null>(null);
  const [receipt, setReceipt] = useState<PointObjectProjectEventDetail | null>(null);

  const refresh = useCallback(async () => {
    if (!identityKey) {
      setStore(null);
      return;
    }
    const result = await readVerifiedPointObjectProjects(identityKey);
    if (identityRef.current !== identityKey) return;
    setStore(result.store);
    if (!result.store) {
      setReceipt({
        identityKey,
        status: result.status === "damaged" ? "damaged" : "failed",
        code: result.status === "damaged" ? "store_damaged" : "storage_inaccessible",
        message: result.message,
        pendingCount: 0
      });
    }
  }, [identityKey]);

  useEffect(() => {
    if (!isSessionResolved) return;
    reconcilePointObjectBrowserIdentity(identityKey);
    void refresh();
    const update = (event: Event) => {
      const detail = (event as CustomEvent<PointObjectProjectEventDetail>).detail;
      if (detail?.identityKey !== identityKey) return;
      setReceipt(detail);
      void refresh();
    };
    const storage = () => void refresh();
    window.addEventListener(POINT_OBJECT_PROJECTS_EVENT, update);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(POINT_OBJECT_PROJECTS_EVENT, update);
      window.removeEventListener("storage", storage);
    };
  }, [identityKey, isSessionResolved, refresh]);

  async function createProject() {
    if (!identityKey) return;
    try {
      await createPointObjectProject(identityKey, locale);
      await refresh();
    } catch (error) {
      setReceipt({
        identityKey,
        status: "failed",
        message: error instanceof Error ? error.message : locale === "ru" ? "Не удалось создать проект." : "Project could not be created.",
        pendingCount: 0
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
        className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-white px-2 text-[11px] font-bold text-[#345c54] hover:border-[#087f8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:px-3"
      >
        <span aria-hidden="true" className="sm:hidden">P</span>
        <span className="hidden sm:inline">{locale === "ru" ? "Проекты" : "Projects"}</span>
      </Link>
      {identityKey && store?.projects.length ? (
        <ReliableSelect
          aria-label={locale === "ru" ? "Активный проект" : "Active project"}
          value={store.activeProjectId ?? ""}
          onChange={(event) => { void selectPointObjectProject(identityKey, event.target.value).then(() => refresh()).catch((error) => setReceipt({ identityKey, status: "failed", message: error instanceof Error ? error.message : "Project selection failed.", pendingCount: 0 })); }}
          wrapperClassName="hidden max-w-[170px] lg:block"
          className="h-11 rounded-lg border border-line bg-white pl-2 text-[11px] font-semibold text-[#344054] outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c]"
        >
          {store.projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.name}</option>)}
        </ReliableSelect>
      ) : null}
      {identityKey ? <button type="button" onClick={() => void createProject()} className="hidden h-11 rounded-lg border border-line bg-white px-2 text-[11px] font-bold text-[#345c54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] sm:inline-flex sm:items-center">{locale === "ru" ? "+ Новый" : "+ New"}</button> : null}
      {statusLabel ? <span className={`hidden max-w-28 text-[10px] font-semibold xl:inline ${receipt?.status === "failed" || receipt?.status === "conflict" ? "text-[#b54708]" : "text-[#176548]"}`} role="status" title={receipt?.message}>{statusLabel}</span> : null}
      {identityKey && (receipt?.status === "failed" || receipt?.status === "capacity" || receipt?.status === "conflict" || receipt?.status === "damaged") ? <button
        type="button"
        data-testid="point-object-project-recovery"
        disabled={receipt.status === "damaged" || receipt.status === "conflict" || receipt.code === "project_limit"}
        onClick={() => void (receipt.code === "project_capacity"
          ? continuePendingPointObjectOperationInNewProject(identityKey)
          : retryPendingPointObjectOperations(identityKey))}
        aria-label={`${receipt.message} ${receipt.code === "project_capacity" ? (locale === "ru" ? "Новый проект и сохранить" : "New project and save") : (locale === "ru" ? "Повторить" : "Retry")}`}
        title={receipt.message}
        className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-[#e6bd74] bg-[#fff9ed] px-2 text-[10px] font-bold text-[#79520d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087f8c] disabled:cursor-not-allowed disabled:opacity-60"
      ><span aria-hidden="true" className="text-base">↻</span><span className="ml-1 hidden md:inline">{receipt.code === "project_capacity" ? (locale === "ru" ? "Новый + сохранить" : "New + save") : (locale === "ru" ? "Повторить" : "Retry")}</span></button> : null}
    </div>
  );
}
