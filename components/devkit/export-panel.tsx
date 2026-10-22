"use client";

import { useEffect, useRef, useState } from "react";
import type { DevkitProject } from "../../src/lib/devkit/contracts";
import { buildDevelopmentKit, type DevelopmentKit } from "../../src/lib/devkit/export";

type Download = { path: string; url: string };

/** Control wires this bounded panel into the existing project workflow. */
export function DevkitExportPanel({ project, locale = project.brief.locale }: { project: DevkitProject; locale?: "en" | "ru" }) {
  const [kit, setKit] = useState<DevelopmentKit | null>(null);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const ru = locale === "ru";

  useEffect(() => { generation.current++; setKit(null); setError(null); setBusy(false); }, [project, locale]);
  useEffect(() => {
    if (!kit) { setDownloads([]); return; }
    const files = kit.files.map(file => ({ path: file.path, url: URL.createObjectURL(new Blob([file.content], { type: `${file.mediaType};charset=utf-8` })) }));
    const bundle = { format: "GEOAI_DEVKIT_BUNDLE", schemaVersion: 1, manifest: kit.manifest, files: kit.files };
    files.unshift({ path: "development-kit.json", url: URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json;charset=utf-8" })) });
    setDownloads(files);
    return () => files.forEach(file => URL.revokeObjectURL(file.url));
  }, [kit]);

  async function prepare() {
    const token = ++generation.current;
    setBusy(true); setKit(null); setError(null);
    try {
      const result = await buildDevelopmentKit(project, { locale });
      if (generation.current === token) setKit(result);
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
      {error ? <p className="rounded-lg bg-amber-50 p-3 text-amber-950">{ru ? "Экспорт не создан. Сохранённый проект не изменён. Причина: " : "Export was not created. The saved project is unchanged. Reason: "}{error}</p> : null}
      {kit ? <p className="rounded-lg bg-teal-50 p-3 text-teal-950">{kit.manifest.status === "partial_draft" ? (ru ? "Частичный черновик: пробелы и несовпадения версий перечислены ниже и в комплекте." : "Partial draft: gaps and version mismatches are listed below and inside the kit.") : (ru ? "Согласованный черновик подготовлен. Нужен профильный review." : "Coherent draft prepared. Professional review is required.")}</p> : null}
    </div>
    {kit ? <>
      <p className="mt-3 break-all text-xs text-slate-600">{project.id} @ {kit.manifest.projectRevision} · {kit.manifest.kitMaturity} · {kit.manifest.financeMaturity}</p>
      <ul className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">{downloads.map(file => <li key={file.path} className="min-w-0"><a href={file.url} download={file.path} className="flex min-h-11 items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-teal-900 underline decoration-teal-300 underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800">{file.path === "development-kit.json" ? (ru ? "Скачать весь комплект · JSON" : "Download entire kit · JSON") : file.path === "project.json" ? (ru ? "Проект для повторного импорта · JSON" : "Project for reimport · JSON") : file.path === "memo-album.html" ? (ru ? "Записка и альбом · HTML для печати" : "Memo and album · printable HTML") : file.path}</a></li>)}</ul>
      <details className="mt-4 rounded-lg border border-slate-200 p-3"><summary className="min-h-11 cursor-pointer font-medium">{ru ? `Открытые вопросы (${kit.manifest.issues.length}) и версии` : `Open gaps (${kit.manifest.issues.length}) and versions`}</summary><ul className="space-y-2 text-sm text-slate-700">{kit.manifest.issues.map((issue, index) => <li key={`${issue.code}-${index}`} className="break-words">{issue.code} · {issue.reference ?? issue.section}: {issue.detail}</li>)}</ul><p className="mt-3 break-all text-xs">Snapshot SHA-256: {kit.manifest.snapshotHash}</p><p className="mt-2 text-xs text-slate-600">{ru ? "Хеши подтверждают целостность файлов, а не достоверность сведений. Лист подготовки не является официальной формой. IFC/BIM не создаются." : "Hashes establish file integrity, not factual verification. The preparation sheet is not an official form. No IFC/BIM is created."}</p></details>
    </> : null}
    <p className="mt-4 break-words text-xs text-slate-600">Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.</p>
  </section>;
}

export const ExportPanel = DevkitExportPanel;
