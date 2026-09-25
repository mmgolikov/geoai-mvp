import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VISUAL_EVIDENCE_OPT_IN, VISUAL_EVIDENCE_MAX_IMAGES, VISUAL_EVIDENCE_MAX_PNG_BYTES, VISUAL_EVIDENCE_VIEWS,
  validateVisualEvidenceEnvironment, publicMapPngMetadata, createVisualEvidenceWriter, capturePublicMapView, captureNight21AnalysisDashboard } from "../tests/e2e/helpers/night21-visual-evidence.ts";

// A fixed 1x1 PNG byte fixture tests file contracts only. It is never a rendered
// product screenshot or acceptance artifact; all temporary fixtures are removed.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=", "base64");
const root = realpathSync(mkdtempSync(join(tmpdir(), "geoai-visual-evidence-check-")));
chmodSync(root, 0o700);
const privateChild = name => { const path = join(root, name); mkdirSync(path, { mode: 0o700 }); return path; };
try {
  assert.equal(VISUAL_EVIDENCE_MAX_IMAGES, 6);
  assert.equal(VISUAL_EVIDENCE_MAX_PNG_BYTES, 5 * 1024 * 1024);
  const directory = privateChild("positive");
  const env = { GEOAI_SPRINT10_VISUAL_EVIDENCE_CAPTURE: VISUAL_EVIDENCE_OPT_IN, GEOAI_SPRINT10_VISUAL_EVIDENCE_DIR: directory };
  assert.deepEqual(validateVisualEvidenceEnvironment({}, "dubai-find"), {});
  assert.deepEqual(validateVisualEvidenceEnvironment(env, "dubai-find"), env);
  assert.deepEqual(validateVisualEvidenceEnvironment(env, "quality20-analyse"), env);
  for (const scope of [undefined, "dubai-analyse", "login", "profile", "alice@example.test"]) {
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
  const mapViews = VISUAL_EVIDENCE_VIEWS.filter(view => !view.startsWith("analysis-"));
  for (const view of mapViews) writer.record(view, png);
  assert.throws(() => writer.record("analysis-dashboard", png), /scope/);
  assert.ok(VISUAL_EVIDENCE_VIEWS.length <= VISUAL_EVIDENCE_MAX_IMAGES && VISUAL_EVIDENCE_MAX_IMAGES <= 6);
  assert.throws(() => writer.record("sixth-unapproved", png));
  assert.throws(() => writer.record("find-comparison-map", png));
  assert.throws(() => writer.record("../profile", png));
  const index = writer.finalize("passed");
  assert.equal(index.commit, "a".repeat(40));
  assert.equal(index.scope, "journey");
  assert.equal(index.outcome, "passed");
  assert.deepEqual(index.images.map(item => item.view), mapViews);
  assert.equal(index.capture, "real_browser_map_canvas_after_assertions");
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
  const analysisDir = privateChild("analysis");
  const analysisWriter = createVisualEvidenceWriter(analysisDir, "d".repeat(40), "quality20-analyse");
  for (const view of mapViews) assert.throws(() => analysisWriter.record(view, png), /scope/);
  for (const view of ["analysis-dashboard", "analysis-decision-cards"]) {
    assert.equal(analysisWriter.accepts(view), true);
    analysisWriter.record(view, png);
    if (view === "analysis-dashboard") assert.throws(() => analysisWriter.finalize("passed"), /both complete/);
    assert.throws(() => analysisWriter.record(view, png), /duplicated/);
    assert.equal(lstatSync(join(analysisDir, `${view}.png`)).mode & 0o777, 0o600);
  }
  const analysisIndex = analysisWriter.finalize("passed");
  assert.equal(analysisIndex.capture, "real_browser_public_analysis_panels_after_assertions");
  assert.equal(analysisIndex.authOrProfileCaptured, false);
  assert.equal(analysisIndex.images.length, 2);
  assert.deepEqual(JSON.parse(readFileSync(join(analysisDir, "index.json"), "utf8")), analysisIndex);
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

  // Synthetic DOM/PNG-header mocks exercise guard logic, not rendering. The
  // mocked screenshot buffer is never persisted or labelled browser evidence.
  const priorHTMLElement = globalThis.HTMLElement;
  let capturedViews = [], analysisShots = 0, visible = true, panelCount = 1;
  let analysisRect = { ...rect }, publicText = "Public open-map screening hypothesis; official validation required.";
  let privateOverlap = [], embedded = false, parentId = "ai-success", wrongDimensions = false, becomePrivate = false;
  let scenario = "development_screening", completedScenario = scenario, depth = "standard", inFlight = "none", moduleCount = 2;
  class Panel {
    constructor(kind) { this.kind = kind; }
    tagName = "SECTION";
    get parentElement() { return { getAttribute: () => parentId }; }
    get innerText() { return publicText; }
    getBoundingClientRect() { return analysisRect; }
    getAttribute() { return this.kind === "cards" ? "role-decision-cards" : null; }
    querySelector(selector) { return selector.includes("analysis-caveat") ? this.kind === "brief" ? {} : null : embedded ? {} : null; }
  }
  globalThis.HTMLElement = Panel;
  globalThis.document = { querySelectorAll: selector => selector.startsWith("header") ? privateOverlap : [] };
  const panel = kind => ({ count: async () => panelCount, isVisible: async () => visible, scrollIntoViewIfNeeded: async () => {},
    evaluate: async (callback, arg) => callback(new Panel(kind), arg),
    screenshot: async () => {
      analysisShots++;
      if (becomePrivate) publicText = "alice@example.test";
      const bytes = Buffer.from(png); bytes.writeUInt32BE(wrongDimensions ? 3010 : analysisRect.width, 16); bytes.writeUInt32BE(analysisRect.height, 20); return bytes;
    } });
  const briefPanel = panel("brief");
  const cardsPanel = { ...panel("cards"), getAttribute: async key => ({ "data-scenario": scenario, "data-depth": depth, "data-dashboard-version": "SCENARIO_DECISION_DASHBOARD_V3" })[key],
    getByTestId: () => ({ count: async () => 1 }), locator: () => ({ count: async () => moduleCount }) };
  const success = { count: async () => 1, isVisible: async () => visible, getByTestId: () => cardsPanel,
    locator: () => ({ filter: () => briefPanel }) };
  const requestState = { count: async () => 1, getAttribute: async key => ({ "data-completed-scenario": completedScenario, "data-completed-depth": "standard", "data-in-flight-depth": inFlight })[key] };
  const analysisPage = { url: () => "https://preview.example.test/prototype/point-to-object/analysis",
    getByTestId: id => id === "ai-success" ? success : id === "analysis-request-state" ? requestState : {} };
  const panelWriter = { accepts: () => true, has: view => capturedViews.includes(view), record: view => capturedViews.push(view) };
  try {
    await captureNight21AnalysisDashboard({ url: () => "/invalid" }, null);
    await assert.rejects(() => captureNight21AnalysisDashboard(analysisPage, { ...panelWriter, accepts: () => false }), /scope/);
    for (const path of ["/profile", "/login", "/prototype/point-to-object"]) {
      await assert.rejects(() => captureNight21AnalysisDashboard({ ...analysisPage, url: () => `https://preview.example.test${path}` }, panelWriter), /auth\/profile/);
    }
    for (const [mutate, undo, pattern] of [
      [() => { visible = false; }, () => { visible = true; }, /visible/],
      [() => { panelCount = 2; }, () => { panelCount = 1; }, /one actual/],
      [() => { completedScenario = "other"; }, () => { completedScenario = scenario; }, /scenario\/depth/],
      [() => { depth = "deep"; }, () => { depth = "standard"; }, /scenario\/depth/],
      [() => { inFlight = "standard"; }, () => { inFlight = "none"; }, /scenario\/depth/],
      [() => { moduleCount = 0; }, () => { moduleCount = 2; }, /visual modules/],
      [() => { parentId = "profile"; }, () => { parentId = "ai-success"; }, /exact public/],
      [() => { analysisRect = { ...rect, width: 100 }; }, () => { analysisRect = { ...rect }; }, /dimensions/],
      [() => { analysisRect = { ...rect, height: 8193 }; }, () => { analysisRect = { ...rect }; }, /no truncation/],
      [() => { privateOverlap = [{ getBoundingClientRect: () => rect }]; }, () => { privateOverlap = []; }, /overlaps header/],
      [() => { embedded = true; }, () => { embedded = false; }, /embedded/],
      ...["alice@example.test", "Bearer secret", "sk-secret", "sb_secret_private", "eyJcredential", "password=private", "", "x".repeat(120001)]
        .map(text => [() => { publicText = text; }, () => { publicText = "Public screening hypothesis; official validation required."; }, /private-shaped/])
    ]) {
      mutate(); await assert.rejects(() => captureNight21AnalysisDashboard(analysisPage, panelWriter), pattern); undo();
      assert.equal(analysisShots, 0, "Privacy/state/dimension guards reject before taking a screenshot.");
    }
    wrongDimensions = true;
    await assert.rejects(() => captureNight21AnalysisDashboard(analysisPage, panelWriter), /dimensions differ/);
    wrongDimensions = false;
    becomePrivate = true;
    await assert.rejects(() => captureNight21AnalysisDashboard(analysisPage, panelWriter), /private-shaped/);
    becomePrivate = false; publicText = "Public screening hypothesis; official validation required.";
    assert.deepEqual(capturedViews, [], "No PNG is recorded when a post-capture guard fails.");
    await captureNight21AnalysisDashboard(analysisPage, panelWriter);
    assert.deepEqual(capturedViews, ["analysis-dashboard", "analysis-decision-cards"]);
    const shots = analysisShots;
    await captureNight21AnalysisDashboard(analysisPage, panelWriter);
    assert.equal(analysisShots, shots, "Already recorded views are not captured again.");
  } finally { globalThis.document = priorDocument; globalThis.HTMLElement = priorHTMLElement; }
  const source = readFileSync(new URL("../tests/e2e/helpers/night21-visual-evidence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fullPage:|page.screenshot|fitBounds|easeTo|setPitch|route.fulfill/);
  assert.match(source, /canvas.screenshot\(\{ type: "png", scale: "css" \}\)/);
  assert.match(source, /panel.screenshot\(\{ type: "png", scale: "css" \}\)/);
  const cardsSource = readFileSync(new URL("../components/point-to-object/decision-cards.tsx", import.meta.url), "utf8");
  assert.match(cardsSource, /data-testid="role-decision-cards" data-goal=\{request.goal\} data-depth=\{request.depth\} data-scenario=\{request.scenario\}/);
  assert.match(cardsSource, /data-testid="dashboard-hero-metrics"/);
  const analysisSource = readFileSync(new URL("../components/point-to-object/analysis-client.tsx", import.meta.url), "utf8");
  assert.match(analysisSource, /data-testid="ai-success"/);
  assert.match(analysisSource, /data-testid="analysis-caveat"/);
  const spec = readFileSync(new URL("../tests/e2e/sprint10-live-journey.spec.ts", import.meta.url), "utf8");
  assert.match(spec, /await verifyComparison\(\);\s*await capturePublicMapView\(page, configuration.visualEvidence, "find-comparison-map"\)/);
  assert.ok(spec.indexOf("geometry: expected, framed: true, useful: true") < spec.indexOf('capturePublicMapView(page, visualEvidence, "create-a-map-3d")'));
  assert.match(spec, /!goldenConcept && !configuration\.quality20\) await captureObservedB\("2d"\)/);
  assert.equal(readdirSync(directory).length, mapViews.length + 1);
  console.log("PASS: map plus two analysis-panel opt-in/scope/privacy/completed-scenario guards, bounded PNG dimensions/size, private exclusive files/index/hash readback, no-overwrite/symlink denial. Offline DOM/byte mocks only; no product/browser/source/AI calls.");
} finally { rmSync(root, { recursive: true, force: true }); }
