import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";
import {
  chooseD2ThroughSearch, expectD2TransportQuiet, installD2Transport, loadD2FixtureBundle,
  openD2Analysis, publicD2Snapshot, type D2Bundle, type D2Case, type D2Locale, type D2Signals
} from "./helpers/d2-context-fixture";
import { installLoopbackBrowserHarness, requireLoopbackTestOrigin } from "./helpers/local-webkit-csp";

// AUTHOR ONLY: Root is the sole runner. This is a synthetic public POST-error
// handler regression, NOT paid G2, real U1 usefulness, Auth or provider evidence.
// Reuse test_1's existing route-projected fixtures without editing/copying them.
// Source hashes retain the reviewed baseline, with Root-approved optional
// Verification diagnostic component refresh at Root29b; all other pins stay.
// Retained fixture source/base are unchanged. Discovery never runs the producer.
const AUTHORITY = {
  productCommit: "29b6781dfb4fa109070d696c19a96136a053df04",
  rootProductCommit: "29b6781dfb4fa109070d696c19a96136a053df04",
  rootReadOnlyHead: "29b6781dfb4fa109070d696c19a96136a053df04",
  fixtureBaseCommit: "622f48f191bb8e968d2e7efcfabdb571774ff3cb",
  sourceHash: "f55ad27098707b5a6efd1ee6d5bd7d8373cff9bd1eddd656207cf70cb15fe67d"
} as const;
const CODE_HASHES = {
  "components/point-to-object/analysis-client.tsx": "de37f695d08970dc57fc98d3f66284a03a59cdb27ae4913e7f37bef665ccf992",
  "components/point-to-object/live-session.ts": "b8fa8aa01dbbec9729a05e4ed54bfd0590cf18cae45f65effc33ead9f20c320e",
  "components/point-to-object/verification-export.tsx": "52f6c571a589f2d3224c0f6f0ba667c6d54ae50284f8d9e3604fc405e8eb8277",
  "src/lib/prototype/point-to-object-ai-core.ts": "ff47efb70998d7064a094fa86a57f716a2640d8733114c6b19fa88a524892987",
  "src/lib/prototype/point-to-object-ai.ts": "60687ead197564e9a38a7c1f45815a5198db42a4affccc056e5a24e211a6e1a8",
  "app/api/prototype/point-to-object/ai/route.ts": "42f4fecec5c02519029c3872dfa22409265992bb1f89e1b1374c1b57c457878e",
  "src/lib/prototype/point-to-object-verification-export.ts": "53d242f766995d6165f9946f6ee4da6d1a91f16b67dfd6f613c345c875844e42",
  "tests/e2e/helpers/d2-context-fixture.ts": "c0934653ecb839a6c24d02f3e5ad73caacdd0a8f4214b6db735eacf0b0941edf",
  "tests/e2e/helpers/local-webkit-csp.ts": "78896ad9a702d29f7c3a3416e9d69c7720ffd8a82c46c760cc7d5871d6eb16ba",
  "tests/e2e/helpers/sprint10-analysis-fixture.ts": "9630407cdabc6bcde9387880467340782e245f42bb05444d676c244050272c5c",
  "scripts/d2-context-http-contract-check.mjs": "8f897a410c31c25c8c2e8eed13d7f527306ffe8857e0a61da7e5972b3a21363a",
  "tests/fixtures/d2-context/transport.json": "2541f96ceb6e443a564c04d4b08a244611c4d67c4aa61db0371ecb48ea778019"
} as const;
const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const ERROR = "D2 synthetic AI_OUTPUT_INVALID: no provider output accepted.";
const QUIET_OBSERVATION_MS = 500;
let bundles: Record<D2Locale, D2Bundle>;

test.describe.configure({ retries: 0 });
test.use({ serviceWorkers: "block" });
test.beforeAll(() => {
  for (const [file, hash] of Object.entries(CODE_HASHES)) {
    expect(createHash("sha256").update(readFileSync(path.join(process.cwd(), file))).digest("hex"),
      "Root source must match the frozen Product/fixture contract: " + file).toBe(hash);
  }
  const deadline = Date.now() + 30_000;
  bundles = { en: loadD2FixtureBundle("en", deadline - Date.now()), ru: loadD2FixtureBundle("ru", deadline - Date.now()) };
  for (const locale of ["en", "ru"] as const) {
    expect(bundles[locale].baseCommit).toBe(AUTHORITY.fixtureBaseCommit);
    expect(bundles[locale].sourceHash).toBe(AUTHORITY.sourceHash);
  }
});
test.beforeEach(async ({ page, browserName }, info) => {
  requireLoopbackTestOrigin(info.project.use.baseURL);
  await installLoopbackBrowserHarness(page, browserName, info.project.use.baseURL);
});

