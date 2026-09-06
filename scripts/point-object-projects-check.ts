import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(ROOT, specifier.slice(2));
      try {
        return nextResolve(pathToFileURL(`${target}.ts`).href, context);
      } catch {
        return nextResolve(pathToFileURL(target).href, context);
      }
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Let Node report the canonical resolution error below.
      }
    }
    return nextResolve(specifier, context);
  }
});

// @ts-expect-error Node's strip-types runner requires the physical .ts suffix; production imports remain extensionless.
const projects = await import("../src/lib/prototype/point-object-projects.ts");
const {
  continuePendingPointObjectOperationInNewProject,
  createPointObjectProject,
  hashPointObjectOperation,
  inspectPointObjectProjects,
  pointObjectPendingOperationCount,
  pointObjectProjectIdentity,
  readPointObjectProjects,
  readVerifiedPointObjectProjects,
  reconcilePointObjectBrowserIdentity,
  retryPendingPointObjectOperations,
  savePointObjectOperation,
  selectPointObjectProject,
  updatePointObjectFindViewState,
  verifySavedPointObjectArtifact
} = projects;
type PointObjectProjectOperationInput = import("../src/lib/prototype/point-object-projects-contract.ts").PointObjectProjectOperationInput;

class MemoryStorage {
  private values = new Map<string, string>();
  failWrites = 0;
  denyReads = false;
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) {
    if (this.denyReads) throw new DOMException("Storage denied", "SecurityError");
    return this.values.get(key) ?? null;
  }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    if (this.failWrites > 0) {
      this.failWrites -= 1;
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    this.values.set(key, value);
  }
}

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
class ProjectEvent<T = unknown> extends Event {
  detail: T;
  constructor(type: string, init: { detail: T }) {
    super(type);
    this.detail = init.detail;
  }
}
Object.assign(globalThis, {
  CustomEvent: ProjectEvent,
  window: { localStorage, sessionStorage, dispatchEvent: () => true }
});

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const candidate = (id: number) => ({
  sourceFeatureId: `way/${id}` as const,
  sourceElementType: "way" as const,
  sourceElementId: String(id),
  label: `Mapped construction site ${id}`,
  name: `Site ${id}`,
  longitude: 55.27 + id / 1_000_000,
  latitude: 25.2 + id / 1_000_000,
  group: "construction" as const,
  matchedTag: { key: "landuse", value: "construction" },
  mappedBuildingLevels: null,
  observedTags: { landuse: "construction", name: `Site ${id}` },
  evidenceClass: "observed_in_open_map_source" as const
});

function findInput(index: number, shortlist = false): PointObjectProjectOperationInput {
  const candidates = [candidate(index * 10 + 1), candidate(index * 10 + 2)];
  const sourceResponseHash = index.toString(16).padStart(64, "0").slice(-64);
  return {
    kind: "find",
    locale: "en",
    marketKey: "dubai",
    label: `Find result ${index}`,
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
        result: {
          protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1",
          mode: "results",
          criteria: { marketKey: "dubai", locale: "en", bounds: [55.26, 25.19, 55.28, 25.21], group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 },
          candidates,
          ordering: "source_identity_ascending_not_ranked",
          coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 4.47, upstreamElementCount: 2, normalizedCandidateCount: 2, returnedCandidateCount: 2, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
          source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash, observedAt: null, acquiredAt: "2026-09-06T10:00:00.000Z", freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
          limitations: ["Bounded open-map sample."],
          caveat
        },
        shortlist: shortlist ? candidates : [],
        comparisonOpen: shortlist,
        analysisTargetSourceFeatureId: shortlist ? candidates[0].sourceFeatureId : null,
        updatedAt: "2026-09-06T10:00:00.000Z"
      }
    }
  };
}

const demoIdentity = pointObjectProjectIdentity({ id: "demo-user", isDemoUser: true } as never);
const userIdentity = pointObjectProjectIdentity({ id: "user-123", isDemoUser: false } as never);
assert.equal(demoIdentity, "demo:demo-user");
assert.equal(userIdentity, "user:user-123");
if (!demoIdentity || !userIdentity) throw new Error("Expected valid identities.");
reconcilePointObjectBrowserIdentity(demoIdentity);

const firstProject = await createPointObjectProject(demoIdentity, "en", "Dubai screening");
assert.equal(firstProject.name, "Dubai screening");
assert.equal(readPointObjectProjects(demoIdentity).activeProjectId, firstProject.projectId);
assert.equal(readPointObjectProjects(userIdentity).projects.length, 0, "another identity must not see demo projects");

const saved = await savePointObjectOperation(demoIdentity, findInput(1), "operation-stable-1");
assert.equal(saved.status, "saved");
if (saved.status !== "saved") throw new Error("Expected saved result.");
assert.equal(await verifySavedPointObjectArtifact(saved.artifact), true);

