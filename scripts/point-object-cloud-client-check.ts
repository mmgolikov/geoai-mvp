import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(root, specifier.slice(2));
      try { return nextResolve(pathToFileURL(`${target}.ts`).href, context); }
      catch { return nextResolve(pathToFileURL(target).href, context); }
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* use normal resolution */ }
    }
    return nextResolve(specifier, context);
  }
});

// @ts-expect-error Node transform-types requires the physical TypeScript suffix.
const cloud = await import("../src/lib/prototype/point-object-cloud-client.ts");
// @ts-expect-error Node transform-types requires the physical TypeScript suffix.
const cloudContract = await import("../src/lib/prototype/point-object-cloud-contract.ts");
// @ts-expect-error Node transform-types requires the physical TypeScript suffix.
const localIntegrity = await import("../src/lib/prototype/point-object-cloud-local-integrity.ts");
// @ts-expect-error Node transform-types requires the physical TypeScript suffix.
const projects = await import("../src/lib/prototype/point-object-projects.ts");
// @ts-expect-error Node transform-types requires the physical TypeScript suffix.
const create = await import("../src/lib/prototype/point-to-object-create.ts");
// @ts-expect-error Node transform-types requires the physical TypeScript suffix.
const createAi = await import("../src/lib/prototype/point-to-object-create-ai-core.ts");
type PointObjectProjectOperationInput = import("../src/lib/prototype/point-object-projects-contract.ts").PointObjectProjectOperationInput;
type SavedPointObjectArtifact = import("../src/lib/prototype/point-object-projects-contract.ts").SavedPointObjectArtifact;

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const operation: PointObjectProjectOperationInput = {
  kind: "find",
  locale: "en",
  marketKey: "dubai",
  label: "Cloud client fixture",
  payload: {
    session: {
      version: 1,
      marketKey: "dubai",
      locale: "en",
      audience: "b2b",
      role: "developer",
      scenario: "b2b_redevelopment_selected_aoi",
      group: "construction",
      mappedMinimumLevels: "",
      mappedMaximumLevels: "",
      shortlist: [],
      comparisonOpen: false,
      analysisTargetSourceFeatureId: null,
      updatedAt: "2026-09-18T10:00:00.000Z",
      result: {
        protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",
        mode: "results",
        criteria: { marketKey: "dubai", locale: "en", bounds: [55.26, 25.19, 55.28, 25.21], group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 },
        candidates: [{
          sourceFeatureId: "way/7001", sourceElementType: "way", sourceElementId: "7001", label: "Cloud site", name: "Cloud site",
          longitude: 55.27, latitude: 25.2, group: "construction", matchedTag: { key: "landuse", value: "construction" },
          mappedBuildingLevels: null, observedTags: { landuse: "construction", name: "Cloud site" }, evidenceClass: "observed_in_open_map_source"
        }],
        ordering: "source_identity_ascending_not_ranked",
        coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 4.47, upstreamElementCount: 1, normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
        source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "7".repeat(64), observedAt: null, acquiredAt: "2026-09-18T10:00:00.000Z", freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
        limitations: ["Cloud client fixture."],
        caveat
      }
    }
  }
};

const payloadHash = await projects.hashPointObjectOperation(operation);
const artifact = (index: number, completedAt: string): SavedPointObjectArtifact => ({
  schemaVersion: 1,
  artifactId: `artifact-cloud-${index}`,
  idempotencyKey: `operation-cloud-${index}`,
  payloadHash,
  completedAt,
  updatedAt: completedAt,
  viewRevision: 0,
  ...operation
});
const localProject = { projectId: "project-cloud-1", name: "Selected cloud project", createdAt: "2026-09-18T09:00:00.000Z" };
const item = (value: SavedPointObjectArtifact, cloudRevision: number) => ({ cloudRevision, localProject, artifact: value });
const okPage = (items: unknown[], nextCursor: string | null) => new Response(JSON.stringify({
  ok: true, persisted: true, storageMode: "authenticated_supabase_preview", items, nextCursor
}), { status: 200, headers: { "Content-Type": "application/json" } });
const okPut = (outcome: "created" | "replayed" | "updated", cloudRevision: number) => new Response(JSON.stringify({
  ok: true, persisted: true, storageMode: "authenticated_supabase_preview", outcome, cloudRevision,
  payloadHash, immutableHash: "b".repeat(64)
}), { status: outcome === "created" ? 201 : 200, headers: { "Content-Type": "application/json" } });

