"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePointObjectLocale } from "@/components/point-to-object/locale-provider";
import { POINT_OBJECT_PROJECTS_EVENT, pointObjectProjectIdentity, readVerifiedPointObjectProjects, type PointObjectProjectEventDetail } from "@/src/lib/prototype/point-object-projects";
import type { PointObjectProjectIdentity, SavedPointObjectProject } from "@/src/lib/prototype/point-object-projects-contract";
import type { DevkitProject, DevkitStoreFailure } from "@/src/lib/devkit/contracts";
import { createDevkitDemoProject, createDevkitCriticalGapProject } from "@/src/lib/devkit/fixtures";
import { bridgeSavedCreateAoi } from "@/src/lib/devkit/project-bridge";
import { DEVKIT_MAX_PROJECT_BYTES, createDevkitProjectStore, parseDevkitProject } from "@/src/lib/devkit/project-store";
import { DevkitWorkflow, type DevkitWorkflowProps, type WorkflowActionResult } from "./workflow";
import { createWorkflowOperationGuard, workflowLocalScopeId, matchWorkflowSavedSnapshot, workflowTransferConsent, reconcileWorkflowSnapshot } from "./workflow-model";

export type DevkitWorkspaceClientProps = {
  slots?: DevkitWorkflowProps["slots"];
  onExportKit?: (snapshot: DevkitProject, guard: { isCurrent: () => boolean }) => WorkflowActionResult | Promise<WorkflowActionResult>;
  onChooseAoi?: () => void;
};
type LocalStore = ReturnType<typeof createDevkitProjectStore>;

/** Existing providers own Auth/locale. Public or synthetic browser-local projects only. */
export function DevkitWorkspaceClient(props: DevkitWorkspaceClientProps = {}) {
  const { user, isSessionResolved } = useAuth();
  const { locale } = usePointObjectLocale();
  const identityKey = useMemo(() => pointObjectProjectIdentity(user), [user]);
  const liveIdentity = useRef<string | null>(null);
  liveIdentity.current = isSessionResolved ? identityKey : null;
  if (!isSessionResolved) return <section className="devkit-workflow" role="status">{locale === "ru" ? "Проверяем текущую сессию…" : "Resolving the current session…"}</section>;
  if (!identityKey) return <section className="devkit-workflow"><h1>{locale === "ru" ? "Откройте пространство через существующий вход" : "Use the existing sign-in to open your workspace"}</h1></section>;
  return <IdentityWorkspace {...props} key={identityKey} identityKey={identityKey} locale={locale} isIdentityCurrent={() => liveIdentity.current === identityKey} />;
}

