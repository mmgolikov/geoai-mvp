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
  if (Date.parse(rights.usagePolicyEvidence.capturedAt) > evaluatedAtMs) return false;
  if (rights.evidenceRefs.some((evidence) => Date.parse(evidence.capturedAt) > evaluatedAtMs)) return false;
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
  if (operation === "export" && rights.redistribution !== "permitted") return false;
  if (["model_input", "generate"].includes(operation) && rights.derivativeWorks !== "permitted") return false;
  if (["export", "model_input", "generate"].includes(operation) && rights.shareAlike === "required") return false;
  return true;
}

function tupleForOperation(operation) {
  if (operation === "model_input" || operation === "generate") {
    return { channel: "third_party_model", deliveryMode: "model_prompt" };
  }
  if (operation === "export") return { channel: "authenticated_user", deliveryMode: "download" };
  if (operation === "report") return { channel: "authenticated_user", deliveryMode: "embedded_report" };
  if (operation === "persist" || operation === "project") return { channel: "authenticated_user", deliveryMode: "project_storage" };
  if (operation === "dashboard") return { channel: "authenticated_user", deliveryMode: "interactive_display" };
  return { channel: "internal_operator", deliveryMode: "server_to_server" };
}

function makeRightsEvaluation(receipt, operation, overrides = {}) {
  const tuple = { ...tupleForOperation(operation), ...overrides };
  const evaluation = {
    rightsEvaluationId: `rights-evaluation.${operation}.${tuple.channel}.${tuple.deliveryMode}.AE`,
    evaluationHash: digest("pending-rights-evaluation"),
    rightsReceiptId: receipt.rightsScope.rightsReceiptId,
    rightsScopeHash: digest(receipt.rightsScope),
    operation,
    channel: tuple.channel,
    deliveryMode: tuple.deliveryMode,
    territoryCountryCode: tuple.territoryCountryCode ?? "AE",
    evaluatedAt: tuple.evaluatedAt ?? "2026-09-04T08:15:00.000Z",
    decision: "permitted",
    evaluatorId: "validator.rights-scope",
    evaluatorVersion: "1.0.0"
  };
  evaluation.evaluationHash = contentHash(evaluation, "evaluationHash");
  return evaluation;
}

function assertRightsEvaluation(evaluation, operation, receiptByRightsId, label) {
  assert.equal(evaluation.operation, operation, `${label} operation mismatch`);
  assert.equal(evaluation.decision, "permitted", `${label} must be a positive immutable receipt`);
  assert.equal(evaluation.evaluationHash, contentHash(evaluation, "evaluationHash"), `${label} hash mismatch`);
  const sourceReceipt = receiptByRightsId.get(evaluation.rightsReceiptId);
  assert(sourceReceipt, `${label} references unknown rights receipt ${evaluation.rightsReceiptId}`);
  assert.equal(evaluation.rightsScopeHash, digest(sourceReceipt.rightsScope), `${label} rights-scope hash mismatch`);
  assert.equal(rightsPermit(sourceReceipt, {
    operation: evaluation.operation,
    channel: evaluation.channel,
    deliveryMode: evaluation.deliveryMode,
    countryCode: evaluation.territoryCountryCode,
    evaluatedAt: evaluation.evaluatedAt
  }), true, `${label} tuple is not permitted by the referenced rights scope`);
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
  const receiptByRightsId = new Map(snapshot.sourceReceipts.map((receipt) => [receipt.rightsScope.rightsReceiptId, receipt]));
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
  for (const gate of snapshot.quality.operationGates) {
    assert.equal(new Set(gate.rightsEvaluations.map((item) => item.evaluationHash)).size, gate.rightsEvaluations.length, `${gate.operation} rights evaluations must be unique`);
    for (const evaluation of gate.rightsEvaluations) {
      assert(Date.parse(evaluation.evaluatedAt) <= Date.parse(snapshot.capturedAt), `snapshot ${gate.operation} rights evaluation cannot follow snapshot capture`);
      assertRightsEvaluation(evaluation, gate.operation, receiptByRightsId, `snapshot ${gate.operation} rights evaluation`);
    }
    assert.deepEqual([...new Set(gate.rightsEvaluations.map((item) => item.rightsReceiptId))].sort(), [...gate.rightsReceiptIds].sort(), `${gate.operation} gate rights refs must equal persisted evaluations`);
    if (gate.status !== "blocked" && snapshot.sourceReceipts.length > 0) {
      assert(gate.rightsEvaluations.length > 0, `${gate.operation} non-blocked gate needs a tuple-scoped rights evaluation`);
    }
  }
  assert.equal(snapshot.snapshotHash, contentHash(snapshot, "snapshotHash"), "snapshot hash mismatch");
}

function assertRegistrySemantics(registry) {
  for (const scenario of registry.scenarios) {
    assertOperationGateCoverage(scenario.operationPolicies, `${scenario.scenarioId} operation policies`);
    assert.deepEqual(scenario.modeBindings.map((binding) => binding.mode).sort(), ["analyse", "create", "find"], "scenario must bind exactly three UI modes");
    assert.equal(new Set(scenario.modeBindings.map((binding) => binding.mode)).size, 3, "scenario mode bindings must be unique");
    assert.equal(scenario.entryHash, contentHash(scenario, "entryHash"), `${scenario.scenarioId} scenario entry hash mismatch`);
  }
  assert.equal(registry.registryHash, contentHash(registry, "registryHash"), "registry hash mismatch");
}

