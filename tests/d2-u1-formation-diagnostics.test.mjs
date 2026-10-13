// Source-only authored regression; Root runs with the existing Node24 runtime.
// Saved public source input + synthetic prose/telemetry. No provider/API/browser,
// no private account/storage or financial operator, no paid G2 acceptance.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire, registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const fixture = JSON.parse(readFileSync(new URL("fixtures/d2-u1-retry/formation-diagnostics.json", import.meta.url), "utf8"));
const clone = structuredClone;
const plain = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash("sha256").update(value).digest("hex");
let prohibitedNetworkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { prohibitedNetworkCalls++; throw new Error("D2 U1 no-API test prohibits all network"); };
let hooks;
after(() => { hooks?.deregister(); globalThis.fetch = originalFetch; assert.equal(prohibitedNetworkCalls, 0); });
hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(new URL(specifier.slice(2) + ".ts", root).href, context);
    if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s(?:\?|$)/.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && new URL(url).pathname.endsWith(".ts")) {
      assert(!/\/operations\/|\/point-to-object-ai\.ts$|\/point-to-object-live-evidence\.ts$/.test(new URL(url).pathname),
        "No financial operator, provider service or source producer import");
      let source = readFileSync(fileURLToPath(url), "utf8");
      if (new URL(url).pathname.endsWith("/point-to-object-ai-core.ts")) {
        // Expose existing pure guards only. Bodies/imports/parsers stay actual.
        source += "\nexport { evidenceSupport, validateFocusedAnswer, independentStatementMismatch };";
      }
      return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(source, { mode: "transform" }) };
    }
    return next(url, context);
  }
});
const core = await import("../src/lib/prototype/point-to-object-ai-core.ts");
const live = await import("../components/point-to-object/live-session.ts");
const observed = await import("../src/lib/prototype/point-to-object-verification-export.ts");
const ts = createRequire(new URL("../package.json", import.meta.url))("typescript");
const req = locale => Object.fromEntries(["role", "scenario", "depth", "goal", "perspective", "horizon", "question"]
  .map(key => [key, fixture.request[key]]).concat([["locale", locale]]));
const profile = { model: "gpt-5.6-sol", reasoningEffort: "medium", verbosity: "high", maxOutputTokens: 6000 };
const support = () => core.evidenceSupport(clone(fixture.pack));
const answer = (statement, refs, scope = "screening_implication", locale = "en") => {
  const payload = JSON.parse(core.buildPointObjectResponsesRequest(clone(fixture.pack), req(locale), profile).input[1].content[0].text);
  return { status: "partial", scope, perspective: fixture.request.perspective, horizon: fixture.request.horizon,
    statement, evidenceRefs: refs, confidence: "low",
    missingEvidenceCodes: [...new Set([...payload.validationPolicy.requiredMissingEvidenceCodes, "physical_baseline", "route_access"])],
    unsupportedReasonCode: null };
};
const originalFailure = () => clone(fixture.syntheticFailure);
function record(response = originalFailure(), httpStatus = 502) {
  const snapshot = observed.snapshotVerificationFailureResponse(response, httpStatus);
  return { operation: "analyse", ...observed.snapshotVerificationSubmission("analyse", fixture.request, fixture.sourceSnapshot),
    ...snapshot, httpStatus, ...fixture.times };
}
const bundle = async (failedResponses, extras = {}) => JSON.parse(await observed.createVerificationBundle(true, {
  preSubmit: null, records: [], failedResponses, currentSelection: clone(fixture.currentSelection), ...extras
}));

test("U1-F01 actual concise EN/RU focused statements pass; cut-off statement is still refused", () => {
  const statements = {
    en: "BinSina Pharmacy is a mapped source lead; verify operation and access before testing additional pharmacy space.",
    ru: "BinSina Pharmacy — запись источника карты; проверьте работу и доступ до проверки гипотезы дополнительных аптечных площадей."
  };
  for (const locale of ["en", "ru"]) {
    const a = answer(statements[locale], [fixture.binsina.evidenceRef], "screening_implication", locale);
    const result = core.validateFocusedAnswer(a, req(locale), support(), "source_evidence_only");
    assert.equal(result.ok, true, result.detail);
    assert.equal(result.answer.statement, statements[locale]); // no punctuation append/truncation/rewrite
    const filler = (locale === "en" ? "Verify source evidence. " : "Проверьте данные источника. ").repeat(60);
    const cutoff = filler.slice(0, 893) + " review";
    const incomplete = core.validateFocusedAnswer({ ...a, statement: cutoff }, req(locale), support(), "source_evidence_only");
    assert.equal(incomplete.ok, false);
    assert.equal(incomplete.detail, "focused_answer_statement_incomplete");
    const oversized = core.validateFocusedAnswer({ ...a, statement: "a".repeat(901) }, req(locale), support(), "source_evidence_only");
    assert.equal(oversized.ok, false); assert.equal(oversized.detail, "focused_answer_statement_too_long");
  }
});

