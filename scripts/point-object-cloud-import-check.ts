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
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* use the normal resolver */ }
    }
    return nextResolve(specifier, context);
  }
});

// @ts-expect-error Node transform-types requires the physical TypeScript suffix.
const projects = await import("../src/lib/prototype/point-object-projects.ts");
type PointObjectProjectOperationInput = import("../src/lib/prototype/point-object-projects-contract.ts").PointObjectProjectOperationInput;

class MemoryStorage {
  values = new Map<string, string>();
  failWrites = 0;
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
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
  constructor(type: string, init: { detail: T }) { super(type); this.detail = init.detail; }
}
Object.assign(globalThis, {
  CustomEvent: ProjectEvent,
  window: { localStorage, sessionStorage, dispatchEvent: () => true }
});

const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
function findInput(label: string, longitude = 55.27): PointObjectProjectOperationInput {
  const candidate = {
    sourceFeatureId: "way/7001" as const, sourceElementType: "way" as const, sourceElementId: "7001", label: "Cloud site", name: "Cloud site",
    longitude, latitude: 25.2, group: "construction" as const, matchedTag: { key: "landuse", value: "construction" }, mappedBuildingLevels: null,
    observedTags: { landuse: "construction", name: "Cloud site" }, evidenceClass: "observed_in_open_map_source" as const
  };
  return {
    kind: "find", locale: "en", marketKey: "dubai", label,
    payload: { session: {
      version: 1, marketKey: "dubai", locale: "en", audience: "b2b", role: "developer", scenario: "b2b_redevelopment_selected_aoi",
      group: "construction", mappedMinimumLevels: "", mappedMaximumLevels: "", shortlist: [], comparisonOpen: false,
      analysisTargetSourceFeatureId: null, updatedAt: "2026-09-18T10:00:00.000Z",
      result: {
        protocol: "POINT_TO_OBJECT_001_FIND_OPEN_MAP_V1", mode: "results",
        criteria: { marketKey: "dubai", locale: "en", bounds: [55.26, 25.19, 55.28, 25.21], group: "construction", mappedMinimumLevels: null, mappedMaximumLevels: null, limit: 12 },
        candidates: [candidate], ordering: "source_identity_ascending_not_ranked",
        coverage: { kind: "bounded_open_map_sample", approximateAreaSqKm: 4.47, upstreamElementCount: 1, normalizedCandidateCount: 1, returnedCandidateCount: 1, upstreamQueryLimit: 80, capReached: false, completeInventory: false, mappedLevelsPolicy: "not_requested" },
        source: { name: "OpenStreetMap", service: "Overpass API", sourceResponseHash: "7".repeat(64), observedAt: null, acquiredAt: "2026-09-18T10:00:00.000Z", freshness: "runtime_response_feature_time_unavailable", licenceId: "ODbL-1.0", attribution: "© OpenStreetMap contributors", licenceUrl: "https://www.openstreetmap.org/copyright", usagePolicyUrl: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html", officialStatus: "open_context_not_official", runtimeNetworkUsed: true, persistenceUsed: false },
        limitations: ["Offline cloud import fixture."], caveat
      }
    } }
  };
}

const sourceIdentity = "user:cloud-source" as const;
projects.reconcilePointObjectBrowserIdentity(sourceIdentity);
const sourceProject = await projects.createPointObjectProject(sourceIdentity, "en", "Cloud source project");
const sourceSave = await projects.savePointObjectOperation(sourceIdentity, findInput("Cloud result"), "operation-cloud-import");
assert.equal(sourceSave.status, "saved");
if (sourceSave.status !== "saved") throw new Error("Fixture creation failed.");
const cloudProject = { projectId: sourceProject.projectId, name: sourceProject.name, createdAt: sourceProject.createdAt };
const cloudArtifact = sourceSave.artifact;

const targetIdentity = "user:cloud-target" as const;
projects.reconcilePointObjectBrowserIdentity(targetIdentity);
const imported = await projects.importPointObjectCloudArtifact(targetIdentity, cloudProject, cloudArtifact);
assert.equal(imported.status, "imported");
const targetKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(targetIdentity)}`;
const importedBytes = localStorage.getItem(targetKey);
assert.ok(importedBytes);
assert.equal((await projects.readVerifiedPointObjectProjects(targetIdentity)).store?.projects[0]?.artifacts[0]?.kind, "find");

const replayed = await projects.importPointObjectCloudArtifact(targetIdentity, cloudProject, cloudArtifact);
assert.equal(replayed.status, "replayed");
assert.equal(localStorage.getItem(targetKey), importedBytes, "An exact cloud replay must not rewrite local bytes.");

const localFindUpdate = await projects.updatePointObjectFindViewState(targetIdentity, cloudArtifact.artifactId, {
  shortlist: cloudArtifact.kind === "find" ? cloudArtifact.payload.session.result.candidates.slice(0, 1) : [],
  comparisonOpen: false,
  comparisonView: "results",
  analysisTargetSourceFeatureId: null
});
assert.equal(localFindUpdate.status, "saved");
if (localFindUpdate.status !== "saved") throw new Error("Expected a valid local Find view successor.");
const localFindBytes = localStorage.getItem(targetKey);
const olderCloudAfterLocalUpdate = await projects.importPointObjectCloudArtifact(targetIdentity, cloudProject, cloudArtifact);
assert.equal(olderCloudAfterLocalUpdate.status, "local_newer",
  "A verified local Find view exactly one revision ahead of the same immutable cloud result must remain eligible for explicit CAS save.");
assert.equal(localStorage.getItem(targetKey), localFindBytes, "Recognizing a local successor must not rewrite its bytes.");

const equalRevisionDifferentView = structuredClone(localFindUpdate.artifact);
if (equalRevisionDifferentView.kind !== "find") throw new Error("Expected a Find successor.");
equalRevisionDifferentView.payload.session.shortlist = [];
equalRevisionDifferentView.payload.session.comparisonOpen = false;
equalRevisionDifferentView.payload.session.analysisTargetSourceFeatureId = null;
equalRevisionDifferentView.payloadHash = await projects.hashPointObjectOperation(equalRevisionDifferentView);
const equalRevisionConflict = await projects.importPointObjectCloudArtifact(targetIdentity, cloudProject, equalRevisionDifferentView);
assert.equal(equalRevisionConflict.status, "conflict", "Equal revisions with different view bytes must remain fail closed.");
assert.equal(localStorage.getItem(targetKey), localFindBytes);

const newerRemoteView = structuredClone(cloudArtifact);
newerRemoteView.viewRevision = localFindUpdate.artifact.viewRevision + 1;
const newerRemoteConflict = await projects.importPointObjectCloudArtifact(targetIdentity, cloudProject, newerRemoteView);
assert.equal(newerRemoteConflict.status, "conflict", "A newer remote view must never be overwritten from stale local bytes.");
assert.equal(localStorage.getItem(targetKey), localFindBytes);

const wrongProjectReplay = await projects.importPointObjectCloudArtifact(targetIdentity, {
  ...cloudProject,
  projectId: "project-different-cloud-origin"
}, cloudArtifact);
assert.equal(wrongProjectReplay.status, "conflict");
assert.equal(localStorage.getItem(targetKey), localFindBytes,
  "The same artifact receipt under a different cloud project must not replay or rewrite local bytes.");

const wrongCreatedAtReplay = await projects.importPointObjectCloudArtifact(targetIdentity, {
  ...cloudProject,
  createdAt: "2026-09-18T09:59:59.000Z"
}, cloudArtifact);
assert.equal(wrongCreatedAtReplay.status, "conflict");
assert.equal(localStorage.getItem(targetKey), localFindBytes,
  "The same artifact receipt with a different project origin timestamp must not replay or rewrite local bytes.");

const conflictingInput = findInput("Different immutable cloud result", 55.28);
const conflict = {
  ...cloudArtifact,
  ...conflictingInput,
  payloadHash: await projects.hashPointObjectOperation(conflictingInput)
};
const conflicted = await projects.importPointObjectCloudArtifact(targetIdentity, cloudProject, conflict);
assert.equal(conflicted.status, "conflict");
assert.equal(localStorage.getItem(targetKey), localFindBytes, "A cloud conflict must preserve local bytes.");

localStorage.setItem(targetKey, "{damaged-json");
const damagedBytes = localStorage.getItem(targetKey);
const damaged = await projects.importPointObjectCloudArtifact(targetIdentity, cloudProject, cloudArtifact);
assert.equal(damaged.status, "failed");
assert.equal(damaged.code, "store_damaged");
assert.equal(localStorage.getItem(targetKey), damagedBytes, "Damaged local bytes must never be replaced by cloud content.");

const capacityIdentity = "user:cloud-capacity" as const;
projects.reconcilePointObjectBrowserIdentity(capacityIdentity);
const capacityKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(capacityIdentity)}`;
const projectsAtCapacity = Array.from({ length: 20 }, (_, index) => ({
  schemaVersion: 1, projectId: `capacity-${index}`, name: `Capacity ${index}`, storageMode: "browser_local_on_this_device",
  createdAt: "2026-09-18T10:00:00.000Z", updatedAt: "2026-09-18T10:00:00.000Z", artifacts: []
}));
localStorage.setItem(capacityKey, JSON.stringify({ schemaVersion: 1, identityKey: capacityIdentity, activeProjectId: null, projects: projectsAtCapacity }));
const capacityBytes = localStorage.getItem(capacityKey);
const capacity = await projects.importPointObjectCloudArtifact(capacityIdentity, cloudProject, cloudArtifact);
assert.equal(capacity.status, "capacity");
assert.equal(localStorage.getItem(capacityKey), capacityBytes, "Capacity refusal must preserve local bytes.");