function object(value: unknown, label: string): Record<string, unknown> {
  expect(value, label).not.toBeNull();
  expect(typeof value, label).toBe("object");
  expect(Array.isArray(value), label).toBe(false);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing public " + label);
  return value as Record<string, unknown>;
}

// Context diagnostic amendment: final public contract and reviewed Root29b.
// Root explicitly approved the one old component pin and three authority fields.
// Original four AI-502 callbacks and all remaining old pins stay intact.
const CONTEXT_SOURCE_HASHES = {
  "components/point-to-object/verification-export.tsx": "52f6c571a589f2d3224c0f6f0ba667c6d54ae50284f8d9e3604fc405e8eb8277",
  "components/point-to-object/prototype-client-v5.tsx": "e33c2756aa131a00e776c06f66024376dcef501cfbe7c6c2978d44184f0c86e3",
  "src/lib/prototype/point-to-object-context-diagnostic.ts": "55b0ff3c5f7268ae2975efc77b46f7bd61348dd69428a42456d83030087ff67b"
} as const;
test.beforeAll(() => {
  for (const [file, hash] of Object.entries(CONTEXT_SOURCE_HASHES))
    expect(createHash("sha256").update(readFileSync(path.join(process.cwd(), file))).digest("hex"),
      "Context diagnostic source must match the reviewed Root29b contract: " + file).toBe(hash);
});
const CONTEXT_DIAGNOSTIC_PROTOCOL = "GEOAI_PREVIEW_CONTEXT_REQUEST_DIAGNOSTIC_V1";
const CONTEXT_PRIVATE_MARKER = "SYNTHETIC_CONTEXT_PRIVATE_MARKER_NOT_FOR_DIAGNOSTIC";
type ContextOutcome = "http_response" | "client_deadline" | "transport_unknown" | "parse_unknown";
const CONTEXT_CODES = { http_response: "CONTEXT_HTTP_RESPONSE_ERROR", client_deadline: "CONTEXT_CLIENT_DEADLINE",
  transport_unknown: "CONTEXT_TRANSPORT_UNKNOWN", parse_unknown: "CONTEXT_RESPONSE_PARSE_UNKNOWN" } as const;
