"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/auth-provider";
import { DevkitFindScreening } from "./find-screening";
import type { DevkitProject, Evidence, JsonObject } from "../../src/lib/devkit/contracts";
import { reviseDevkitInputs } from "../../src/lib/devkit/project-store";
import {
  DEVKIT_FIND_SCENARIO, createDevkitFindState, mapDevkitFindSelectionToProjectBrief, parseDevkitFindState,
  type DevkitFindSelection, type DevkitFindState
} from "../../src/lib/devkit/find-ranking";
import {
  POINT_OBJECT_PROJECTS_EVENT, inspectPointObjectProjects, pointObjectProjectIdentity, readVerifiedPointObjectProjects,
  type PointObjectProjectStoreReadResult
} from "../../src/lib/prototype/point-object-projects";
import { parseSavedPointObjectArtifact } from "../../src/lib/prototype/point-object-projects-contract";
import { parsePointObjectFindSessionState } from "../../src/lib/prototype/point-to-object-find-session";

export type DevkitFindProjectPanelProps = { project: DevkitProject; onChange: (project: DevkitProject) => void; locale: "en" | "ru" };
type Scope = { owner: string | null; projectId: string; inputRevision: number; market: string; resolved: boolean };
type Origin = { ownerScope: string; legacyProjectId: string; artifactId: string; payloadHash: string; viewRevision: number; updatedAt: string };
export type DevkitSavedFindInput = { origin: Origin; legacyProjectName: string; state: DevkitFindState };
const PANEL_ID = "devkit-find-panel-state";
const json = (value: unknown) => JSON.stringify(value);
const clone = <T,>(value: T): T => JSON.parse(json(value)) as T;
const upsert = <T extends { id: string },>(existing: T[], additions: T[]) => [...existing.filter(row => !additions.some(item => item.id === row.id)), ...additions];
export const devkitFindPanelScopeMatches = (first: Scope, second: Scope) => first.owner === second.owner && first.projectId === second.projectId && first.inputRevision === second.inputRevision && first.market === second.market && first.resolved === second.resolved;

/** Input must come from the existing verified local reader. Never scans another owner or inactive project. */
export function activeSavedDevkitFind(read: PointObjectProjectStoreReadResult, owner: string, market: string): DevkitSavedFindInput | null {
  if (!read.store || read.store.identityKey !== owner || !read.store.activeProjectId) return null;
  const project = read.store.projects.find(row => row.projectId === read.store!.activeProjectId);
  if (!project) return null;
  const artifacts = project.artifacts.map(parseSavedPointObjectArtifact).filter(row => row?.kind === "find")
    .sort((a, b) => Date.parse(b!.updatedAt) - Date.parse(a!.updatedAt) || (a!.artifactId < b!.artifactId ? -1 : 1));
  const artifact = artifacts[0];
  if (!artifact || artifact.kind !== "find" || artifact.marketKey !== market) return null;
  const session = parsePointObjectFindSessionState(artifact.payload.session);
  if (!session?.result) return null;
  const [west, south, east, north] = session.result.criteria.bounds;
  try {
    const state = createDevkitFindState(session.result, { scenarioId: DEVKIT_FIND_SCENARIO,
      maximumMappedLevels: session.result.criteria.mappedMaximumLevels ?? 6, maximumReferenceDistanceKm: 1.5,
      referencePoint: { longitude: (west + east) / 2, latitude: (south + north) / 2, label: "Saved search bounds centre; screening assumption" } }, "existing_find_result");
    state.shortlist = clone(session.shortlist); state.selectedSourceFeatureId = session.analysisTargetSourceFeatureId;
    return { origin: { ownerScope: owner, legacyProjectId: project.projectId, artifactId: artifact.artifactId,
      payloadHash: artifact.payloadHash, viewRevision: artifact.viewRevision, updatedAt: artifact.updatedAt }, legacyProjectName: project.name, state };
  } catch { return null; }
}

export function restoredDevkitFindPanelState(project: DevkitProject, input: DevkitSavedFindInput): DevkitFindState | null {
  const provenance = project.evidence.find(row => row.id === PANEL_ID)?.provenance;
  if (provenance?.protocol !== "DEVKIT_FIND_PANEL_V1" || provenance.publicDataConfirmed !== true || json(provenance.origin) !== json(input.origin)) return null;
  const state = parseDevkitFindState(provenance.state);
  return state?.inputKind === "existing_find_result" && json(state.result) === json(input.state.result) ? state : null;
}