function IdentityWorkspace({ identityKey, locale, slots, onExportKit, onChooseAoi, isIdentityCurrent }: DevkitWorkspaceClientProps & { identityKey: PointObjectProjectIdentity; locale: "en" | "ru"; isIdentityCurrent: () => boolean }) {
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const t = (en: string, ru: string) => localeRef.current === "ru" ? ru : en;
  const [store, setStore] = useState<LocalStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<DevkitProject[]>([]);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const [project, setProject] = useState<DevkitProject | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const [externalConflicts, setExternalConflicts] = useState<Set<string>>(new Set());
  const [legacyProject, setLegacyProject] = useState<SavedPointObjectProject | null>(null);
  const [legacyState, setLegacyState] = useState<"loading" | "ready" | "missing" | "unavailable">("loading");
  const [sourceArtifactId, setSourceArtifactId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [includeRetainedContext, setIncludeRetainedContext] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [hasUnappliedBrief, setHasUnappliedBrief] = useState(false);
  const unappliedRef = useRef(hasUnappliedBrief);
  unappliedRef.current = hasUnappliedBrief;
  const drafts = useRef(new Map<string, DevkitProject>());
  const revisions = useRef(new Map<string, number>());
  const operation = useRef(createWorkflowOperationGuard(isIdentityCurrent));
  const alive = useRef(false);
  const sourceSequence = useRef(0);
  const selectedRef = useRef(project);
  selectedRef.current = project;
  const legacyRef = useRef(legacyProject);
  legacyRef.current = legacyProject;

  function failureMessage(code: DevkitStoreFailure) {
    const messages: Record<DevkitStoreFailure, string> = {
      invalid_project: t("Snapshot validation failed. The previous save was preserved.", "Снимок не прошёл проверку. Прежнее сохранение не изменено."),
      invalid_import: t("Invalid project file. Existing projects were preserved.", "Некорректный файл проекта. Существующие проекты сохранены."),
      unsupported_version: t("Unsupported file version. No migration was applied.", "Версия файла не поддерживается. Миграция не выполнялась."),
      storage_unavailable: t("Device storage is unavailable. Keep this page open; no cloud save occurred.", "Хранилище устройства недоступно. Сохраните страницу открытой; облачного сохранения не было."),
      store_damaged: t("Local storage could not be verified. Original bytes were preserved.", "Локальное хранилище не прошло проверку. Исходные данные не изменены."),
      conflict: t("Saved revision or ID conflicts. Reopen the saved snapshot before saving again.", "Конфликт сохранённой версии или ID. Откройте сохранённый снимок перед повторным сохранением."),
      capacity: t("Local project limit reached. Existing projects were preserved.", "Достигнут лимит локальных проектов. Существующие проекты сохранены."),
      scope_mismatch: t("Local namespace mismatch. No project was overwritten.", "Несовпадение локального пространства. Проекты не перезаписаны.")
    };
    return messages[code];
  }

  async function refreshLegacy() {
    const sequence = ++sourceSequence.current;
    try {
      const result = await readVerifiedPointObjectProjects(identityKey);
      if (!alive.current || !isIdentityCurrent() || sequence !== sourceSequence.current) return;
      if (!result.store || result.store.identityKey !== identityKey) { setLegacyProject(null); setLegacyState("unavailable"); return; }
      const active = result.store.projects.find((item) => item.projectId === result.store.activeProjectId) ?? null;
      if (legacyRef.current?.projectId !== active?.projectId) { setSourceArtifactId(""); setConfirmed(false); setIncludeRetainedContext(false); invalidateOperations(); }
      setLegacyProject(active); setLegacyState(active ? "ready" : "missing");
    } catch {
      if (alive.current && isIdentityCurrent() && sequence === sourceSequence.current) { setLegacyProject(null); setLegacyState("unavailable"); }
    }
  }

  useEffect(() => {
    alive.current = true;
    operation.current = createWorkflowOperationGuard(isIdentityCurrent);
    let cancelled = false;
    let local: LocalStore | null = null;
    void (async () => {
      try {
        const scopeId = await workflowLocalScopeId(identityKey);
        if (!alive.current || !isIdentityCurrent() || cancelled) return;
        let storage: Storage | null = null;
        try { storage = window.localStorage; } catch { /* Browser policy may deny this property. */ }
        local = createDevkitProjectStore(storage, scopeId);
        const result = local.list();
        if (!alive.current || !isIdentityCurrent() || cancelled) return;
        setStore(local);
        if (result.ok) { savedRef.current = result.value; setSaved(result.value); revisions.current = new Map(result.value.map((item) => [item.id, item.revision])); }
        else setError(failureMessage(result.code));
      } catch {
        if (alive.current && isIdentityCurrent() && !cancelled) setError(t("Local workspace could not be opened. Saved data was not changed.", "Не удалось открыть локальное пространство. Сохранённые данные не изменены."));
      } finally { if (alive.current && isIdentityCurrent() && !cancelled) setLoading(false); }
    })();
    void refreshLegacy();
    const localChanged = () => {
      if (!isIdentityCurrent()) return;
      if (local) {
        const result = local.list();
        if (result.ok) reconcileStoredSnapshots(result.value);
        else setError(failureMessage(result.code));
      }
      void refreshLegacy();
    };
    const projectChanged = (event: Event) => {
      if ((event as CustomEvent<PointObjectProjectEventDetail>).detail?.identityKey === identityKey) void refreshLegacy();
    };
    window.addEventListener("storage", localChanged);
    window.addEventListener(POINT_OBJECT_PROJECTS_EVENT, projectChanged);
    return () => { cancelled = true; alive.current = false; sourceSequence.current++; operation.current.close(); window.removeEventListener("storage", localChanged); window.removeEventListener(POINT_OBJECT_PROJECTS_EVENT, projectChanged); };
    // Locale alters copy only; it must not reload or replace a draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey]);

  function reconcileStoredSnapshots(incoming: DevkitProject[]) {
    const previousSaved = new Map(savedRef.current.map((item) => [item.id, item]));
    const nextSaved = new Map(incoming.map((item) => [item.id, item]));
    const conflictChanges = new Map<string, boolean>();
    for (const [id, cached] of drafts.current) {
      const next = nextSaved.get(id) ?? null;
      if (JSON.stringify(previousSaved.get(id) ?? null) === JSON.stringify(next)) continue;
      const current = selectedRef.current?.id === id;
      const decision = reconcileWorkflowSnapshot(cached, next, dirtyRef.current.has(id), current && unappliedRef.current);
      conflictChanges.set(id, decision.status === "conflict");
      if (decision.status === "updated") {
        drafts.current.set(id, decision.project); revisions.current.set(id, decision.project.revision);
        if (current) { invalidateOperations(); setProject(decision.project); setSaveFailed(false); }
      } else if (decision.status === "conflict" && current) {
        invalidateOperations();
        setError(t("The saved copy changed in another window. Your local edits are preserved; reopen the saved snapshot to resolve the conflict.", "Сохранённая копия изменилась в другом окне. Локальные правки сохранены; для разрешения конфликта откройте сохранённый снимок."));
      }
    }
    for (const next of incoming) if (!drafts.current.has(next.id)) revisions.current.set(next.id, next.revision);
    setExternalConflicts((previous) => { const changes = new Set(previous); for (const [id, conflicted] of conflictChanges) { if (conflicted) changes.add(id); else changes.delete(id); } return changes; });
    savedRef.current = incoming; setSaved(incoming);
  }
  function invalidateOperations() { operation.current.invalidate(); setImporting(false); setTransferring(false); }
  function setSelected(next: DevkitProject, unsaved: boolean) {
    invalidateOperations(); setHasUnappliedBrief(false);
    if (selectedRef.current?.id !== next.id) { setConfirmed(false); setSourceArtifactId(""); setIncludeRetainedContext(false); }
    drafts.current.set(next.id, next); setProject(next); setSaveFailed(false);
    const changed = new Set(dirtyRef.current); if (unsaved) changed.add(next.id); else changed.delete(next.id);
    dirtyRef.current = changed; setDirty(changed);
  }
  function acceptSaved(next: DevkitProject) {
    revisions.current.set(next.id, next.revision);
    const nextSaved = [...savedRef.current.filter((item) => item.id !== next.id), next]; savedRef.current = nextSaved; setSaved(nextSaved);
    setExternalConflicts((previous) => { const changes = new Set(previous); changes.delete(next.id); return changes; });
    setSelected(next, false);
  }
  function changeProject(next: DevkitProject) {
    const current = selectedRef.current;
    if (!isIdentityCurrent() || !current || next.id !== current.id || next.revision !== current.revision || next.createdAt !== current.createdAt) { setError(t("Project context changed. No edit was applied.", "Контекст проекта изменился. Правка не применена.")); return; }
    const valid = parseDevkitProject(next);
    if (!valid) { setError(failureMessage("invalid_project")); return; }
    if (JSON.stringify(valid) === JSON.stringify(current)) return;
    setSelected(valid, true); setError(null); setNotice(null);
  }
  function saveProject(snapshot: DevkitProject): WorkflowActionResult {
    if (!isIdentityCurrent() || !store || snapshot.id !== selectedRef.current?.id) return { ok: false, message: failureMessage("storage_unavailable") };
    const expected = revisions.current.get(snapshot.id) ?? null;
    const result = store.save(snapshot, expected);
    if (!result.ok) { setSaveFailed(true); return { ok: false, message: failureMessage(result.code) }; }
    acceptSaved(result.value);
    return { ok: true, message: t("Snapshot saved on this device. No cloud synchronization occurred.", "Снимок сохранён на этом устройстве. Облачной синхронизации не было.") };
  }
  function reopenProject(projectId: string): WorkflowActionResult {
    if (!isIdentityCurrent() || !store) return { ok: false, message: failureMessage("storage_unavailable") };
    const result = store.get(projectId);
    if (!result.ok) return { ok: false, message: failureMessage(result.code) };
    if (!result.value) return { ok: false, message: t("No saved snapshot exists for this project yet.", "Сохранённого снимка этого проекта пока нет.") };
    acceptSaved(result.value); setError(null); return { ok: true };
  }
  function openProject(projectId: string) {
    if (!isIdentityCurrent() || hasUnappliedBrief) return;
    setError(null); setNotice(null);
    const draft = drafts.current.get(projectId);
    if (draft) { setSelected(draft, dirty.has(projectId)); if (externalConflicts.has(projectId)) setError(t("The saved copy changed elsewhere. Local edits are preserved; reopen the saved snapshot to resolve the conflict.", "Сохранённая копия изменилась в другом окне. Локальные правки сохранены; откройте сохранённый снимок для разрешения конфликта.")); return; }
    const result = reopenProject(projectId);
    if (!result.ok) setError(result.message ?? failureMessage("invalid_project"));
  }
  function createExample(critical: boolean) {
    if (!isIdentityCurrent() || hasUnappliedBrief) return;
    try {
      const id = `devkit-example-${crypto.randomUUID()}`;
      const example = critical ? { ...createDevkitCriticalGapProject(), id } : createDevkitDemoProject(id);
      setSelected(example, true); setError(null);
      setNotice(t("Explicit synthetic example opened. It contains no acquired site facts.", "Открыт явный синтетический пример. В нём нет полученных фактов о площадке."));
    } catch { setError(t("The example could not be opened.", "Не удалось открыть пример.")); }
  }
  async function transferAoi() {
    if (!isIdentityCurrent() || !legacyProject || !sourceArtifactId || !confirmed || transferring || hasUnappliedBrief) return;
    const expectedProjectId = legacyProject.projectId, expectedArtifactId = sourceArtifactId;
    const expectedHash = legacyProject.artifacts.find((item) => item.artifactId === expectedArtifactId)?.payloadHash;
    const contextRequested = includeRetainedContext === true;
    invalidateOperations();
    const token = operation.current.begin(); setTransferring(true); setError(null); setNotice(null);
    try {
      const read = await readVerifiedPointObjectProjects(identityKey);
      if (!alive.current || !isIdentityCurrent() || !operation.current.isCurrent(token)) return;
      const active = read.store?.identityKey === identityKey && read.store.activeProjectId === expectedProjectId ? read.store.projects.find((item) => item.projectId === expectedProjectId) : null;
      if (!active) { setConfirmed(false); setSourceArtifactId(""); setIncludeRetainedContext(false); setError(t("The active source changed or failed verification. Select it again in Project Hub.", "Активный источник изменился или не прошёл проверку. Выберите его заново в Центре проектов.")); void refreshLegacy(); return; }
      if (!expectedHash || active.artifacts.find((item) => item.artifactId === expectedArtifactId)?.payloadHash !== expectedHash) {
        setConfirmed(false); setSourceArtifactId(""); setIncludeRetainedContext(false);
        setError(t("The selected source snapshot changed. Select and confirm the area again.", "Выбранный исходный снимок изменился. Выберите и подтвердите зону заново."));
        void refreshLegacy(); return;
      }
      const result = bridgeSavedCreateAoi({ sourceProject: structuredClone(active), sourceArtifactId: expectedArtifactId, ...workflowTransferConsent(confirmed, contextRequested), projectId: `devkit-${crypto.randomUUID()}`, now: new Date().toISOString(), locale });
      if (!alive.current || !isIdentityCurrent() || !operation.current.isCurrent(token)) return;
      if (!result.ok) { setError(t("The saved area could not be copied. The original result was preserved.", "Не удалось скопировать зону. Исходный результат сохранён.")); return; }
      const valid = parseDevkitProject(result.project);
      if (!valid) { setError(failureMessage("invalid_project")); return; }
      const contextStatus = valid.evidence.find((item) => item.id === "input-drawn-aoi")?.provenance?.contextStatus;
      setSelected(valid, true); setConfirmed(false); setIncludeRetainedContext(false);
      setNotice(contextRequested
        ? contextStatus === "retained_context"
          ? t("Saved area and opted-in context copied without a source refresh. The source project is unchanged.", "Скопированы сохранённая зона и явно выбранный контекст без обновления источников. Исходный проект не изменён.")
          : t("The area was copied. Requested saved context is unavailable or mismatched; inspect the critical gap.", "Зона скопирована. Запрошенный сохранённый контекст недоступен или не соответствует зоне; проверьте критический пробел.")
        : t("Only the saved area was copied to a new local draft. The source project is unchanged.", "В новый локальный черновик скопирована только сохранённая зона. Исходный проект не изменён."));
    } catch { if (alive.current && isIdentityCurrent() && operation.current.isCurrent(token)) setError(t("The saved area could not be verified. No replacement was created.", "Не удалось проверить сохранённую зону. Подмена не создавалась.")); }
    finally { if (alive.current && isIdentityCurrent() && operation.current.isCurrent(token)) setTransferring(false); }
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!isIdentityCurrent() || !file || !store || hasUnappliedBrief) return;
    if (file.size > DEVKIT_MAX_PROJECT_BYTES + 2048) { setError(failureMessage("invalid_import")); return; }
    invalidateOperations();
    const token = operation.current.begin(); setImporting(true); setError(null); setNotice(null);
    try {
      const json = await file.text();
      // Check before importProject: that function writes synchronously.
      if (!alive.current || !isIdentityCurrent() || !operation.current.isCurrent(token)) return;
      const result = store.importProject(json);
      if (!result.ok) { setError(failureMessage(result.code)); return; }
      acceptSaved(result.value); setNotice(t("Validated project imported on this device. Existing IDs are never overwritten by import.", "Проверенный проект импортирован на устройство. Импорт не перезаписывает существующие ID."));
    } catch { if (alive.current && isIdentityCurrent() && operation.current.isCurrent(token)) setError(failureMessage("invalid_import")); }
    finally { if (alive.current && isIdentityCurrent() && operation.current.isCurrent(token)) setImporting(false); }
  }
  function exportSavedJson() {
    if (!isIdentityCurrent() || !store || !project || dirty.has(project.id) || hasUnappliedBrief) return;
    const result = store.exportProject(project.id);
    if (!result.ok) { setError(failureMessage(result.code)); return; }
    let url: string | null = null;
    try {
      if (JSON.stringify(JSON.parse(result.value).project) !== JSON.stringify(project)) { setError(failureMessage("conflict")); return; }
      url = URL.createObjectURL(new Blob([result.value], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `${project.id.replace(/[^A-Za-z0-9_.-]/g, "_")}.geoai-project.json`;
      document.body.appendChild(link); link.click(); link.remove();
      const completedUrl = url; setTimeout(() => URL.revokeObjectURL(completedUrl), 1000);
      setNotice(t("Saved project JSON exported. This transfers a snapshot, not a reviewed development kit.", "Экспортирован JSON сохранённого проекта. Это перенос снимка, а не проверенный комплект.")); setError(null);
    } catch { if (url) URL.revokeObjectURL(url); setError(t("The file could not be downloaded. The saved snapshot is preserved.", "Не удалось скачать файл. Сохранённый снимок не изменён.")); }
  }

  function verifiedReadback(current: DevkitProject | null): DevkitProject | null {
    if (!isIdentityCurrent() || !store || !current || !alive.current) return null;
    const result = store.get(current.id);
    return result.ok ? matchWorkflowSavedSnapshot(current, result.value, dirty.has(current.id), unappliedRef.current) : null;
  }
  async function exportKit(snapshot: DevkitProject): Promise<WorkflowActionResult> {
    const requested = selectedRef.current;
    const readback = verifiedReadback(requested);
    if (!onExportKit || !requested || !readback || JSON.stringify(snapshot) !== JSON.stringify(readback)) return { ok: false, message: t("Save and reopen the current snapshot before export.", "Перед экспортом сохраните и откройте текущий снимок.") };
    invalidateOperations();
    const token = operation.current.begin();
    const isCurrent = () => alive.current && isIdentityCurrent() && operation.current.isCurrent(token) && selectedRef.current === requested && !unappliedRef.current && Boolean(verifiedReadback(requested));
    if (!isCurrent()) return { ok: false, message: t("The snapshot changed before export.", "Снимок изменился перед экспортом.") };
    const result = await onExportKit(readback, { isCurrent });
    return isCurrent() ? result : { ok: false, message: t("The export result was discarded because the snapshot changed.", "Результат экспорта отброшен: снимок изменился.") };
  }
  const savedSnapshot = verifiedReadback(project);
  const projects = new Map(saved.map((item) => [item.id, item]));
  for (const [id, draft] of drafts.current) projects.set(id, draft);
  const createArtifacts = legacyProject?.artifacts.filter((item) => item.kind === "create") ?? [];
  const selectedSaved = project && revisions.current.has(project.id);
  const WorkspaceHeading = project ? "h2" : "h1";
  return <div className="devkit-workspace-client" data-testid="devkit-workspace-client"><section className="devkit-workflow" aria-label={t("Open a project", "Открыть проект")}><div className="dk-panel dk-stack">
    <div className="dk-panel-head" style={{ marginBottom: 0 }}><div><p className="dk-eyebrow">{t("Project workspace", "Пространство проекта")}</p><WorkspaceHeading>{t("Continue your development project", "Продолжить проект развития")}</WorkspaceHeading><p>{t("Public or synthetic inputs only. Projects stay on this device in the current local account namespace.", "Только публичные или синтетические данные. Проекты остаются на устройстве в локальном пространстве текущего аккаунта.")}</p></div><span className="dk-pill">{t("Local only", "Только локально")}</span></div>
    {loading ? <p role="status">{t("Opening local storage…", "Открываем локальное хранилище…")}</p> : <div className="dk-fields"><label className="dk-field">{t("Saved projects & session drafts", "Сохранённые проекты и черновики сеанса")}<select data-testid="devkit-project-select" value={project?.id ?? ""} onChange={(event) => openProject(event.target.value)} disabled={!projects.size || hasUnappliedBrief}><option value="" disabled>{t("Choose a project", "Выберите проект")}</option>{[...projects.values()].map((item) => <option key={item.id} value={item.id}>{item.brief.title}{dirty.has(item.id) ? t(" · unsaved", " · не сохранён") : ""}</option>)}</select></label><div className="dk-field"><span>{t("Project transfer", "Перенос проекта")}</span><div className="dk-actions"><label className="dk-button dk-file-control" style={{ display: "inline-flex", alignItems: "center", position: "relative", cursor: importing || !store || hasUnappliedBrief ? "not-allowed" : "pointer" }}>{importing ? t("Importing…", "Импорт…") : t("Import project JSON", "Импорт JSON проекта")}<input data-testid="devkit-project-import" type="file" accept=".json,application/json" aria-label={t("Import public or synthetic project JSON", "Импорт JSON публичного или синтетического проекта")} disabled={importing || !store || hasUnappliedBrief} onChange={(event) => void importFile(event)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "inherit" }} /></label><button type="button" className="dk-button" disabled={!selectedSaved || !project || dirty.has(project.id) || hasUnappliedBrief} data-testid="devkit-project-export-json" onClick={exportSavedJson}>{t("Export saved JSON", "Экспорт сохранённого JSON")}</button></div></div></div>}
    {error && <p className="dk-callout" data-tone="danger" role="alert">{error}</p>}{notice && <p className="dk-status-message" role="status">{notice}</p>}
    <details open={!project}><summary>{t("Start from the active Project Hub area", "Начать с зоны активного проекта")}</summary><div className="dk-stack" style={{ marginTop: 14 }}>{legacyState === "loading" ? <p role="status">{t("Verifying the active saved project…", "Проверяем активный сохранённый проект…")}</p> : legacyState === "unavailable" ? <p className="dk-callout">{t("The saved source could not be verified. No synthetic replacement was loaded.", "Не удалось проверить источник. Синтетическая подмена не загружалась.")}</p> : !legacyProject ? <p className="dk-small">{t("No active saved Project Hub project. Select one in the existing hub or use an explicit example below.", "В Центре проектов нет сохранённого активного проекта. Выберите его там или явно откройте пример ниже.")}</p> : <><p><strong>{legacyProject.name}</strong></p>{!createArtifacts.length ? <p className="dk-small">{t("This active project has no saved Create area. A point or Find result is not converted into a parcel or polygon.", "У активного проекта нет сохранённой зоны Create. Точка или результат Find не преобразуются в участок или полигон.")}</p> : <><label className="dk-field">{t("Saved Create area", "Сохранённая зона Create")}<select data-testid="devkit-source-artifact" value={sourceArtifactId} disabled={hasUnappliedBrief} onChange={(event) => { setSourceArtifactId(event.target.value); setConfirmed(false); setIncludeRetainedContext(false); invalidateOperations(); }}><option value="">{t("Choose the area to copy", "Выберите зону для копирования")}</option>{createArtifacts.map((item) => <option key={item.artifactId} value={item.artifactId}>{item.label}</option>)}</select></label><label className="dk-inline" style={{ alignItems: "flex-start", fontSize: 12 }}><input data-testid="devkit-source-public-confirmation" type="checkbox" checked={confirmed} disabled={hasUnappliedBrief} onChange={(event) => { setConfirmed(event.target.checked); setIncludeRetainedContext(false); invalidateOperations(); }} style={{ width: 20, minHeight: 24, margin: 0, flex: "0 0 20px" }} /><span>{t("I confirm this drawn area is public and non-confidential. This confirmation covers only the AOI; it does not establish a legal parcel or development right.", "Подтверждаю, что зона публична и неконфиденциальна. Это подтверждение относится только к AOI; она не подтверждает юридический участок или право строительства.")}</span></label><label className="dk-inline" style={{ alignItems: "flex-start", fontSize: 12 }}><input data-testid="devkit-source-context-confirmation" type="checkbox" checked={includeRetainedContext} disabled={!confirmed || hasUnappliedBrief} onChange={(event) => { setIncludeRetainedContext(event.target.checked); invalidateOperations(); }} style={{ width: 20, minHeight: 24, margin: 0, flex: "0 0 20px" }} /><span>{t("Also copy saved geocontext (without refreshing sources)", "Также скопировать сохранённый геоконтекст (без обновления источников)")}</span></label><p className="dk-small">{t("Select only for public, non-confidential context. Source rights and dates remain as saved.", "Выбирайте только для публичного неконфиденциального контекста. Права источников и даты остаются сохранёнными.")}</p><button type="button" className="dk-button dk-button-primary" disabled={!sourceArtifactId || !confirmed || transferring || loading || hasUnappliedBrief} data-testid="devkit-transfer-aoi" onClick={() => void transferAoi()}>{transferring ? t("Verifying area…", "Проверяем зону…") : t("Copy area to a new local draft", "Скопировать зону в новый локальный черновик")}</button></>}</>}<div className="dk-actions"><button type="button" className="dk-button" onClick={() => void refreshLegacy()}>{t("Refresh active project", "Обновить активный проект")}</button>{onChooseAoi && <button type="button" className="dk-button" onClick={onChooseAoi} disabled={hasUnappliedBrief}>{t("Open existing map", "Открыть существующую карту")}</button>}</div></div></details>
    <details open={!project}><summary>{t("Explicit synthetic examples", "Явные синтетические примеры")}</summary><p className="dk-small" style={{ marginTop: 12 }}>{t("Examples are separate drafts. They do not replace an unavailable source or prove a real site case.", "Примеры — отдельные черновики. Они не заменяют недоступный источник и не подтверждают реальный кейс.")}</p><div className="dk-actions" style={{ marginTop: 12 }}><button type="button" className="dk-button" disabled={loading || hasUnappliedBrief} data-testid="devkit-example-positive" onClick={() => createExample(false)}>{t("Open synthetic programme example", "Открыть синтетический пример программ")}</button><button type="button" className="dk-button" disabled={loading || hasUnappliedBrief} data-testid="devkit-example-critical" onClick={() => createExample(true)}>{t("Open source failure example", "Открыть пример отказа источника")}</button></div></details>
  </div></section>{project && <DevkitWorkflow project={project} locale={locale} onProjectChange={changeProject} saveState={externalConflicts.has(project.id) ? "conflict" : saveFailed ? "error" : dirty.has(project.id) ? "unsaved" : "saved"} onSave={saveProject} onReopen={reopenProject} onExport={onExportKit ? exportKit : undefined} slots={slots} savedSnapshot={savedSnapshot} onChooseAoi={onChooseAoi} onUnappliedBriefChange={setHasUnappliedBrief} />}</div>;
}