function contextItem(locale: D2Locale, key: "u1" | "u2" = "u1") {
  const item = bundles[locale].cases.find(value => value.key === key);
  if (!item) throw new Error("Missing existing admitted Context selection fixture");
  return item;
}
function contextHttpError(code: "OVERPASS_TIMEOUT" | "OVERPASS_UNAVAILABLE" = "OVERPASS_TIMEOUT") {
  return { mode: "unavailable", code, error: CONTEXT_PRIVATE_MARKER, retryable: true };
}
async function contextFailureSetup(page: Page, baseURL: string, locale: D2Locale, width: number) {
  const item = contextItem(locale);
  await page.setViewportSize({ width, height: 900 });
  await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
  return { item, signals: await installD2Transport(page, baseURL, item) };
}
async function readContextDiagnostic(page: Page, intent: Record<string, unknown>,
  outcome: ContextOutcome, httpStatus: number | null, serverCode: string | null, timeout = 20_000) {
  const widget = page.getByTestId("verification-export");
  await expect(widget).toBeVisible();
  if (!await widget.evaluate(element => element.hasAttribute("open"))) await widget.locator("summary").click();
  const textarea = widget.getByTestId("context-request-diagnostic");
  await expect(textarea).toBeVisible({ timeout }); await expect(textarea).toHaveAttribute("readonly", "");
  await expect(textarea).toHaveCount(1);
  const raw = await textarea.inputValue(), value = object(JSON.parse(raw), "Context diagnostic");
  expect(Buffer.byteLength(raw, "utf8")).toBeLessThanOrEqual(2048);
  expect(Object.keys(value).sort()).toEqual(["protocol", "operation", "intent", "intentSha256", "hashStatus",
    "startedAt", "completedAt", "elapsedMs", "timingScope", "httpStatus", "outcome", "errorCode", "serverCode", "proofScope", "upstreamCause"].sort());
  expect(value).toMatchObject({ protocol: CONTEXT_DIAGNOSTIC_PROTOCOL, operation: "context", outcome, httpStatus,
    errorCode: CONTEXT_CODES[outcome], serverCode, timingScope: "client_operation_including_debounce_not_upstream_latency",
    proofScope: "client_observation_not_source_evidence", upstreamCause: "unverified" });
  expect(value.intent).toEqual(intent);
  expect(Object.keys(object(value.intent, "Context diagnostic intent")).sort())
    .toEqual(["caseKey", "expectedSourceFeatureId", "latitude", "locale", "longitude"].sort());
  if (value.hashStatus === "sha256") expect(value.intentSha256).toBe(createHash("sha256").update(canonicalJson(intent)).digest("hex"));
  else { expect(value.hashStatus).toBe("unavailable"); expect(value.intentSha256).toBeNull(); }
  expect(typeof value.startedAt).toBe("string"); expect(typeof value.completedAt).toBe("string");
  expect(Number.isFinite(Date.parse(String(value.startedAt)))).toBe(true);
  expect(Date.parse(String(value.completedAt))).toBeGreaterThanOrEqual(Date.parse(String(value.startedAt)));
  expect(typeof value.elapsedMs).toBe("number"); expect(Number.isSafeInteger(value.elapsedMs)).toBe(true);
  expect(value.elapsedMs).toBeGreaterThanOrEqual(0); expect(raw).not.toContain(CONTEXT_PRIVATE_MARKER);
  return { raw, value, textarea, widget };
}
async function captureContextFailure(page: Page, info: TestInfo, signals: D2Signals,
  observed: Awaited<ReturnType<typeof readContextDiagnostic>>, locale: D2Locale, width: number, contextPosts: number) {
  const snapshot = await publicD2Snapshot(page);
  expect(snapshot.protocol).toBe("GEOAI_PREVIEW_VERIFICATION_V1");
  expect(snapshot.records).toEqual([]); expect(snapshot.failedResponses).toBeUndefined();
  expect(JSON.stringify(snapshot)).not.toContain(CONTEXT_DIAGNOSTIC_PROTOCOL);
  expect(object(object(snapshot.preSubmit, "Context pre-submit").sourceSnapshot, "Context source").context).toBeNull();
  expect(await observed.textarea.inputValue()).toBe(observed.raw);
  await expect(page.getByTestId("ai-success")).toHaveCount(0);
  await expect(page.getByTestId("normalized-context-dashboard")).toHaveCount(0);
  const bounds = await observed.widget.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 2);
  const screenshot = info.outputPath("context-diagnostic-" + locale + "-" + width + ".png");
  await observed.widget.screenshot({ path: screenshot });
  await info.attach("context-request-diagnostic", { body: observed.raw, contentType: "application/json" });
  await info.attach("context-diagnostic-component", { path: screenshot, contentType: "image/png" });
  await page.waitForTimeout(QUIET_OBSERVATION_MS);
  expect(await observed.textarea.inputValue()).toBe(observed.raw);
  expect(counters(signals)).toEqual({ contextPosts, aiPosts: 0, challenges: 0 });
  expectD2TransportQuiet(signals);
}
async function settleCancelledContext(route: Route, info: TestInfo) {
  let transportOutcome = "fulfilled_interception_not_proof_of_browser_delivery";
  try { await route.fulfill({ status: 504, json: contextHttpError() }); }
  catch (error) {
    if (!/closed|cancel|abort|disposed|invalid interception id/i.test(String(error))) throw error;
    transportOutcome = "aborted_or_closed_transport";
  }
  await info.attach("context-old-transport", { body: JSON.stringify({ transportOutcome,
    scope: "Cancellation/ownership isolation only; late browser delivery is not established." }), contentType: "application/json" });
}

