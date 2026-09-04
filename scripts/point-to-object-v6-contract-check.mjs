import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = "docs/change-requests/point-to-object-001/experience-v6";
const CAVEAT = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const OPERATIONS = [
  "resolve",
  "acquire",
  "normalize",
  "calculate",
  "analyse",
  "find",
  "shortlist",
  "compare",
  "rank",
  "create",
  "generate",
  "evaluate",
  "model_input",
  "dashboard",
  "report",
  "project",
  "export",
  "persist"
];
const CHANNELS = [
  "internal_operator",
  "authenticated_user",
  "public_preview",
  "client_shared",
  "third_party_model",
  "machine_api",
  "mcp_tool"
];
const DELIVERY_MODES = [
  "interactive_display",
  "server_to_server",
  "download",
  "email",
  "embedded_report",
  "project_storage",
  "model_prompt"
];
const CONTEXT_SECTIONS = [
  "identity_geometry",
  "built_environment",
  "land_use",
  "mobility_accessibility",
  "infrastructure_poi",
  "open_space_public_realm",
  "terrain_environment",
  "climate",
  "satellite_change",
  "market_socioeconomic",
  "risks_constraints"
];

function loadSchema(fileName) {
  return JSON.parse(readFileSync(resolve(process.cwd(), ROOT, fileName), "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

function contentHash(value, omittedField) {
  const payload = clone(value);
  delete payload[omittedField];
  return digest(payload);
}

function expectValid(validate, value, label) {
  assert.equal(validate(value), true, `${label} must validate: ${JSON.stringify(validate.errors)}`);
}

function expectInvalid(validate, value, label) {
  assert.equal(validate(value), false, `${label} must be rejected`);
}

function assertExactPartition(scope, domain, label) {
  const flattened = [...scope.permitted, ...scope.unknown, ...scope.prohibited];
  assert.deepEqual([...new Set(flattened)].sort(), [...domain].sort(), `${label} must cover its complete vocabulary`);
  assert.equal(flattened.length, domain.length, `${label} entries must be mutually exclusive`);
}

function hasCurrentRightsEvidence(rights) {
  return rights.scopeStatus === "cleared_for_named_scope"
    && rights.reviewStatus === "current"
    && typeof rights.licence.licenceId === "string"
    && typeof rights.licence.licenceUrl === "string"
    && typeof rights.licence.attributionText === "string"
    && typeof rights.usagePolicyEvidence.policyId === "string"
    && typeof rights.usagePolicyEvidence.policyUrl === "string"
    && typeof rights.usagePolicyEvidence.evidenceHash === "string"
    && typeof rights.usagePolicyEvidence.capturedAt === "string"
    && rights.evidenceRefs.length > 0;
}

function rightsPermit(receipt, { operation, channel, deliveryMode, countryCode, evaluatedAt = "2026-09-04T12:00:00.000Z" }) {
  const rights = receipt?.rightsScope;
  if (!rights || !hasCurrentRightsEvidence(rights)) return false;
  const evaluatedAtMs = Date.parse(evaluatedAt);
  if (rights.expiresAt && Date.parse(rights.expiresAt) <= evaluatedAtMs) return false;
  if (rights.nextReviewAt && Date.parse(rights.nextReviewAt) <= evaluatedAtMs) return false;
  if (!rights.operations.permitted.includes(operation)) return false;
  if (!rights.channels.permitted.includes(channel)) return false;
  if (!rights.deliveryModes.permitted.includes(deliveryMode)) return false;
  if (rights.operations.unknown.includes(operation) || rights.operations.prohibited.includes(operation)) return false;
  if (rights.channels.unknown.includes(channel) || rights.channels.prohibited.includes(channel)) return false;
  if (rights.deliveryModes.unknown.includes(deliveryMode) || rights.deliveryModes.prohibited.includes(deliveryMode)) return false;
  if (rights.territory.scope === "unknown") return false;
  if (rights.territory.scope === "named" && !rights.territory.countryCodes.includes(countryCode)) return false;
  if (rights.commercialUse !== "permitted") return false;
  if (operation === "export" && !["permitted", "permitted_with_conditions"].includes(rights.redistribution)) return false;
  if (["model_input", "generate"].includes(operation) && !["permitted", "permitted_with_conditions"].includes(rights.derivativeWorks)) return false;
  return true;
}

function assertOperationGateCoverage(gates, label) {
  assert.equal(gates.length, OPERATIONS.length, `${label} must contain one gate for every operation`);
  assert.deepEqual(gates.map((gate) => gate.operation).sort(), [...OPERATIONS].sort(), `${label} operation coverage mismatch`);
  assert.equal(new Set(gates.map((gate) => gate.operation)).size, OPERATIONS.length, `${label} operations must be unique`);
}

function assertSnapshotSemantics(snapshot) {
  assert.deepEqual(snapshot.sections.map((section) => section.section).sort(), [...CONTEXT_SECTIONS].sort(), "snapshot sections must be complete and unique");
  assert.equal(new Set(snapshot.sections.map((section) => section.section)).size, CONTEXT_SECTIONS.length, "snapshot section duplicate");
  assertOperationGateCoverage(snapshot.quality.operationGates, "snapshot quality gates");
  const receiptIds = new Set(snapshot.sourceReceipts.map((receipt) => receipt.sourceReceiptId));
  for (const receipt of snapshot.sourceReceipts) {
    assertExactPartition(receipt.rightsScope.operations, OPERATIONS, `${receipt.sourceReceiptId} operation rights`);
    assertExactPartition(receipt.rightsScope.channels, CHANNELS, `${receipt.sourceReceiptId} channel rights`);
    assertExactPartition(receipt.rightsScope.deliveryModes, DELIVERY_MODES, `${receipt.sourceReceiptId} delivery rights`);
  }
  for (const fact of snapshot.facts) {
    for (const sourceReceiptId of fact.sourceReceiptIds) {
      assert(receiptIds.has(sourceReceiptId), `unknown source receipt ${sourceReceiptId}`);
    }
  }
  assert.equal(snapshot.snapshotHash, contentHash(snapshot, "snapshotHash"), "snapshot hash mismatch");
}

function assertRegistrySemantics(registry) {
  for (const scenario of registry.scenarios) {
    assertOperationGateCoverage(scenario.operationPolicies, `${scenario.scenarioId} operation policies`);
    assert.deepEqual(scenario.modeBindings.map((binding) => binding.mode).sort(), ["analyse", "create", "find"], "scenario must bind exactly three UI modes");
    assert.equal(new Set(scenario.modeBindings.map((binding) => binding.mode)).size, 3, "scenario mode bindings must be unique");
  }
  assert.equal(registry.registryHash, contentHash(registry, "registryHash"), "registry hash mismatch");
}

function assertDecisionSemantics(record) {
  assertOperationGateCoverage(record.operationGates, "decision operation gates");
  for (const gate of record.operationGates.filter((item) => item.status === "blocked")) {
    assert(gate.gapIds.length + gate.validationTaskIds.length + gate.reasons.length > 0, `${gate.operation} blocked gate needs a reason reference`);
  }
  assert.equal(record.recordHash, contentHash(record, "recordHash"), "DecisionRecord hash mismatch");
  assert.equal("renderBindings" in record, false, "DecisionRecord cannot contain mutable render bindings");
}

function assertRenderSemantics(receipt, decisionRecord, artifactPayload) {
  const expectedOperation = { dashboard: "dashboard", report: "report", project_summary: "project" }[receipt.renderKind];
  assert.equal(receipt.operation, expectedOperation, "render kind and operation mismatch");
  assert.equal(receipt.sourceOperationGate.operation, receipt.operation, "source operation gate mismatch");
  assert.notEqual(receipt.sourceOperationGate.status, "blocked", "blocked operation cannot render");
  assert.equal(receipt.sourceDecisionRecordRef.decisionRecordId, decisionRecord.decisionRecordId, "render source record ID mismatch");
  assert.equal(receipt.sourceDecisionRecordRef.recordHash, decisionRecord.recordHash, "render source record hash mismatch");
  if (receipt.artifact) {
    assert.equal(receipt.artifact.embeddedDecisionRecordId, decisionRecord.decisionRecordId, "artifact record ID mismatch");
    assert.equal(receipt.artifact.embeddedRecordHash, decisionRecord.recordHash, "artifact record hash mismatch");
    assert.equal(receipt.artifact.artifactHash, digest(artifactPayload), "artifact hash mismatch");
    assert.equal(canonicalJson(artifactPayload).includes(receipt.renderReceiptHash), false, "artifact cannot embed its later receipt hash");
  }
  assert.equal(canonicalJson(decisionRecord).includes(receipt.renderReceiptHash), false, "parent record cannot embed child receipt hash");
  assert.equal(canonicalJson(decisionRecord).includes(receipt.artifact?.artifactHash ?? "not-present"), false, "parent record cannot embed later render artifact hash");
  assert.equal(receipt.renderReceiptHash, contentHash(receipt, "renderReceiptHash"), "render receipt hash mismatch");
}

function findUnionTypeArrays(value, path = "$") {
  const findings = [];
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value.type)) findings.push(`${path}.type`);
  for (const [key, child] of Object.entries(value)) {
    findings.push(...findUnionTypeArrays(child, `${path}.${key}`));
  }
  return findings;
}

const schemas = {
  geoContext: loadSchema("GEO_CONTEXT_SNAPSHOT_V1.schema.json"),
  scenarioRegistry: loadSchema("SCENARIO_REGISTRY_V1.schema.json"),
  decisionRecord: loadSchema("DECISION_RECORD_V1.schema.json"),
  decisionRender: loadSchema("DECISION_RENDER_RECEIPT_V1.schema.json")
};

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validators = Object.fromEntries(Object.entries(schemas).map(([key, schema]) => [key, ajv.compile(schema)]));

for (const [name, schema] of Object.entries(schemas)) {
  assert.deepEqual(findUnionTypeArrays(schema), [], `${name} uses union type arrays; use oneOf/anyOf under strict Ajv`);
  assert.deepEqual(schema.$defs.operation.enum, OPERATIONS, `${name} operation vocabulary drifted`);
}
for (const requiredOperation of ["create", "generate", "evaluate", "compare", "rank", "report", "project"]) {
  assert(OPERATIONS.includes(requiredOperation), `${requiredOperation} must be a gateable operation`);
}

const rightsScope = {
  rightsReceiptId: "rights.osm.1",
  rightsProfileVersion: "1.0.0",
  scopeStatus: "cleared_for_named_scope",
  licence: {
    licenceId: "ODbL-1.0",
    licenceUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    attributionText: "OpenStreetMap contributors"
  },
  usagePolicyEvidence: {
    policyId: "osm-tile-usage-1",
    policyUrl: "https://operations.osmfoundation.org/policies/tiles/",
    evidenceHash: digest("usage-policy"),
    capturedAt: "2026-09-04T08:00:00.000Z"
  },
  operations: { permitted: [...OPERATIONS], unknown: [], prohibited: [] },
  channels: { permitted: [...CHANNELS], unknown: [], prohibited: [] },
  deliveryModes: { permitted: [...DELIVERY_MODES], unknown: [], prohibited: [] },
  territory: { scope: "named", countryCodes: ["AE", "SG"] },
  redistribution: "permitted_with_conditions",
  derivativeWorks: "permitted_with_conditions",
  shareAlike: "required",
  commercialUse: "permitted",
  expiresAt: null,
  nextReviewAt: "2026-12-04T08:00:00.000Z",
  reviewStatus: "current",
  evidenceRefs: [{
    evidenceId: "rights-evidence.osm-odbl",
    evidenceType: "licence_text",
    evidenceHash: digest("odbl-evidence"),
    sourceUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    capturedAt: "2026-09-04T08:00:00.000Z"
  }]
};

const sourceReceipt = {
  sourceReceiptId: "source-receipt.osm.1",
  sourceId: "openstreetmap",
  provider: "OpenStreetMap contributors",
  sourceKind: "open_map",
  authorityStatus: "open_context_not_official",
  rightsScope,
  requestedAt: "2026-09-04T08:00:00.000Z",
  acquisitionMethodId: "method.osm-context",
  acquisitionMethodVersion: "1.0.0",
  minimizedPayloadHash: digest("minimized-payload"),
  coverage: {
    coverageId: "coverage.osm.1",
    kind: "buffer",
    geometryHash: digest("coverage-geometry"),
    spatialStatus: "partial",
    temporalStatus: "unknown",
    returnedCount: 1,
    capReached: false,
    supportsAbsenceConclusion: false,
    proofLimit: "Open-map context only; completeness is not established."
  },
  freshness: {
    sourceObservedAt: null,
    retrievedAt: "2026-09-04T08:00:01.000Z",
    ageSeconds: null,
    policyId: "freshness.open-map.1",
    maxAgeSeconds: null,
    status: "unknown"
  },
  lineageHash: digest("source-lineage"),
  limitations: ["Open-map context is not an official register."]
};

const snapshot = {
  schemaId: "urn:geoai:geo-context-snapshot:1.0.0",
  schemaVersion: "1.0.0",
  snapshotId: "snapshot.dubai.sample.1",
  snapshotHash: digest("pending-snapshot"),
  status: "partial",
  subject: {
    subjectId: "subject.osm.way.1",
    subjectType: "object",
    geometryId: "geometry.osm.way.1",
    geometryHash: digest("subject-geometry"),
    geometryType: "Polygon",
    crs: "EPSG:4326",
    coordinateOrder: "longitude_latitude",
    resolutionStatus: "resolved",
    sourceIdentity: {
      sourceId: "openstreetmap",
      namespace: "osm",
      featureId: "way.1",
      association: "trusted_identity"
    },
    resolutionReceiptHash: digest("resolution-receipt")
  },
  scope: {
    marketKey: "dubai",
    contextProfileId: "context.redevelopment",
    contextProfileVersion: "1.0.0",
    requestedRadiusM: 400,
    requestedExtentGeometryHash: null,
    timeBasis: {
      requestedAsOf: null,
      acquisitionWindowStart: "2026-09-04T08:00:00.000Z",
      acquisitionWindowEnd: "2026-09-04T08:00:02.000Z"
    }
  },
  capturedAt: "2026-09-04T08:00:03.000Z",
  sourceReceipts: [sourceReceipt],
  facts: [{
    factId: "fact.identity.name.en",
    factKey: "identity.name.en",
    section: "identity_geometry",
    evidenceClass: "observed",
    supportStatus: "supported",
    valueState: "known",
    value: "Sample building",
    unit: null,
    sourceReceiptIds: [sourceReceipt.sourceReceiptId],
    inputFactIds: [],
    method: null,
    modelReceipt: null,
    assumptions: [],
    confidence: { level: "medium", basis: "Named open-map value within partial coverage.", capApplied: true },
    validAt: null,
    proofLimit: "Name is observed in the named source only.",
    validationRequired: true
  }],
  sections: CONTEXT_SECTIONS.map((section) => ({
    section,
    status: section === "identity_geometry" ? "available" : "not_requested",
    factIds: section === "identity_geometry" ? ["fact.identity.name.en"] : [],
    gapIds: []
  })),
  conflicts: [],
  gaps: [],
  quality: {
    coverageStatus: "partial",
    freshnessStatus: "unknown",
    confidenceCounts: { low: 0, medium: 1, high: 0 },
    gapCounts: { informational: 0, material: 0, blocking: 0 },
    gate: "partial",
    gateReasons: ["Only the requested identity context was assembled."],
    operationGates: OPERATIONS.map((operation) => ({ operation, status: "pass", gapIds: [], rightsReceiptIds: [rightsScope.rightsReceiptId], reasons: [] }))
  },
  lineage: {
    parentSnapshotRefs: [],
    assemblerId: "assembler.geocontext",
    assemblerVersion: "1.0.0",
    canonicalizationProfile: "JCS_SHA256_OMIT_SNAPSHOT_HASH_V1",
    inputHash: digest("snapshot-input"),
    factGraphHash: digest("fact-graph"),
    sourceReceiptIds: [sourceReceipt.sourceReceiptId]
  },
  governance: {
    claimPolicyId: "claim-policy.screening",
    claimPolicyVersion: "1.0.0",
    maximumClaimLevel: "open_context_screening",
    validationState: "official_validation_required",
    privacyClass: "public_open_context",
    caveat: CAVEAT
  }
};
snapshot.snapshotHash = contentHash(snapshot, "snapshotHash");
expectValid(validators.geoContext, snapshot, "positive GeoContextSnapshot fixture");
assertSnapshotSemantics(snapshot);

const localeInScope = clone(snapshot);
localeInScope.scope.locale = "ru";
expectInvalid(validators.geoContext, localeInScope, "locale inside truth snapshot");
const displayNameInSubject = clone(snapshot);
displayNameInSubject.subject.displayName = "Локализованное имя";
expectInvalid(validators.geoContext, displayNameInSubject, "localized display name inside truth subject");
const presentationEn = { snapshotId: snapshot.snapshotId, snapshotHash: snapshot.snapshotHash, locale: "en" };
const presentationRu = { snapshotId: snapshot.snapshotId, snapshotHash: snapshot.snapshotHash, locale: "ru" };
assert.equal(presentationEn.snapshotHash, presentationRu.snapshotHash, "presentation locale must not alter truth hash");
const changedTruth = clone(snapshot);
changedTruth.facts[0].value = "Changed source value";
assert.notEqual(contentHash(changedTruth, "snapshotHash"), snapshot.snapshotHash, "truth change must alter snapshot hash");
const missingObservedReceipt = clone(snapshot);
missingObservedReceipt.facts[0].sourceReceiptIds = [];
expectInvalid(validators.geoContext, missingObservedReceipt, "observed fact without source receipt");
const unknownFactWithValue = clone(snapshot);
unknownFactWithValue.facts[0].valueState = "unknown";
expectInvalid(validators.geoContext, unknownFactWithValue, "unknown fact carrying a value");
const missingRightsScope = clone(snapshot);
delete missingRightsScope.sourceReceipts[0].rightsScope;
expectInvalid(validators.geoContext, missingRightsScope, "source receipt without rights scope");
const unknownRightsReceipt = clone(sourceReceipt);
unknownRightsReceipt.rightsScope.scopeStatus = "unknown";
unknownRightsReceipt.rightsScope.operations = { permitted: OPERATIONS.filter((operation) => !["model_input", "rank", "export"].includes(operation)), unknown: ["model_input", "rank", "export"], prohibited: [] };
for (const operation of ["model_input", "rank", "export"]) {
  assert.equal(rightsPermit(unknownRightsReceipt, { operation, channel: "authenticated_user", deliveryMode: operation === "model_input" ? "model_prompt" : "interactive_display", countryCode: "AE" }), false, `${operation} must fail closed under unknown rights`);
}
const missingEvidenceReceipt = clone(sourceReceipt);
missingEvidenceReceipt.rightsScope.licence.licenceId = null;
assert.equal(rightsPermit(missingEvidenceReceipt, { operation: "model_input", channel: "third_party_model", deliveryMode: "model_prompt", countryCode: "AE" }), false, "missing licence evidence must block model input");
const expiredRightsReceipt = clone(sourceReceipt);
expiredRightsReceipt.rightsScope.expiresAt = "2026-09-04T11:00:00.000Z";
assert.equal(rightsPermit(expiredRightsReceipt, { operation: "export", channel: "authenticated_user", deliveryMode: "download", countryCode: "AE" }), false, "expired rights evidence must block export");
assert.equal(rightsPermit(sourceReceipt, { operation: "model_input", channel: "third_party_model", deliveryMode: "model_prompt", countryCode: "AE" }), true, "fully scoped fixture should permit named model input");
const incompleteRightsPartition = clone(snapshot);
incompleteRightsPartition.sourceReceipts[0].rightsScope.operations.permitted = OPERATIONS.filter((operation) => operation !== "export");
assert.throws(() => assertSnapshotSemantics(incompleteRightsPartition), /must cover its complete vocabulary/);
const overlappingRightsPartition = clone(snapshot);
overlappingRightsPartition.sourceReceipts[0].rightsScope.operations.unknown = ["export"];
assert.throws(() => assertSnapshotSemantics(overlappingRightsPartition), /entries must be mutually exclusive/);

const localText = (en, ru) => ({ en, ru });
const operationPolicies = OPERATIONS.map((operation) => {
  const blocked = ["compare", "rank", "create", "generate", "evaluate", "project", "export"].includes(operation);
  return { operation, status: blocked ? "blocked" : "partial", blockingRequirementIds: blocked ? ["validation.data-and-rights"] : [] };
});
const scenarioRegistry = {
  schemaId: "urn:geoai:scenario-registry:1.0.0",
  schemaVersion: "1.0.0",
  registryId: "registry.point-object.v6",
  registryVersion: "1.0.0",
  registryHash: digest("pending-registry"),
  status: "candidate",
  generatedAt: "2026-09-04T08:10:00.000Z",
  roles: [{
    roleId: "developer",
    audience: "b2b",
    label: localText("Developer", "Девелопер"),
    description: localText("Screens development options.", "Проводит скрининг вариантов развития."),
    preferenceOnly: true
  }],
  contextProfiles: [{
    contextProfileId: "context.redevelopment",
    version: "1.0.0",
    requiredSections: ["identity_geometry"],
    optionalSections: CONTEXT_SECTIONS.filter((section) => section !== "identity_geometry"),
    radiusRule: { kind: "bounded_user_choice", defaultM: 400, minimumM: 100, maximumM: 2000 },
    acquisitionWindowToleranceSeconds: 3600,
    factRequirements: [{
      factKey: "identity.name.en",
      section: "identity_geometry",
      necessity: "required",
      allowedEvidenceClasses: ["observed"],
      maximumAgeSeconds: null,
      minimumCoverage: "partial_allowed",
      absenceSemantics: "absence_not_supported",
      blocks: ["analyse", "model_input", "dashboard", "report"]
    }],
    comparisonCohortPolicy: {
      sameProfileVersion: true,
      sameMetricDefinitions: true,
      compatibleAcquisitionWindow: true,
      allowPartialFactualComparison: true
    }
  }],
  methods: [{
    methodId: "method.analysis-brief",
    version: "1.0.0",
    status: "candidate",
    operation: "analyse",
    implementationKind: "llm_structured",
    executionPlane: "server",
    deterministic: false,
    inputFactKeys: ["identity.name.en"],
    outputKeys: ["analysis.summary"],
    modelPolicy: {
      providerAdapterId: "provider.openai",
      modelClass: "reasoning",
      reasoningEffort: "medium",
      timeoutMs: 30000,
      maxOutputTokens: 4000,
      maxCostUsd: 1,
      store: false,
      toolCallsAllowed: 0,
      outputValidationId: "validator.analysis-brief"
    },
    failurePolicy: "fail_closed",
    explainabilityRequired: true,
    validationPolicyId: "validation.analysis-brief"
  }],
  dashboardTemplates: [{
    templateId: "template.dashboard.object",
    version: "1.0.0",
    status: "candidate",
    sections: [{
      sectionId: "summary",
      label: localText("Summary", "Резюме"),
      requiredFactKeys: ["identity.name.en"],
      requiredOutputKeys: ["analysis.summary"],
      missingValueBehavior: "render_named_gap_no_default"
    }],
    recomputationAllowed: false
  }],
  reportTemplates: [{
    templateId: "template.report.object",
    version: "1.0.0",
    status: "candidate",
    sections: [{
      sectionId: "summary",
      label: localText("Summary", "Резюме"),
      requiredFactKeys: ["identity.name.en"],
      requiredOutputKeys: ["analysis.summary"],
      missingValueBehavior: "render_named_gap_no_default"
    }],
    recomputationAllowed: false
  }],
  scenarios: [{
    scenarioId: "b2b_redevelopment_selected_aoi",
    version: "1.0.0",
    entryHash: digest("scenario-entry"),
    status: "candidate",
    audience: "b2b",
    roleIds: ["developer"],
    businessQuestion: {
      questionId: "question.redevelopment",
      text: localText("Which hypotheses should be tested?", "Какие гипотезы необходимо проверить?"),
      decisionType: "screen",
      decisionOwnerRoleIds: ["developer"],
      decisionHorizon: "one_to_three_years"
    },
    subjectTypes: ["object", "site", "aoi"],
    contextProfileRef: { contextProfileId: "context.redevelopment", version: "1.0.0" },
    modeBindings: [
      { mode: "analyse", status: "partial", operations: ["analyse", "model_input", "dashboard", "report"], subjectTypes: ["object", "site", "aoi"], methodIds: ["method.analysis-brief"], outputKeys: ["analysis.summary"], blockingRequirementIds: [], limitation: localText("Open-context screening only.", "Только скрининг по открытым данным.") },
      { mode: "find", status: "partial", operations: ["find", "shortlist", "compare", "rank"], subjectTypes: ["object", "site", "aoi"], methodIds: [], outputKeys: [], blockingRequirementIds: ["validation.data-and-rights"], limitation: localText("Ranking is blocked.", "Ранжирование заблокировано.") },
      { mode: "create", status: "blocked", operations: ["create", "generate", "evaluate"], subjectTypes: ["object", "site", "aoi"], methodIds: [], outputKeys: [], blockingRequirementIds: ["validation.data-and-rights"], limitation: localText("Generation needs validation.", "Для генерации нужна валидация.") }
    ],
    operationPolicies,
    methodIds: ["method.analysis-brief"],
    ranking: {
      status: "blocked",
      methodId: null,
      metrics: [],
      missingDataPolicy: "block_ranking",
      minimumComparableCandidates: 2,
      explainabilityRequired: true,
      winnerLanguage: "screening_preference_only",
      blockingRequirementIds: ["validation.data-and-rights"]
    },
    dashboardTemplateRef: { templateId: "template.dashboard.object", version: "1.0.0" },
    reportTemplateRef: { templateId: "template.report.object", version: "1.0.0" },
    validationRequirements: [{
      requirementId: "validation.data-and-rights",
      label: localText("Validate data and rights", "Подтвердить данные и права"),
      status: "required",
      blocks: ["compare", "rank", "create", "generate", "evaluate", "project", "export"],
      evidenceNeeded: localText("Named source and rights evidence.", "Именованные доказательства источника и прав.")
    }],
    requiredProjectCapabilities: [],
    maximumClaimLevel: "open_context_screening",
    limitations: [localText("Official validation is required.", "Требуется официальная валидация.")],
    changeControl: { owner: "GeoAI Product Architecture", approvedBy: null, approvedAt: null, supersedes: [] }
  }],
  governance: {
    claimPolicyId: "claim-policy.screening",
    claimPolicyVersion: "1.0.0",
    validationState: "official_validation_required",
    canonicalizationProfile: "JCS_SHA256_OMIT_REGISTRY_HASH_V1",
    caveat: CAVEAT
  }
};
scenarioRegistry.registryHash = contentHash(scenarioRegistry, "registryHash");
expectValid(validators.scenarioRegistry, scenarioRegistry, "positive Scenario Registry fixture");
assertRegistrySemantics(scenarioRegistry);
const enabledRankingWithoutMetrics = clone(scenarioRegistry);
enabledRankingWithoutMetrics.scenarios[0].ranking.status = "enabled";
enabledRankingWithoutMetrics.scenarios[0].ranking.methodId = "method.analysis-brief";
enabledRankingWithoutMetrics.scenarios[0].ranking.metrics = [];
expectInvalid(validators.scenarioRegistry, enabledRankingWithoutMetrics, "enabled ranking without metrics");

const blockedOperations = new Set(["compare", "rank", "create", "generate", "evaluate", "project", "export"]);
const decisionRecord = {
  schemaId: "urn:geoai:decision-record:1.0.0",
  schemaVersion: "1.0.0",
  decisionRecordId: "decision.analysis.1",
  recordHash: digest("pending-decision"),
  status: "partial",
  projectRef: null,
  preferenceContext: { audience: "b2b", roleId: "developer", preferenceOnly: true },
  scenarioRef: {
    registryId: scenarioRegistry.registryId,
    registryVersion: scenarioRegistry.registryVersion,
    registryHash: scenarioRegistry.registryHash,
    scenarioId: scenarioRegistry.scenarios[0].scenarioId,
    scenarioVersion: scenarioRegistry.scenarios[0].version,
    scenarioHash: scenarioRegistry.scenarios[0].entryHash,
    businessQuestionId: scenarioRegistry.scenarios[0].businessQuestion.questionId
  },
  operation: "analyse",
  createdAt: "2026-09-04T08:20:00.000Z",
  decisionAsOf: "2026-09-04T08:20:00.000Z",
  parentRecordRefs: [],
  inputs: {
    subjects: [{ subjectId: snapshot.subject.subjectId, subjectType: "object", geometryHash: snapshot.subject.geometryHash, role: "primary" }],
    criteria: [],
    criteriaHash: digest("criteria-empty"),
    contextSnapshots: [{
      snapshotId: snapshot.snapshotId,
      snapshotHash: snapshot.snapshotHash,
      subjectId: snapshot.subject.subjectId,
      contextProfileId: snapshot.scope.contextProfileId,
      contextProfileVersion: snapshot.scope.contextProfileVersion,
      acquisitionWindowStart: snapshot.scope.timeBasis.acquisitionWindowStart,
      acquisitionWindowEnd: snapshot.scope.timeBasis.acquisitionWindowEnd
    }],
    acquisitionPosture: "reuse_exact_snapshot",
    refreshReason: null
  },
  methodExecutions: [],
  operationGates: OPERATIONS.map((operation) => ({
    operation,
    status: blockedOperations.has(operation) ? "blocked" : "pass",
    gapIds: blockedOperations.has(operation) ? ["gap.future-evidence"] : [],
    validationTaskIds: blockedOperations.has(operation) ? ["validation.future-evidence"] : [],
    rightsReceiptIds: [rightsScope.rightsReceiptId],
    reasons: blockedOperations.has(operation) ? ["Named evidence is required before this operation."] : []
  })),
  outputs: {
    claims: [],
    metrics: [],
    candidateSet: null,
    alternatives: [],
    recommendation: null,
    validationTasks: [{
      validationTaskId: "validation.future-evidence",
      title: "Validate decision evidence",
      priority: "high",
      status: "open",
      evidenceNeeded: "Named data and rights evidence.",
      blocks: [...blockedOperations],
      ownerRole: null
    }],
    gapIds: ["gap.future-evidence"]
  },
  renderPolicy: {
    dashboard: { templateId: "template.dashboard.object", templateVersion: "1.0.0", recomputationAllowed: false },
    report: { templateId: "template.report.object", templateVersion: "1.0.0", recomputationAllowed: false },
    projectSummary: null
  },
  lineage: {
    canonicalizationProfile: "JCS_SHA256_OMIT_RECORD_HASH_V1",
    inputGraphHash: digest("decision-input-graph"),
    outputGraphHash: digest("decision-output-graph"),
    decisionArtifactHashes: [],
    refreshReason: null
  },
  governance: {
    claimPolicyId: "claim-policy.screening",
    claimPolicyVersion: "1.0.0",
    maximumClaimLevel: "open_context_screening",
    validationState: "official_validation_required",
    privacyClass: "public_open_context",
    releaseState: "local_candidate",
    caveat: CAVEAT
  }
};
decisionRecord.recordHash = contentHash(decisionRecord, "recordHash");
expectValid(validators.decisionRecord, decisionRecord, "positive DecisionRecord fixture");
assertDecisionSemantics(decisionRecord);

const unknownMetricWithValue = clone(decisionRecord);
unknownMetricWithValue.outputs.metrics.push({
  metricId: "metric.unknown",
  metricKey: "market.rent",
  subjectId: snapshot.subject.subjectId,
  valueState: "unknown",
  value: 42,
  unit: "AED",
  evidenceClass: "calculated",
  snapshotHashes: [snapshot.snapshotHash],
  factIds: [],
  methodExecutionId: null,
  confidence: "low",
  proofLimit: "No source value was acquired."
});
expectInvalid(validators.decisionRecord, unknownMetricWithValue, "unknown metric carrying a value");
const oldCyclicRenderBinding = clone(decisionRecord);
oldCyclicRenderBinding.renderBindings = { report: { artifactHash: digest("report") } };
expectInvalid(validators.decisionRecord, oldCyclicRenderBinding, "legacy render artifact binding in parent DecisionRecord");

const artifactPayload = {
  sourceDecisionRecordId: decisionRecord.decisionRecordId,
  sourceRecordHash: decisionRecord.recordHash,
  title: "Screening report",
  values: []
};
const reportGate = decisionRecord.operationGates.find((gate) => gate.operation === "report");
const renderReceipt = {
  schemaId: "urn:geoai:decision-render-receipt:1.0.0",
  schemaVersion: "1.0.0",
  renderReceiptId: "render-receipt.report.1",
  renderReceiptHash: digest("pending-render-receipt"),
  sourceDecisionRecordRef: {
    decisionRecordId: decisionRecord.decisionRecordId,
    recordHash: decisionRecord.recordHash,
    finalizedAt: "2026-09-04T08:20:01.000Z"
  },
  renderKind: "report",
  operation: "report",
  templateRef: { templateId: "template.report.object", templateVersion: "1.0.0" },
  presentation: { locale: "en" },
  renderer: { methodId: "renderer.report", methodVersion: "1.0.0" },
  renderedAt: "2026-09-04T08:21:00.000Z",
  renderManifestHash: digest("render-manifest"),
  artifact: {
    artifactId: "artifact.report.1",
    artifactHash: digest(artifactPayload),
    mediaType: "application/pdf",
    createdAt: "2026-09-04T08:21:00.000Z",
    embeddedDecisionRecordId: decisionRecord.decisionRecordId,
    embeddedRecordHash: decisionRecord.recordHash
  },
  truthRecomputationPerformed: false,
  sourceOperationGate: {
    operation: reportGate.operation,
    status: reportGate.status,
    gapIds: reportGate.gapIds,
    rightsReceiptIds: reportGate.rightsReceiptIds
  },
  validation: {
    sourceRecordHashVerified: true,
    refsResolved: true,
    rightsScopeVerified: true,
    caveatRendered: true,
    gapsRendered: true,
    status: "passed"
  },
  governance: {
    canonicalizationProfile: "JCS_SHA256_OMIT_RENDER_RECEIPT_HASH_V1",
    caveat: CAVEAT
  }
};
renderReceipt.renderReceiptHash = contentHash(renderReceipt, "renderReceiptHash");
expectValid(validators.decisionRender, renderReceipt, "positive DecisionRenderReceipt fixture");
assertRenderSemantics(renderReceipt, decisionRecord, artifactPayload);
const recomputingRender = clone(renderReceipt);
recomputingRender.truthRecomputationPerformed = true;
expectInvalid(validators.decisionRender, recomputingRender, "render that recomputes truth");
const wrongRenderOperation = clone(renderReceipt);
wrongRenderOperation.operation = "dashboard";
expectInvalid(validators.decisionRender, wrongRenderOperation, "report receipt with dashboard operation");
const wrongEmbeddedRecord = clone(renderReceipt);
wrongEmbeddedRecord.artifact.embeddedRecordHash = digest("wrong-parent");
assert.throws(() => assertRenderSemantics(wrongEmbeddedRecord, decisionRecord, artifactPayload), /artifact record hash mismatch/);
const parentMutatedWithLaterArtifact = clone(decisionRecord);
parentMutatedWithLaterArtifact.lineage.decisionArtifactHashes.push(renderReceipt.artifact.artifactHash);
assert.throws(() => assertDecisionSemantics(parentMutatedWithLaterArtifact), /DecisionRecord hash mismatch/);
parentMutatedWithLaterArtifact.recordHash = contentHash(parentMutatedWithLaterArtifact, "recordHash");
assert.throws(() => assertRenderSemantics(renderReceipt, parentMutatedWithLaterArtifact, artifactPayload), /render source record hash mismatch/);

console.log(JSON.stringify({
  ok: true,
  strictAjv2020: true,
  schemasCompiled: Object.keys(schemas),
  positiveFixtures: ["GeoContextSnapshot", "ScenarioRegistry", "DecisionRecord", "DecisionRenderReceipt"],
  negativeInvariants: [
    "locale_and_display_name_excluded_from_truth_snapshot",
    "truth_change_changes_snapshot_hash",
    "observed_fact_requires_source_receipt",
    "unknown_fact_and_metric_have_null_value",
    "missing_or_unknown_rights_block_model_input_rank_export",
    "rights_permission_partitions_are_complete_disjoint_and_exact",
    "operation_vocabularies_and_gate_coverage_match",
    "enabled_ranking_requires_metrics",
    "legacy_parent_render_artifact_binding_rejected",
    "render_truth_recomputation_rejected",
    "render_kind_operation_mapping_enforced",
    "render_receipt_is_acyclic_and_parent_bound",
    "later_render_hash_cannot_be_inserted_into_final_parent"
  ]
}, null, 2));