const pageOne = [
  item(artifact(5, "2026-09-18T10:05:00.000Z"), 1),
  item(artifact(4, "2026-09-18T10:04:00.000Z"), 1),
  item(artifact(3, "2026-09-18T10:03:00.000Z"), 1),
  item(artifact(2, "2026-09-18T10:02:00.000Z"), 1)
];
const pageTwo = [item(artifact(1, "2026-09-18T10:01:00.000Z"), 1)];
const listCalls: string[] = [];
const listed = await cloud.listPointObjectCloudArtifacts({
  signal: new AbortController().signal,
  fetcher: async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.method, "GET");
    assert.equal(init?.credentials, "same-origin");
    assert.equal(init?.cache, "no-store");
    listCalls.push(String(url));
    return listCalls.length === 1 ? okPage(pageOne, "cursor_page_2") : okPage(pageTwo, null);
  }
});
assert.equal(listed.status, "ready");
if (listed.status !== "ready") throw new Error("Expected ready cloud list.");
assert.deepEqual(listed.items.map((candidate: { artifact: SavedPointObjectArtifact }) => candidate.artifact.artifactId), [
  "artifact-cloud-5", "artifact-cloud-4", "artifact-cloud-3", "artifact-cloud-2", "artifact-cloud-1"
]);
assert.match(listCalls[1], /cursor=cursor_page_2/);

const malformed = await cloud.listPointObjectCloudArtifacts({
  signal: new AbortController().signal,
  fetcher: async () => okPage([{ ...pageTwo[0], localProject: { ...localProject, extra: true } }], null)
});
assert.equal(malformed.status, "failed", "Unexpected cloud fields must fail closed.");

const splitReceipt = await cloud.listPointObjectCloudArtifacts({
  signal: new AbortController().signal,
  fetcher: async () => okPage([
    item(artifact(1, "2026-09-18T10:01:00.000Z"), 1),
    item({ ...artifact(2, "2026-09-18T10:02:00.000Z"), artifactId: "artifact-cloud-1" }, 1)
  ], null)
});
assert.equal(splitReceipt.status, "failed", "Split artifact/idempotency keys must fail before local import.");

const mixedProjectOrigin = await cloud.listPointObjectCloudArtifacts({
  signal: new AbortController().signal,
  fetcher: async () => okPage([
    item(artifact(1, "2026-09-18T10:01:00.000Z"), 1),
    { ...item(artifact(2, "2026-09-18T10:02:00.000Z"), 1), localProject: { ...localProject, createdAt: "2026-09-18T09:00:01.000Z" } }
  ], null)
});
assert.equal(mixedProjectOrigin.status, "failed", "One cloud project ID must have one exact origin receipt.");

const renameConflict = await cloud.putPointObjectCloudArtifact({
  localProject,
  artifact: artifact(1, "2026-09-18T10:01:00.000Z"),
  expectedCloudRevision: 2,
  signal: new AbortController().signal,
  fetcher: async () => new Response(JSON.stringify({
    ok: false,
    persisted: false,
    conflict: true,
    reason: "local_project_identity",
    message: "The cloud artifact changed or belongs to a different immutable result.",
    current: { cloudRevision: 2, payloadHash: "a".repeat(64), immutableHash: "b".repeat(64) }
  }), { status: 409, headers: { "Content-Type": "application/json" } })
});
assert.deepEqual(renameConflict, { status: "conflict", reason: "local_project_identity", cloudRevision: 2 },
  "A renamed local project must expose the immutable project-origin conflict to UI without changing local bytes.");

