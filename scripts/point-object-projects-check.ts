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
const create = await import("../src/lib/prototype/point-to-object-create");
const createAi = await import("../src/lib/prototype/point-to-object-create-ai-core");
const createResult = await import("../src/lib/prototype/point-to-object-create-result");
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
const interleavedRetry = await retryPendingPointObjectOperations(demoIdentity);
assert.deepEqual(interleavedRetry.map((result) => result.status === "saved" || result.status === "replayed" ? result.artifact.idempotencyKey : null), [
  "operation-stable-4",
  "operation-stable-5"
], "pending recovery must execute in original FIFO order");
const afterRetry = readPointObjectProjects(demoIdentity);
assert.deepEqual(
  afterRetry.projects.find((item) => item.projectId === firstProject.projectId)?.artifacts.slice(0, 2).map((item) => item.idempotencyKey),
  ["operation-stable-5", "operation-stable-4"],
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
const nullActiveStore = JSON.parse(goodRaw) as { activeProjectId: string | null };
nullActiveStore.activeProjectId = null;
localStorage.setItem(demoStoreKey, JSON.stringify(nullActiveStore));
const nullActiveRead = inspectPointObjectProjects(demoIdentity);
assert.equal(nullActiveRead.status, "ready", "a legitimate explicit null active project must remain valid");
assert.equal(nullActiveRead.store?.activeProjectId, null, "parsing must preserve explicit null without selecting another project");

const danglingActiveStore = JSON.parse(goodRaw) as { activeProjectId: string | null; projects: Array<{ projectId: string }> };
danglingActiveStore.activeProjectId = "project-missing";
const danglingRaw = JSON.stringify(danglingActiveStore);
localStorage.setItem(demoStoreKey, danglingRaw);
assert.equal(inspectPointObjectProjects(demoIdentity).status, "damaged", "a dangling non-null active project reference must fail closed");
await assert.rejects(() => createPointObjectProject(demoIdentity, "en", "Must not replace dangling bytes"));
assert.equal(localStorage.getItem(demoStoreKey), danglingRaw, "create must preserve exact dangling-reference bytes");
await assert.rejects(() => selectPointObjectProject(demoIdentity, danglingActiveStore.projects[0].projectId));
assert.equal(localStorage.getItem(demoStoreKey), danglingRaw, "select must preserve exact dangling-reference bytes");
const danglingSave = await savePointObjectOperation(demoIdentity, findInput(35), "operation-dangling-active");
assert.equal(danglingSave.status, "failed");
assert.equal("code" in danglingSave ? danglingSave.code : null, "store_damaged");
assert.equal(localStorage.getItem(demoStoreKey), danglingRaw, "save must preserve exact dangling-reference bytes and unrelated results");

localStorage.setItem(demoStoreKey, goodRaw);
await retryPendingPointObjectOperations(demoIdentity);
const recoveredRaw = localStorage.getItem(demoStoreKey);
assert.ok(recoveredRaw, "expected recovery to clear the accepted pending save after restoring valid bytes");
localStorage.setItem(demoStoreKey, goodRaw);
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
const shortlistMismatchStore = JSON.parse(goodRaw) as { projects: Array<{ artifacts: Array<Record<string, unknown>> }> };
const shortlistMismatchArtifact = shortlistMismatchStore.projects.flatMap((project) => project.artifacts).find((artifact) => artifact.kind === "find");
assert.ok(shortlistMismatchArtifact, "expected a saved Find artifact");
const shortlistMismatchPayload = shortlistMismatchArtifact.payload as { session: { result: { candidates: Array<Record<string, unknown>> }; shortlist: Array<Record<string, unknown>>; comparisonOpen: boolean } };
const canonicalCandidate = shortlistMismatchPayload.session.result.candidates[0];
shortlistMismatchPayload.session.shortlist = [{ ...canonicalCandidate, label: "Tampered shortlist label" }];
shortlistMismatchPayload.session.comparisonOpen = false;
shortlistMismatchArtifact.payloadHash = await hashPointObjectOperation(shortlistMismatchArtifact as unknown as PointObjectProjectOperationInput);
const shortlistMismatchRaw = JSON.stringify(shortlistMismatchStore);
localStorage.setItem(demoStoreKey, shortlistMismatchRaw);
assert.equal(inspectPointObjectProjects(demoIdentity).status, "damaged", "a matching-hash shortlist record that differs from its result candidate must fail closed");
assert.equal(localStorage.getItem(demoStoreKey), shortlistMismatchRaw, "shortlist mismatch bytes must remain untouched");

const duplicateShortlistStore = JSON.parse(goodRaw) as { projects: Array<{ artifacts: Array<Record<string, unknown>> }> };
const duplicateShortlistArtifact = duplicateShortlistStore.projects.flatMap((project) => project.artifacts).find((artifact) => artifact.kind === "find");
assert.ok(duplicateShortlistArtifact, "expected another saved Find artifact");
const duplicateShortlistPayload = duplicateShortlistArtifact.payload as { session: { result: { candidates: Array<Record<string, unknown>> }; shortlist: Array<Record<string, unknown>>; comparisonOpen: boolean } };
const duplicatedCandidate = duplicateShortlistPayload.session.result.candidates[0];
duplicateShortlistPayload.session.shortlist = [duplicatedCandidate, { ...duplicatedCandidate }];
duplicateShortlistPayload.session.comparisonOpen = true;
duplicateShortlistArtifact.payloadHash = await hashPointObjectOperation(duplicateShortlistArtifact as unknown as PointObjectProjectOperationInput);
localStorage.setItem(demoStoreKey, JSON.stringify(duplicateShortlistStore));
assert.equal(inspectPointObjectProjects(demoIdentity).status, "damaged", "duplicate shortlist source IDs must fail closed");

const reorderedShortlistStore = JSON.parse(goodRaw) as { projects: Array<{ artifacts: Array<Record<string, unknown>> }> };
const reorderedShortlistArtifact = reorderedShortlistStore.projects.flatMap((project) => project.artifacts).find((artifact) => artifact.kind === "find");
assert.ok(reorderedShortlistArtifact, "expected a Find artifact for key-order coverage");
const reorderedShortlistPayload = reorderedShortlistArtifact.payload as { session: { result: { candidates: Array<Record<string, unknown>> }; shortlist: Array<Record<string, unknown>>; comparisonOpen: boolean } };
const reorderedCandidate = Object.fromEntries(Object.entries(reorderedShortlistPayload.session.result.candidates[0]).reverse());
reorderedShortlistPayload.session.shortlist = [reorderedCandidate];
reorderedShortlistPayload.session.comparisonOpen = false;
reorderedShortlistArtifact.payloadHash = await hashPointObjectOperation(reorderedShortlistArtifact as unknown as PointObjectProjectOperationInput);
localStorage.setItem(demoStoreKey, JSON.stringify(reorderedShortlistStore));
assert.equal(inspectPointObjectProjects(demoIdentity).status, "ready", "legitimate candidate key reordering must not invalidate an exact shortlist subset");

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

const createIdentity = pointObjectProjectIdentity({ id: "demo-create-seed", isDemoUser: true } as never);
if (!createIdentity) throw new Error("Expected a valid Create test identity.");
reconcilePointObjectBrowserIdentity(createIdentity);
await createPointObjectProject(createIdentity, "en", "Create seed regression");
const createCoordinates: Array<Array<[number, number]>> = [[
  [55.2808, 25.2182],
  [55.2828, 25.2182],
  [55.2828, 25.2197],
  [55.2808, 25.2197],
  [55.2808, 25.2182]
]];
const aoiValidation = create.validatePointObjectCreateAoiVertices(createCoordinates[0].slice(0, -1));
assert.equal(aoiValidation.ok, true);
if (!aoiValidation.ok) throw new Error("Expected a valid Create AOI fixture.");
const createAoi = {
  id: "create-aoi-route-seed-regression",
  coordinates: createCoordinates,
  vertexCount: createCoordinates[0].length - 1,
  areaSqM: aoiValidation.measurements.areaSqM,
  perimeterM: aoiValidation.measurements.perimeterM
};
const programValidation = create.validateRedevelopmentProgram({
  templateId: "residential_mixed_use",
  title: "Shaded residential courtyard mixed-use concept",
  summary: "A conceptual five-block courtyard programme for bounded massing screening.",
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
  rationale: ["Uses a courtyard form for conceptual screening only."]
});
assert.equal(programValidation.ok, true);
if (!programValidation.ok) throw new Error("Expected a valid Create programme fixture.");
const routeSeed = createAi.createProgramSeed(programValidation.value, "a".repeat(64));
const routeAlternatives = create.generateConceptMassingAlternatives(createCoordinates, programValidation.value, routeSeed, "en");
assert.equal(routeAlternatives.length, 2);
assert.deepEqual(routeAlternatives.map((item) => item.massing.seed.length), [389, 389], "the fixture must exercise the real producer seed shape that exceeded the former 256-character parser cap");
const routeGenerated = {
  mode: "openai_concept" as const,
  generatedAt: "2026-09-06T15:48:02.790Z",
  promptVersion: createAi.POINT_OBJECT_CREATE_PROMPT_VERSION,
  program: programValidation.value,
  massing: routeAlternatives[0].massing,
  alternatives: routeAlternatives,
  telemetry: {
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    requestId: "req_create_seed_regression",
    latencyMs: 10_280,
    attempts: 1,
    inputTokens: 1_011,
    outputTokens: 319,
    totalTokens: 1_330,
    estimatedCostUsd: 0.010424,
    stored: false as const,
    toolCalls: 0 as const
  },
  caveat
};
assert.ok(createResult.parsePointObjectGeneratedConcept(routeGenerated, createAoi), "a bounded seed emitted by the real Create producer must parse");

const malformedSeed = structuredClone(routeGenerated) as typeof routeGenerated;
malformedSeed.massing.seed = "";
assert.equal(createResult.parsePointObjectGeneratedConcept(malformedSeed, createAoi), null, "an empty seed must remain rejected");
const excessiveSeed = structuredClone(routeGenerated) as typeof routeGenerated;
excessiveSeed.massing.seed = "x".repeat(1_025);
assert.equal(createResult.parsePointObjectGeneratedConcept(excessiveSeed, createAoi), null, "an excessive primary seed must remain rejected");
const excessiveAlternativeSeed = structuredClone(routeGenerated) as typeof routeGenerated;
excessiveAlternativeSeed.alternatives[1].massing.seed = "x".repeat(1_025);
assert.equal(createResult.parsePointObjectGeneratedConcept(excessiveAlternativeSeed, createAoi), null, "an excessive alternative seed must remain rejected");

const createSave = await savePointObjectOperation(createIdentity, {
  kind: "create",
  locale: "en",
  marketKey: "dubai",
  label: "Route-produced Create result",
  payload: {
    aoi: createAoi,
    editorSnapshot: null,
    generated: routeGenerated,
    generatedLocale: "en",
    activeAlternativeId: "A",
    areaContext: null
  }
}, "operation-create-route-seed");
assert.equal(createSave.status, "saved", "the route-produced Create result must save successfully");
const reopenedCreate = await readVerifiedPointObjectProjects(createIdentity);
assert.equal(reopenedCreate.status, "ready", "the saved Create result must reopen with integrity verification");
const reopenedArtifact = reopenedCreate.store?.projects[0]?.artifacts[0];
assert.equal(reopenedArtifact?.kind, "create");
if (reopenedArtifact?.kind === "create") {
  assert.equal(reopenedArtifact.payload.generated.massing.seed.length, 389, "reopen must preserve the accepted producer seed exactly");
  assert.equal(reopenedArtifact.payload.generated.alternatives?.[1]?.massing.seed.length, 389, "reopen must preserve alternative seeds exactly");
}

console.log("point-to-object browser-local project contract checks passed");