/** Explicit transfer/update only. Same-project AOI and all old evidence remain intact. */
export function reviseDevkitFindPanel(project: DevkitProject, input: DevkitSavedFindInput, state: DevkitFindState, selection?: DevkitFindSelection): DevkitProject {
  const parsed = parseDevkitFindState(state);
  if (!parsed || parsed.inputKind !== "existing_find_result" || project.brief.marketKey !== parsed.result.criteria.marketKey || json(parsed.result) !== json(input.state.result)) throw new Error("The saved Find input changed; copy the current verified result again.");
  if (selection && (json(selection.scenario) !== json(parsed.criteria) || selection.candidate.sourceFeatureId !== parsed.selectedSourceFeatureId || json(selection.source) !== json(parsed.result.source) || !parsed.result.candidates.some(row => json(row) === json(selection.candidate)))) throw new Error("Selection is outside the copied Find result.");
  const mapped = selection ? mapDevkitFindSelectionToProjectBrief(selection, { projectId: project.id, brief: project.brief }) : null;
  const panel: Evidence = { id: PANEL_ID, subjectId: project.id, label: "Explicitly copied public Find screening state",
    sourceId: "devkit-find-local-state-v1", sourceUrl: null, excerpt: "User confirmed public/non-confidential data for this transfer. No source refresh. Source usage rights remain as stated separately.",
    acquiredAt: parsed.result.source.acquiredAt, validAt: null, responseHash: parsed.result.source.sourceResponseHash,
    trust: "public_source", status: "partial", rights: { licence: parsed.result.source.licenceId, attribution: parsed.result.source.attribution, permittedUse: "unknown", redistribution: "unknown" },
    provenance: { protocol: "DEVKIT_FIND_PANEL_V1", publicDataConfirmed: true, origin: clone(input.origin) as unknown as JsonObject, state: clone(parsed) as unknown as JsonObject } };
  return reviseDevkitInputs(project, { brief: mapped?.brief ?? project.brief,
    objects: upsert(project.objects, mapped?.objects ?? []), evidence: upsert(project.evidence, [...(mapped?.evidence ?? []), panel]),
    claims: upsert(project.claims, mapped?.claims ?? []), constraints: upsert(project.constraints, mapped?.constraints ?? []) });
}