const mismatchedPutHash = await cloud.putPointObjectCloudArtifact({
  localProject,
  artifact: artifact(1, "2026-09-18T10:01:00.000Z"),
  expectedCloudRevision: null,
  signal: new AbortController().signal,
  fetcher: async () => new Response(JSON.stringify({
    ok: true, persisted: true, storageMode: "authenticated_supabase_preview", outcome: "created", cloudRevision: 1,
    payloadHash: "a".repeat(64), immutableHash: "b".repeat(64)
  }), { status: 201, headers: { "Content-Type": "application/json" } })
});
assert.equal(mismatchedPutHash.status, "failed", "A well-formed receipt for different client bytes must fail closed.");

const imported: string[] = [];
const putExpectedRevisions: Array<number | null> = [];
const sessionMethods: string[] = [];
let putRevision = 3;
const session = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:cloud-owner",
  importArtifact: async (identityKey: `user:${string}`, _project: unknown, value: SavedPointObjectArtifact) => {
    assert.equal(identityKey, "user:cloud-owner");
    imported.push(value.artifactId);
    return { status: "imported" as const };
  },
  fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => {
    sessionMethods.push(init?.method ?? "GET");
    if (init?.method === "GET") return okPage([item(artifact(1, "2026-09-18T10:01:00.000Z"), 2), item(artifact(2, "2026-09-18T10:02:00.000Z"), 2)], null);
    const body = JSON.parse(String(init?.body));
    putExpectedRevisions.push(body.expectedCloudRevision);
    putRevision += 1;
    return okPut(putRevision === 4 ? "updated" : "replayed", putRevision);
  }
});
assert.equal(await session.start(), "ready");
assert.deepEqual(imported, ["artifact-cloud-1", "artifact-cloud-2"], "Newest-first server pages must replay oldest-first into prepend-only local storage.");
assert.deepEqual(sessionMethods, ["GET"], "Opening Project Hub must not bulk-upload existing local projects.");
assert.equal((await session.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"))).status, "saved");
assert.equal((await session.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"))).status, "saved");
assert.deepEqual(putExpectedRevisions, [2, 4], "Serialized writes must advance the server CAS revision.");
assert.equal(session.getExpectedRevision("artifact-cloud-1"), 5);
session.close();

let unavailableCalls = 0;
const unavailableSession = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:no-cloud-scope",
  importArtifact: async () => ({ status: "imported" as const }),
  fetcher: async () => { unavailableCalls += 1; return new Response(null, { status: 404 }); }
});
assert.equal(await unavailableSession.start(), "unavailable");
assert.equal((await unavailableSession.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"))).status, "skipped");
assert.equal(unavailableCalls, 1, "A disabled route must not receive a follow-up PUT.");
unavailableSession.close();

let conflictCalls = 0;
const conflictSession = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:local-conflict",
  importArtifact: async () => ({ status: "conflict" as const }),
  fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => {
    conflictCalls += 1;
    return init?.method === "GET" ? okPage([item(artifact(1, "2026-09-18T10:01:00.000Z"), 2)], null) : okPut("updated", 3);
  }
});
assert.equal(await conflictSession.start(), "conflict");
assert.equal((await conflictSession.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"))).status, "skipped");
assert.equal(conflictCalls, 1, "A local/cloud byte conflict must block cloud mutation.");
conflictSession.close();

let capacityCalls = 0;
const capacitySession = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:local-capacity",
  importArtifact: async () => ({ status: "capacity" as const }),
  fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => {
    capacityCalls += 1;
    return init?.method === "GET" ? okPage([item(artifact(1, "2026-09-18T10:01:00.000Z"), 2)], null) : okPut("updated", 3);
  }
});
assert.equal(await capacitySession.start(), "capacity");
assert.equal((await capacitySession.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"))).status, "skipped");
assert.equal(capacityCalls, 1, "Local capacity must remain distinct and block cloud mutation.");
capacitySession.close();

let rejectedImportCalls = 0;
const rejectedImportStatuses: string[] = [];
const rejectedImportSession = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:rejected-import",
  importArtifact: async () => { throw new Error("simulated local storage failure"); },
  onStatus: (status: string) => rejectedImportStatuses.push(status),
  fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => {
    rejectedImportCalls += 1;
    assert.equal(init?.method, "GET");
    return okPage([item(artifact(1, "2026-09-18T10:01:00.000Z"), 2)], null);
  }
});
assert.equal(await rejectedImportSession.start(), "failed", "A rejected additive import must resolve to a terminal failed state.");
assert.equal(rejectedImportSession.getStatus(), "failed");
assert.deepEqual(rejectedImportStatuses, ["syncing", "failed"]);
assert.equal((await rejectedImportSession.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"))).status, "skipped");
assert.equal(rejectedImportCalls, 1, "A failed local import must fail closed without any cloud write.");
rejectedImportSession.close();

let conflictPutCalls = 0;
const writeConflictSession = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:write-conflict",
  importArtifact: async () => ({ status: "replayed" as const }),
  fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "GET") return okPage([item(artifact(1, "2026-09-18T10:01:00.000Z"), 2)], null);
    conflictPutCalls += 1;
    return new Response(JSON.stringify({
      ok: false,
      persisted: false,
      conflict: true,
      reason: "stale_cloud_revision",
      message: "The cloud artifact changed.",
      current: { cloudRevision: 9, payloadHash: "a".repeat(64), immutableHash: "b".repeat(64) }
    }), { status: 409, headers: { "Content-Type": "application/json" } });
  }
});
assert.equal(await writeConflictSession.start(), "ready");
const queuedConflictWrite = writeConflictSession.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"));
const queuedWriteAfterConflict = writeConflictSession.persist(localProject, artifact(2, "2026-09-18T10:02:00.000Z"));
assert.equal((await queuedConflictWrite).status, "conflict");
assert.equal((await queuedWriteAfterConflict).status, "skipped", "Queued writes must stop after the first cloud conflict.");
assert.equal(conflictPutCalls, 1);
assert.equal(writeConflictSession.getStatus(), "conflict");
assert.equal(writeConflictSession.getExpectedRevision("artifact-cloud-1"), 2,
  "A 409 receipt must not advance the locally trusted CAS revision.");