test("U1-F02 typed selected OSM scalar and independent point distance stay separately bound", () => {
  const b = fixture.binsina, s = support();
  for (const [locale, scalar, distance] of [
    ["en", "Mapped footprint area: 3613 square metres", b.name + " — " + b.distanceM + " m straight-line to the mapped point"],
    ["ru", "Площадь контура по карте: 3613 квадратных метров", b.name + " — " + b.distanceM + " м по прямой до точки записи"]
  ]) {
    const statement = scalar + ". " + distance + ".";
    assert.equal(core.independentStatementMismatch(statement, ["EVD-OBJECT-METRICS", b.evidenceRef], "screening_implication", s), false);
    assert.equal(core.independentStatementMismatch(statement, [b.evidenceRef], "screening_implication", s), true,
      "A real selected scalar cannot be laundered through a place citation");
    assert.equal(core.independentStatementMismatch(statement.replace("3613", "3614"),
      ["EVD-OBJECT-METRICS", b.evidenceRef], "screening_implication", s), true);
    assert.equal(core.independentStatementMismatch(statement.replace(String(b.distanceM), "10"),
      ["EVD-OBJECT-METRICS", b.evidenceRef], "screening_implication", s), true,
      "Known height number cannot be substituted for point distance");
    assert.equal(req(locale).question, fixture.request.question);
  }
  for (const statement of [
    b.name + " is operating with adequate capacity and verified walking access.",
    b.name + " is a clinic with verified entrance access.",
    b.name + " — " + b.distanceM + " m walking distance.",
    b.name + " is a source lead from 2026.",
    "Another Pharmacy — " + b.distanceM + " m straight-line to the mapped point."
  ]) assert.equal(core.independentStatementMismatch(statement, [b.evidenceRef], "screening_implication", s), true, statement);
  const limit = "Overture is a bounded mapped-point snapshot, not a complete inventory; operation and capacity remain unknown.";
  assert.equal(core.independentStatementMismatch(limit, ["EVD-OVERTURE-SNAPSHOT"], "source_limitation", s), false);
  assert.equal(core.independentStatementMismatch(limit, ["EVD-OVERTURE-SNAPSHOT"], "selected_object", s), true);
});

test("U1-F03 real admitted snapshot projection retains scope; malformed or mismatched sources have no usable refs", () => {
  const p = core.buildModelEvidenceProjection(clone(fixture.pack));
  assert.equal(p.selectedObject.sourceFeatureId, "way/254666300");
  assert.equal(p.independentContext.sampleSize, 165); assert.equal(p.independentContext.places.length, 20);
  assert.equal(p.independentContext.snapshotHash, fixture.sourceSnapshot.context.normalizedContext.independentContext.snapshotHash);
  assert.equal(p.independentContext.completeInventory, false); assert.equal(p.independentContext.sourceMode, "admitted_bundled_snapshot_not_live");
  assert.equal(p.independentContext.observationDate, null);
  const bin = p.independentContext.places.find(place => place.sourceRecordId === fixture.binsina.id);
  assert.equal(bin.name, fixture.binsina.name); assert.equal(bin.distanceM, fixture.binsina.distanceM);
  assert.equal(bin.taxonomy.primary, "pharmacy"); assert.equal(bin.currentOperation, "unknown"); assert.equal(bin.capacity, "unknown");
  for (const change of [
    pack => { pack.coordinates.longitude += 0.01; },
    pack => { pack.selectedObject.sourceFeatureId = "way/393391114"; },
    pack => { const r = pack.evidence.find(e => e.id === "EVD-OVERTURE-SNAPSHOT"); pack.evidence.push(clone(r)); },
    pack => { const r = pack.evidence.find(e => e.id === "EVD-OVERTURE-SNAPSHOT"); r.sourceId = "another_source"; },
    pack => { const r = pack.evidence.find(e => e.id === "EVD-OVERTURE-SNAPSHOT"); r.value = "{}"; },
    pack => { const r = pack.evidence.find(e => e.id === "EVD-OVERTURE-SNAPSHOT"); const c = JSON.parse(r.value); c.places[0].name = "Another Pharmacy"; r.value = JSON.stringify(c); },
    pack => { const r = pack.evidence.find(e => e.id === "EVD-OVERTURE-SNAPSHOT"); const c = JSON.parse(r.value); c.sampleSize++; r.value = JSON.stringify(c); },
    pack => { const r = pack.evidence.find(e => e.id === "EVD-OVERTURE-SNAPSHOT"); const c = JSON.parse(r.value); c.spatialCoverage.state = "partial_circle_within_acquisition_extent"; r.value = JSON.stringify(c); }
  ]) {
    const pack = clone(fixture.pack); change(pack); const output = core.buildModelEvidenceProjection(pack);
    assert.equal(output.independentContext, undefined);
    assert(!output.evidenceIndex.some(e => e.id.startsWith("EVD-OVERTURE-")));
  }
});