const replay = await savePointObjectOperation(demoIdentity, findInput(1), "operation-stable-1");
assert.equal(replay.status, "replayed", "identical retry must replay without a duplicate");
assert.equal(readPointObjectProjects(demoIdentity).projects.find((item) => item.projectId === firstProject.projectId)?.artifacts.length, 1);

const conflict = await savePointObjectOperation(demoIdentity, findInput(2), "operation-stable-1");
assert.equal(conflict.status, "conflict", "same completed key with different payload must fail closed");

localStorage.failWrites = 1;
const failed = await savePointObjectOperation(demoIdentity, findInput(3), "operation-stable-3");
assert.equal(failed.status, "failed");
assert.equal(pointObjectPendingOperationCount(demoIdentity), 1);
const retried = await retryPendingPointObjectOperations(demoIdentity);
assert.equal(retried[0]?.status, "saved", "retry must reuse the queued immutable operation after storage recovers");

localStorage.failWrites = 2;
const [failedEarlier, failedLater] = await Promise.all([
  savePointObjectOperation(demoIdentity, findInput(4), "operation-stable-4"),
  savePointObjectOperation(demoIdentity, findInput(5), "operation-stable-5")
]);
assert.equal(failedEarlier.status, "failed");
assert.equal(failedLater.status, "failed");
assert.equal(pointObjectPendingOperationCount(demoIdentity), 2, "distinct failures must remain independently recoverable");
const secondProject = await createPointObjectProject(demoIdentity, "en", "Second project");
const laterSuccess = await savePointObjectOperation(demoIdentity, findInput(6), "operation-stable-6");
assert.equal(laterSuccess.status, "saved");
assert.equal(pointObjectPendingOperationCount(demoIdentity), 2, "later success must not mask or discard earlier failures");
await retryPendingPointObjectOperations(demoIdentity);
const afterRetry = readPointObjectProjects(demoIdentity);
assert.deepEqual(
  afterRetry.projects.find((item) => item.projectId === firstProject.projectId)?.artifacts.slice(0, 2).map((item) => item.idempotencyKey).sort(),
  ["operation-stable-4", "operation-stable-5"],
  "active-project changes must not move retried results away from their initiating destination"
);
assert.equal(afterRetry.projects.find((item) => item.projectId === secondProject.projectId)?.artifacts[0]?.idempotencyKey, "operation-stable-6");

await selectPointObjectProject(demoIdentity, firstProject.projectId);
for (let index = 7; index <= 32; index += 1) {
  const result = await savePointObjectOperation(demoIdentity, findInput(index), `operation-stable-${index}`);
  assert.equal(result.status, "saved");
}
const fullProject = readPointObjectProjects(demoIdentity).projects.find((item) => item.projectId === firstProject.projectId);
assert.equal(fullProject?.artifacts.length, 30, "all 30 existing records must be retained");
const overCapacity = await savePointObjectOperation(demoIdentity, findInput(33), "operation-stable-33");
assert.equal(overCapacity.status, "capacity");
assert.equal(pointObjectPendingOperationCount(demoIdentity), 1, "the 31st result must remain recoverable");
assert.equal(readPointObjectProjects(demoIdentity).projects.find((item) => item.projectId === firstProject.projectId)?.artifacts.length, 30);
const continued = await continuePendingPointObjectOperationInNewProject(demoIdentity);
assert.equal(continued?.status, "saved", "capacity recovery requires explicit new-project continuation");
assert.equal(readPointObjectProjects(demoIdentity).projects.reduce((count, item) => count + item.artifacts.length, 0), 32);

if (continued?.status !== "saved") throw new Error("Expected continued artifact.");
const beforeViewUpdate = readPointObjectProjects(demoIdentity).projects.reduce((count, item) => count + item.artifacts.length, 0);
const viewUpdated = await updatePointObjectFindViewState(demoIdentity, continued.artifact.artifactId, {
  shortlist: continued.artifact.kind === "find" ? continued.artifact.payload.session.result.candidates : [],
  comparisonOpen: true,
  analysisTargetSourceFeatureId: continued.artifact.kind === "find" ? continued.artifact.payload.session.result.candidates[0]?.sourceFeatureId ?? null : null
});
assert.equal(viewUpdated.status, "saved");
assert.equal(readPointObjectProjects(demoIdentity).projects.reduce((count, item) => count + item.artifacts.length, 0), beforeViewUpdate, "shortlist/comparison state must update the existing record, not create a new completed result");