writeConflictSession.close();

let failedPutCalls = 0;
const writeFailureSession = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:write-failure",
  importArtifact: async () => ({ status: "replayed" as const }),
  fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "GET") return okPage([], null);
    failedPutCalls += 1;
    return new Response(JSON.stringify({ ok: false }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
});
assert.equal(await writeFailureSession.start(), "ready");
const queuedFailedWrite = writeFailureSession.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"));
const queuedWriteAfterFailure = writeFailureSession.persist(localProject, artifact(2, "2026-09-18T10:02:00.000Z"));
assert.equal((await queuedFailedWrite).status, "failed");
assert.equal((await queuedWriteAfterFailure).status, "skipped", "Queued writes must stop after the first cloud error.");
assert.equal(failedPutCalls, 1);
writeFailureSession.close();

let importsAfterClose = 0;
const delayedSession = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:first-session",
  importArtifact: async () => { importsAfterClose += 1; return { status: "imported" as const }; },
  fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    if (signal?.aborted) reject(new DOMException("Aborted", "AbortError"));
    void resolve;
  })
});
const delayedStart = delayedSession.start();
delayedSession.close();
assert.equal(await delayedStart, "aborted");
assert.equal(importsAfterClose, 0, "A closed identity session must never import into its former namespace.");

const stalePutDeferred: { resolve?: (response: Response) => void } = {};
let staleStatusUpdates = 0;
const staleWriteSession = cloud.createPointObjectCloudSyncSession({
  identityKey: "user:old-account",
  importArtifact: async () => ({ status: "imported" as const }),
  onStatus: () => { staleStatusUpdates += 1; },
  fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "GET") return okPage([], null);
    return new Promise<Response>((resolve) => { stalePutDeferred.resolve = resolve; });
  }
});
assert.equal(await staleWriteSession.start(), "ready");
const staleWrite = staleWriteSession.persist(localProject, artifact(1, "2026-09-18T10:01:00.000Z"));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.ok(stalePutDeferred.resolve, "The old identity write must be in flight before the account switch.");
staleWriteSession.close();
const staleUpdatesBeforeCompletion = staleStatusUpdates;
stalePutDeferred.resolve(okPut("created", 1));
assert.equal((await staleWrite).status, "skipped", "A stale completion must not be accepted after an account switch.");
assert.equal(staleWriteSession.getExpectedRevision("artifact-cloud-1"), null);
assert.equal(staleStatusUpdates, staleUpdatesBeforeCompletion, "A stale completion must not update UI state.");