test("U1-D01 valid 502 telemetry remains a separate unavailable observation, never a successful report", async () => {
  const response = originalFailure(), before = JSON.stringify(response);
  const parsed = live.parsePointObjectAiFailureResponse(response);
  assert.equal(parsed.mode, "unavailable"); assert.equal(parsed.code, "AI_OUTPUT_INVALID");
  assert.deepEqual(parsed.telemetry, response.telemetry);
  assert.deepEqual(live.parsePointObjectAiResponse(response), parsed);
  const saved = record(response), result = await bundle([saved]);
  assert.deepEqual(result.records, []); assert.equal(result.failedResponses.length, 1);
  const failure = result.failedResponses[0];
  assert.equal(failure.httpStatus, 502); assert.equal(failure.operation, "analyse");
  assert.equal(failure.telemetryQualification, "reported_schema_valid");
  assert.equal(failure.accounting, "unqualified_failure_observation");
  assert.equal(failure.responseScope, "complete_public_parsed_error_response");
  assert.equal(failure.response.mode, "unavailable");
  assert.equal(failure.response.code, response.code); assert.equal(failure.response.retryable, true);
  assert.deepEqual(failure.response.telemetry, response.telemetry);
  assert.equal(failure.correspondence, "captured_by_original_ui_handler_not_server_signed");
  assert.deepEqual(failure.originalSubmissionIntent, plain(saved.originalSubmissionIntent));
  assert.equal(failure.payloadSha256, await observed.verificationSha256(observed.canonicalVerificationIntent("analyse", fixture.request)));
  assert.equal(failure.sourceSnapshot.context.sourceFeatureId, "way/254666300");
  assert.equal(failure.sourceSnapshot.context.evidenceReceipt.evidencePackHash, fixture.request.evidenceReceipt.evidencePackHash);
  assert(!Object.hasOwn(failure.response, "content")); assert(!Object.hasOwn(failure.response, "generatedAt"));
  assert.equal(JSON.stringify(response), before);
});

test("U1-D02 missing/partial/malformed/private optional telemetry preserves public code with honest rejection", async () => {
  const missing = originalFailure(); delete missing.telemetry;
  assert.equal(record(missing).telemetryQualification, "not_reported");
  const missingBundle = await bundle([record(missing)]);
  assert.equal(missingBundle.failedResponses[0].response.code, "AI_OUTPUT_INVALID");
  assert(!Object.hasOwn(missingBundle.failedResponses[0].response, "telemetry"));
  for (const change of [
    r => { r.telemetry = null; },
    r => { delete r.telemetry.attemptTrace; },
    r => { r.telemetry.attemptTrace.pop(); },
    r => { r.telemetry.totalTokens++; },
    r => { r.telemetry.attempts = 0; },
    r => { r.telemetry.privateAccount = "synthetic private field"; },
    r => { r.telemetry.attemptTrace[0].authorization = "synthetic forbidden field"; },
    r => { r.telemetry.model = "Bearer " + "synthetic_test_credential"; }
  ]) {
    const r = originalFailure(); change(r);
    const parsed = live.parsePointObjectAiFailureResponse(r);
    assert.equal(parsed.mode, "unavailable"); assert.equal(parsed.code, "AI_OUTPUT_INVALID");
    assert(!Object.hasOwn(parsed, "telemetry"), "Invalid telemetry cannot become typed/zero evidence");
    const captured = record(r); assert.equal(captured.telemetryQualification, "rejected");
    assert(!Object.hasOwn(captured.response, "telemetry"));
    const result = await bundle([captured]);
    const failure = result.failedResponses[0];
    assert.equal(failure.telemetryQualification, "rejected");
    assert.equal(failure.responseScope, "public_error_fields_with_rejected_telemetry_omitted");
    assert.equal(failure.accounting, "unqualified_failure_observation");
    assert.equal(failure.response.code, "AI_OUTPUT_INVALID");
    assert(!Object.hasOwn(failure.response, "telemetry"));
  }
  let accessorCalls = 0;
  const accessor = originalFailure(); Object.defineProperty(accessor, "telemetry", {
    enumerable: true, get() { accessorCalls++; throw new Error("Must not read optional diagnostic accessor"); }
  });
  assert.equal(record(accessor).telemetryQualification, "rejected");
  assert.equal(accessorCalls, 0);
  // Complete public schema with null provider IDs/usage is still not complete accounting evidence.
  const unknown = originalFailure();
  for (const t of [unknown.telemetry, ...unknown.telemetry.attemptTrace]) {
    t.requestId = null;
    for (const key of ["inputTokens", "cachedInputTokens", "cacheWriteTokens", "outputTokens", "totalTokens", "estimatedCostUsd"]) t[key] = null;
  }
  const nullTrace = await bundle([record(unknown)]);
  assert.equal(nullTrace.failedResponses[0].telemetryQualification, "reported_schema_valid");
  assert.equal(nullTrace.failedResponses[0].accounting, "unqualified_failure_observation");
  assert.equal(nullTrace.failedResponses[0].response.telemetry.inputTokens, null);
  assert.equal(nullTrace.failedResponses[0].response.telemetry.requestId, null);
});

