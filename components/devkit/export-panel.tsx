"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DevkitProject } from "../../src/lib/devkit/contracts";
import { buildDevelopmentKit, buildSourceMetadataDraft, canonicalDevkitJson, type DevelopmentKit, type SourceMetadataDraft } from "../../src/lib/devkit/export";

type Download = { path: string; url: string };

/** Control wires this bounded panel into the existing project workflow. */
export function DevkitExportPanel({ project, locale = project.brief.locale }: { project: DevkitProject; locale?: "en" | "ru" }) {
  // A different exact snapshot/locale gets a different React state owner during reconciliation,
  // before passive effects. Even a same-revision input mutation cannot display the prior kit.
  return <ExportPreparationPanel key={`${locale}:${canonicalDevkitJson(project)}`} project={project} locale={locale} />;
}

function ExportPreparationPanel({ project, locale }: { project: DevkitProject; locale: "en" | "ru" }) {
  const [kit, setKit] = useState<DevelopmentKit | null>(null);
  const [metadataDraft, setMetadataDraft] = useState<SourceMetadataDraft | null>(null);
  const [downloadState, setDownloadState] = useState<{ owner: DevelopmentKit | SourceMetadataDraft | null; files: Download[] }>({ owner: null, files: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const prepared = kit ?? metadataDraft;
  const downloads = downloadState.owner === prepared ? downloadState.files : [];
  const ru = locale === "ru";
  const errorText = error?.includes("RIGHTS_UNRESOLVED") ? (ru ? "Не подтверждены права на включение источника. Уточните разрешение или исключите этот материал в новой версии проекта." : "Reuse rights for a source are unresolved. Confirm permission or remove that material in a new project version.") : error?.includes("TOO_LARGE") ? (ru ? "Комплект превышает допустимый размер. Уменьшите объём вложений в новой версии проекта." : "The kit exceeds the supported size. Reduce attachments in a new project version.") : error?.includes("CRYPTO_UNAVAILABLE") ? (ru ? "Браузер не поддерживает проверку целостности. Откройте проект в актуальном браузере через защищённый адрес." : "File integrity checks are unavailable. Open the project in a current browser using a secure address.") : (ru ? "Не удалось проверить сохранённый снимок. Сохраните проект и откройте его заново." : "The saved snapshot could not be validated. Save and reopen the project.");

  useLayoutEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (!prepared) { setDownloadState({ owner: null, files: [] }); return; }
    const files = prepared.files.map(file => ({ path: file.path, url: URL.createObjectURL(new Blob([file.content], { type: `${file.mediaType};charset=utf-8` })) }));
    const bundle = { format: kit ? "GEOAI_DEVKIT_BUNDLE" : "GEOAI_DEVKIT_SOURCE_METADATA_DRAFT", schemaVersion: 1, manifest: prepared.manifest, files: prepared.files };
    files.unshift({ path: kit ? "development-kit.json" : "source-metadata-draft.json", url: URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json;charset=utf-8" })) });
    setDownloadState({ owner: prepared, files });
    return () => files.forEach(file => URL.revokeObjectURL(file.url));
  }, [prepared, kit]);

  async function prepare() {
    const token = ++generation.current;
    setBusy(true); setKit(null); setMetadataDraft(null); setError(null);
    try {
      const result = await buildDevelopmentKit(project, { locale });
      if (generation.current === token) setKit(result);
    } catch (failure) {
      if (generation.current === token) setError(failure instanceof Error ? failure.message : "DEVKIT_EXPORT_FAILED");
    } finally { if (generation.current === token) setBusy(false); }
  }

  async function prepareMetadata() {
    const token = ++generation.current;
    setBusy(true); setKit(null); setMetadataDraft(null);
    try {
      const result = await buildSourceMetadataDraft(project, { locale });
      if (generation.current === token) setMetadataDraft(result);
    } catch (failure) {
      if (generation.current === token) setError(failure instanceof Error ? failure.message : "DEVKIT_EXPORT_FAILED");
    } finally { if (generation.current === token) setBusy(false); }
  }

  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" data-testid="devkit-export-panel" aria-labelledby="devkit-export-heading">
    <h2 id="devkit-export-heading" className="text-lg font-semibold text-slate-900">{ru ? "Комплект проекта" : "Project kit"}</h2>
    <p className="mt-2 text-sm text-slate-600">{ru ? "Альбом, записка, площади, экономика, источники и лист подготовки обращения из одной сохранённой версии. Печать альбома доступна в браузере." : "Album, memo, areas, finance, sources and a procedure preparation sheet from one saved version. Print the album in your browser."}</p>
    <p className="mt-2 text-sm text-slate-600">{ru ? "Локальное хранение на этом устройстве. Review не выполнен. Обращение не подано." : "Local storage on this device. Review not performed. No application submitted."}</p>
    <button type="button" onClick={() => void prepare()} disabled={busy || project.revision < 1} className="mt-4 min-h-11 rounded-lg bg-teal-800 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800" data-testid="devkit-export-prepare">{busy ? (ru ? "Подготовка…" : "Preparing…") : (ru ? "Подготовить комплект" : "Prepare kit")}</button>
    {project.revision < 1 ? <p className="mt-2 text-sm text-amber-900">{ru ? "Сначала сохраните проект, чтобы зафиксировать снимок." : "Save the project first to establish a snapshot."}</p> : null}
    <div role="status" aria-live="polite" className="mt-3 break-words text-sm">
      {error ? <p className="rounded-lg bg-amber-50 p-3 text-amber-950">{ru ? "Экспорт не создан. " : "Export was not created. "}{errorText}</p> : null}
      {kit ? <p className="rounded-lg bg-teal-50 p-3 text-teal-950">{kit.manifest.status === "partial_draft" ? (ru ? "Частичный черновик: пробелы и несовпадения версий перечислены ниже и в комплекте." : "Partial draft: gaps and version mismatches are listed below and inside the kit.") : (ru ? "Согласованный черновик подготовлен. Нужен профильный review." : "Coherent draft prepared. Professional review is required.")}</p> : null}
    </div>
    {error?.includes("RIGHTS_UNRESOLVED") ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p>{ru ? "Можно подготовить отдельный черновик метаданных: только ID, ссылки, даты, статусы и права. Исходные материалы, геометрия и расчёты исключены. Такой документ нельзя импортировать как проект; исходный снимок сохранён." : "You can prepare a separate metadata draft containing only IDs, links, dates, statuses and rights. Source content, geometry and calculations are withheld. This document cannot be imported as a project; the original snapshot is preserved."}</p><button type="button" onClick={() => void prepareMetadata()} disabled={busy} className="mt-3 min-h-11 rounded-lg border border-amber-800 px-3 py-2 font-medium disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800" data-testid="devkit-export-metadata-prepare">{ru ? "Подготовить только метаданные" : "Prepare metadata only"}</button></div> : null}
    {metadataDraft ? <div className="mt-3" data-testid="devkit-export-metadata-draft"><p role="status" className="text-sm font-medium text-amber-950">{ru ? "Готов отдельный черновик метаданных. Полный комплект проекта не создан." : "A separate metadata draft is prepared. A full project kit was not created."}</p><ul className="mt-2 grid gap-2 sm:grid-cols-2">{downloads.map(file => <li key={file.path}><a href={file.url} download={file.path} className="flex min-h-11 items-center break-all rounded-lg border border-slate-300 px-3 py-2 text-sm text-teal-900 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800">{file.path}</a></li>)}</ul></div> : null}
    {kit ? <>
      <p className="mt-3 break-all text-xs text-slate-600">{project.id} @ {kit.manifest.projectRevision} · {kit.manifest.kitMaturity} · {kit.manifest.financeMaturity}</p>
      <ul className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">{downloads.map(file => <li key={file.path} className="min-w-0"><a href={file.url} download={file.path} className="flex min-h-11 items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-teal-900 underline decoration-teal-300 underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800">{file.path === "development-kit.json" ? (ru ? "Скачать весь комплект · JSON" : "Download entire kit · JSON") : file.path === "project.json" ? (ru ? "Проект для повторного импорта · JSON" : "Project for reimport · JSON") : file.path === "memo-album.html" ? (ru ? "Записка и альбом · HTML для печати" : "Memo and album · printable HTML") : file.path}</a></li>)}</ul>
      <details className="mt-4 rounded-lg border border-slate-200 p-3"><summary className="min-h-11 cursor-pointer font-medium">{ru ? `Открытые вопросы (${kit.manifest.issues.length}) и версии` : `Open gaps (${kit.manifest.issues.length}) and versions`}</summary><ul className="space-y-2 text-sm text-slate-700">{kit.manifest.issues.map((issue, index) => <li key={`${issue.code}-${index}`} className="break-words">{issue.code} · {issue.reference ?? issue.section}: {issue.detail}</li>)}</ul><p className="mt-3 break-all text-xs">Snapshot SHA-256: {kit.manifest.snapshotHash}</p><p className="mt-2 text-xs text-slate-600">{ru ? "Хеши подтверждают целостность файлов, а не достоверность сведений. Лист подготовки не является официальной формой. IFC/BIM не создаются." : "Hashes establish file integrity, not factual verification. The preparation sheet is not an official form. No IFC/BIM is created."}</p></details>
    </> : null}
    <p className="mt-4 break-words text-xs text-slate-600">Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.</p>
  </section>;
}

export const ExportPanel = DevkitExportPanel;