function assertDecisionSemantics(record, { registry, snapshots }) {
  assertRegistrySemantics(registry);
  for (const candidateSnapshot of snapshots) assertSnapshotSemantics(candidateSnapshot);
  assertOperationGateCoverage(record.operationGates, "decision operation gates");
  for (const gate of record.operationGates.filter((item) => item.status === "blocked")) {
    assert(gate.gapIds.length + gate.validationTaskIds.length + gate.reasons.length > 0, `${gate.operation} blocked gate needs a reason reference`);
  }
  assert.equal(record.finalization?.state, "finalized", "DecisionRecord must carry finalized state");
  assert.equal(record.finalization?.schemaValidationPassed, true, "DecisionRecord finalization requires schema validation");
  assert.equal(record.finalization?.semanticValidationPassed, true, "DecisionRecord finalization requires semantic validation");
  assert(Date.parse(record.finalization.finalizedAt) >= Date.parse(record.createdAt), "DecisionRecord cannot finalize before creation");
  assert.equal(record.truthLanguagePolicy, "locale_neutral_codes_and_user_authored_inputs_v1", "DecisionRecord truth-language policy mismatch");
  assert.equal(record.scenarioRef.registryId, registry.registryId, "DecisionRecord registry ID mismatch");
  assert.equal(record.scenarioRef.registryVersion, registry.registryVersion, "DecisionRecord registry version mismatch");
  assert.equal(record.scenarioRef.registryHash, registry.registryHash, "DecisionRecord registry hash mismatch");
  const scenario = registry.scenarios.find((item) => item.scenarioId === record.scenarioRef.scenarioId && item.version === record.scenarioRef.scenarioVersion);
  assert(scenario, "DecisionRecord scenario ref does not resolve");
  assert.equal(record.scenarioRef.scenarioHash, scenario.entryHash, "DecisionRecord scenario hash mismatch");
  assert.equal(record.scenarioRef.businessQuestionId, scenario.businessQuestion.questionId, "DecisionRecord business-question ref mismatch");
  assert.equal(record.preferenceContext.audience, scenario.audience, "DecisionRecord audience does not match scenario");
  assert(scenario.roleIds.includes(record.preferenceContext.roleId), "DecisionRecord role does not belong to scenario");
  const role = registry.roles.find((item) => item.roleId === record.preferenceContext.roleId);
  assert(role, "DecisionRecord role ref does not resolve in registry");
  assert.equal(role.audience, record.preferenceContext.audience, "DecisionRecord role audience mismatch");
  const contextProfile = registry.contextProfiles.find((item) => item.contextProfileId === scenario.contextProfileRef.contextProfileId && item.version === scenario.contextProfileRef.version);
  assert(contextProfile, "Scenario context-profile ref does not resolve in registry");

  const snapshotById = new Map(snapshots.map((item) => [item.snapshotId, item]));
  const resolvedSnapshots = record.inputs.contextSnapshots.map((ref) => {
    const resolved = snapshotById.get(ref.snapshotId);
    assert(resolved, `DecisionRecord snapshot ref ${ref.snapshotId} does not resolve`);
    assert.equal(ref.snapshotHash, resolved.snapshotHash, `DecisionRecord snapshot hash mismatch for ${ref.snapshotId}`);
    assert.equal(ref.subjectId, resolved.subject.subjectId, `DecisionRecord snapshot subject mismatch for ${ref.snapshotId}`);
    assert.equal(ref.contextProfileId, resolved.scope.contextProfileId, `DecisionRecord context profile mismatch for ${ref.snapshotId}`);
    assert.equal(ref.contextProfileVersion, resolved.scope.contextProfileVersion, `DecisionRecord context profile version mismatch for ${ref.snapshotId}`);
    assert.equal(ref.contextProfileId, scenario.contextProfileRef.contextProfileId, `DecisionRecord snapshot does not use scenario context profile for ${ref.snapshotId}`);
    assert.equal(ref.contextProfileVersion, scenario.contextProfileRef.version, `DecisionRecord snapshot does not use scenario context profile version for ${ref.snapshotId}`);
    assert.equal(ref.acquisitionWindowStart, resolved.scope.timeBasis.acquisitionWindowStart, `DecisionRecord acquisition start mismatch for ${ref.snapshotId}`);
    assert.equal(ref.acquisitionWindowEnd, resolved.scope.timeBasis.acquisitionWindowEnd, `DecisionRecord acquisition end mismatch for ${ref.snapshotId}`);
    return resolved;
  });
  const snapshotBySubjectId = new Map(resolvedSnapshots.map((item) => [item.subject.subjectId, item]));
  for (const subject of record.inputs.subjects) {
    const subjectSnapshot = snapshotBySubjectId.get(subject.subjectId);
    if (!subjectSnapshot && record.inputs.acquisitionPosture === "no_context_for_discovery") continue;
    assert(subjectSnapshot, `DecisionRecord subject ${subject.subjectId} lacks a resolved snapshot`);
    assert.equal(subject.geometryHash, subjectSnapshot.subject.geometryHash, `DecisionRecord subject geometry hash mismatch for ${subject.subjectId}`);
    assert.equal(subject.subjectType, subjectSnapshot.subject.subjectType, `DecisionRecord subject type mismatch for ${subject.subjectId}`);
    assert(scenario.subjectTypes.includes(subject.subjectType), `DecisionRecord subject type ${subject.subjectType} is not allowed by scenario`);
  }

  const methodByKey = new Map(registry.methods.map((method) => [`${method.methodId}@${method.version}`, method]));
  for (const execution of record.methodExecutions) {
    const method = methodByKey.get(`${execution.methodId}@${execution.methodVersion}`);
    assert(method, `DecisionRecord method ${execution.methodId}@${execution.methodVersion} does not resolve`);
    assert(scenario.methodIds.includes(execution.methodId), `DecisionRecord method ${execution.methodId} is not bound to scenario`);
    assert.equal(execution.operation, method.operation, `DecisionRecord method operation mismatch for ${execution.executionId}`);
    for (const inputSnapshotHash of execution.inputSnapshotHashes) {
      assert(resolvedSnapshots.some((item) => item.snapshotHash === inputSnapshotHash), `DecisionRecord method input snapshot ${inputSnapshotHash} does not resolve`);
    }
  }

  const templateSets = {
    dashboard: registry.dashboardTemplates,
    report: registry.reportTemplates,
    projectSummary: registry.reportTemplates
  };
  for (const [kind, binding] of Object.entries(record.renderPolicy)) {
    if (!binding) continue;
    assert(templateSets[kind].some((template) => template.templateId === binding.templateId && template.version === binding.templateVersion), `DecisionRecord ${kind} template does not resolve`);
  }
  assert.deepEqual(record.renderPolicy.dashboard && { templateId: record.renderPolicy.dashboard.templateId, version: record.renderPolicy.dashboard.templateVersion }, scenario.dashboardTemplateRef, "DecisionRecord dashboard template differs from scenario binding");
  assert.deepEqual(record.renderPolicy.report && { templateId: record.renderPolicy.report.templateId, version: record.renderPolicy.report.templateVersion }, scenario.reportTemplateRef, "DecisionRecord report template differs from scenario binding");

  const gapIds = new Set(record.outputs.gapIds);
  const validationTaskIds = new Set(record.outputs.validationTasks.map((task) => task.validationTaskId));
  const receiptByRightsId = new Map(resolvedSnapshots.flatMap((item) => item.sourceReceipts.map((receipt) => [receipt.rightsScope.rightsReceiptId, receipt])));
  const scenarioPolicies = new Map(scenario.operationPolicies.map((policy) => [policy.operation, policy]));
  const snapshotGates = resolvedSnapshots.map((item) => new Map(item.quality.operationGates.map((gate) => [gate.operation, gate])));
  const level = { pass: 0, enabled: 0, partial: 1, blocked: 2, not_applicable: 2 };
  for (const gate of record.operationGates) {
    for (const gapId of gate.gapIds) assert(gapIds.has(gapId), `${gate.operation} gate references unknown gap ${gapId}`);
    for (const taskId of gate.validationTaskIds) assert(validationTaskIds.has(taskId), `${gate.operation} gate references unknown validation task ${taskId}`);
    assert.deepEqual([...new Set(gate.rightsEvaluations.map((item) => item.rightsReceiptId))].sort(), [...gate.rightsReceiptIds].sort(), `${gate.operation} gate rights refs must equal persisted evaluations`);
    for (const evaluation of gate.rightsEvaluations) {
      assert(Date.parse(evaluation.evaluatedAt) <= Date.parse(record.decisionAsOf), `decision ${gate.operation} rights evaluation cannot follow decisionAsOf`);
      assert(Date.parse(evaluation.evaluatedAt) <= Date.parse(record.finalization.finalizedAt), `decision ${gate.operation} rights evaluation cannot follow finalization`);
      assertRightsEvaluation(evaluation, gate.operation, receiptByRightsId, `decision ${gate.operation} rights evaluation`);
    }
    if (gate.status !== "blocked" && receiptByRightsId.size > 0) assert(gate.rightsEvaluations.length > 0, `${gate.operation} non-blocked gate needs a tuple-scoped rights evaluation`);
    const policy = scenarioPolicies.get(gate.operation);
    assert(policy, `${gate.operation} scenario policy is missing`);
    assert(level[gate.status] >= level[policy.status], `${gate.operation} DecisionRecord gate is more permissive than scenario policy`);
    for (const snapshotGateMap of snapshotGates) {
      const snapshotGate = snapshotGateMap.get(gate.operation);
      assert(snapshotGate, `${gate.operation} snapshot gate is missing`);
      assert(level[gate.status] >= level[snapshotGate.status], `${gate.operation} DecisionRecord gate is more permissive than snapshot gate`);
    }
  }
  assert.equal(record.recordHash, contentHash(record, "recordHash"), "DecisionRecord hash mismatch");
  assert.equal("renderBindings" in record, false, "DecisionRecord cannot contain mutable render bindings");
}