test("U1-D03 unrelated/generated/private base fields and invalid status/shape stay refused", () => {
  for (const key of ["content", "generatedAt", "subject", "providerOutput", "authorization", "account", "headers", "cookies"]) {
    const r = originalFailure(); r[key] = "synthetic forbidden extra";
    assert.equal(live.parsePointObjectAiFailureResponse(r), null);
    assert.throws(() => observed.snapshotVerificationFailureResponse(r, 502));
  }
  for (const change of [
    r => { r.mode = "openai"; },
    r => { r.code = 42; },
    r => { r.error = null; },
    r => { r.retryable = "yes"; },
    r => { r.error = "Bearer " + "synthetic_test_credential"; },
    r => { r.error = "https://example.test/?token=synthetic"; },
    r => { r.error = "a".repeat(501); }
  ]) { const r = originalFailure(); change(r); assert.throws(() => observed.snapshotVerificationFailureResponse(r, 502)); }
  for (const status of [0, 99, 600, 502.5, NaN, "502"]) assert.throws(() => observed.snapshotVerificationFailureResponse(originalFailure(), status));
  assert.throws(() => observed.snapshotVerificationFailureResponse([], 502));
  let called = 0; const r = originalFailure();
  Object.defineProperty(r, "error", { enumerable: true, get() { called++; return "unsafe synthetic getter"; } });
  assert.throws(() => observed.snapshotVerificationFailureResponse(r, 502)); assert.equal(called, 0);
});

test("U1-D04 source/subject/anchor/locale/time/count correspondence refuses malformed failures", async () => {
  for (const change of [
    r => { r.originalSubmissionIntent.expectedSourceFeatureId = "way/393391114"; },
    r => { r.originalSubmissionIntent.longitude += 0.001; },
    r => { r.originalSubmissionIntent.locale = "ru"; },
    r => { r.originalSubmissionIntent.evidenceReceipt.evidencePackHash = "b".repeat(64); },
    r => { r.sourceSnapshot.context.sourceFeatureId = "way/393391114"; },
    r => { r.sourceSnapshot.context.normalizedContext.independentContext.places[0].name = "Another Pharmacy"; },
    r => { delete r.sourceSnapshot.context.normalizedContext.details; r.sourceSnapshot.context.evidenceReceipt.lookupSourceFeatureId = null; },
    r => { r.sourceSnapshot.context.privateField = "synthetic forbidden extra"; },
    r => { r.submittedAt = "invalid"; },
    r => { r.completedAt = "2026-10-13T18:29:59.000Z"; },
    r => { r.operation = "create"; },
    r => { r.telemetryQualification = "qualified_accounting"; },
    r => { r.telemetryQualification = "not_reported"; }
  ]) { const r = record(); change(r); await assert.rejects(() => bundle([r])); }
  const r = record();
  assert.equal((await bundle(Array.from({ length: 16 }, () => clone(r)))).failedResponses.length, 16);
  await assert.rejects(() => bundle(Array.from({ length: 17 }, () => clone(r))), /COUNT_REFUSED/);
  await assert.rejects(() => observed.createVerificationBundle(false, {
    preSubmit: null, records: [], failedResponses: [r], currentSelection: fixture.currentSelection
  }), /PREVIEW_ONLY/);
});