class MemoryStorage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
class ProjectEvent<T = unknown> extends Event {
  detail: T;
  constructor(type: string, init: { detail: T }) { super(type); this.detail = init.detail; }
}
const browserLocalStorage = new MemoryStorage();
const browserSessionStorage = new MemoryStorage();
Object.assign(globalThis, {
  CustomEvent: ProjectEvent,
  window: { localStorage: browserLocalStorage, sessionStorage: browserSessionStorage, dispatchEvent: () => true }
});

const createCoordinates: Array<Array<[number, number]>> = [[
  [55.2808, 25.2182], [55.2828, 25.2182], [55.2828, 25.2197], [55.2808, 25.2197], [55.2808, 25.2182]
]];
const aoiValidation = create.validatePointObjectCreateAoiVertices(createCoordinates[0].slice(0, -1));
assert.equal(aoiValidation.ok, true);
if (!aoiValidation.ok) throw new Error("Expected a valid Create AOI fixture.");
const createAoi = {
  id: "create-aoi-cloud-local-successor",
  coordinates: createCoordinates,
  vertexCount: createCoordinates[0].length - 1,
  areaSqM: aoiValidation.measurements.areaSqM,
  perimeterM: aoiValidation.measurements.perimeterM
};
const programValidation = create.validateRedevelopmentProgram({
  templateId: "residential_mixed_use",
  title: "Cloud successor courtyard concept",
  summary: "A bounded two-alternative concept used only by the local cloud regression.",
  massingStyle: "courtyard",
  blockCount: 5,
  levelsMin: 6,
  levelsMax: 12,
  targetSiteCoveragePct: 28,
  openSpacePct: 35,
  setbackM: 8,
  useMix: [
    { use: "residential", sharePct: 72 },
    { use: "retail", sharePct: 18 },
    { use: "open_space", sharePct: 10 }
  ],
  rationale: ["Local cloud synchronization regression fixture."]
});
assert.equal(programValidation.ok, true);
if (!programValidation.ok) throw new Error("Expected a valid Create program fixture.");
const createSeed = createAi.createProgramSeed(programValidation.value, "c".repeat(64));
const createAlternatives = create.generateConceptMassingAlternatives(createCoordinates, programValidation.value, createSeed, "en");
const createOperation: PointObjectProjectOperationInput = {
  kind: "create",
  locale: "en",
  marketKey: "dubai",
  label: "Cloud Create successor",
  payload: {
    aoi: createAoi,
    editorSnapshot: null,
    generated: {
      mode: "openai_concept",
      generatedAt: "2026-09-18T10:00:00.000Z",
      promptVersion: createAi.POINT_OBJECT_CREATE_PROMPT_VERSION,
      program: programValidation.value,
      massing: createAlternatives[0].massing,
      alternatives: createAlternatives,
      telemetry: {
        model: "gpt-5.6-sol",
        reasoningEffort: "medium",
        requestId: "req_cloud_successor_create",
        latencyMs: 1,
        attempts: 1,
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        estimatedCostUsd: 0,
        stored: false,
        toolCalls: 0
      },
      caveat
    },
    generatedLocale: "en",
    activeAlternativeId: "A",
    areaContext: null
  }
};

