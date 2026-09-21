import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VISUAL_EVIDENCE_OPT_IN, VISUAL_EVIDENCE_MAX_IMAGES, VISUAL_EVIDENCE_MAX_PNG_BYTES, VISUAL_EVIDENCE_VIEWS,
  validateVisualEvidenceEnvironment, publicMapPngMetadata, createVisualEvidenceWriter, capturePublicMapView } from "../tests/e2e/helpers/night21-visual-evidence.ts";

// A fixed 1x1 PNG byte fixture tests file contracts only. It is never a rendered
// product screenshot or acceptance artifact; all temporary fixtures are removed.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=", "base64");
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-visual-evidence-check-")));
chmodSync(root, 0o700);
const privateChild = name => { const path = join(root, name); mkdirSync(path, { mode: 0o700 }); return path; };
try {
  const directory = privateChild("positive");
  const env = { GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE: VISUAL_EVIDENCE_OPT_IN, GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: directory };
  assert.deepEqual(validateVisualEvidenceEnvironment({}, "dubai-find"), {});
  assert.deepEqual(validateVisualEvidenceEnvironment(env, "dubai-find"), env);
  for (const scope of [undefined, "dubai-analyse", "quality20-analyse", "login", "profile", "alice@example.test"]) {
    assert.throws(() => validateVisualEvidenceEnvironment(env, scope));
  }
  for (const bad of [{ ...env, GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE: "yes" },
    { GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: directory }, { GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE: VISUAL_EVIDENCE_OPT_IN },
    { ...env, GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: "relative" },
    { ...env, GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: join(root, "missing") }]) assert.throws(() => validateVisualEvidenceEnvironment(bad, "dubai-find"));
  const unsafe = privateChild("unsafe"); chmodSync(unsafe, 0o755);
  assert.throws(() => validateVisualEvidenceEnvironment({ ...env, GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: unsafe }, "dubai-find"));
  const linked = join(root, "linked"); symlinkSync(directory, linked);
  assert.throws(() => validateVisualEvidenceEnvironment({ ...env, GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: linked }, "dubai-find"));
  const metadata = publicMapPngMetadata(png);
  assert.deepEqual(metadata, { width: 1, height: 1, bytes: png.length, sha256: createHash("sha256").update(png).digest("hex") });
  assert.throws(() => publicMapPngMetadata(Buffer.alloc(VISUAL_EVIDENCE_MAX_PNG_BYTES + 1)));
  assert.throws(() => publicMapPngMetadata(Buffer.from("not a png")));
  for (const [offset, value] of [[16, 0], [20, 0], [16, 8193], [16, 8192], [20, 8193]]) {
    const mutated = Buffer.from(png); mutated.writeUInt32BE(value, offset);
    if (value === 8192) mutated.writeUInt32BE(8192, 20);
    assert.throws(() => publicMapPngMetadata(mutated));
  }
  const writer = createVisualEvidenceWriter(directory, "a".repeat(40), "journey");
  for (const view of VISUAL_EVIDENCE_VIEWS) writer.record(view, png);
  assert.ok(VISUAL_EVIDENCE_VIEWS.length <= VISUAL_EVIDENCE_MAX_IMAGES && VISUAL_EVIDENCE_MAX_IMAGES <= 6);
  assert.throws(() => writer.record("sixth-unapproved", png));
  assert.throws(() => writer.record("find-comparison-map", png));
  assert.throws(() => writer.record("../profile", png));
  const index = writer.finalize("passed");
  assert.equal(index.commit, "a".repeat(40));
  assert.equal(index.scope, "journey");
  assert.equal(index.outcome, "passed");
  assert.deepEqual(index.images.map(item => item.view), [...VISUAL_EVIDENCE_VIEWS]);
  assert.ok(index.images.every(item => item.width === 1 && item.height === 1 && item.bytes === png.length && item.sha256 === metadata.sha256));
  assert.deepEqual(JSON.parse(readFileSync(join(directory, "index.json"), "utf8")), index);
  for (const item of index.images) {
    const bytes = readFileSync(join(directory, item.file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
    assert.equal(lstatSync(join(directory, item.file)).mode & 0o777, 0o600);
    assert.equal(lstatSync(join(directory, item.file)).nlink, 1);
  }
  assert.equal(lstatSync(join(directory, "index.json")).mode & 0o777, 0o600);
  assert.doesNotMatch(JSON.stringify(index), /@|password|userId|email|Bearer|token|\/private\/|\/Users\//);
  assert.throws(() => writer.finalize("passed"));
  assert.throws(() => validateVisualEvidenceEnvironment(env, "dubai-find"), /empty/);
  const failed = createVisualEvidenceWriter(privateChild("failed"), "b".repeat(40), "dubai-find");
  assert.throws(() => failed.record("create-a-map-3d", png), /scope/);
  assert.throws(() => failed.finalize("passed"), /at least one/);
  assert.equal(failed.finalize("failed").images.length, 0);
  const createOnly = createVisualEvidenceWriter(privateChild("create-only"), "b".repeat(40), "dubai-create");
  assert.throws(() => createOnly.record("find-comparison-map", png), /scope/);
  assert.equal(createOnly.finalize("inconclusive").images.length, 0);
  const collisionDir = privateChild("collision");
  const collision = createVisualEvidenceWriter(collisionDir, "c".repeat(40), "dubai-find");
  const destination = join(collisionDir, "find-comparison-map.png");
  symlinkSync(join(directory, "find-comparison-map.png"), destination);
  assert.throws(() => collision.record("find-comparison-map", png));
  assert.ok(readFileSync(join(directory, "find-comparison-map.png")).equals(png));
  const indexCollisionDir = privateChild("index-collision");
  const indexCollision = createVisualEvidenceWriter(indexCollisionDir, "c".repeat(40), "dubai-find");
  writeFileSync(join(indexCollisionDir, "index.json"), "existing", { mode: 0o600 });
  assert.throws(() => indexCollision.finalize("failed"));
  assert.equal(readFileSync(join(indexCollisionDir, "index.json"), "utf8"), "existing");

  // Exercise actual capture guard callbacks without launching a browser. No PNG
  // is manufactured or credited as a successful browser capture here.
  let screenshotCalls = 0;
  const mockWriter = { has: () => false, record: () => assert.fail("must reject before recording") };
  await capturePublicMapView({ url: () => "/invalid" }, null, "find-comparison-map");
  await assert.rejects(() => capturePublicMapView({ url: () => "http://127.0.0.1/profile" }, mockWriter, "find-comparison-map"), /auth\/profile/);
  const rect = { left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200 };
  class Canvas { getBoundingClientRect() { return rect; } }
  const priorDocument = globalThis.document; const priorCanvas = globalThis.HTMLCanvasElement;
  globalThis.HTMLCanvasElement = Canvas;
  let privateNodes = [{ getBoundingClientRect: () => rect }];
  globalThis.document = { querySelectorAll: selector => selector.startsWith("header") ? privateNodes : [] };
  const canvas = { count: async () => 1, scrollIntoViewIfNeeded: async () => {}, evaluate: async callback => callback(new Canvas()),
    screenshot: async () => { screenshotCalls++; return png; } };
  const locator = { getByTestId: () => locator, locator: () => canvas };
  const page = { url: () => "http://127.0.0.1/prototype/point-to-object", getByTestId: () => locator };
  try {
    await assert.rejects(() => capturePublicMapView(page, mockWriter, "find-comparison-map"), /overlaps header/);
    assert.equal(screenshotCalls, 0);
    privateNodes = [];
    await assert.rejects(() => capturePublicMapView(page, mockWriter, "find-comparison-map"), /dimensions differ/);
    assert.equal(screenshotCalls, 1);
  } finally { globalThis.document = priorDocument; globalThis.HTMLCanvasElement = priorCanvas; }
  const source = readFileSync(new URL("../tests/e2e/helpers/night21-visual-evidence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fullPage:|page.screenshot|fitBounds|easeTo|setPitch|route.fulfill/);
  assert.match(source, /canvas.screenshot\(\{ type: "png", scale: "css" \}\)/);
  const spec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
  assert.match(spec, /await verifyComparison\(\);\s*await capturePublicMapView\(page, configuration.visualEvidence, "find-comparison-map"\)/);
  assert.ok(spec.indexOf("geometry: expected, framed: true, useful: true") < spec.indexOf('capturePublicMapView(page, visualEvidence, "create-a-map-3d")'));
  assert.match(spec, /!goldenConcept && !configuration\.quality20\) await captureObservedB\("2d"\)/);
  assert.equal(readdirSync(directory).length, VISUAL_EVIDENCE_VIEWS.length + 1);
  console.log("PASS: opt-in/scope/privacy guards, bounded PNG dimensions/size, private exclusive files/index/hash readback, no-overwrite/symlink denial. Offline byte fixtures only; no product/browser/source/AI calls.");
} finally { rmSync(root, { recursive: true, force: true }); }
