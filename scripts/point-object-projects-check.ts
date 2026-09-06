import assert from "node:assert/strict";

// @ts-expect-error Node's strip-types runner requires the physical .ts suffix; production imports remain extensionless.
import { POINT_OBJECT_BROWSER_IDENTITY_KEY, createPointObjectProject, pointObjectProjectIdentity, readPointObjectProjects, reconcilePointObjectBrowserIdentity, retryPendingPointObjectOperation, savePointObjectOperation, verifySavedPointObjectArtifact, type PointObjectProjectOperationInput } from "../src/lib/prototype/point-object-projects.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  failNextWrite = false;
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    this.values.set(key, value);
  }
}

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
Object.assign(globalThis, {
  window: { localStorage, sessionStorage, dispatchEvent: () => true }
});

const demoIdentity = pointObjectProjectIdentity({ id: "demo-user", isDemoUser: true } as never);
const userIdentity = pointObjectProjectIdentity({ id: "user-123", isDemoUser: false } as never);
assert.equal(demoIdentity, "demo:demo-user");
assert.equal(userIdentity, "user:user-123");
if (!demoIdentity || !userIdentity) throw new Error("Expected valid identities.");

const explicit = createPointObjectProject(demoIdentity, "en", "Dubai screening");
assert.equal(explicit.name, "Dubai screening");
assert.equal(readPointObjectProjects(demoIdentity).activeProjectId, explicit.projectId);
assert.equal(readPointObjectProjects(userIdentity).projects.length, 0, "another identity must not see demo projects");

const input = {
  kind: "analyse",
  locale: "en",
  marketKey: "dubai",
  label: "Selected building analysis",
  payload: {
    selection: { locationKey: "dubai" },
    analysis: { mode: "openai", generatedAt: "2026-09-06T10:00:00.000Z" }
  }
} as unknown as PointObjectProjectOperationInput;

const saved = await savePointObjectOperation(demoIdentity, input, "operation-stable-1");
assert.equal(saved.status, "saved");
if (saved.status !== "saved") throw new Error("Expected saved result.");
assert.equal(await verifySavedPointObjectArtifact(saved.artifact), true);

const replay = await savePointObjectOperation(demoIdentity, input, "operation-stable-1");
assert.equal(replay.status, "replayed", "identical retry must replay without a duplicate");
assert.equal(readPointObjectProjects(demoIdentity).projects[0]?.artifacts.length, 1);

const conflict = await savePointObjectOperation(demoIdentity, {
  ...input,
  payload: { ...input.payload, changed: true }
} as unknown as PointObjectProjectOperationInput, "operation-stable-1");
assert.equal(conflict.status, "conflict", "same key with a different hash must fail closed");
assert.equal(readPointObjectProjects(demoIdentity).projects[0]?.artifacts.length, 1);

localStorage.failNextWrite = true;
const failed = await savePointObjectOperation(demoIdentity, { ...input, label: "Retryable result" }, "operation-stable-2");
assert.equal(failed.status, "failed");
const retried = await retryPendingPointObjectOperation(demoIdentity);
assert.equal(retried?.status, "saved", "retry must reuse the pending operation after storage recovers");
if (retried?.status === "saved") assert.equal(retried.artifact.idempotencyKey, "operation-stable-2");

sessionStorage.setItem("geoai:point-to-object:selection:v3", "transient");
localStorage.setItem(POINT_OBJECT_BROWSER_IDENTITY_KEY, demoIdentity);
reconcilePointObjectBrowserIdentity(userIdentity);
assert.equal(sessionStorage.getItem("geoai:point-to-object:selection:v3"), null, "identity transition must clear transient point state");
assert.equal(readPointObjectProjects(demoIdentity).projects.length, 1, "identity transition must not destroy scoped saved projects");

const demoStoreKey = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
  .find((key): key is string => key?.startsWith("geoai:point-to-object:projects:v1:") === true);
assert.ok(demoStoreKey, "expected the identity-scoped project store");
const malformedStore = JSON.parse(localStorage.getItem(demoStoreKey) ?? "null") as { projects: Array<{ artifacts: Array<{ marketKey: string }> }> };
malformedStore.projects[0].artifacts[0].marketKey = "unregistered_market";
localStorage.setItem(demoStoreKey, JSON.stringify(malformedStore));
assert.equal(readPointObjectProjects(demoIdentity).projects.length, 0, "unregistered markets must fail the stored-project parser closed");

console.log("point-to-object browser-local project contract checks passed");