test("U1-D05 observation snapshots original source; later selection/draft changes cannot rewrite it", async () => {
  const intent = clone(fixture.request), source = clone(fixture.sourceSnapshot);
  const snapshot = observed.snapshotVerificationSubmission("analyse", intent, source), frozen = JSON.stringify(snapshot);
  intent.question = "Later synthetic draft"; intent.depth = "deep";
  source.context.name = "Later source"; source.context.normalizedContext.independentContext.places[0].name = "Later place";
  assert.equal(JSON.stringify(snapshot), frozen);
  const r = { operation: "analyse", ...snapshot, ...observed.snapshotVerificationFailureResponse(originalFailure(), 502), httpStatus: 502, ...fixture.times };
  const result = await bundle([r], {
    currentSelection: { ...clone(fixture.currentSelection), sourceFeatureId: "way/393391114" },
    preSubmit: { operation: "analyse", intent: { ...clone(fixture.request), question: "A later user draft" }, sourceSnapshot: clone(fixture.sourceSnapshot) }
  });
  assert.equal(result.failedResponses[0].originalSubmissionIntent.question, fixture.request.question);
  assert.equal(result.failedResponses[0].sourceSnapshot.context.name, "Millenium Plaza Downtown");
  assert.equal(result.currentSelection.sourceFeatureId, "way/393391114");
  assert.equal(result.preSubmit.intent.question, "A later user draft");
  const hugeSource = clone(fixture.sourceSnapshot); hugeSource.context.name = "界".repeat(1_500_000);
  assert.throws(() => observed.snapshotVerificationSubmission("analyse", fixture.request, hugeSource), /SIZE_REFUSED/);
  const hugeError = originalFailure(); hugeError.error = "a".repeat(observed.VERIFICATION_RESPONSE_MAX_BYTES + 1);
  assert.throws(() => observed.snapshotVerificationFailureResponse(hugeError, 502), /SIZE_REFUSED/);
});

function tree(path) {
  return ts.createSourceFile(path, readFileSync(new URL(path, root), "utf8"), ts.ScriptTarget.Latest, true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function declarationHashes(source, names) {
  const found = {};
  function walk(n) {
    if (ts.isFunctionDeclaration(n) && n.name && names.includes(n.name.text)) found[n.name.text] = hash(n.getText(source));
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && names.includes(n.name.text)) found[n.name.text] = hash(n.getText(source));
    ts.forEachChild(n, walk);
  }
  walk(source); return found;
}
test("U1-S01 actual validators unchanged; no new API/effect/retry calls or last-valid/draft mutator changes", () => {
  const coreTree = tree("src/lib/prototype/point-to-object-ai-core.ts");
  assert.deepEqual(declarationHashes(coreTree, Object.keys(fixture.staticBaseline.guardHashes)), fixture.staticBaseline.guardHashes);
  const client = tree("components/point-to-object/analysis-client.tsx");
  assert.deepEqual(declarationHashes(client, Object.keys(fixture.staticBaseline.clientFunctions)), fixture.staticBaseline.clientFunctions);
  const calls = Object.fromEntries(Object.keys(fixture.staticBaseline.clientCalls).map(k => [k, []]));
  function walk(n) {
    if (ts.isCallExpression(n)) {
      const expression = n.expression.getText(client);
      if (Object.hasOwn(calls, expression)) calls[expression].push(hash(n.getText(client)));
    }
    ts.forEachChild(n, walk);
  }
  walk(client); assert.deepEqual(calls, fixture.staticBaseline.clientCalls);
  const captureTree = tree("components/point-to-object/verification-export.tsx");
  const forbidden = [];
  function inspect(n) {
    if (ts.isCallExpression(n) && /^(fetch|requestAnalysis|setInterval|setTimeout|window\.setInterval|window\.setTimeout)$/.test(n.expression.getText(captureTree))) forbidden.push(n.getText(captureTree));
    ts.forEachChild(n, inspect);
  }
  inspect(captureTree); assert.deepEqual(forbidden, []);
  assert.equal(prohibitedNetworkCalls, 0);
  // Static equality and pure snapshots do not qualify browser focus, save/reopen,
  // actual runtime GET/POST transport or an actual paid model response.
});