for (const [locale, width] of [["en", 1440], ["ru", 390]] as const) {
  test("D2 Context actual HTTP504 diagnostic stays separate from evidence " + locale + " " + width, async ({ page }, info) => {
    const { item, signals } = await contextFailureSetup(page, info.project.use.baseURL!, locale, width);
    await page.route("**/api/prototype/point-to-object/context", async route => {
      signals.contextPosts.push(route.request().postDataJSON());
      await route.fulfill({ status: 504, json: contextHttpError(), headers: { "x-synthetic-private-marker": CONTEXT_PRIVATE_MARKER } });
    });
    await chooseD2ThroughSearch(page, item, locale);
    await expect.poll(() => signals.contextPosts.length).toBe(1);
    const observed = await readContextDiagnostic(page, signals.contextPosts[0], "http_response", 504, "OVERPASS_TIMEOUT");
    await captureContextFailure(page, info, signals, observed, locale, width, 1);
  });
}
test("D2 Context existing client deadline and explicit same-object Retry isolate the cancelled request", async ({ page }, info) => {
  const { item, signals } = await contextFailureSetup(page, info.project.use.baseURL!, "en", 390);
  const held: Route[] = [];
  await page.route("**/api/prototype/point-to-object/context", route => {
    signals.contextPosts.push(route.request().postDataJSON()); held.push(route);
  });
  await chooseD2ThroughSearch(page, item, "en");
  await expect.poll(() => held.length).toBe(1);
  // Wait for the real existing AbortSignal.timeout(30_000), including debounce.
  // No clock override, Product timeout change or artificial 504 is involved.
  const first = await readContextDiagnostic(page, signals.contextPosts[0], "client_deadline", null, null, 40_000);
  expect(first.value.elapsedMs).toBeGreaterThanOrEqual(29_000);
  await page.locator("#workspace-task").getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => held.length).toBe(2);
  await expect(page.getByTestId("context-request-diagnostic")).toHaveCount(0);
  await held[1].fulfill({ status: 504, json: contextHttpError() });
  const second = await readContextDiagnostic(page, signals.contextPosts[1], "http_response", 504, "OVERPASS_TIMEOUT");
  expect(second.value.intent).toEqual(first.value.intent); expect(second.value.startedAt).not.toBe(first.value.startedAt);
  await settleCancelledContext(held[0], info);
  await captureContextFailure(page, info, signals, second, "en", 390, 2);
});
test("D2 Context transport rejection cannot invent an HTTP status ru 1440", async ({ page }, info) => {
  const { item, signals } = await contextFailureSetup(page, info.project.use.baseURL!, "ru", 1440);
  await page.route("**/api/prototype/point-to-object/context", route => {
    signals.contextPosts.push(route.request().postDataJSON()); return route.abort("failed");
  });
  await chooseD2ThroughSearch(page, item, "ru");
  await expect.poll(() => signals.contextPosts.length).toBe(1);
  const observed = await readContextDiagnostic(page, signals.contextPosts[0], "transport_unknown", null, null);
  await captureContextFailure(page, info, signals, observed, "ru", 1440, 1);
});
test("D2 Context controlled body-read stall preserves received HTTP200 at the existing client deadline", async ({ page }, info) => {
  const { item, signals } = await contextFailureSetup(page, info.project.use.baseURL!, "en", 1440);
  // Controlled browser transport seam: the mocked HTTP200 Response is really
  // received, then only its json() read is held. No upstream/body-timeout claim,
  // private state, changed Product timeout, fabricated status or second fetch.
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (new URL(url, window.location.href).pathname === "/api/prototype/point-to-object/context" && method === "POST")
        Object.defineProperty(response, "json", { configurable: true, value: () => new Promise<never>(() => {}) });
      return response;
    };
  });
  await page.route("**/api/prototype/point-to-object/context", route => {
    signals.contextPosts.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, json: item.envelope });
  });
  await chooseD2ThroughSearch(page, item, "en");
  await expect.poll(() => signals.contextPosts.length).toBe(1);
  const observed = await readContextDiagnostic(page, signals.contextPosts[0], "client_deadline", 200, null, 40_000);
  expect(observed.value.elapsedMs).toBeGreaterThanOrEqual(29_000);
  await info.attach("context-body-read-seam", { body: JSON.stringify({
    classification: "CONTROLLED_JSON_READ_STALL_AFTER_MOCK_HTTP200_NOT_UPSTREAM_TIMEOUT", receivedStatus: 200,
    productDeadlineUnchanged: true, privateStateSeed: false }), contentType: "application/json" });
  await captureContextFailure(page, info, signals, observed, "en", 1440, 1);
});
for (const [locale, width, status, body] of [
  ["en", 390, 502, CONTEXT_PRIVATE_MARKER],
  ["ru", 1440, 200, JSON.stringify({ mode: "resolved", schemaVersion: 2, subject: { rejectedRawField: CONTEXT_PRIVATE_MARKER } })],
  ["en", 1440, 200, JSON.stringify({ mode: "unrecognized", code: CONTEXT_PRIVATE_MARKER, rejectedRawField: CONTEXT_PRIVATE_MARKER })]
] as const) {
  test("D2 Context parse rejection retains received status " + status + " " + locale, async ({ page }, info) => {
    const { item, signals } = await contextFailureSetup(page, info.project.use.baseURL!, locale, width);
    await page.route("**/api/prototype/point-to-object/context", route => {
      signals.contextPosts.push(route.request().postDataJSON()); return route.fulfill({ status, body });
    });
    await chooseD2ThroughSearch(page, item, locale);
    await expect.poll(() => signals.contextPosts.length).toBe(1);
    const observed = await readContextDiagnostic(page, signals.contextPosts[0], "parse_unknown", status, null);
    await captureContextFailure(page, info, signals, observed, locale, width, 1);
  });
}
test("D2 Context replacement selection keeps its diagnostic when the old request is cancelled", async ({ page }, info) => {
  const { item, signals } = await contextFailureSetup(page, info.project.use.baseURL!, "en", 1440);
  const replacement = contextItem("en", "u2");
  let target = item, oldRoute: Route | null = null;
  await page.route("**/api/prototype/point-to-object/suggest", route => route.fulfill({ json: {
    // Same public Photon transport shape as the existing shared fixture; only
    // the already admitted selection case changes, without a navigation reset.
    protocol: "POINT_TO_OBJECT_001_AUTOCOMPLETE_V1", mode: "results", provider: "Photon",
    results: [{ id: target.sourceFeatureId, label: target.label, secondaryLabel: "Synthetic OSM transport only",
      longitude: target.anchor[0], latitude: target.anchor[1], category: "building", featureType: "office", boundingBox: null }],
    source: { attribution: "© OpenStreetMap contributors", licenceId: "ODbL-1.0", licenceUrl: "https://www.openstreetmap.org/copyright",
      serviceUrl: "https://photon.komoot.io/", officialStatus: "open_context_not_official" }
  } }));
  await page.route("**/api/prototype/point-to-object/context", async route => {
    const intent = route.request().postDataJSON(); signals.contextPosts.push(intent);
    if (intent.expectedSourceFeatureId === item.sourceFeatureId) { oldRoute = route; return; }
    expect(intent.expectedSourceFeatureId).toBe(replacement.sourceFeatureId);
    await route.fulfill({ status: 503, json: contextHttpError("OVERPASS_UNAVAILABLE") });
  });
  await chooseD2ThroughSearch(page, item, "en");
  await expect.poll(() => oldRoute !== null).toBe(true);
  target = replacement;
  await page.getByRole("combobox", { name: "Search address or place", exact: true }).fill("D2 synthetic replacement");
  await page.locator("#point-object-search-results").getByRole("option").filter({ hasText: replacement.label }).click();
  await expect.poll(() => signals.contextPosts.length).toBe(2);
  const observed = await readContextDiagnostic(page, signals.contextPosts[1], "http_response", 503, "OVERPASS_UNAVAILABLE");
  expect(object(observed.value.intent, "replacement intent").expectedSourceFeatureId).toBe(replacement.sourceFeatureId);
  await settleCancelledContext(oldRoute!, info);
  await captureContextFailure(page, info, signals, observed, "en", 1440, 2);
});
// Independent canonicalization of already exported public intent; do not import
// the Product serializer/parser to make an implementation its own test oracle.
function canonicalJson(value: unknown): string {
  function sorted(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(sorted);
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, sorted(child)]));
    return item;
  }
  return JSON.stringify(sorted(value));
}
function errorFixture(locale: D2Locale, width: number) {
  // Every ID/token/latency below is synthetic; cost remains unknown (null).
  // provider=openai is the public schema discriminator, NOT a network call.
  const requestId = "synthetic-d2-u1-failure-" + locale + "-" + width;
  const usage = { model: "fixture-only", reasoningEffort: "medium", requestId,
    inputTokens: 1, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 1, totalTokens: 2, estimatedCostUsd: null };
  return { mode: "unavailable", code: "AI_OUTPUT_INVALID", error: ERROR, retryable: true,
    telemetry: { provider: "openai", schemaVersion: 6, ...usage, depth: "standard",
      promptVersion: "POINT_OBJECT_AI_PROMPT_V14_2026_09_26", latencyMs: 1, attempts: 1,
      attemptTrace: [{ attempt: 1, purpose: "focused", ...usage }],
      costRateSource: null, stored: false, toolCalls: 0 } };
}
function counters(signals: D2Signals) {
  return { contextPosts: signals.contextPosts.length, aiPosts: signals.aiPosts.length, challenges: signals.challenges };
}
function failureRecord(bundle: Record<string, unknown>) {
  expect(bundle.protocol).toBe("GEOAI_PREVIEW_VERIFICATION_V1");
  expect(bundle.caveat).toBe(CAVEAT);
  expect(bundle.hashScope).toBe("canonical_ui_intent_excluding_challenge_cookie_headers_not_wire_or_server_signed");
  expect(bundle.records, "A failed POST cannot create a successful analysis record").toEqual([]);
  expect(Array.isArray(bundle.failedResponses)).toBe(true);
  expect(bundle.failedResponses).toHaveLength(1);
  return object((bundle.failedResponses as unknown[])[0], "failed response");
}
async function expectFailure(page: Page, item: D2Case, intent: Record<string, unknown>,
  originalSource: Record<string, unknown>, response: ReturnType<typeof errorFixture>) {
  const bundle = await publicD2Snapshot(page);
  const failure = failureRecord(bundle);
  expect(failure).toMatchObject({ protocol: "GEOAI_PREVIEW_FAILED_RESPONSE_OBSERVATION_V1",
    operation: "analyse", observationKind: "failed_response", requestPhase: "analysis_post", httpStatus: 502,
    telemetryQualification: "reported_schema_valid", responseScope: "complete_public_parsed_error_response",
    correspondence: "captured_by_original_ui_handler_not_server_signed", accounting: "unqualified_failure_observation" });
  expect(failure.response).toEqual(response);
  expect(failure.originalSubmissionIntent).toEqual(intent);
  expect(failure.sourceSnapshot).toEqual(originalSource);
  expect(failure.payloadSha256).toBe(createHash("sha256").update(canonicalJson(intent)).digest("hex"));
  expect(Object.keys(object(failure.originalSubmissionIntent, "original intent"))).not.toContain("challenge");
  const source = object(object(failure.sourceSnapshot, "held source").context, "held context");
  expect(source.sourceFeatureId).toBe(item.sourceFeatureId);
  expect(source.evidenceReceipt).toEqual(item.envelope.evidenceReceipt);
  // The public snapshot is not the exact-coordinate server evidence pack.
  // Freeze the already public pre-submit bytes above, then independently check
  // identity/lease, six-decimal public scope and immutable admitted-source facts.
  // Never substitute a raw whole-envelope comparison or the Product serializer.
  const normalized = object(source.normalizedContext, "public normalized context");
  expect(normalized).toMatchObject({ version: "POINT_OBJECT_NORMALIZED_CONTEXT_V1", subjectId: item.sourceFeatureId });
  expect(normalized.scope).toMatchObject({ kind: "point_radius", radiusM: 400,
    anchor: item.anchor.map(value => Number(value.toFixed(6))) });
  const independent = object(normalized.independentContext, "public independent source");
  const admitted = item.envelope.subject.normalizedContext?.independentContext;
  if (!admitted) throw new Error("Missing admitted U1 source fixture");
  expect(independent).toMatchObject({ version: "POINT_OBJECT_INDEPENDENT_CONTEXT_V1",
    subjectId: item.sourceFeatureId, snapshotHash: AUTHORITY.sourceHash, status: "available",
    dataset: "Overture Places", sourceMode: "admitted_bundled_snapshot_not_live",
    officialStatus: "open_context_not_official", completeInventory: false,
    sampleSize: admitted.sampleSize, interiorSampleSize: admitted.interiorSampleSize });
  expect(Array.isArray(independent.places)).toBe(true);
  expect(independent.places).toHaveLength(admitted.places.length);
  const immutablePlaceFacts = (values: unknown[]) => values.map(value => {
    const place = object(value, "public admitted place");
    return { id: place.id, name: place.name, basic_category: place.basic_category, evidenceRef: place.evidenceRef };
  });
  expect(immutablePlaceFacts(independent.places as unknown[])).toEqual(immutablePlaceFacts(admitted.places));
  expect(source.name).toBe(item.label);
  expect(typeof failure.submittedAt).toBe("string");
  expect(typeof failure.completedAt).toBe("string");
  const submitted = Date.parse(String(failure.submittedAt)), completed = Date.parse(String(failure.completedAt));
  expect(Number.isFinite(submitted) && Number.isFinite(completed)).toBe(true);
  expect(completed).toBeGreaterThanOrEqual(submitted);
  await expect(page.getByTestId("verification-json")).toHaveAttribute("readonly", "");
  await expect(page.getByTestId("ai-success")).toHaveCount(0);
  return { bundle, failure };
}

