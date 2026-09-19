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
const projects = await import("../src/lib/prototype/point-object-projects.ts");
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
  payloadHash: "a".repeat(64), immutableHash: "b".repeat(64)
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

console.log("Point-object cloud client checks passed (strict pages/origins, additive order, CAS serialization, disabled/conflict gates, identity abort).");