function assertRenderSemantics(receipt, decisionRecord, artifactPayload) {
  const expectedOperation = { dashboard: "dashboard", report: "report", project_summary: "project" }[receipt.renderKind];
  assert.equal(receipt.operation, expectedOperation, "render kind and operation mismatch");
  assert.equal(receipt.sourceDecisionRecordRef.decisionRecordId, decisionRecord.decisionRecordId, "render source record ID mismatch");
  assert.equal(validators.decisionRecord(decisionRecord), true, "render source DecisionRecord is not schema-valid and finalized");
  assert.equal(decisionRecord.recordHash, contentHash(decisionRecord, "recordHash"), "render source DecisionRecord hash is not final");
  assert.equal(receipt.sourceDecisionRecordRef.recordHash, decisionRecord.recordHash, "render source record hash mismatch");
  assert.equal(decisionRecord.finalization?.state, "finalized", "render source DecisionRecord is not finalized");
  assert.equal(decisionRecord.finalization?.schemaValidationPassed, true, "render source DecisionRecord lacks schema-validation finalization");
  assert.equal(decisionRecord.finalization?.semanticValidationPassed, true, "render source DecisionRecord lacks semantic-validation finalization");
  assert.equal(receipt.sourceDecisionRecordRef.finalizedAt, decisionRecord.finalization.finalizedAt, "render source finalization time mismatch");
  assert.equal(receipt.sourceDecisionRecordRef.finalizationValidatorId, decisionRecord.finalization.validatorId, "render source finalization validator mismatch");
  assert.equal(receipt.sourceDecisionRecordRef.finalizationValidatorVersion, decisionRecord.finalization.validatorVersion, "render source finalization validator version mismatch");
  assert(Date.parse(receipt.renderedAt) >= Date.parse(decisionRecord.finalization.finalizedAt), "render cannot precede parent finalization");
  const referencedGate = decisionRecord.operationGates.find((gate) => gate.operation === receipt.operation);
  assert(referencedGate, `DecisionRecord has no ${receipt.operation} gate`);
  assert.deepEqual(receipt.sourceOperationGate, referencedGate, "render source gate must exactly match the referenced DecisionRecord gate");
  assert.notEqual(referencedGate.status, "blocked", "blocked DecisionRecord operation cannot be relabeled and rendered");
  const renderPolicyKey = { dashboard: "dashboard", report: "report", project_summary: "projectSummary" }[receipt.renderKind];
  const expectedTemplate = decisionRecord.renderPolicy[renderPolicyKey];
  assert(expectedTemplate, `DecisionRecord has no ${renderPolicyKey} template binding`);
  assert.deepEqual(receipt.templateRef, { templateId: expectedTemplate.templateId, templateVersion: expectedTemplate.templateVersion }, "render template does not match finalized DecisionRecord policy");
  assert.equal(receipt.validation.status, referencedGate.status === "pass" ? "passed" : "partial", "render validation status must preserve source gate status");
  if (receipt.artifact) {
    assert(Date.parse(receipt.artifact.createdAt) >= Date.parse(decisionRecord.finalization.finalizedAt), "artifact cannot predate parent finalization");
    assert(Date.parse(receipt.artifact.createdAt) <= Date.parse(receipt.renderedAt), "artifact creation cannot follow render receipt time");
    assert.equal(receipt.artifact.embeddedDecisionRecordId, decisionRecord.decisionRecordId, "artifact record ID mismatch");
    assert.equal(receipt.artifact.embeddedRecordHash, decisionRecord.recordHash, "artifact record hash mismatch");
    assert.equal(receipt.artifact.artifactHash, digest(artifactPayload), "artifact hash mismatch");
    assert.equal(canonicalJson(artifactPayload).includes(receipt.renderReceiptHash), false, "artifact cannot embed its later receipt hash");
  }
  assert.equal(canonicalJson(decisionRecord).includes(receipt.renderReceiptHash), false, "parent record cannot embed child receipt hash");
  assert.equal(canonicalJson(decisionRecord).includes(receipt.artifact?.artifactHash ?? "not-present"), false, "parent record cannot embed later render artifact hash");
  assert.equal(receipt.renderReceiptHash, contentHash(receipt, "renderReceiptHash"), "render receipt hash mismatch");
}