localStorage.failWrites = 1;
const identityPending = await savePointObjectOperation(demoIdentity, findInput(34), "operation-stable-34");
assert.equal(identityPending.status, "failed");
sessionStorage.setItem("geoai:point-to-object:selection:v3", "transient");
reconcilePointObjectBrowserIdentity(userIdentity);
const wrongIdentityRetry = await retryPendingPointObjectOperations(demoIdentity);
assert.equal(wrongIdentityRetry[0]?.status, "failed");
assert.equal(wrongIdentityRetry[0] && "code" in wrongIdentityRetry[0] ? wrongIdentityRetry[0].code : null, "identity_changed");
assert.equal(sessionStorage.getItem("geoai:point-to-object:selection:v3"), null, "identity transition must clear transient point state");
assert.equal(readPointObjectProjects(demoIdentity).projects.length >= 1, true, "identity transition must not destroy scoped saved projects");
reconcilePointObjectBrowserIdentity(demoIdentity);
await retryPendingPointObjectOperations(demoIdentity);

const invalidAnalyse = await savePointObjectOperation(demoIdentity, {
  kind: "analyse", locale: "en", marketKey: "dubai", label: "Invalid analysis", payload: { selection: { locationKey: "dubai" }, analysis: { mode: "openai" } }
} as unknown as PointObjectProjectOperationInput, "invalid-analyse");
assert.equal(invalidAnalyse.status, "failed");
assert.equal("code" in invalidAnalyse ? invalidAnalyse.code : null, "payload_invalid");
const invalidCreate = await savePointObjectOperation(demoIdentity, {
  kind: "create", locale: "en", marketKey: "dubai", label: "Invalid create", payload: {}
} as unknown as PointObjectProjectOperationInput, "invalid-create");
assert.equal(invalidCreate.status, "failed");
assert.equal("code" in invalidCreate ? invalidCreate.code : null, "payload_invalid");

const demoStoreKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(demoIdentity)}`;
const goodRaw = localStorage.getItem(demoStoreKey);
assert.ok(goodRaw, "expected the identity-scoped project store");
const malformedStore = JSON.parse(goodRaw) as { projects: Array<{ artifacts: Array<Record<string, unknown>> }> };
const damagedArtifact = malformedStore.projects[0].artifacts[0];
const damagedPayload = damagedArtifact.payload as { session: { result: { candidates: Array<Record<string, unknown>> } } };
damagedPayload.session.result.candidates[0].evidenceClass = "official";
damagedArtifact.payloadHash = await hashPointObjectOperation(damagedArtifact as unknown as PointObjectProjectOperationInput);
const malformedRaw = JSON.stringify(malformedStore);
localStorage.setItem(demoStoreKey, malformedRaw);
assert.equal(inspectPointObjectProjects(demoIdentity).status, "damaged", "hash-matching malformed nested payload must fail strict parsing");
assert.equal(localStorage.getItem(demoStoreKey), malformedRaw, "damaged raw bytes must be preserved exactly");
await assert.rejects(() => createPointObjectProject(demoIdentity, "en", "Must not overwrite damage"));
assert.equal(localStorage.getItem(demoStoreKey), malformedRaw, "writes must never replace a damaged namespace");

localStorage.setItem(demoStoreKey, goodRaw);
const duplicateIdentityStore = JSON.parse(goodRaw) as { projects: Array<{ artifacts: Array<{ artifactId: string; idempotencyKey: string }> }> };
duplicateIdentityStore.projects[1].artifacts[0].artifactId = duplicateIdentityStore.projects[0].artifacts[0].artifactId;
duplicateIdentityStore.projects[1].artifacts[0].idempotencyKey = duplicateIdentityStore.projects[0].artifacts[0].idempotencyKey;
localStorage.setItem(demoStoreKey, JSON.stringify(duplicateIdentityStore));
assert.equal(inspectPointObjectProjects(demoIdentity).status, "damaged", "duplicate artifact and operation identities must fail closed before restore");

localStorage.setItem(demoStoreKey, goodRaw);
const hashMismatch = JSON.parse(goodRaw) as { projects: Array<{ artifacts: Array<{ payload: { session: { result: { candidates: Array<{ label: string }> } } } }> }> };
hashMismatch.projects[0].artifacts[0].payload.session.result.candidates[0].label = "Changed without rehash";
localStorage.setItem(demoStoreKey, JSON.stringify(hashMismatch));
assert.equal((await readVerifiedPointObjectProjects(demoIdentity)).status, "damaged", "valid-shaped bytes with a payload hash mismatch must fail integrity verification");

localStorage.setItem(demoStoreKey, "{invalid-json");
assert.equal(inspectPointObjectProjects(demoIdentity).status, "damaged", "invalid stored JSON is damaged, not missing or inaccessible");
localStorage.setItem(demoStoreKey, goodRaw);
localStorage.denyReads = true;
assert.equal(inspectPointObjectProjects(demoIdentity).status, "inaccessible", "storage denial must remain distinct from damage and absence");
localStorage.denyReads = false;
assert.equal((await readVerifiedPointObjectProjects(demoIdentity)).status, "ready");

console.log("point-to-object browser-local project contract checks passed");
