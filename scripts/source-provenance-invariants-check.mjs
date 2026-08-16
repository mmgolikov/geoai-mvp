import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadTypeScriptModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const result = ts.transpileModule(source, {
    fileName: relativePath,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (errors.length > 0) {
    throw new Error(
      `Unable to load ${relativePath}: ${errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("; ")}`
    );
  }
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`);
}

const {
  SOURCE_PROVENANCE_CAVEAT,
  deriveSourceConfidence,
  evaluateSourceReleaseGate
} = await loadTypeScriptModule("../src/lib/external-data/source-provenance-contract.ts");
const {
  assertSourceReleaseProvenance,
  validateSourceReleaseProvenance
} = await loadTypeScriptModule("../src/lib/external-data/source-provenance-invariants.ts");
const {
  MARKET_METRICS_SAMPLE_RELEASE_GATE,
  isMarketMetricsDecisionUseAllowed
} = await loadTypeScriptModule("../src/lib/market-metrics/release-gate.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const hash = (character) => character.repeat(64);

assert(
  MARKET_METRICS_SAMPLE_RELEASE_GATE.screeningContextAvailable === true,
  "Imported sample metrics must remain available as labelled screening context"
);
assert(
  MARKET_METRICS_SAMPLE_RELEASE_GATE.decisionUse === "blocked",
  "Imported sample metrics must fail closed for decision use"
);
assert(
  !isMarketMetricsDecisionUseAllowed(MARKET_METRICS_SAMPLE_RELEASE_GATE),
  "The current imported sample release gate must not permit scoring"
);
assert(
  isMarketMetricsDecisionUseAllowed({
    structurallyValid: true,
    screeningContextAvailable: true,
    decisionUse: "allowed",
    blockers: []
  }),
  "A future explicit, blocker-free release gate should permit scoring"
);
assert(
  !isMarketMetricsDecisionUseAllowed({
    structurallyValid: true,
    screeningContextAvailable: true,
    decisionUse: "allowed",
    blockers: ["Unresolved release evidence"]
  }),
  "A nominally allowed release with blockers must still fail closed"
);
assert(
  !isMarketMetricsDecisionUseAllowed({
    structurallyValid: false,
    screeningContextAvailable: true,
    decisionUse: "allowed",
    blockers: []
  }),
  "A structurally invalid release must fail closed even when marked allowed"
);

const [marketMetricTypesSource, marketMetricMatcherSource, marketMetricScoringSource] = await Promise.all([
  readFile(new URL("../src/lib/market-metrics/types.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/market-metrics/matcher.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/market-metrics/scoring.ts", import.meta.url), "utf8")
]);

assert(marketMetricTypesSource.includes("releaseGate: MarketMetricsReleaseGate"), "Market metric matches must carry their release gate");
assert(!marketMetricMatcherSource.includes("importedMetricsUsed: true"), "Matcher must not hard-code imported sample metrics as used");
assert(
  marketMetricMatcherSource.includes("importedMetricsUsed: isMarketMetricsDecisionUseAllowed(releaseGate)"),
  "Matcher must derive decision use from the explicit release gate"
);
assert(
  /scoreSignalsFromMarketMetrics[\s\S]*?!isMarketMetricsDecisionUseAllowed\(match\.releaseGate\)/.test(marketMetricScoringSource),
  "Market metric score signals must fail closed unless the attached release gate allows decision use"
);

function fixture() {
  const confidenceInput = {
    dataMode: "open_snapshot",
    rights: {
      status: "approved",
      licenseId: "ODbL-1.0",
      licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
      licenseNote: "OpenStreetMap data is used under ODbL 1.0; downstream share-alike obligations remain applicable.",
      attributionNote: "Contains OpenStreetMap data, licensed under ODbL 1.0; Geofabrik extract lineage recorded.",
      reviewedAt: "2026-08-15T10:00:00.000Z",
      permittedUses: [
        "local normalization",
        "screening context",
        "attributed report context",
        "source-backed decision scoring"
      ],
      prohibitedUses: ["official parcel proof", "cadastral validation"]
    },
    validationStatus: "source_reviewed",
    freshness: {
      status: "current",
      referenceTimestamp: "2026-08-14T00:00:00.000Z",
      evaluatedAt: "2026-08-16T00:00:00.000Z",
      maximumAgeDays: 30,
      ageDays: 2,
      policyId: "geoai-open-snapshot-freshness-v1"
    },
    custodyReceipt: {
      status: "local_manifest_recorded",
      receiptId: "osm-uae-2026-08-14-local-manifest",
      receiptSha256: hash("d"),
      recordedAt: "2026-08-16T00:02:00.000Z",
      repository: "geoai-mvp"
    },
    dimensions: {
      sourceIdentity: "verified",
      artifactIntegrity: "verified",
      temporalLineage: "verified",
      rights: "verified",
      schema: "verified",
      content: "verified",
      custody: "partial"
    }
  };

  return {
    contractVersion: "1.0",
    releaseId: "osm-uae-2026-08-14",
    releaseVersion: "2026-08-14",
    schemaVersion: "geoai-osm-normalized-v1",
    sourceGroupId: "osm-geofabrik-open-geospatial",
    sourceGroupName: "OSM / Geofabrik open geospatial baseline",
    sourceId: "osm-geofabrik-uae",
    sourceName: "OSM / Geofabrik UAE open snapshot",
    originUrl: "https://download.geofabrik.de/asia/gcc-states.html",
    originHost: "download.geofabrik.de",
    artifact: {
      path: "data/external/normalized/osm_uae_20260814.geojson",
      mediaType: "application/geo+json",
      contentSha256: hash("a"),
      sourceUriSha256: hash("b"),
      schemaSha256: hash("c"),
      byteCount: 148320,
      recordCount: null,
      featureCount: 412
    },
    generatedAt: "2026-08-16T00:01:00.000Z",
    extractedAt: "2026-08-16T00:00:00.000Z",
    publishedAt: "2026-08-14T00:00:00.000Z",
    rights: confidenceInput.rights,
    dataMode: confidenceInput.dataMode,
    confidence: deriveSourceConfidence(confidenceInput),
    validationStatus: confidenceInput.validationStatus,
    caveat: SOURCE_PROVENANCE_CAVEAT,
    nextValidationStep: "Reconcile selected geometries against client-approved or authoritative evidence before use in a decision.",
    blockers: ["No authoritative parcel or cadastral validation is attached to this release."],
    freshness: confidenceInput.freshness,
    custodyReceipt: confidenceInput.custodyReceipt
  };
}

const validFixture = fixture();
assertSourceReleaseProvenance(validFixture);
assert(validFixture.confidence.level === "medium", "Local-manifest custody must cap confidence at medium");
assert(validFixture.confidence.capsApplied.includes("immutable_custody_receipt_missing"), "Expected custody confidence cap");
const localManifestGate = evaluateSourceReleaseGate(validFixture, true);
assert(localManifestGate.screeningContextAvailable === true, "Valid local artifact should remain available as screening context");
assert(localManifestGate.decisionUse === "blocked", "Local-manifest custody must fail closed for decision use");

const decisionEligibleFixture = fixture();
decisionEligibleFixture.blockers = [];
decisionEligibleFixture.custodyReceipt = {
  ...decisionEligibleFixture.custodyReceipt,
  status: "immutable_receipt_recorded"
};
decisionEligibleFixture.confidence = deriveSourceConfidence({
  ...decisionEligibleFixture,
  dimensions: {
    ...decisionEligibleFixture.confidence.dimensions,
    custody: "verified"
  }
});
assertSourceReleaseProvenance(decisionEligibleFixture);
const decisionEligibleGate = evaluateSourceReleaseGate(decisionEligibleFixture, true);
assert(decisionEligibleGate.decisionUse === "allowed", "Complete release evidence should pass the decision-use gate");

const unverifiedConfidenceFixture = fixture();
unverifiedConfidenceFixture.blockers = [];
unverifiedConfidenceFixture.custodyReceipt = {
  ...unverifiedConfidenceFixture.custodyReceipt,
  status: "immutable_receipt_recorded"
};
unverifiedConfidenceFixture.confidence = deriveSourceConfidence({
  ...unverifiedConfidenceFixture,
  dimensions: Object.fromEntries(
    Object.keys(unverifiedConfidenceFixture.confidence.dimensions).map((key) => [key, "unverified"])
  )
});
assertSourceReleaseProvenance(unverifiedConfidenceFixture);
assert(
  evaluateSourceReleaseGate(unverifiedConfidenceFixture, true).decisionUse === "blocked",
  "Unverified confidence dimensions must fail closed for decision use"
);

const prohibitedScoringFixture = structuredClone(decisionEligibleFixture);
prohibitedScoringFixture.rights.prohibitedUses.push("source-backed decision scoring");
assertSourceReleaseProvenance(prohibitedScoringFixture);
assert(
  evaluateSourceReleaseGate(prohibitedScoringFixture, true).decisionUse === "blocked",
  "A prohibited source-backed decision-scoring use must fail closed"
);

const unknownFreshnessFixture = structuredClone(decisionEligibleFixture);
unknownFreshnessFixture.freshness = {
  status: "unknown",
  referenceTimestamp: null,
  evaluatedAt: null,
  maximumAgeDays: null,
  ageDays: null,
  policyId: null
};
unknownFreshnessFixture.confidence = deriveSourceConfidence({
  ...unknownFreshnessFixture,
  dimensions: {
    ...unknownFreshnessFixture.confidence.dimensions,
    temporalLineage: "unverified"
  }
});
assertSourceReleaseProvenance(unknownFreshnessFixture);
assert(
  evaluateSourceReleaseGate(unknownFreshnessFixture, true).decisionUse === "blocked",
  "Unknown freshness must fail closed for decision use"
);

const invalidFixtures = [
  {
    name: "approved rights without license receipt",
    value: { ...fixture(), rights: { ...fixture().rights, licenseId: null, licenseUrl: null } },
    code: "missing_approved_license_id"
  },
  {
    name: "origin host substitution",
    value: { ...fixture(), originHost: "attacker.example" },
    code: "origin_host_mismatch"
  },
  {
    name: "unsafe artifact path",
    value: { ...fixture(), artifact: { ...fixture().artifact, path: "../outside/source.geojson" } },
    code: "unsafe_artifact_path"
  },
  {
    name: "invented unknown freshness",
    value: {
      ...fixture(),
      freshness: { ...fixture().freshness, status: "unknown", ageDays: 2 },
      confidence: deriveSourceConfidence({
        ...fixture(),
        freshness: { ...fixture().freshness, status: "unknown", ageDays: 2 },
        dimensions: fixture().confidence.dimensions
      })
    },
    code: "fabricated_freshness"
  },
  {
    name: "manually inflated confidence",
    value: { ...fixture(), confidence: { ...fixture().confidence, score: 100, level: "high" } },
    code: "confidence_not_derived"
  },
  {
    name: "unreviewed rights without blocker",
    value: (() => {
      const value = fixture();
      value.rights = { ...value.rights, status: "unreviewed", reviewedAt: null, permittedUses: [] };
      value.blockers = [];
      value.confidence = deriveSourceConfidence({
        ...value,
        dimensions: { ...value.confidence.dimensions, rights: "unverified" }
      });
      return value;
    })(),
    code: "missing_rights_blocker"
  },
  {
    name: "unsupported data mode",
    value: { ...fixture(), dataMode: "live_official_integration" },
    code: "invalid_enum"
  },
  {
    name: "missing observation count",
    value: {
      ...fixture(),
      artifact: { ...fixture().artifact, recordCount: null, featureCount: null }
    },
    code: "missing_observation_count"
  },
  {
    name: "partial malformed release",
    value: {
      contractVersion: "1.0",
      releaseId: "partial-release",
      confidence: { method: "evidence_dimensions_v1", dimensions: {} }
    },
    code: "missing_artifact"
  }
];

for (const invalidFixture of invalidFixtures) {
  const result = validateSourceReleaseProvenance(invalidFixture.value);
  assert(!result.valid, `${invalidFixture.name} must fail closed`);
  assert(
    result.violations.some((violation) => violation.code === invalidFixture.code),
    `${invalidFixture.name} did not produce ${invalidFixture.code}`
  );
}

console.log(
  `Source provenance invariants passed: local screening and complete decision gates verified; ${invalidFixtures.length} unsafe fixtures rejected fail-closed.`
);