// Four small journeys only. Last-valid retention is already covered by the
// shared vertical suite; adding a prior success here would violate one-POST
// and empty-records acceptance. No retry or rejected raw provider prose here.
for (const locale of ["en", "ru"] as const) for (const width of [1440, 390]) {
  test("D2 synthetic U1 502 is exported without auto-POST " + locale + " " + width, async ({ page }, info) => {
    const baseURL = info.project.use.baseURL!;
    const item = bundles[locale].cases.find(value => value.key === "u1");
    if (!item) throw new Error("Missing existing U1 route fixture");
    expect(item.sourceFeatureId).toBe("way/254666300");
    expect(item.anchor).toEqual([55.280154550000006, 25.22041245]);
    await page.setViewportSize({ width, height: 900 });
    await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
    const signals = await installD2Transport(page, baseURL, item);
    const response = errorFixture(locale, width);
    let submittedIntent: Record<string, unknown> | null = null;
    // Only this exact public AI endpoint is overridden. GET falls back to the
    // existing synthetic challenge. No upstream/route.fetch/real API execution.
    await page.route("**/api/prototype/point-to-object/ai", async route => {
      if (route.request().method() === "GET") return route.fallback();
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON() as Record<string, unknown>;
      signals.aiPosts.push(body);
      expect(signals.aiPosts, "One intentional submit, never an automatic retry").toHaveLength(1);
      expect(body.challenge).toBe("A".repeat(43));
      expect(body).toMatchObject({ caseKey: "dubai", expectedSourceFeatureId: item.sourceFeatureId,
        longitude: item.anchor[0], latitude: item.anchor[1], locale, consent: true, depth: "standard", goal: "custom" });
      expect(body.evidenceReceipt).toEqual(item.envelope.evidenceReceipt);
      const { challenge: _challenge, ...intent } = body;
      submittedIntent = structuredClone(intent);
      await route.fulfill({ status: 502, json: response, headers: { "cache-control": "private, no-store" } });
    });
    await chooseD2ThroughSearch(page, item, locale);
    await expect.poll(() => signals.contextPosts.length).toBe(1);
    await openD2Analysis(page, locale);
    await expect(page.getByTestId("normalized-context-dashboard")).toBeVisible();
    const form = page.getByTestId("analysis-controls-form");
    if (width < 640) await page.getByTestId("analysis-mobile-controls-trigger").click();
    const question = locale === "ru"
      ? "Каких картографических данных не хватает для этого синтетического скрининга U1?"
      : "Which mapped evidence is missing for this synthetic U1 screening?";
    await form.locator("fieldset").getByRole("button").nth(1).click();
    await expect(form.getByTestId("analysis-request-state")).toHaveAttribute("data-draft-depth", "standard");
    await form.locator("#analysis-follow-up").fill(question);
    const before = await publicD2Snapshot(page);
    const pre = object(before.preSubmit, "pre-submit");
    const intentBefore = object(pre.intent, "pre-submit intent");
    expect(intentBefore).toMatchObject({ question, locale, expectedSourceFeatureId: item.sourceFeatureId,
      longitude: item.anchor[0], latitude: item.anchor[1], depth: "standard", goal: "custom" });
    const sourceBefore = structuredClone(object(pre.sourceSnapshot, "pre-submit source"));
    expect(before.records).toEqual([]);
    expect(before.failedResponses).toBeUndefined();
    expect(counters(signals)).toEqual({ contextPosts: 1, aiPosts: 0, challenges: 0 });
    await form.getByRole("button", { name: locale === "ru" ? "Запустить целевой анализ" : "Run focused analysis", exact: true }).click();
    const alert = page.getByRole("alert").filter({ hasText: ERROR });
    await expect(alert).toHaveCount(1);
    await expect(alert).toBeVisible();
    await expect(form.getByTestId("analysis-request-state")).toHaveAttribute("data-in-flight-depth", "none");
    await expect(form.getByTestId("analysis-request-state")).toHaveAttribute("data-completed-depth", "none");
    await expect(form.locator("#analysis-follow-up")).toHaveValue(question);
    expect(submittedIntent).toEqual(intentBefore);
    const intent = object(submittedIntent, "captured public POST intent");
    const first = await expectFailure(page, item, intent, sourceBefore, response);
    expect(counters(signals)).toEqual({ contextPosts: 1, aiPosts: 1, challenges: 1 });
    // Observe original intent separately from later unsubmitted UI edits.
    const changedDraft = locale === "ru" ? "Изменённый черновик: не отправлен." : "Changed draft: not submitted.";
    await form.locator("#analysis-follow-up").fill(changedDraft);
    const edited = await expectFailure(page, item, intent, sourceBefore, response);
    expect(object(object(edited.bundle.preSubmit, "edited pre-submit").intent, "edited intent").question).toBe(changedDraft);
    expect(edited.failure).toEqual(first.failure);
    const switchedLocale = locale === "ru" ? "en" : "ru";
    const language = page.getByRole("button", { name: switchedLocale, exact: true });
    await language.click();
    await expect(language).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: locale, exact: true })).toHaveAttribute("aria-pressed", "false");
    const switched = await expectFailure(page, item, intent, sourceBefore, response);
    expect(object(switched.bundle.currentSelection, "current selection").locale).toBe(switchedLocale);
    // Drafts are locale-scoped in Product730; do not invent cross-locale draft
    // persistence. Current export follows rendered draft, while the failure
    // keeps the original locale/question/lease regardless of draft restoration.
    const displayedQuestion = (await form.locator("#analysis-follow-up").inputValue()).trim() || null;
    expect(object(object(switched.bundle.preSubmit, "switched pre-submit").intent, "switched intent"))
      .toMatchObject({ locale: switchedLocale, question: displayedQuestion });
    expect(switched.failure).toEqual(first.failure); // Original locale/lease/question must not be re-labelled.
    // A finite negative-observation window, not a claim about indefinite quiet.
    await page.waitForTimeout(QUIET_OBSERVATION_MS);
    expect(counters(signals)).toEqual({ contextPosts: 1, aiPosts: 1, challenges: 1 });
    expectD2TransportQuiet(signals);
    await info.attach("d2-synthetic-u1-failure-observation", { contentType: "application/json", body: JSON.stringify({
      classification: "SYNTHETIC_PUBLIC_502_HANDLER_NOT_PAID_G2_OR_REAL_U1_ACCEPTANCE",
      authority: AUTHORITY, pinnedSourceHashes: CODE_HASHES, locale, width, switchedLocale,
      selectedSourceFeatureId: item.sourceFeatureId, anchor: item.anchor, sourceLocale: item.sourceLocale,
      counters: counters(signals), status: 502, code: response.code, telemetryQualification: first.failure.telemetryQualification,
      originalIntentSha256: first.failure.payloadSha256, records: 0, failedResponses: 1,
      syntheticTelemetry: response.telemetry, originalIntentRetained: true, sourceSnapshotRetained: true,
      noPostDuringPrepareOrLanguageSwitch: true, quietObservationMs: QUIET_OBSERVATION_MS,
      noRealProviderCall: true, noPrivateStateSeed: true, lastValidRetention: "OUT_OF_SCOPE_ALREADY_IN_SHARED_VERTICAL_SUITE"
    }) });
  });
}
