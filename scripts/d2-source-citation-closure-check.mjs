// Independent QA authoring only. Root runs with existing Node24 after integration.
// No discovery-time Product imports; this file is not imported by the E2E spec.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire, registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export async function runD2SourceCitationClosureCheck({ fixtureLocale } = {}) {
  assert(fixtureLocale === undefined || fixtureLocale === "en" || fixtureLocale === "ru", "Bounded fixture locale");
  const root = new URL("../", import.meta.url);
  const dir = new URL("../tests/fixtures/d2-source-citation-closure/", import.meta.url);
  const sha = value => createHash("sha256").update(value).digest("hex");
  const clone = structuredClone;
  const plain = value => JSON.parse(JSON.stringify(value));
  const bytes = readFileSync(new URL("recorded-public-result.json", dir));
  const manifest = JSON.parse(readFileSync(new URL("replay-manifest.json", dir), "utf8"));
  const historical = JSON.parse(bytes);
  const fixture = JSON.parse(readFileSync(new URL("synthetic-citation-pack.json", dir), "utf8"));
  assert.equal(sha(bytes), manifest.sha256);
  assert.equal(bytes.length, manifest.bytes);
  const old = historical.records[0], legacy = old.sourceSnapshot.context;
  const expected = fixture.expected, anchor = expected.anchor, groups = [];
  let networkCalls = 0;
  const originalFetch = globalThis.fetch;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  globalThis.fetch = async () => { networkCalls++; throw new Error("Independent citation QA prohibits network"); };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
      if (specifier.startsWith("@/")) return next(new URL(specifier.slice(2) + ".ts", root).href, context);
      if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s(?:\?|$)/.test(specifier)) return next(specifier + ".ts", context);
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith("file:") && new URL(url).pathname.endsWith(".tsx")) {
        assert.equal(fileURLToPath(url), fileURLToPath(new URL("components/point-to-object/verification-export.tsx", root)),
          "Only the approved Preview Verification component may be rendered for this gate check");
        const ts = createRequire(import.meta.url)("typescript");
        return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"),
          { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText };
      }
      if (url.startsWith("file:") && new URL(url).pathname.endsWith(".ts")) {
        assert(!/\/operations\/|\/point-to-object-(?:ai|live-evidence|overture-snapshot|u4-snapshot)\.ts$/.test(new URL(url).pathname),
          "No financial, provider, source-reader or evidence-producer module");
        return { format: "module", shortCircuit: true,
          source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), { mode: "transform" }) };
      }
      return next(url, context);
    }
  });
  async function group(id, run) { await run(); groups.push({ id, status: "PASS" }); }
  try {
    const citation = await import(new URL("src/lib/prototype/point-to-object-citation-context.ts", root).href);
    const normalized = await import(new URL("src/lib/prototype/point-to-object-normalized-context.ts", root).href);
    const live = await import(new URL("components/point-to-object/live-session.ts", root).href);
    const observer = await import(new URL("src/lib/prototype/point-to-object-verification-export.ts", root).href);
    const pack = clone(fixture.pack);
    // Explicit mixed test input: admitted immutable independent context remains
    // separate from the entirely synthetic OSM citation pack. Not historical backfill.
    const independent = legacy.normalizedContext.independentContext;
    pack.evidence.push({ id: "EVD-OVERTURE-SNAPSHOT", sourceId: "OVERTURE-PLACES",
      label: "Retained admitted independent context", value: JSON.stringify(independent) });
    const catalogue = citation.citationContextFromEvidence(pack);
    const parse = value => citation.parsePointObjectCitationContext(value, expected.subjectId, anchor, expected.packHash);
    const context = normalized.normalizePointObjectContext(pack);
    const resolved = clone(legacy);
    resolved.normalizedContext = clone(context);
    resolved.evidenceReceipt.evidencePackHash = expected.packHash;
    resolved.evidenceReceipt.createdAt = "2026-10-18T14:00:00.000Z";
    resolved.evidenceReceipt.acquiredAt = "2026-10-18T14:00:00.000Z";
    resolved.evidenceReceipt.expiresAt = "2026-10-18T14:15:00.000Z";
    resolved.evidenceReceipt.cacheWindow = Math.floor(Date.parse(resolved.evidenceReceipt.createdAt) / 900_000);
    const intent = { caseKey: "dubai", longitude: anchor[0], latitude: anchor[1],
      locale: "en", expectedSourceFeatureId: expected.subjectId };
    const response = { mode: "resolved", schemaVersion: 2, evidenceReceipt: clone(resolved.evidenceReceipt), subject: resolved };
    const times = { submittedAt: "2026-10-18T14:00:02.000Z", completedAt: "2026-10-18T14:00:03.000Z" };
    const currentSelection = { ...clone(historical.currentSelection), longitude: anchor[0], latitude: anchor[1] };

    if (fixtureLocale !== undefined) {
      // Test-only MIXED fixture: retained selected-object geometry/tags/details
      // and admitted Overture plus entirely synthetic nearby citations/profile
      // provenance. Never append these rows to the original historical source.
      const subject = clone(resolved);
      const details = clone(legacy.normalizedContext.details);
      assert(details && details.association === "selected_record", "Golden selected measurements required");
      for (const entry of details.sources) if (entry.id === "osm_surroundings") {
        entry.acquiredAt = context.source.acquiredAt;
        entry.observedAt = context.source.observedAt;
        entry.responseHash = context.source.responseHash;
      }
      subject.normalizedContext.details = details;
      const created = Date.now() - 1_000;
      subject.evidenceReceipt.createdAt = new Date(created).toISOString();
      subject.evidenceReceipt.expiresAt = new Date(created + 900_000).toISOString();
      subject.evidenceReceipt.cacheWindow = Math.floor(created / 900_000);
      subject.evidenceReceipt.acquiredAt = legacy.evidenceReceipt.acquiredAt;
      subject.evidenceReceipt.sourceLocale = fixtureLocale === "ru" ? "ru,en" : "en";
      assert.deepEqual(live.parseLiveResolvedObject(subject), subject);
      assert.equal(subject.normalizedContext.sampleSize, 123);
      assert.equal(subject.normalizedContext.scope.radiusM, 400);
      assert.equal(subject.normalizedContext.citationContext.items.length, 12);
      const university = subject.normalizedContext.citationContext.items.find(p => p.evidenceRef === "EVD-CONTEXT-1");
      assert.equal(university.distanceM, 548); assert.equal(university.featureClass, "amenity:university");
      assert(!subject.normalizedContext.places.some(p => p.evidenceRef === university.evidenceRef));
      const screening = await import(new URL("src/lib/prototype/d2-scenario-screening.ts", root).href);
      const pharmacy = subject.normalizedContext.independentContext?.places.find(p => p.taxonomy.primary === "pharmacy");
      assert(pharmacy && typeof pharmacy.name === "string" && pharmacy.name.length > 0,
        "Named pharmacy must belong to this exact admitted U1 context");
      const scenarioCardIds = screening.buildD2ScenarioScreening(subject.normalizedContext, subject.name,
        "custom", "b2b_redevelopment_selected_aoi", fixtureLocale).map(card => card.id);
      assert.deepEqual(scenarioCardIds, ["mapped-envelope", "entrances-and-servicing", "programme-service-check"]);
      const envelope = { mode: "resolved", schemaVersion: 2, evidenceReceipt: clone(subject.evidenceReceipt), subject };
      const legacyEnvelope = clone(envelope); delete legacyEnvelope.subject.normalizedContext.citationContext;
      assert(live.parseLiveResolvedObject(legacyEnvelope.subject));
      assert.equal(networkCalls, 0);
      return { protocol: "D2_ISOLATED_CITATION_FIXTURE_V1",
        classification: "MIXED_GOLDEN_SELECTED_OBJECT_ADMITTED_OVERTURE_SYNTHETIC_NEARBY_NOT_HISTORICAL_BACKFILL",
        locale: fixtureLocale, sourceLocale: subject.evidenceReceipt.sourceLocale, networkCalls,
        goldenRecordedPublicResultSha256: manifest.sha256, scenarioCardIds,
        proof: { catalogueItems: 12, outsideKpiRef: university.evidenceRef, outsideDistanceM: 548,
          originalClassInSyntheticInput: "amenity:university", kpiRadiusM: 400, sampleSize: 123,
          detailsAssociation: details.association, externalAiCalls: 0,
          independentSubjectId: subject.normalizedContext.independentContext.subjectId,
          independentPharmacy: { id: pharmacy.id, name: pharmacy.name, evidenceRef: pharmacy.evidenceRef } },
        item: { locale: fixtureLocale, sourceLocale: subject.evidenceReceipt.sourceLocale,
          key: "u1", sourceFeatureId: expected.subjectId, anchor: clone(anchor), label: subject.name,
          expectedIndependentStatus: "available", envelope, legacyEnvelope } };
    }

    await group("C01-immutable-recorded-input", () => {
      assert.equal(sha(bytes), manifest.sha256);
      assert.equal(bytes.length, manifest.bytes);
      assert.equal(historical.records.length, 1);
      assert.equal(old.response.mode, "openai"); assert.equal(old.response.schemaVersion, 6);
      assert.equal(old.payloadSha256, manifest.originalIntentSha256);
      assert.equal(old.response.evidencePackHash, manifest.originalEvidencePackHash);
      assert.equal(old.response.generatedAt, manifest.originalGeneratedAt);
      assert.equal(legacy.normalizedContext.citationContext, undefined);
      assert(!legacy.normalizedContext.places.some(p => p.evidenceRef === "EVD-CONTEXT-1"));
      assert.equal(manifest.historicalG2.score, 7); assert.equal(manifest.historicalG2.accepted, false);
    });
    await group("C02-producer-original-class-ref-548", () => {
      assert(catalogue, "Actual new pure projection must admit the explicit synthetic pack");
      assert.deepEqual(parse(catalogue), catalogue);
      assert.equal(catalogue.items.length, 12);
      const university = citation.getPointObjectCitation(catalogue, "EVD-CONTEXT-1");
      assert.equal(university.id, fixture.pack.nearbyContext[0].sourceFeatureId);
      assert.equal(university.name, "University of Europe for Applied Sciences (Campus Dubai)");
      assert.equal(university.featureClass, "amenity:university");
      assert.equal(university.distanceM, 548); assert.equal(university.method, "overpass_around_query_element_center_haversine");
      for (const [index, row] of catalogue.items.entries()) {
        const source = fixture.pack.nearbyContext[index];
        assert.equal(row.evidenceRef, source.evidenceId);
        assert.equal(row.featureClass, source.featureClass);
        assert.deepEqual(row.categories, source.categories);
        assert.equal(row.id, source.sourceFeatureId);
      }
      assert.equal(catalogue.source.responseHash, expected.nearbyResponseHash);
      assert.equal(catalogue.source.observedAt, null);
    });
    await group("C03-400m-denominator-independent-scope", () => {
      const reduced = clone(pack); reduced.source.contextStatus = "unavailable";
      const withoutCatalogue = normalized.normalizePointObjectContext(reduced);
      const withoutField = clone(context); delete withoutField.citationContext;
      assert.deepEqual(withoutField, withoutCatalogue);
      assert.equal(context.scope.radiusM, 400); assert.equal(context.sampleSize, 123);
      assert.equal(context.places.length, 10);
      assert(!context.places.some(p => expected.outside400Refs.includes(p.evidenceRef)));
      assert.equal(context.programmeChecks.find(p => p.group === "education").mappedCount, 0);
      assert.equal(context.citationContext.scope.radiusM, 800);
      assert.equal(context.source.responseHash, expected.fabricResponseHash);
      assert.notEqual(context.source.responseHash, context.citationContext.source.responseHash);
      assert.deepEqual(context.independentContext, independent);
      assert.equal(context.independentContext.sampleSize, 165);
      assert.equal(context.independentContext.completeInventory, false);
      assert(normalized.parseNormalizedPointObjectContext(context));
    });
    await group("C04-foreign-binding-and-duplicate-ref-refusal", () => {
      assert.equal(citation.parsePointObjectCitationContext(catalogue, "way/393391114", anchor, expected.packHash), null);
      assert.equal(citation.parsePointObjectCitationContext(catalogue, expected.subjectId, [anchor[0] + 0.01, anchor[1]], expected.packHash), null);
      assert.equal(citation.parsePointObjectCitationContext(catalogue, expected.subjectId, anchor, "f".repeat(64)), null);
      for (const mutate of [
        c => { c.subjectId = "way/393391114"; }, c => { c.scope.radiusM = 400; },
        c => { c.scope.anchor[1] += 0.01; }, c => { c.completeInventory = true; },
        c => { c.items[1].evidenceRef = c.items[0].evidenceRef; },
        c => { c.items[1].id = c.items[0].id; },
        c => { c.items[0].id = expected.subjectId; },
        c => { c.items[0].evidenceRef = "EVD-OBJECT-METRICS"; },
        c => { c.items[0].distanceM = 801; }, c => { c.items[0].distanceM = 548.5; },
        c => { c.items[0].coordinates[1] += 0.01; },
        c => { c.items[0].method = "walking_route"; },
        c => { c.source.sourceId = "OVERTURE-PLACES"; },
        c => { c.source.responseHash = "not-a-source-hash"; },
        c => { c.source.observedAt = "not-a-date"; },
        c => { c.source.officialStatus = "official"; },
        c => { c.items.push(clone(c.items[0])); },
        c => { c.items[0].privateField = "not-public"; }
      ]) { const changed = clone(catalogue); mutate(changed); assert.equal(parse(changed), null); }
    });
    await group("C05-producer-ref-and-retained-fact-correspondence", () => {
      for (const mutate of [
        p => { p.nearbyContext[0].name = "Another university"; },
        p => { p.nearbyContext[0].featureClass = "amenity:hospital"; },
        p => { p.nearbyContext[0].categories = ["healthcare"]; },
        p => { p.nearbyContext[0].evidenceId = "EVD-CONTEXT-2"; },
        p => { p.evidence[0].sourceId = "node/1"; },
        p => { p.evidence[0].label = "Foreign record"; },
        p => { p.evidence[0].value = "{}"; },
        p => { p.evidence.shift(); },
        p => { p.source.contextRadiusM = 400; },
        p => { p.source.contextResponseHash = "invalid"; },
        p => { p.source.contextStatus = "unavailable"; }
      ]) { const changed = clone(pack); mutate(changed); assert.equal(citation.citationContextFromEvidence(changed), undefined); }
    });
    await group("C06-bounds-descriptors-nulls-byte-limit", () => {
      let getterCalls = 0;
      const accessor = clone(catalogue);
      Object.defineProperty(accessor, "subjectId", { enumerable: true, get() { getterCalls++; return expected.subjectId; } });
      assert.equal(parse(accessor), null); assert.equal(getterCalls, 0);
      const sparse = clone(catalogue); delete sparse.items[0]; assert.equal(parse(sparse), null);
      const foreignPrototype = Object.assign(Object.create({ inherited: true }), clone(catalogue));
      assert.equal(parse(foreignPrototype), null);
      const nulls = clone(catalogue); nulls.items[0].coordinates = null; nulls.items[0].contextGroup = null;
      nulls.source.acquiredAt = null; nulls.source.observedAt = null;
      assert.deepEqual(parse(nulls), nulls);
      const large = clone(catalogue);
      for (const item of large.items) { item.name = "界".repeat(240); item.featureClass = "类".repeat(160); item.categories = Array(8).fill("类".repeat(80)); }
      assert(JSON.stringify(large).length <= 20_000, "Byte-limit negative must pass the character-count threshold");
      assert(Buffer.byteLength(JSON.stringify(large), "utf8") > 20_000);
      assert.equal(parse(large), null);
    });
    await group("C07-legacy-catalogue-absence-is-not-zero", () => {
      const oldNormalized = normalized.parseNormalizedPointObjectContext(legacy.normalizedContext);
      assert(oldNormalized); assert.equal(oldNormalized.citationContext, undefined);
      assert.equal(citation.getPointObjectCitation(oldNormalized.citationContext, "EVD-CONTEXT-1"), null);
      assert.equal(citation.getPointObjectCitation(catalogue, "EVD-CONTEXT-99"), null);
      assert.equal(oldNormalized.sampleSize, 123);
      const stripped = clone(context); delete stripped.citationContext;
      assert(normalized.parseNormalizedPointObjectContext(stripped));
      assert(live.parseLiveResolvedObject(legacy));
    });
    await group("C08-live-parser-checks-catalogue-binding", () => {
      assert(live.parseLiveResolvedObject(resolved));
      for (const mutate of [
        r => { r.normalizedContext.citationContext.subjectId = "way/393391114"; },
        r => { r.normalizedContext.citationContext.scope.anchor[0] += 0.01; },
        r => { r.normalizedContext.citationContext.evidencePackHash = "f".repeat(64); },
        r => { r.normalizedContext.citationContext.items[1].evidenceRef = "EVD-CONTEXT-1"; }
      ]) { const changed = clone(resolved); mutate(changed); assert.equal(live.parseLiveResolvedObject(changed), null); }
    });
    function selection(object) {
      return { locationKey: "dubai", longitude: anchor[0], latitude: anchor[1], clickedAt: "2026-10-18T14:00:00.000Z",
        object: { name: object.name, featureClass: object.featureClass, sourceFeatureId: object.sourceFeatureId,
          geometry: object.displayGeometry, geometryProvenance: object.geometryProvenance, renderHeightM: object.renderHeightM, renderMinHeightM: object.renderMinHeightM },
        resolvedObject: object, viewport: { center: anchor, zoom: 17, pitch: 0, bearing: 0, viewMode: "2d", basemapId: "street" },
        provider: "OpenFreeMap / OpenStreetMap", nearbyLabels: [] };
    }
    await group("C09-new-and-old-local-selection-roundtrip", () => {
      const memory = new Map();
      Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: {
        getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key)
      } } });
      live.writePointObjectSelection(selection(resolved));
      assert.equal(memory.size, 1);
      const reopened = live.readPointObjectSelection();
      assert(reopened); assert.deepEqual(reopened.resolvedObject.normalizedContext.citationContext, catalogue);
      live.writePointObjectSelection(selection(legacy));
      const oldSave = live.readPointObjectSelection();
      assert(oldSave); assert.equal(oldSave.resolvedObject.normalizedContext.citationContext, undefined);
      assert.equal(citation.getPointObjectCitation(oldSave.resolvedObject.normalizedContext.citationContext, "EVD-CONTEXT-1"), null);
      assert.deepEqual(oldSave.resolvedObject.normalizedContext, legacy.normalizedContext);
    });
    await group("C10-new-public-envelope-export-roundtrip", async () => {
      const submission = observer.snapshotVerificationSubmission("context", intent, { context: resolved });
      const captured = observer.snapshotVerificationResponse("context", response);
      const output = JSON.parse(await observer.createVerificationBundle(true, { preSubmit: null, currentSelection,
        records: [{ operation: "context", ...submission, response: captured, ...times }] }));
      assert.equal(output.records.length, 1);
      assert.deepEqual(output.records[0].sourceSnapshot.context.normalizedContext.citationContext, catalogue);
      assert.deepEqual(output.records[0].response.subject.normalizedContext.citationContext, catalogue);
      assert.equal(output.records[0].response.subject.normalizedContext.sampleSize, 123);
      assert.equal(output.records[0].response.subject.normalizedContext.programmeChecks.find(p => p.group === "education").mappedCount, 0);
    });
    await group("C11-original-paid-response-replay-keeps-legacy-gap", async () => {
      const parsed = live.parsePointObjectAiResponse(old.response);
      assert(parsed); assert.equal(parsed.mode, "openai");
      assert.deepEqual(plain(parsed.content), old.response.content);
      const output = JSON.parse(await observer.createVerificationBundle(true, {
        preSubmit: null, currentSelection: historical.currentSelection, records: [clone(old)]
      }));
      const replay = output.records[0];
      assert.equal(replay.payloadSha256, manifest.originalIntentSha256);
      assert.deepEqual(replay.originalSubmissionIntent, old.originalSubmissionIntent);
      assert.deepEqual(replay.sourceSnapshot, old.sourceSnapshot);
      assert.deepEqual(replay.response.content, old.response.content);
      assert.deepEqual(replay.response.telemetry, old.response.telemetry);
      assert.equal(replay.response.generatedAt, manifest.originalGeneratedAt);
      assert.equal(replay.sourceSnapshot.context.normalizedContext.citationContext, undefined);
      assert.equal(citation.getPointObjectCitation(replay.sourceSnapshot.context.normalizedContext.citationContext, "EVD-CONTEXT-1"), null);
    });
    await group("C12-invalid-public-catalogue-refused-no-input-rewrite", async () => {
      const bad = clone(response); bad.subject.normalizedContext.citationContext.items[1].evidenceRef = "EVD-CONTEXT-1";
      const submission = observer.snapshotVerificationSubmission("context", intent, { context: resolved });
      const captured = observer.snapshotVerificationResponse("context", bad);
      await assert.rejects(() => observer.createVerificationBundle(true, { preSubmit: null, currentSelection,
        records: [{ operation: "context", ...submission, response: captured, ...times }] }), /EXPORT_/);
      const privateField = clone(response); privateField.subject.normalizedContext.citationContext.items[0].privateToken = "synthetic-private-field";
      assert.throws(() => observer.snapshotVerificationResponse("context", privateField), /EXPORT_/);
      assert.equal(sha(readFileSync(new URL("recorded-public-result.json", dir))), manifest.sha256);
      assert.deepEqual(fixture.pack, JSON.parse(readFileSync(new URL("synthetic-citation-pack.json", dir), "utf8")).pack);
      assert.equal(networkCalls, 0);
    });
    await group("C13-context-diagnostic-observed-status-and-public-scope", async () => {
      const diagnostic = await import(new URL("src/lib/prototype/point-to-object-context-diagnostic.ts", root).href);
      const publicIntent = { caseKey: "dubai", longitude: anchor[0], latitude: anchor[1],
        locale: "en", expectedSourceFeatureId: expected.subjectId };
      const timing = { startedAt: "2026-10-18T17:00:00.000Z", completedAt: "2026-10-18T17:00:30.000Z", elapsedMs: 30_000 };
      const fieldNames = ["protocol", "operation", "intent", "intentSha256", "hashStatus", "startedAt", "completedAt",
        "elapsedMs", "timingScope", "httpStatus", "outcome", "errorCode", "serverCode", "proofScope", "upstreamCause"].sort();
      for (const [outcome, httpStatus, errorCode] of [
        ["http_response", 504, "CONTEXT_HTTP_RESPONSE_ERROR"],
        ["client_deadline", null, "CONTEXT_CLIENT_DEADLINE"],
        ["client_deadline", 200, "CONTEXT_CLIENT_DEADLINE"],
        ["transport_unknown", null, "CONTEXT_TRANSPORT_UNKNOWN"],
        ["transport_unknown", 503, "CONTEXT_TRANSPORT_UNKNOWN"],
        ["parse_unknown", 502, "CONTEXT_RESPONSE_PARSE_UNKNOWN"]
      ]) {
        const value = await diagnostic.createContextRequestDiagnostic(publicIntent, { ...timing, outcome, httpStatus });
        assert(value); assert.deepEqual(Object.keys(value).sort(), fieldNames);
        assert.equal(value.protocol, "GEOAI_PREVIEW_CONTEXT_REQUEST_DIAGNOSTIC_V1");
        assert.equal(value.httpStatus, httpStatus, "Actually received status survives any later local failure");
        assert.equal(value.outcome, outcome); assert.equal(value.errorCode, errorCode);
        assert.equal(value.proofScope, "client_observation_not_source_evidence");
        assert.equal(value.upstreamCause, "unverified"); assert.equal(value.serverCode, null);
        assert.equal(value.timingScope, "client_operation_including_debounce_not_upstream_latency");
        const json = diagnostic.contextRequestDiagnosticJson(value, publicIntent);
        assert.equal(typeof json, "string"); assert(Buffer.byteLength(json, "utf8") <= 2048);
        if (value.hashStatus === "sha256") {
          const ordered = Object.fromEntries(Object.entries(publicIntent).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
          assert.equal(value.intentSha256, sha(JSON.stringify(ordered)));
        } else { assert.equal(value.hashStatus, "unavailable"); assert.equal(value.intentSha256, null); }
      }
      assert.equal(networkCalls, 0);
    });
    await group("C14-context-diagnostic-negative-binding-and-async-freeze", async () => {
      const diagnostic = await import(new URL("src/lib/prototype/point-to-object-context-diagnostic.ts", root).href);
      const original = { caseKey: "dubai", longitude: anchor[0], latitude: anchor[1],
        locale: "en", expectedSourceFeatureId: expected.subjectId };
      const timing = { startedAt: "2026-10-18T17:00:00.000Z", completedAt: "2026-10-18T17:00:01.000Z",
        elapsedMs: 1_000, outcome: "http_response", httpStatus: 504 };
      const callerIntent = clone(original), callerDetails = { ...timing, serverCode: "OVERPASS_TIMEOUT" };
      const pending = diagnostic.createContextRequestDiagnostic(callerIntent, callerDetails);
      callerIntent.longitude += 0.01; callerDetails.httpStatus = 200; callerDetails.completedAt = "2026-10-18T18:00:00.000Z";
      const value = await pending;
      assert(value); assert.deepEqual(value.intent, original); assert.equal(value.httpStatus, 504);
      assert.equal(value.completedAt, timing.completedAt); assert.equal(value.serverCode, "OVERPASS_TIMEOUT");
      for (const changed of [{ ...original, expectedSourceFeatureId: "way/393391114" },
        { ...original, longitude: original.longitude + 0.01 }, { ...original, locale: "ru" }]) {
        assert.equal(diagnostic.contextRequestDiagnosticJson(value, changed), null);
        assert.equal(diagnostic.contextRequestDiagnosticMatchesIntent(value, changed), false);
      }
      for (const changed of [{ ...value, headers: {} }, { ...value, body: "synthetic-private-marker" },
        { ...value, serverCode: "synthetic-private-marker" }, { ...value, upstreamCause: "confirmed_overpass_timeout" },
        { ...value, httpStatus: 600 }, { ...value, elapsedMs: -1 }, { ...value, errorCode: "RAW_ERROR" },
        { ...value, completedAt: "2026-10-18T16:00:00.000Z" }, { ...value, intentSha256: "x".repeat(3_000) }])
        assert.equal(diagnostic.contextRequestDiagnosticJson(changed, original), null);
      const symbol = clone(value); symbol[Symbol("private")] = "synthetic-private-marker";
      assert.equal(diagnostic.contextRequestDiagnosticJson(symbol, original), null);
      assert.equal(await diagnostic.createContextRequestDiagnostic({ ...original, cookie: "synthetic-private-marker" }, timing), null);
      assert.equal(await diagnostic.createContextRequestDiagnostic(original, { ...timing, stack: "synthetic-private-marker" }), null);
      let getters = 0;
      const accessor = clone(value);
      Object.defineProperty(accessor, "httpStatus", { enumerable: true, get() { getters++; return 504; } });
      assert.equal(diagnostic.contextRequestDiagnosticJson(accessor, original), null); assert.equal(getters, 0);
      const unknown = await diagnostic.createContextRequestDiagnostic(original, { ...timing, serverCode: "synthetic-private-marker" });
      assert(unknown); assert.equal(unknown.serverCode, null);
      assert(!JSON.stringify(unknown).includes("synthetic-private-marker"));
      const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
      try {
        Object.defineProperty(globalThis, "crypto", { configurable: true, value: { subtle: {
          digest: async () => { throw new Error("Synthetic unavailable browser hashing"); }
        } } });
        const unhashed = await diagnostic.createContextRequestDiagnostic(original, timing);
        assert(unhashed); assert.equal(unhashed.intentSha256, null); assert.equal(unhashed.hashStatus, "unavailable");
        assert(diagnostic.contextRequestDiagnosticJson(unhashed, original));
        assert.equal(diagnostic.contextRequestDiagnosticJson(unhashed, { ...original, longitude: original.longitude + 0.01 }), null,
          "Unavailable WebCrypto never bypasses structural current-intent binding");
      } finally {
        if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor); else delete globalThis.crypto;
      }
      assert.equal(networkCalls, 0);
    });
    await group("C15-context-diagnostic-preview-disclosure-gate", async () => {
      const diagnostic = await import(new URL("src/lib/prototype/point-to-object-context-diagnostic.ts", root).href);
      const React = await import("react"), { renderToStaticMarkup } = await import("react-dom/server");
      const { VerificationExport } = await import(new URL("components/point-to-object/verification-export.tsx", root).href);
      const publicIntent = { caseKey: "dubai", longitude: anchor[0], latitude: anchor[1],
        locale: "en", expectedSourceFeatureId: expected.subjectId };
      const value = await diagnostic.createContextRequestDiagnostic(publicIntent, {
        startedAt: "2026-10-18T17:00:00.000Z", completedAt: "2026-10-18T17:00:01.000Z", elapsedMs: 1_000,
        outcome: "http_response", httpStatus: 504, serverCode: "OVERPASS_TIMEOUT" });
      assert(value);
      for (const locale of ["en", "ru"]) {
        const props = { enabled: true, locale, contextDiagnostic: value, records: [], failedResponses: [],
          currentSelection: null, preSubmit: { operation: "context", intent: publicIntent, sourceSnapshot: { context: null } } };
        const visible = renderToStaticMarkup(React.createElement(VerificationExport, props));
        assert(visible.includes('data-testid="context-request-diagnostic"'));
        assert(/<textarea[^>]*readOnly=""/i.test(visible));
        assert(visible.includes("client_observation_not_source_evidence"));
        assert.equal(renderToStaticMarkup(React.createElement(VerificationExport, { ...props, enabled: false })), "",
          "Disabled existing Preview gate emits no disclosure or diagnostic");
        const foreign = renderToStaticMarkup(React.createElement(VerificationExport, { ...props,
          preSubmit: { ...props.preSubmit, intent: { ...publicIntent, expectedSourceFeatureId: "way/393391114" } } }));
        assert(!foreign.includes('data-testid="context-request-diagnostic"'), "Old-object observation is not exposed for a different current intent");
      }
      assert.equal(networkCalls, 0);
    });
    return { classification: "NO_NETWORK_ACTUAL_PARSER_SERIALIZER_QA_NOT_NEW_LIVE_AI", groups,
      passed: groups.length, networkCalls, recordedPublicResultSha256: manifest.sha256,
      historicalG2Score: 7, historicalG2Accepted: false, newPaidCalls: 0 };
  } finally {
    hooks.deregister(); globalThis.fetch = originalFetch;
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor); else delete globalThis.window;
    assert.equal(networkCalls, 0);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert(args.every(arg => arg === "--fixtures" || /^--locale=(en|ru)$/.test(arg)), "Unknown QA argument");
  assert(new Set(args).size === args.length, "Duplicate QA arguments");
  const locale = args.find(arg => arg.startsWith("--locale="))?.slice(9);
  assert(args.length === 0 || args.includes("--fixtures") && locale && args.length === 2, "Use --fixtures with one locale");
  process.stdout.write(JSON.stringify(await runD2SourceCitationClosureCheck({ fixtureLocale: locale }), null, 2) + "\n");
}