const raceIdentity = "user:cloud-race" as const;
projects.reconcilePointObjectBrowserIdentity(raceIdentity);
const raceKey = `geoai:point-to-object:projects:v1:${encodeURIComponent(raceIdentity)}`;
const originalDigest = crypto.subtle.digest.bind(crypto.subtle);
const releaseDigest = { current: null as (() => void) | null };
const digestStarted = { current: null as (() => void) | null };
const started = new Promise<void>((resolve) => { digestStarted.current = resolve; });
const release = new Promise<void>((resolve) => { releaseDigest.current = resolve; });
Object.defineProperty(crypto.subtle, "digest", { configurable: true, value: async (...args: Parameters<typeof originalDigest>) => {
  digestStarted.current?.();
  await release;
  return originalDigest(...args);
} });
try {
  const lateImport = projects.importPointObjectCloudArtifact(raceIdentity, cloudProject, cloudArtifact);
  await started;
  projects.reconcilePointObjectBrowserIdentity("user:cloud-successor");
  releaseDigest.current?.();
  const lateResult = await lateImport;
  assert.equal(lateResult.status, "failed");
  assert.equal(lateResult.code, "identity_changed");
  assert.equal(localStorage.getItem(raceKey), null, "A late response must not write into the previous identity namespace.");
} finally {
  Object.defineProperty(crypto.subtle, "digest", { configurable: true, value: originalDigest });
}

console.log("Point-to-object cloud additive import checks passed (origin-bound replay, safe local successor, conflict, damage, capacity, identity race).");
