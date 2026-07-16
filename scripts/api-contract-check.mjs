const baseUrl = (process.env.GEOAI_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const publicReportPackageRoute = "/api/report-packages?projectKey=dubai-investment-screening-demo";
const seededReportPackageRoute = "/api/report-packages/report-package-dubai-investment-screening-demo-investment-screening-seeded-analysis-dubai-marina-report";

const routes = [
  "/api/health",
  "/api/data-sources",
  "/api/data-sources/readiness",
  "/api/external-data/manifest",
  "/api/external-data/sources",
  "/api/external-data/status",
  "/api/external-data/market-metrics",
  "/api/market-metrics",
  "/api/source-lineage",
  "/api/db/health",
  "/api/storage/health",
  "/api/platform/activation-status",
  "/api/pilot-backend/status",
  "/api/known-limitations",
  "/api/security/rls-readiness",
  "/api/validation/connectors",
  "/api/auth/session",
  publicReportPackageRoute,
  seededReportPackageRoute
];

const dataFoundationRoutes = new Set([
  "/api/data-sources",
  "/api/data-sources/readiness",
  "/api/external-data/manifest",
  "/api/external-data/sources",
  "/api/external-data/status",
  "/api/source-lineage"
]);

const dataFoundationMaxBytes = new Map([
  ["/api/data-sources", 48 * 1024],
  ["/api/data-sources/readiness", 48 * 1024],
  ["/api/external-data/manifest", 64 * 1024],
  ["/api/external-data/sources", 48 * 1024],
  ["/api/external-data/status", 64 * 1024],
  ["/api/source-lineage", 48 * 1024]
]);

const publicMarketRoutes = new Set([
  "/api/external-data/market-metrics",
  "/api/market-metrics"
]);

const publicReportPackageRoutes = new Set([publicReportPackageRoute]);

const noStoreRoutes = new Set([
  "/api/db/health",
  "/api/storage/health",
  "/api/platform/activation-status",
  "/api/pilot-backend/status",
  "/api/known-limitations",
  "/api/security/rls-readiness",
  "/api/auth/session"
]);

const infrastructureEnumerationKeys = /"(?:projectRef|requiredTables|missingTables|requiredBuckets|missingBuckets|bucketName|serviceRole|hasSupabaseServiceRoleEnv|readOnlyProbes|runtimeReadiness|supabaseActivation|tablePlans|cases)"\s*:/i;

const secretPatterns = [
  /\bsk-(?:proj-[a-z0-9_-]{20,}|[a-z0-9]{32,})\b/i,
  /postgres:\/\/[^"'\s]+:[^"'\s]+@/i,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/
];

const requiredCaveatPattern = /screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion/i;
const privateSourceKeys = /"(?:available[_-]?files|input[_-]?file|output[_-]?file|file[_-]?path|normalized[_-]?path|raw[_-]?file[_-]?name|raw[_-]?path|storage[_-]?path|object[_-]?path|local[_-]?path|filesystem[_-]?path|bucket[_-]?name|storage[_-]?key|object[_-]?key)"\s*:/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertString(value, message) {
  assert(typeof value === "string" && value.trim().length > 0, message);
}

function assertArray(value, message) {
  assert(Array.isArray(value), message);
}

function assertObject(value, message) {
  assert(typeof value === "object" && value !== null && !Array.isArray(value), message);
}

function assertCaveat(value, message) {
  const values = Array.isArray(value) ? value : [value];
  assert(values.some((item) => typeof item === "string" && item.trim().length > 0), message);
}

function assertNoPositiveReadinessClaim(route, text, payload) {
  const normalized = text.toLowerCase();
  const hasReadyPhrase = /production[-_]ready|pilot[-_]ready/.test(normalized);
  if (!hasReadyPhrase) return;

  const hasExplicitNegative = /not[-_ ]production[-_ ]ready|not[-_ ]pilot[-_ ]ready|not_production_ready_or_pilot_ready/.test(normalized);
  const hardVerified = payload.canRunConfidentialPilot === true || (
    payload.runtimeReadiness?.hardAccessVerified === true &&
    payload.runtimeReadiness?.schemaReady === true &&
    payload.runtimeReadiness?.storageReady === true
  );
  assert(hasExplicitNegative || hardVerified, `${route} appears to make a production-ready or pilot-ready claim without hard runtime verification`);
}

function assertRuntimeReadiness(route, runtimeReadiness) {
  assertObject(runtimeReadiness, `${route} missing runtimeReadiness`);
  assertString(runtimeReadiness.runtimeMode, `${route} runtimeReadiness missing runtimeMode`);
  assertString(runtimeReadiness.repositoryMode, `${route} runtimeReadiness missing repositoryMode`);
  assert(typeof runtimeReadiness.supabaseConfigured === "boolean", `${route} runtimeReadiness missing supabaseConfigured`);
  assert(typeof runtimeReadiness.hasSupabasePublicEnv === "boolean", `${route} runtimeReadiness missing hasSupabasePublicEnv`);
  assert(typeof runtimeReadiness.hasSupabaseServerEnv === "boolean", `${route} runtimeReadiness missing hasSupabaseServerEnv`);
  assert(typeof runtimeReadiness.hasSupabaseServiceRoleEnv === "boolean", `${route} runtimeReadiness missing hasSupabaseServiceRoleEnv`);
  assert(typeof runtimeReadiness.serviceRoleUsedForWrites === "boolean", `${route} runtimeReadiness missing serviceRoleUsedForWrites`);
  assert(runtimeReadiness.serviceRoleUsedForWrites === false, `${route} runtimeReadiness must never report service-role writes`);
  assert(typeof runtimeReadiness.canReadHealthcheck === "boolean", `${route} runtimeReadiness missing canReadHealthcheck`);
  assert(typeof runtimeReadiness.canReadSourceRegistry === "boolean", `${route} runtimeReadiness missing canReadSourceRegistry`);
  assert(typeof runtimeReadiness.canReadExternalSnapshots === "boolean", `${route} runtimeReadiness missing canReadExternalSnapshots`);
  assert(typeof runtimeReadiness.schemaReady === "boolean", `${route} runtimeReadiness missing schemaReady`);
  assert(typeof runtimeReadiness.postgisReady === "boolean", `${route} runtimeReadiness missing postgisReady`);
  assert(typeof runtimeReadiness.storageReady === "boolean", `${route} runtimeReadiness missing storageReady`);
  assert(typeof runtimeReadiness.localApiFallbackActive === "boolean", `${route} runtimeReadiness missing localApiFallbackActive`);
  assertArray(runtimeReadiness.blockers, `${route} runtimeReadiness missing blockers`);
  assertArray(runtimeReadiness.nextActions, `${route} runtimeReadiness missing nextActions`);
  assertCaveat(runtimeReadiness.caveats ?? runtimeReadiness.caveat, `${route} runtimeReadiness missing caveats`);
  assertString(runtimeReadiness.generatedAt, `${route} runtimeReadiness missing generatedAt`);
}

function assertDataFoundationPayload(route, payload) {
  assert(payload.ok === true, `${route} must return ok: true`);
  assertString(payload.version, `${route} missing version`);
  assert(payload.contractVersion === "1.3", `${route} missing public source contractVersion 1.3`);
  assert(payload.manifestVersion === "1.6", `${route} missing bundled manifestVersion 1.6`);
  assert(payload.version === payload.manifestVersion, `${route} top-level version must identify the bundled manifest`);
  assert(payload.projection === "compact_public_v1", `${route} must use the compact anonymous projection`);
  assertString(payload.mode, `${route} missing mode`);
  assertString(payload.source, `${route} missing source`);
  assert(payload.mode === "bundled_public_manifest", `${route} must not query a live registry anonymously`);
  assert(payload.source === "reviewed_repository_snapshot", `${route} must identify the reviewed repository snapshot`);
  assert(payload.liveRegistryIncluded === false, `${route} must explicitly exclude live registry state`);
  assert(payload.diagnosticsWithheld === true, `${route} must withhold source-custody diagnostics`);
  assert(payload.sourceRegistryCount === 0 && payload.externalSnapshotCount === 0, `${route} must not expose live registry/snapshot counts`);
  assertObject(payload.summary, `${route} missing summary`);
  assertString(payload.caveat, `${route} missing caveat`);
  assert(requiredCaveatPattern.test(payload.caveat), `${route} caveat does not match required data-honesty framing`);
  assertString(payload.generatedAt, `${route} missing generatedAt`);

  const routeCollection = route === "/api/data-sources" || route === "/api/external-data/sources"
    ? payload.sources
    : route === "/api/data-sources/readiness"
      ? payload.readiness
      : route === "/api/external-data/manifest"
        ? payload.manifest?.sources
        : route === "/api/external-data/status"
          ? payload.sourceGroups
          : payload.lineage;
  assertArray(routeCollection, `${route} missing its route-specific compact collection`);
  assert(routeCollection.length > 0, `${route} compact collection must not be empty`);

  if (route === "/api/external-data/manifest") {
    assertObject(payload.manifest, `${route} missing manifest`);
    assert(payload.manifest.version === "1.6", `${route} manifest version mismatch`);

    const sourcesById = new Map(payload.manifest.sources.map((source) => [source.id, source]));
    for (const sourceId of [
      "dld-dubai-pulse-public-valuations",
      "dld-dubai-pulse-public-brokers",
      "dld-dubai-pulse-public-developers"
    ]) {
      const source = sourcesById.get(sourceId);
      assertObject(source, `${route} missing ${sourceId}`);
      assert(source.status === "manual_import_ready", `${route} ${sourceId} must remain manual-import ready`);
      assert(source.recordCount === 0, `${route} ${sourceId} must preserve its zero-record truth`);
      assert(source.usedInAnalysis === false, `${route} ${sourceId} must not claim analysis use without records`);
    }

    const osmBuildings = sourcesById.get("osm-geofabrik-open-buildings");
    assertObject(osmBuildings, `${route} missing OSM buildings source`);
    assert(osmBuildings.recordCount === 0 && osmBuildings.featureCount === 0, `${route} OSM buildings must not inherit the OSM group total`);
    assert(osmBuildings.usedInAnalysis === false, `${route} zero-feature OSM buildings must not claim analysis use`);
    for (const sourceId of ["osm-geofabrik-open-roads", "osm-geofabrik-open-pois"]) {
      const source = sourcesById.get(sourceId);
      assertObject(source, `${route} missing ${sourceId}`);
      assert(source.recordCount === 1 && source.featureCount === 1, `${route} ${sourceId} must preserve its per-source count 1`);
      assert(source.usedInAnalysis === true, `${route} ${sourceId} must preserve acquired sample evidence`);
    }

    const overtureExpectedCounts = new Map([
      ["overture-maps-open-buildings", 2],
      ["overture-maps-open-places", 2],
      ["overture-maps-open-transportation", 1]
    ]);
    for (const [sourceId, expectedCount] of overtureExpectedCounts) {
      const source = sourcesById.get(sourceId);
      assertObject(source, `${route} missing ${sourceId}`);
      assert(source.recordCount === expectedCount && source.featureCount === expectedCount, `${route} ${sourceId} must preserve its per-source count ${expectedCount}`);
    }
  }
  if (route === "/api/external-data/status") {
    assertArray(payload.readiness, `${route} missing compact readiness`);
    const groupsById = new Map(payload.sourceGroups.map((group) => [group.id, group]));
    const expectedGroupCounts = new Map([
      ["dld-dubai-pulse-public-real-estate", 18],
      ["osm-geofabrik-open-geospatial", 3],
      ["overture-maps-open-context", 5]
    ]);
    for (const [groupId, expectedCount] of expectedGroupCounts) {
      const group = groupsById.get(groupId);
      assertObject(group, `${route} missing ${groupId}`);
      assert(group.recordCount === expectedCount, `${route} ${groupId} must preserve verified group total ${expectedCount}`);
    }
    const dldGroup = groupsById.get("dld-dubai-pulse-public-real-estate");
    assert(dldGroup.status === "sample_fallback", `${route} bundled DLD sample must not be promoted to snapshot_available`);
    assert(dldGroup.dataMode === "sample_fallback", `${route} bundled DLD sample must retain sample_fallback data mode`);
  }
  if (route !== "/api/source-lineage") {
    assertArray(payload.blockers, `${route} missing blockers`);
    assertArray(payload.nextActions, `${route} missing nextActions`);
  }
  assert(!("sourceQuality" in payload), `${route} must not repeat the full source-quality manifest anonymously`);

  const groups = route === "/api/data-sources" || route === "/api/external-data/sources"
    ? payload.sources
    : route === "/api/external-data/status"
      ? payload.sourceGroups
      : [];
  for (const group of groups) {
    assertObject(group, `${route} sourceGroups entries must be objects`);
    assertString(group.id, `${route} source group missing id`);
    assertString(group.name, `${route} source group missing name`);
    assertString(group.status, `${route} source group missing status`);
    assertString(group.dataMode, `${route} source group missing dataMode`);
    assertString(group.confidence, `${route} source group missing confidence`);
    assertString(group.caveat, `${route} source group missing caveat`);
    assertString(group.nextValidationStep, `${route} source group missing nextValidationStep`);
    assert(!("sourceQuality" in group), `${route} compact source group repeats sourceQuality`);
  }

  for (const lineage of route === "/api/source-lineage" ? payload.lineage : []) {
    assertObject(lineage, `${route} lineage entries must be objects`);
    assertString(lineage.sourceGroupId, `${route} lineage missing sourceGroupId`);
    assertString(lineage.sourceGroupName, `${route} lineage missing sourceGroupName`);
    assertString(lineage.status, `${route} lineage missing status`);
    assertString(lineage.caveat, `${route} lineage missing caveat`);
    assertString(lineage.nextValidationStep, `${route} lineage missing nextValidationStep`);
    assert(!("sourceQuality" in lineage), `${route} compact lineage repeats sourceQuality`);
  }
}

function assertBackendPayload(route, payload) {
  if (publicMarketRoutes.has(route)) {
    assert(payload.contractVersion === "compact_public_v1", `${route} must use the compact public market projection`);
    assert(payload.sourceMode === "sample_fallback" && payload.fallbackUsed === true, `${route} must remain bundled sample fallback`);
    assert(payload.liveSnapshotIncluded === false && payload.diagnosticsWithheld === true, `${route} must exclude live/operator market snapshots`);
    assert(!("areas" in payload), `${route} must not expose wholesale market rows`);
    assertArray(payload.availableAreaNames, `${route} missing reviewed public area names`);
    assert(payload.count === payload.availableAreaNames.length, `${route} public market count mismatch`);
    assertString(payload.caveat, `${route} missing data-honesty caveat`);
  }

  if (publicReportPackageRoutes.has(route)) {
    const allowedSummaryKeys = new Set([
      "id",
      "packageKey",
      "projectKey",
      "title",
      "packageType",
      "status",
      "version",
      "generatedAt",
      "printablePath",
      "jsonPath",
      "caveat"
    ]);
    assert(payload.ok === true, `${route} public report-package projection must be available`);
    assert(payload.contractVersion === "compact_public_v1", `${route} must use compact_public_v1`);
    assert(payload.projection === "dashboard_summaries_v1", `${route} must expose dashboard summaries only`);
    assert(payload.sourceMode === "demo_seed" && payload.mode === "demo_seed", `${route} must contain static seed data only`);
    assert(payload.dynamicStoredStateIncluded === false, `${route} must exclude dynamic stored state`);
    assert(!("items" in payload) && !("packages" in payload) && !("access" in payload), `${route} exposes a heavy or request-specific collection field`);
    assertArray(payload.summaries, `${route} missing dashboard summaries`);
    assert(payload.count === payload.summaries.length, `${route} summary count mismatch`);
    assert(payload.count <= 10, `${route} exceeds its public summary-count budget`);
    for (const summary of payload.summaries) {
      assertObject(summary, `${route} summary must be an object`);
      assert(Object.keys(summary).every((key) => allowedSummaryKeys.has(key)), `${route} summary contains a non-allowlisted field`);
      assert(summary.projectKey === "dubai-investment-screening-demo", `${route} returned a cross-project summary`);
    }
    assert(!/"(?:sections|sourceLineage|exportManifest|evidenceReviewSummary|validationSummary|linkedReportIds)"\s*:/.test(JSON.stringify(payload)), `${route} leaked full report-package internals`);
    assertString(payload.caveat, `${route} missing report-package caveat`);
  }
  if (route === seededReportPackageRoute) {
    assert(payload.ok === true, `${route} seeded package must be available`);
    assertObject(payload.package, `${route} missing package`);
    assertArray(payload.package.sourceLineage, `${route} missing source lineage`);
    const sourceLineage = payload.package.sourceLineage;
    const evidence = sourceLineage.filter((source) => source.evidenceRole === "used");
    const candidates = sourceLineage.filter((source) => source.evidenceRole === "candidate_validation_required");
    assert(evidence.length > 0, `${route} must retain explicitly acquired demo/open evidence`);
    assert(candidates.length > 0, `${route} must disclose referenced validation-required candidates`);
    assert(sourceLineage.every((source) => typeof source.status === "string" && typeof source.dataMode === "string"), `${route} lineage must preserve canonical status and data mode`);
    const memo = payload.package.sections.find((section) => section.type === "ai_decision_memo");
    assertObject(memo, `${route} missing AI decision memo`);
    assertObject(memo.content, `${route} AI decision memo content must be an object`);
    assertArray(memo.content.evidenceUsed, `${route} missing evidenceUsed`);
    assertArray(memo.content.candidateSourcesRequiringValidation, `${route} missing candidate source disclosure`);
    const evidenceNames = new Set(evidence.map((source) => source.name));
    assert(memo.content.evidenceUsed.every((name) => evidenceNames.has(name)), `${route} calls a non-acquired candidate evidence used`);
    const forbiddenEvidenceIds = new Set(candidates.map((source) => source.id));
    assert(!sourceLineage.some((source) => source.id.includes("copernicus")), `${route} attached an unrelated registry source`);
    assert(!evidence.some((source) => forbiddenEvidenceIds.has(source.id)), `${route} candidate/evidence classifications overlap`);
  }

  if (route === "/api/health") {
    assert(payload.status === "ok", "health status must be ok");
    assert(payload.productStage === "public_demo_prototype", "health missing canonical productStage");
    assert(payload.productSemVer === null, "health must not invent Product SemVer");
    assertString(payload.environment, "health missing environment");
    assertString(payload.releaseIdentity, "health missing release identity rule");
    assertString(payload.dataStatus, "health missing dataStatus");
    assert(/live official integrations are not connected/i.test(payload.dataStatus), "health must preserve no-live-official-integration framing");
  }

  if (route === "/api/db/health") {
    assert(payload.status === "diagnostics_withheld", "db health must withhold public diagnostics");
    assert(payload.mode === "browser_local", "db health must identify browser-local public state");
    assert(payload.configured === null && payload.reachable === null, "db health must not attest configuration/reachability publicly");
    assert(payload.schemaReady === null && payload.postgisReady === null && payload.tablesReady === null, "db health must not attest schema internals publicly");
    assert(payload.diagnosticsWithheld === true, "db health missing diagnosticsWithheld");
    assert(payload.canonicalReplayCertified === false, "db health must keep canonical replay uncertified");
    assertString(payload.caveat, "db health missing caveat");
    assertArray(payload.blockers, "db health missing blockers");
    assertArray(payload.nextActions, "db health missing nextActions");
  }

  if (route === "/api/platform/activation-status") {
    assert(payload.activationStatus === "public_demo_only", "platform activation must remain public-demo only");
    assert(payload.mode === "browser_local", "platform activation must identify browser-local public state");
    assert(payload.protectedModeActive === false && payload.canRunConfidentialPilot === false, "platform activation must not promote protected/confidential capability");
    assert(payload.canonicalReplayCertified === false, "platform activation must keep canonical replay uncertified");
    assert(payload.diagnosticsWithheld === true, "platform activation missing diagnosticsWithheld");
    assert(payload.supabaseConfigured === null && payload.supabaseReachable === null, "platform activation must not expose live Supabase attestation");
    assertArray(payload.blockers, "platform activation missing blockers");
    assertArray(payload.nextActions, "platform activation missing nextActions");
    assertCaveat(payload.caveats ?? payload.caveat, "platform activation missing caveats");
  }

  if (route === "/api/storage/health") {
    assert(payload.status === "diagnostics_withheld", "storage health must withhold public diagnostics");
    assert(payload.mode === "browser_local", "storage health must identify browser-local public state");
    assert(payload.provider === "protected_storage_unavailable_to_public_demo", "storage health must not advertise a live provider");
    assert(payload.configured === null && payload.bucketReady === false && payload.storageReady === false, "storage health must not attest protected storage readiness");
    assert(payload.protectedStorageAvailableToPublic === false, "protected storage must remain unavailable publicly");
    assert(payload.diagnosticsWithheld === true, "storage health missing diagnosticsWithheld");
    assertArray(payload.blockers, "storage health missing blockers");
    assertArray(payload.nextActions, "storage health missing nextActions");
    assertString(payload.caveat, "storage health missing caveat");
  }

  if (route === "/api/pilot-backend/status") {
    assert(payload.status === "public_demo_prototype", "pilot backend must expose canonical public-demo stage");
    assert(payload.productSemVer === null, "pilot backend must not invent Product SemVer");
    assertString(payload.environment, "pilot backend missing environment");
    assertString(payload.accessMode, "pilot backend missing accessMode");
    assertString(payload.authMode, "pilot backend missing authMode");
    assertString(payload.repositoryMode, "pilot backend missing repositoryMode");
    assertString(payload.sourceMode, "pilot backend missing sourceMode");
    assert(payload.sourceMode === "operator_only_disabled_for_public", "pilot backend must not disclose source-pack operator configuration");
    assert(typeof payload.canRunDemoPilot === "boolean", "canRunDemoPilot is missing");
    assert(typeof payload.canRunDemoWorkflow === "boolean", "canRunDemoWorkflow is missing");
    assert(typeof payload.canRunConfidentialPilot === "boolean", "canRunConfidentialPilot is missing");
    assert(payload.canonicalReplayCertified === false, "canonical replay must remain uncertified");
    assert(payload.containmentMigrationApplied === false, "unapplied containment migration must remain false");
    assertArray(payload.blockers, "pilot backend blockers must be an array");
    assertArray(payload.nextActions, "pilot backend nextActions must be an array");
    assertArray(payload.caveats, "pilot backend caveats must be an array");
    assertCaveat(payload.caveats, "pilot backend missing caveats");
    assert(!("runtimeReadiness" in payload) && !("supabaseActivation" in payload), "public pilot status must not expose operator diagnostics");
    assert(!/hasSupabase|serviceRole|bucketName|requiredTables|projectRef/i.test(JSON.stringify(payload)), "public pilot status exposes infrastructure enumeration fields");
  }

  if (route === "/api/known-limitations") {
    assert(payload.status === "static_candidate_truth", "known limitations must be a static candidate catalog");
    assert(payload.liveReadinessIncluded === false && payload.diagnosticsWithheld === true, "known limitations must exclude live readiness probes");
    assertArray(payload.items, "known limitations missing items");
    assert(payload.count === payload.items.length, "known limitations count mismatch");
    assertString(payload.caveat, "known limitations missing caveat");
  }

  if (route === "/api/security/rls-readiness") {
    assert(payload.status === "not_attested_on_public_endpoint", "RLS readiness must not attest live state publicly");
    assert(payload.diagnosticsWithheld === true, "RLS readiness missing diagnosticsWithheld");
    assert(payload.hardAccessEnabled === false && payload.confidentialPilotReady === false, "RLS readiness must keep protected capabilities disabled");
    assert(payload.canonicalReplayCertified === false && payload.containmentMigrationApplied === false, "RLS readiness must preserve unapplied/uncertified truth");
    assert(!("tablePlans" in payload) && !("cases" in payload) && !("requiredTables" in payload), "RLS readiness exposes table/policy inventory");
  }

  if (route === "/api/validation/connectors") {
    assert(payload.ok === true && payload.mode === "local_fallback", "validation connectors must remain static metadata");
    assertArray(payload.connectorReadiness, "validation connectors missing catalog");
    assertString(payload.dataHonesty, "validation connectors missing data honesty");
  }
}

const checked = [];

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`);
  const text = await response.text();
  assert(response.status === 200, `${route} returned HTTP ${response.status}`);
  assert(!secretPatterns.some((pattern) => pattern.test(text)), `${route} appears to expose a secret-like value`);
  const payload = JSON.parse(text);
  assertObject(payload, `${route} did not return a JSON object`);
  if (noStoreRoutes.has(route)) {
    assert(/(?:^|,)\s*(?:private\s*,\s*)?no-store\b/i.test(response.headers.get("cache-control") ?? ""), `${route} must be private/no-store`);
    assert(!infrastructureEnumerationKeys.test(text), `${route} exposes infrastructure enumeration fields`);
  }
  if (dataFoundationRoutes.has(route)) {
    assert(/s-maxage=300/i.test(response.headers.get("cache-control") ?? ""), `${route} missing bounded public cache policy`);
  }
  if (publicMarketRoutes.has(route)) {
    assert(/s-maxage=300/i.test(response.headers.get("cache-control") ?? ""), `${route} missing bounded public cache policy`);
    assert(Buffer.byteLength(text, "utf8") <= 16 * 1024, `${route} exceeds its compact public payload budget`);
    assert(!privateSourceKeys.test(text), `${route} exposes a private market source path/file key`);
  }
  if (publicReportPackageRoutes.has(route)) {
    const cacheControl = response.headers.get("cache-control") ?? "";
    const vary = response.headers.get("vary") ?? "";
    assert(/s-maxage=300/i.test(cacheControl) && !/no-store/i.test(cacheControl), `${route} must cache only its static seed projection`);
    assert(/authorization/i.test(vary) && /cookie/i.test(vary), `${route} cache policy must vary on request identity headers`);
    assert(Buffer.byteLength(text, "utf8") <= 16 * 1024, `${route} exceeds its compact public payload budget`);
  }
  if (route === seededReportPackageRoute) {
    assert(Buffer.byteLength(text, "utf8") <= 64 * 1024, `${route} exceeds its full seeded-package payload budget`);
  }
  assertNoPositiveReadinessClaim(route, text, payload);

  if (dataFoundationRoutes.has(route)) {
    assert(!privateSourceKeys.test(text), `${route} exposes a private source path/file key`);
    assert(Buffer.byteLength(text, "utf8") <= dataFoundationMaxBytes.get(route), `${route} exceeds its compact public payload budget`);
    assertDataFoundationPayload(route, payload);
  } else {
    assertBackendPayload(route, payload);
  }

  checked.push(route);
}

const isolationCases = [
  { name: "unknown-data-room", path: "/api/data-room?projectKey=definitely-unknown-project", expected: [403, 404] },
  { name: "unknown-report-package-project", path: "/api/report-packages?projectKey=definitely-unknown-project", expected: [403], requireNoStore: true },
  { name: "unknown-aoi", path: "/api/aois/definitely-unknown-aoi", expected: [404] },
  { name: "protected-evidence-download", path: "/api/storage/evidence-files/definitely-unknown-file/download", expected: [403] },
  { name: "protected-signed-url-test", path: "/api/storage/evidence-files/definitely-unknown-file/signed-url-test", method: "POST", expected: [403] },
  { name: "protected-review-history", path: "/api/validation/evidence/definitely-unknown-evidence/reviews", expected: [403] },
  {
    name: "mutation-denied-before-body-validation",
    path: "/api/data-room/assets",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json",
    expected: [403]
  }
];

for (const testCase of isolationCases) {
  const response = await fetch(`${baseUrl}${testCase.path}`, {
    method: testCase.method ?? "GET",
    headers: testCase.headers,
    body: testCase.body
  });
  const text = await response.text();
  assert(testCase.expected.includes(response.status), `${testCase.name} returned HTTP ${response.status}; expected ${testCase.expected.join("/")}`);
  if (testCase.requireNoStore) {
    assert(/no-store/i.test(response.headers.get("cache-control") ?? ""), `${testCase.name} denial must not be publicly cached`);
  }
  assert(!/dubai-investment-screening-demo|developer-land-pipeline-demo|bank-asset-review-demo/.test(text), `${testCase.name} substituted or disclosed another demo project`);
  checked.push(`${testCase.path}#${testCase.name}`);
}

const boundedPointRoutes = [
  "/api/context/climate",
  "/api/context/solar-energy",
  "/api/context/air-quality",
  "/api/context/demographics",
  "/api/context/accessibility",
  "/api/context/spatial",
  "/api/external-data/climate-context"
];

for (const route of boundedPointRoutes) {
  const missing = await fetch(`${baseUrl}${route}`);
  assert(missing.status === 400, `${route} must reject missing coordinates instead of querying (0, 0)`);
  const outOfRange = await fetch(`${baseUrl}${route}?lat=91&lng=181`);
  assert(outOfRange.status === 400, `${route} must reject out-of-range coordinates`);
  checked.push(`${route}#coordinate-guard`);
}

const openMeteoGate = await fetch(`${baseUrl}/api/context/climate?lat=25.2048&lng=55.2708`);
assert(openMeteoGate.status === 200, "Open-Meteo licence gate route must return a declared state");
const openMeteoPayload = await openMeteoGate.json();
assert(openMeteoPayload.status === "permission_required", "Open-Meteo free API must remain permission-gated");
assert(openMeteoPayload.metrics?.avgTemperatureC === null, "Permission-gated Open-Meteo must not return fabricated metrics");
checked.push("/api/context/climate#open-meteo-license-gate");

const legacySolarGate = await fetch(`${baseUrl}/api/context/solar-energy?lat=25.2048&lng=55.2708`);
assert(legacySolarGate.status === 200, "Legacy solar route must return a declared fallback state");
const legacySolarPayload = await legacySolarGate.json();
assert(legacySolarPayload.status === "sample_fallback", "Legacy solar route must not bypass the controlled source pack");
assert(legacySolarPayload.fallbackReason === "runtime_source_pack_required", "Legacy solar fallback reason changed unexpectedly");
checked.push("/api/context/solar-energy#controlled-pack-gate");

const productionSourcePack = await fetch(`${baseUrl}/api/external-data/source-connection-pack`);
assert(productionSourcePack.status === 503, "Generic production runtime must fail closed before provider execution");
const productionSourcePackPayload = await productionSourcePack.json();
assert(productionSourcePackPayload.effectiveMode === "disabled", "Production source pack must report disabled mode");
assert(productionSourcePackPayload.activationAllowed === false, "Production source pack must deny activation");
assert(Array.isArray(productionSourcePackPayload.sources) && productionSourcePackPayload.sources.length === 0, "Production source pack must return zero provider observations");
checked.push("/api/external-data/source-connection-pack#production-fail-closed");

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  checked,
  caveat: "Contract check validates API shape and secret hygiene; it is not a security certification."
}, null, 2));