export function DevkitFindProjectPanel({ project, onChange, locale }: DevkitFindProjectPanelProps) {
  const ru = locale === "ru";
  const { user, isSessionResolved } = useAuth();
  const owner = pointObjectProjectIdentity(user);
  const scope: Scope = { owner, projectId: project.id, inputRevision: project.inputRevision, market: project.brief.marketKey, resolved: isSessionResolved };
  const current = useRef({ scope, project }); current.current = { scope, project };
  const epoch = useRef(0);
  const localRevision = useRef<Scope | null>(null);
  const [read, setRead] = useState<{ scope: Scope; input: DevkitSavedFindInput | null } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const ownUpdate = !!localRevision.current && devkitFindPanelScopeMatches(localRevision.current, scope);
  const visible = read && (devkitFindPanelScopeMatches(read.scope, scope) || ownUpdate && read.scope.owner === owner && read.scope.projectId === project.id && read.scope.market === scope.market) ? read.input : null;
  const state = visible ? restoredDevkitFindPanelState(project, visible) : null;

  useEffect(() => {
    let disposed = false;
    const stamp = current.current.scope;
    setConfirmed(false); setMessage("");
    async function refresh(retainOwn = false) {
      const sequence = ++epoch.current;
      if (!retainOwn) setRead(null);
      if (!stamp.resolved || !stamp.owner) return;
      try {
        const result = await readVerifiedPointObjectProjects(stamp.owner as NonNullable<ReturnType<typeof pointObjectProjectIdentity>>);
        if (disposed || sequence !== epoch.current || !devkitFindPanelScopeMatches(stamp, current.current.scope)) return;
        const input = activeSavedDevkitFind(result, stamp.owner, stamp.market);
        // Recheck active ID/artifact after async digest verification; no second network/source read.
        const latest = activeSavedDevkitFind(inspectPointObjectProjects(stamp.owner as NonNullable<ReturnType<typeof pointObjectProjectIdentity>>), stamp.owner, stamp.market);
        if (json(input) !== json(latest)) { setRead(null); setMessage(ru ? "Активный Find изменился. Откройте панель повторно." : "Active Find changed. Reopen this panel."); return; }
        setRead({ scope: stamp, input });
        if (!result.store) setMessage(ru ? "Сохранённый источник недоступен или повреждён; исходные данные сохранены." : "Saved source is unavailable or damaged; original bytes are preserved.");
      } catch { if (!disposed && sequence === epoch.current) { setRead(null); setMessage(ru ? "Не удалось проверить сохранённый Find." : "Saved Find could not be verified."); } }
    }
    void refresh(ownUpdate);
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ identityKey?: string }>).detail;
      if (event.type === POINT_OBJECT_PROJECTS_EVENT && detail?.identityKey !== stamp.owner) return;
      setConfirmed(false); void refresh();
    };
    window.addEventListener(POINT_OBJECT_PROJECTS_EVENT, changed); window.addEventListener("storage", changed);
    return () => { disposed = true; epoch.current++; window.removeEventListener(POINT_OBJECT_PROJECTS_EVENT, changed); window.removeEventListener("storage", changed); };
  }, [owner, isSessionResolved, project.id, project.inputRevision, project.brief.marketKey, ru]);

  function publish(next: DevkitProject) {
    const nextScope = { ...current.current.scope, inputRevision: next.inputRevision };
    localRevision.current = nextScope; current.current = { scope: nextScope, project: next }; onChange(next);
  }
  function apply(nextState: DevkitFindState, selection?: DevkitFindSelection) {
    if (!visible || !isSessionResolved || !owner || !devkitFindPanelScopeMatches(scope, current.current.scope)) return;
    const latest = activeSavedDevkitFind(inspectPointObjectProjects(owner), owner, project.brief.marketKey);
    if (json(latest) !== json(visible)) { setRead(null); setConfirmed(false); setMessage(ru ? "Find изменился; перенос отменён." : "Find changed; transfer cancelled."); return; }
    try { publish(reviseDevkitFindPanel(current.current.project, visible, nextState, selection)); setMessage(ru ? "Find добавлен в текущий проект на этом устройстве." : "Find added to this project on this device."); }
    catch { setMessage(ru ? "Изменения не прошли проверку; последний проект сохранён." : "Changes failed validation; the last project is preserved."); }
  }
  return <section className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4" aria-label={ru ? "Сохранённый Find в проекте" : "Saved Find in this project"}>
    <h3 className="text-base font-semibold text-slate-900">{ru ? "Сохранённый Find → текущий проект" : "Saved Find → current project"}</h3>
    <p className="text-sm text-slate-700">{ru ? "Перенос уже сохранённой выборки активного проекта на этом устройстве. Без повторного запроса источника. AOI текущего проекта сохраняется." : "Copy an already saved sample from the active project on this device. No source refresh. The current project AOI is retained."}</p>
    {visible ? <><p className="break-words text-xs text-slate-700">{visible.legacyProjectName} · {visible.state.result.candidates.length} {ru ? "кандидатов" : "candidates"} · {visible.origin.updatedAt}</p>
      <label className="flex min-h-11 items-start gap-2 text-sm text-slate-800"><input className="mt-1 h-4 w-4" type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{ru ? "Подтверждаю: данные публичные и не содержат конфиденциальных сведений." : "I confirm these data are public and contain no confidential information."}</label>
      <button className="min-h-11 rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-900 disabled:opacity-50" type="button" disabled={!confirmed} onClick={() => { if (confirmed) apply(visible.state); }}>{ru ? "Перенести сохранённый Find" : "Copy saved Find"}</button>
    </> : <p role="status" className="text-sm text-slate-700">{!isSessionResolved ? (ru ? "Проверяем локальную сессию…" : "Checking local session…") : (ru ? "Проверенного Find активного проекта в этом рынке нет. Синтетическая замена не создаётся." : "No verified active-project Find in this market. No synthetic substitute is generated.")}</p>}
    <a className="inline-block min-h-11 py-2 text-sm text-teal-800 underline" href="/prototype/point-to-object?mode=find">{ru ? "Открыть обычный Find на карте" : "Open Find on the map"}</a>
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    {visible && state && <DevkitFindScreening state={state} locale={locale} onChange={next => {
      // The child calls onChoose immediately after its selection-state callback;
      // keep that action one input revision, including both state and mapped evidence.
      if (next.selectedSourceFeatureId !== state.selectedSourceFeatureId || json(next) === json(state)) return;
      apply(next);
    }} onChoose={selection => apply({ ...state, selectedSourceFeatureId: selection.candidate.sourceFeatureId }, selection)} />}
    <p className="text-xs leading-5 text-slate-700">{project.caveat}</p>
  </section>;
}