async function exerciseRealLocalSuccessor(input: PointObjectProjectOperationInput, label: "find" | "create") {
  const identityKey = `user:cloud-local-${label}` as const;
  projects.reconcilePointObjectBrowserIdentity(identityKey);
  const project = await projects.createPointObjectProject(identityKey, "en", `Cloud ${label} project`);
  const saved = await projects.savePointObjectOperation(identityKey, input, `operation-cloud-local-${label}`);
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") throw new Error(`Expected a saved ${label} cloud fixture.`);
  let remoteArtifact = structuredClone(saved.artifact);
  let updated;
  if (label === "find" && saved.artifact.kind === "find") {
    const firstUpdate = await projects.updatePointObjectFindViewState(identityKey, saved.artifact.artifactId, {
        shortlist: saved.artifact.payload.session.result.candidates.slice(0, 1),
        comparisonOpen: false,
        comparisonView: "results",
        analysisTargetSourceFeatureId: null
    });
    assert.equal(firstUpdate.status, "saved");
    updated = await projects.updatePointObjectFindViewState(identityKey, saved.artifact.artifactId, {
      shortlist: [],
      comparisonOpen: false,
      comparisonView: "results",
      analysisTargetSourceFeatureId: null
    });
  } else {
    const firstUpdate = await projects.updatePointObjectCreateViewState(identityKey, saved.artifact.artifactId, "B");
    assert.equal(firstUpdate.status, "saved");
    if (firstUpdate.status !== "saved") throw new Error("Expected the Create revision-one cloud base.");
    remoteArtifact = structuredClone(firstUpdate.artifact);
    const secondUpdate = await projects.updatePointObjectCreateViewState(identityKey, saved.artifact.artifactId, "A");
    assert.equal(secondUpdate.status, "saved");
    updated = await projects.updatePointObjectCreateViewState(identityKey, saved.artifact.artifactId, "B");
  }
  assert.equal(updated.status, "saved");
  if (updated.status !== "saved") throw new Error(`Expected a local ${label} successor.`);
  assert.equal(updated.artifact.viewRevision, remoteArtifact.viewRevision + 2,
    `The ${label} fixture must exercise two real local view changes after the cloud snapshot.`);
  assert.deepEqual(
    localIntegrity.pointObjectCloudLocalImmutableProjection(updated.artifact),
    cloudContract.pointObjectCloudImmutableProjection(updated.artifact),
    `The browser-local ${label} immutable projection must match the current server field-selection contract.`
  );
  const storageKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(identityKey)}`;
  const localBytesBeforeGet = browserLocalStorage.getItem(storageKey);
  const equalRevisionRemote = { ...structuredClone(remoteArtifact), viewRevision: updated.artifact.viewRevision };
  assert.equal((await projects.importPointObjectCloudArtifact(identityKey, {
    projectId: project.projectId, name: project.name, createdAt: project.createdAt
  }, equalRevisionRemote)).status, "conflict", `Equal ${label} view revisions with different bytes must fail closed.`);
  const newerRemote = { ...structuredClone(remoteArtifact), viewRevision: updated.artifact.viewRevision + 1 };
  assert.equal((await projects.importPointObjectCloudArtifact(identityKey, {
    projectId: project.projectId, name: project.name, createdAt: project.createdAt
  }, newerRemote)).status, "conflict", `A newer remote ${label} view must fail closed.`);
  const immutableMismatch = { ...structuredClone(remoteArtifact), label: `${remoteArtifact.label} changed` };
  assert.equal((await projects.importPointObjectCloudArtifact(identityKey, {
    projectId: project.projectId, name: project.name, createdAt: project.createdAt
  }, immutableMismatch)).status, "conflict", `A divergent immutable ${label} result must fail closed.`);
  const equalRevisionImmutableMismatch = { ...structuredClone(updated.artifact), label: `${updated.artifact.label} changed` };
  assert.equal((await projects.importPointObjectCloudArtifact(identityKey, {
    projectId: project.projectId, name: project.name, createdAt: project.createdAt
  }, equalRevisionImmutableMismatch)).status, "conflict", `Equal-revision ${label} immutable differences must not replay.`);
  assert.equal(browserLocalStorage.getItem(storageKey), localBytesBeforeGet,
    `Rejected ${label} remote candidates must preserve every local byte.`);
  let putCount = 0;
  const successorStatuses: string[] = [];
  const successorSession = cloud.createPointObjectCloudSyncSession({
    identityKey,
    importArtifact: projects.importPointObjectCloudArtifact,
    onStatus: (status: string) => successorStatuses.push(status),
    fetcher: async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET") return okPage([{
        cloudRevision: 7,
        localProject: { projectId: project.projectId, name: project.name, createdAt: project.createdAt },
        artifact: remoteArtifact
      }], null);
      putCount += 1;
      const body = JSON.parse(String(init?.body)) as {
        localProject: { projectId: string };
        artifact: SavedPointObjectArtifact;
        expectedCloudRevision: number | null;
      };
      assert.equal(body.localProject.projectId, project.projectId);
      assert.equal(body.artifact.artifactId, updated.artifact.artifactId);
      assert.equal(body.artifact.viewRevision, remoteArtifact.viewRevision + 2);
      assert.equal(body.expectedCloudRevision, 7, "The GET cloud revision must remain the CAS base for the explicit update.");
      return new Response(JSON.stringify({
        ok: true,
        persisted: true,
        storageMode: "authenticated_supabase_preview",
        outcome: "updated",
        cloudRevision: 8,
        payloadHash: body.artifact.payloadHash,
        immutableHash: "b".repeat(64)
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });
  assert.equal(await successorSession.start(), "ready", `An older same-immutable ${label} cloud view must allow explicit save.`);
  assert.equal(successorSession.getStatus(), "local_ahead", `An unsaved local ${label} successor must not be presented as fully synced.`);
  assert.deepEqual(successorStatuses, ["syncing", "local_ahead"]);
  assert.equal(browserLocalStorage.getItem(storageKey), localBytesBeforeGet, "GET must preserve the newer local bytes exactly.");
  const currentProject = (await projects.readVerifiedPointObjectProjects(identityKey)).store?.projects.find(
    (candidate: { projectId: string }) => candidate.projectId === project.projectId
  );
  assert.ok(currentProject);
  const currentArtifact = currentProject.artifacts.find((candidate: SavedPointObjectArtifact) => candidate.artifactId === updated.artifact.artifactId);
  assert.ok(currentArtifact);
  const result = await successorSession.persist(
    { projectId: currentProject.projectId, name: currentProject.name, createdAt: currentProject.createdAt },
    currentArtifact
  );
  assert.equal(result.status, "saved");
  assert.equal(successorSession.getStatus(), "ready", `A successful explicit ${label} snapshot should clear local-ahead status.`);
  assert.equal(putCount, 1);
  assert.equal(browserLocalStorage.getItem(storageKey), localBytesBeforeGet, "Explicit cloud save must not rewrite local project bytes.");
  successorSession.close();
}

await exerciseRealLocalSuccessor(operation, "find");
await exerciseRealLocalSuccessor(createOperation, "create");

console.log("Point-object cloud client checks passed (strict pages/origins, additive order, real Find/Create local-successor CAS, fail-closed conflicts/errors, identity abort).");