function rebindRenderReceipt(baseReceipt, parentRecord, artifactTitle = "Screening report") {
  const reboundArtifactPayload = {
    sourceDecisionRecordId: parentRecord.decisionRecordId,
    sourceRecordHash: parentRecord.recordHash,
    title: artifactTitle,
    values: []
  };
  const rebound = clone(baseReceipt);
  rebound.sourceDecisionRecordRef = {
    decisionRecordId: parentRecord.decisionRecordId,
    recordHash: parentRecord.recordHash,
    finalizedAt: parentRecord.finalization.finalizedAt,
    finalizationValidatorId: parentRecord.finalization.validatorId,
    finalizationValidatorVersion: parentRecord.finalization.validatorVersion
  };
  rebound.sourceOperationGate = clone(parentRecord.operationGates.find((gate) => gate.operation === rebound.operation));
  if (rebound.artifact) {
    rebound.artifact.artifactHash = digest(reboundArtifactPayload);
    rebound.artifact.embeddedDecisionRecordId = parentRecord.decisionRecordId;
    rebound.artifact.embeddedRecordHash = parentRecord.recordHash;
  }
  rebound.validation.status = rebound.sourceOperationGate.status === "pass" ? "passed" : "partial";
  rebound.renderReceiptHash = contentHash(rebound, "renderReceiptHash");
  return { receipt: rebound, artifactPayload: reboundArtifactPayload };
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

function schemaDeclaredPropertyNames(value) {
  const names = [];
  if (!value || typeof value !== "object") return names;
  if (value.properties && typeof value.properties === "object") names.push(...Object.keys(value.properties));
  for (const child of Object.values(value)) names.push(...schemaDeclaredPropertyNames(child));
  return names;
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
  rightsReceiptId: "rights.synthetic-unconditional.1",
  rightsProfileVersion: "1.0.0",
  scopeStatus: "cleared_for_named_scope",
  licence: {
    licenceId: "TEST-UNCONDITIONAL-1.0",
    licenceUrl: "https://example.invalid/licences/test-unconditional-1.0",
    attributionText: "Synthetic contract fixture; not a rights determination"
  },
  usagePolicyEvidence: {
    policyId: "test-unconditional-policy-1",
    policyUrl: "https://example.invalid/policies/test-unconditional-1",
    evidenceHash: digest("synthetic-usage-policy"),
    capturedAt: "2026-09-04T08:00:00.000Z"
  },
  operations: { permitted: [...OPERATIONS], unknown: [], prohibited: [] },
  channels: { permitted: [...CHANNELS], unknown: [], prohibited: [] },
  deliveryModes: { permitted: [...DELIVERY_MODES], unknown: [], prohibited: [] },
  territory: { scope: "named", countryCodes: ["AE", "SG"] },
  redistribution: "permitted",
  derivativeWorks: "permitted",
  shareAlike: "not_required",
  commercialUse: "permitted",
  expiresAt: null,
  nextReviewAt: "2026-12-04T08:00:00.000Z",
  reviewStatus: "current",
  evidenceRefs: [{
    evidenceId: "rights-evidence.synthetic-unconditional",
    evidenceType: "licence_text",
    evidenceHash: digest("synthetic-unconditional-evidence"),
    sourceUrl: "https://example.invalid/licences/test-unconditional-1.0",
    capturedAt: "2026-09-04T08:00:00.000Z"
  }]
};

const sourceReceipt = {
  sourceReceiptId: "source-receipt.synthetic-contract-fixture.1",
  sourceId: "synthetic-contract-fixture",
  provider: "Synthetic contract fixture",
  sourceKind: "synthetic",
  authorityStatus: "synthetic_not_evidence",
  rightsScope,
  requestedAt: "2026-09-04T08:00:00.000Z",
  acquisitionMethodId: "method.synthetic-contract-fixture",
  acquisitionMethodVersion: "1.0.0",
  minimizedPayloadHash: digest("minimized-payload"),
  coverage: {
    coverageId: "coverage.synthetic.1",
    kind: "buffer",
    geometryHash: digest("coverage-geometry"),
    spatialStatus: "partial",
    temporalStatus: "unknown",
    returnedCount: 1,
    capReached: false,
    supportsAbsenceConclusion: false,
    proofLimit: "Synthetic checker fixture only; no real-world coverage claim."
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
  limitations: ["Synthetic checker fixture only; not source or rights evidence."]
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
      sourceId: "synthetic-contract-fixture",
      namespace: "synthetic",
      featureId: "object.1",
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
  capturedAt: "2026-09-04T08:16:00.000Z",
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
    operationGates: OPERATIONS.map((operation) => ({
      operation,
      status: "pass",
      gapIds: [],
      rightsReceiptIds: [rightsScope.rightsReceiptId],
      rightsEvaluations: [makeRightsEvaluation(sourceReceipt, operation)],
      reasons: []
    }))
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
const futureEvidenceReceipt = clone(sourceReceipt);
futureEvidenceReceipt.rightsScope.usagePolicyEvidence.capturedAt = "2026-09-04T08:16:00.000Z";
futureEvidenceReceipt.rightsScope.evidenceRefs[0].capturedAt = "2026-09-04T08:16:00.000Z";
assert.equal(rightsPermit(futureEvidenceReceipt, { operation: "model_input", channel: "third_party_model", deliveryMode: "model_prompt", countryCode: "AE", evaluatedAt: "2026-09-04T08:15:00.000Z" }), false, "future-dated evidence cannot authorize an earlier rights evaluation");
assert.equal(rightsPermit(sourceReceipt, { operation: "model_input", channel: "third_party_model", deliveryMode: "model_prompt", countryCode: "AE" }), true, "fully scoped fixture should permit named model input");
const conditionalRedistributionReceipt = clone(sourceReceipt);
conditionalRedistributionReceipt.rightsScope.redistribution = "permitted_with_conditions";
assert.equal(rightsPermit(conditionalRedistributionReceipt, { operation: "export", channel: "authenticated_user", deliveryMode: "download", countryCode: "AE" }), false, "conditional redistribution must fail closed without obligation-satisfaction evidence");
const conditionalDerivativeReceipt = clone(sourceReceipt);
conditionalDerivativeReceipt.rightsScope.derivativeWorks = "permitted_with_conditions";
assert.equal(rightsPermit(conditionalDerivativeReceipt, { operation: "model_input", channel: "third_party_model", deliveryMode: "model_prompt", countryCode: "AE" }), false, "conditional derivative use must fail closed without obligation-satisfaction evidence");
const shareAlikeReceipt = clone(sourceReceipt);
shareAlikeReceipt.rightsScope.shareAlike = "required";
assert.equal(rightsPermit(shareAlikeReceipt, { operation: "generate", channel: "third_party_model", deliveryMode: "model_prompt", countryCode: "AE" }), false, "unproven share-alike obligations must block derivative generation");
const conditionallyPermittedSnapshot = clone(snapshot);
conditionallyPermittedSnapshot.sourceReceipts[0].rightsScope.derivativeWorks = "permitted_with_conditions";
for (const gate of conditionallyPermittedSnapshot.quality.operationGates) {
  for (const evaluation of gate.rightsEvaluations) {
    evaluation.rightsScopeHash = digest(conditionallyPermittedSnapshot.sourceReceipts[0].rightsScope);
    evaluation.evaluationHash = contentHash(evaluation, "evaluationHash");
  }
}
conditionallyPermittedSnapshot.snapshotHash = contentHash(conditionallyPermittedSnapshot, "snapshotHash");
expectValid(validators.geoContext, conditionallyPermittedSnapshot, "schema-valid snapshot with unmet conditional derivative rights");
assert.throws(() => assertSnapshotSemantics(conditionallyPermittedSnapshot), /tuple is not permitted/, "conditional rights cannot produce a positive gate evaluation without satisfaction evidence");
const tamperedRightsEvaluationSnapshot = clone(snapshot);
tamperedRightsEvaluationSnapshot.quality.operationGates[0].rightsEvaluations[0].channel = "public_preview";
tamperedRightsEvaluationSnapshot.snapshotHash = contentHash(tamperedRightsEvaluationSnapshot, "snapshotHash");
expectValid(validators.geoContext, tamperedRightsEvaluationSnapshot, "schema-valid snapshot with tampered rights tuple");
assert.throws(() => assertSnapshotSemantics(tamperedRightsEvaluationSnapshot), /hash mismatch/, "rights tuple mutation must invalidate evaluation hash");
const futureRightsEvaluationSnapshot = clone(snapshot);
futureRightsEvaluationSnapshot.quality.operationGates[0].rightsEvaluations[0].evaluatedAt = "2026-09-04T08:17:00.000Z";
futureRightsEvaluationSnapshot.quality.operationGates[0].rightsEvaluations[0].evaluationHash = contentHash(futureRightsEvaluationSnapshot.quality.operationGates[0].rightsEvaluations[0], "evaluationHash");
futureRightsEvaluationSnapshot.snapshotHash = contentHash(futureRightsEvaluationSnapshot, "snapshotHash");
expectValid(validators.geoContext, futureRightsEvaluationSnapshot, "schema-valid snapshot with future rights evaluation");
assert.throws(() => assertSnapshotSemantics(futureRightsEvaluationSnapshot), /cannot follow snapshot capture/);
const incompleteRightsPartition = clone(snapshot);
incompleteRightsPartition.sourceReceipts[0].rightsScope.operations.permitted = OPERATIONS.filter((operation) => operation !== "export");
assert.throws(() => assertSnapshotSemantics(incompleteRightsPartition), /must cover its complete vocabulary/);
const overlappingRightsPartition = clone(snapshot);
overlappingRightsPartition.sourceReceipts[0].rightsScope.operations.unknown = ["export"];
assert.throws(() => assertSnapshotSemantics(overlappingRightsPartition), /entries must be mutually exclusive/);

const localText = (en, ru) => ({ en, ru });
const operationPolicies = OPERATIONS.map((operation) => {
  const blocked = ["compare", "rank", "create", "generate", "evaluate", "project", "export"].includes(operation);
  return { operation, status: blocked ? "blocked" : "enabled", blockingRequirementIds: blocked ? ["validation.data-and-rights"] : [] };
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
scenarioRegistry.scenarios[0].entryHash = contentHash(scenarioRegistry.scenarios[0], "entryHash");
scenarioRegistry.registryHash = contentHash(scenarioRegistry, "registryHash");
expectValid(validators.scenarioRegistry, scenarioRegistry, "positive Scenario Registry fixture");
assertRegistrySemantics(scenarioRegistry);
const mutatedScenarioEntry = clone(scenarioRegistry);
mutatedScenarioEntry.scenarios[0].modeBindings[0].status = "enabled";
mutatedScenarioEntry.registryHash = contentHash(mutatedScenarioEntry, "registryHash");
assert.throws(() => assertRegistrySemantics(mutatedScenarioEntry), /scenario entry hash mismatch/, "scenario mutation must invalidate its entry hash even when registry hash is recomputed");
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
  finalization: {
    state: "finalized",
    finalizedAt: "2026-09-04T08:20:01.000Z",
    validatorId: "validator.decision-record",
    validatorVersion: "1.0.0",
    schemaValidationPassed: true,
    semanticValidationPassed: true
  },
  truthLanguagePolicy: "locale_neutral_codes_and_user_authored_inputs_v1",
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
    refreshReasonCode: null
  },
  methodExecutions: [],
  operationGates: OPERATIONS.map((operation) => ({
    operation,
    status: blockedOperations.has(operation) ? "blocked" : "pass",
    gapIds: blockedOperations.has(operation) ? ["gap.future-evidence"] : [],
    validationTaskIds: blockedOperations.has(operation) ? ["validation.future-evidence"] : [],
    rightsReceiptIds: [rightsScope.rightsReceiptId],
    rightsEvaluations: [makeRightsEvaluation(sourceReceipt, operation)],
    reasons: blockedOperations.has(operation) ? ["gate.named-evidence-required"] : []
  })),
  outputs: {
    claims: [],
    metrics: [],
    candidateSet: null,
    alternatives: [],
    recommendation: null,
    validationTasks: [{
      validationTaskId: "validation.future-evidence",
      titleKey: "validation.decision-evidence.title",
      priority: "high",
      status: "open",
      evidenceRequirementKeys: ["evidence.named-data", "evidence.named-rights"],
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
    refreshReasonCode: null
  },
  governance: {
    claimPolicyId: "claim-policy.screening",
    claimPolicyVersion: "1.0.0",
    maximumClaimLevel: "open_context_screening",
    validationState: "official_validation_required",
    privacyClass: "public_open_context",
    releaseState: "local_candidate",
    caveatPolicyId: "caveat.screening-official-validation-required.v1"
  }
};
decisionRecord.recordHash = contentHash(decisionRecord, "recordHash");
expectValid(validators.decisionRecord, decisionRecord, "positive DecisionRecord fixture");
assertDecisionSemantics(decisionRecord, { registry: scenarioRegistry, snapshots: [snapshot] });

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
  proofLimitCode: "proof.no-source-value"
});
expectInvalid(validators.decisionRecord, unknownMetricWithValue, "unknown metric carrying a value");
const localizedDecisionNarrative = clone(decisionRecord);
localizedDecisionNarrative.outputs.validationTasks[0].title = "Проверить доказательства";
expectInvalid(validators.decisionRecord, localizedDecisionNarrative, "localized system narrative inside DecisionRecord truth payload");
const localizedSystemCriterion = clone(decisionRecord);
localizedSystemCriterion.inputs.criteria.push({
  criterionId: "criterion.land-use",
  value: "Жилой район",
  unit: null,
  source: "scenario_default",
  normalizedHash: digest("localized-system-criterion")
});
expectInvalid(validators.decisionRecord, localizedSystemCriterion, "localized system-owned criterion value inside DecisionRecord truth payload");
const userAuthoredCriterion = clone(decisionRecord);
userAuthoredCriterion.inputs.criteria.push({
  criterionId: "criterion.user-question",
  value: "Проверить жилой сценарий",
  unit: null,
  source: "user",
  normalizedHash: digest("user-authored-criterion")
});
userAuthoredCriterion.recordHash = contentHash(userAuthoredCriterion, "recordHash");
expectValid(validators.decisionRecord, userAuthoredCriterion, "user-authored language-bearing criterion input");
const decisionPropertyNames = new Set(schemaDeclaredPropertyNames(schemas.decisionRecord));
for (const forbiddenField of ["text", "summary", "title", "label", "reason", "assumptions", "violations", "failureReasons", "refreshReason", "proofLimit", "caveat"]) {
  assert.equal(decisionPropertyNames.has(forbiddenField), false, `DecisionRecord schema contains hash-bearing narrative field ${forbiddenField}`);
}
const mismatchedScenarioHash = clone(decisionRecord);
mismatchedScenarioHash.scenarioRef.scenarioHash = digest("wrong-scenario-entry");
mismatchedScenarioHash.recordHash = contentHash(mismatchedScenarioHash, "recordHash");
expectValid(validators.decisionRecord, mismatchedScenarioHash, "schema-valid DecisionRecord with mismatched scenario hash");
assert.throws(() => assertDecisionSemantics(mismatchedScenarioHash, { registry: scenarioRegistry, snapshots: [snapshot] }), /scenario hash mismatch/);
const mismatchedSnapshotHash = clone(decisionRecord);
mismatchedSnapshotHash.inputs.contextSnapshots[0].snapshotHash = digest("wrong-snapshot");
mismatchedSnapshotHash.recordHash = contentHash(mismatchedSnapshotHash, "recordHash");
expectValid(validators.decisionRecord, mismatchedSnapshotHash, "schema-valid DecisionRecord with mismatched snapshot hash");
assert.throws(() => assertDecisionSemantics(mismatchedSnapshotHash, { registry: scenarioRegistry, snapshots: [snapshot] }), /snapshot hash mismatch/);
const futureDecisionRightsEvaluation = clone(decisionRecord);
futureDecisionRightsEvaluation.operationGates[0].rightsEvaluations[0].evaluatedAt = "2026-09-04T08:21:00.000Z";
futureDecisionRightsEvaluation.operationGates[0].rightsEvaluations[0].evaluationHash = contentHash(futureDecisionRightsEvaluation.operationGates[0].rightsEvaluations[0], "evaluationHash");
futureDecisionRightsEvaluation.recordHash = contentHash(futureDecisionRightsEvaluation, "recordHash");
expectValid(validators.decisionRecord, futureDecisionRightsEvaluation, "schema-valid DecisionRecord with future rights evaluation");
assert.throws(() => assertDecisionSemantics(futureDecisionRightsEvaluation, { registry: scenarioRegistry, snapshots: [snapshot] }), /cannot follow decisionAsOf/);
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
    finalizedAt: decisionRecord.finalization.finalizedAt,
    finalizationValidatorId: decisionRecord.finalization.validatorId,
    finalizationValidatorVersion: decisionRecord.finalization.validatorVersion
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
  sourceOperationGate: clone(reportGate),
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
    caveatPolicyId: "caveat.screening-official-validation-required.v1"
  }
};
renderReceipt.renderReceiptHash = contentHash(renderReceipt, "renderReceiptHash");
expectValid(validators.decisionRender, renderReceipt, "positive DecisionRenderReceipt fixture");
assertRenderSemantics(renderReceipt, decisionRecord, artifactPayload);
const localizedRenderReceipt = clone(renderReceipt);
localizedRenderReceipt.presentation.locale = "ru";
localizedRenderReceipt.renderManifestHash = digest("render-manifest-ru");
localizedRenderReceipt.renderReceiptHash = contentHash(localizedRenderReceipt, "renderReceiptHash");
expectValid(validators.decisionRender, localizedRenderReceipt, "localized child render receipt");
assertRenderSemantics(localizedRenderReceipt, decisionRecord, artifactPayload);
assert.equal(decisionRecord.recordHash, contentHash(decisionRecord, "recordHash"), "localized render must not alter parent truth hash");
const recomputingRender = clone(renderReceipt);
recomputingRender.truthRecomputationPerformed = true;
expectInvalid(validators.decisionRender, recomputingRender, "render that recomputes truth");
const wrongRenderOperation = clone(renderReceipt);
wrongRenderOperation.operation = "dashboard";
expectInvalid(validators.decisionRender, wrongRenderOperation, "report receipt with dashboard operation");
const wrongEmbeddedRecord = clone(renderReceipt);
wrongEmbeddedRecord.artifact.embeddedRecordHash = digest("wrong-parent");
assert.throws(() => assertRenderSemantics(wrongEmbeddedRecord, decisionRecord, artifactPayload), /artifact record hash mismatch/);
const artifactBeforeParent = clone(renderReceipt);
artifactBeforeParent.artifact.createdAt = "2026-09-04T08:19:59.000Z";
artifactBeforeParent.renderReceiptHash = contentHash(artifactBeforeParent, "renderReceiptHash");
expectValid(validators.decisionRender, artifactBeforeParent, "schema-valid artifact predating parent finalization");
assert.throws(() => assertRenderSemantics(artifactBeforeParent, decisionRecord, artifactPayload), /cannot predate parent finalization/);
const artifactAfterReceipt = clone(renderReceipt);
artifactAfterReceipt.artifact.createdAt = "2026-09-04T08:22:00.000Z";
artifactAfterReceipt.renderReceiptHash = contentHash(artifactAfterReceipt, "renderReceiptHash");
expectValid(validators.decisionRender, artifactAfterReceipt, "schema-valid artifact created after render receipt time");
assert.throws(() => assertRenderSemantics(artifactAfterReceipt, decisionRecord, artifactPayload), /cannot follow render receipt time/);
const tamperedRenderGate = clone(renderReceipt);
tamperedRenderGate.sourceOperationGate.reasons = ["gate.relabelled"];
tamperedRenderGate.renderReceiptHash = contentHash(tamperedRenderGate, "renderReceiptHash");
expectValid(validators.decisionRender, tamperedRenderGate, "schema-valid render receipt with tampered gate");
assert.throws(() => assertRenderSemantics(tamperedRenderGate, decisionRecord, artifactPayload), /must exactly match/);
const blockedRenderParent = clone(decisionRecord);
const blockedReportGate = blockedRenderParent.operationGates.find((gate) => gate.operation === "report");
blockedReportGate.status = "blocked";
blockedReportGate.gapIds = ["gap.future-evidence"];
blockedReportGate.validationTaskIds = ["validation.future-evidence"];
blockedReportGate.reasons = ["gate.named-evidence-required"];
blockedRenderParent.recordHash = contentHash(blockedRenderParent, "recordHash");
expectValid(validators.decisionRecord, blockedRenderParent, "finalized parent with blocked report gate");
assertDecisionSemantics(blockedRenderParent, { registry: scenarioRegistry, snapshots: [snapshot] });
const blockedBinding = rebindRenderReceipt(renderReceipt, blockedRenderParent);
blockedBinding.receipt.sourceOperationGate.status = "pass";
blockedBinding.receipt.validation.status = "passed";
blockedBinding.receipt.renderReceiptHash = contentHash(blockedBinding.receipt, "renderReceiptHash");
expectValid(validators.decisionRender, blockedBinding.receipt, "schema-valid receipt relabeling a blocked source gate");
assert.throws(() => assertRenderSemantics(blockedBinding.receipt, blockedRenderParent, blockedBinding.artifactPayload), /must exactly match/);
const blockedAsPartialBinding = rebindRenderReceipt(renderReceipt, blockedRenderParent);
blockedAsPartialBinding.receipt.sourceOperationGate.status = "partial";
blockedAsPartialBinding.receipt.validation.status = "partial";
blockedAsPartialBinding.receipt.renderReceiptHash = contentHash(blockedAsPartialBinding.receipt, "renderReceiptHash");
expectValid(validators.decisionRender, blockedAsPartialBinding.receipt, "schema-valid receipt relabeling blocked source gate as partial");
assert.throws(() => assertRenderSemantics(blockedAsPartialBinding.receipt, blockedRenderParent, blockedAsPartialBinding.artifactPayload), /must exactly match/);
const unfinalizedParent = clone(decisionRecord);
unfinalizedParent.finalization.state = "pending";
unfinalizedParent.recordHash = contentHash(unfinalizedParent, "recordHash");
expectInvalid(validators.decisionRecord, unfinalizedParent, "unfinalized DecisionRecord parent");
const unfinalizedBinding = rebindRenderReceipt(renderReceipt, unfinalizedParent);
expectValid(validators.decisionRender, unfinalizedBinding.receipt, "child receipt referencing structurally unfinalized parent");
assert.throws(() => assertRenderSemantics(unfinalizedBinding.receipt, unfinalizedParent, unfinalizedBinding.artifactPayload), /not schema-valid and finalized/);
const parentMutatedWithLaterArtifact = clone(decisionRecord);
parentMutatedWithLaterArtifact.lineage.decisionArtifactHashes.push(renderReceipt.artifact.artifactHash);
assert.throws(() => assertDecisionSemantics(parentMutatedWithLaterArtifact, { registry: scenarioRegistry, snapshots: [snapshot] }), /DecisionRecord hash mismatch/);
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
    "conditional_or_share_alike_rights_fail_closed_without_satisfaction_evidence",
    "rights_permission_partitions_are_complete_disjoint_and_exact",
    "rights_gate_persists_hashed_operation_channel_delivery_territory_time_tuple",
    "rights_evaluation_chronology_precedes_snapshot_and_decision_finalization",
    "rights_evidence_exists_before_its_evaluation",
    "operation_vocabularies_and_gate_coverage_match",
    "scenario_entry_hash_is_independent_from_registry_hash",
    "decision_registry_scenario_snapshot_subject_method_template_refs_resolve",
    "decision_system_narrative_is_locale_neutral_codes",
    "enabled_ranking_requires_metrics",
    "legacy_parent_render_artifact_binding_rejected",
    "render_truth_recomputation_rejected",
    "render_kind_operation_mapping_enforced",
    "render_gate_is_exact_parent_gate_and_blocked_cannot_be_relabelled",
    "render_requires_finalized_parent_and_matching_validator_receipt",
    "render_artifact_chronology_is_parent_then_artifact_then_receipt",
    "localized_render_preserves_parent_truth_hash",
    "render_receipt_is_acyclic_and_parent_bound",
    "later_render_hash_cannot_be_inserted_into_final_parent"
  ]
}, null, 2));
