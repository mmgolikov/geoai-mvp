#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phaseArgument = process.argv.find((argument) => argument.startsWith("--phase="));
const phaseIndex = process.argv.indexOf("--phase");
const phase = phaseArgument?.split("=")[1] ?? (phaseIndex >= 0 ? process.argv[phaseIndex + 1] : "full");
assert.ok(phase === "p0" || phase === "full", "--phase must be p0 or full");

const buildDirectory = mkdtempSync(path.join(tmpdir(), "rosim-contract-"));

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function assertChangedFilesWithinAllowlist() {
  const status = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    { cwd: repoRoot, encoding: "utf8" }
  );
  const changedPaths = status
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ""));
  const allowed = [
    /^app\/pilots\/rosimushchestvo\//,
    /^src\/pilots\/rosimushchestvo\//,
    /^tests\/e2e\/rosimushchestvo-pilot\.spec\.ts$/,
    /^scripts\/rosimushchestvo-pilot-contract-check\.mjs$/,
    /^artifacts\/rosimushchestvo-pilot\//,
    /^docs\/pilots\/rosimushchestvo-moscow\/evidence\/dev-001\//,
    /^docs\/pilots\/rosimushchestvo-moscow\/ROSIMUSHCHESTVO_DEV_IMPLEMENTATION_RECEIPT_V1\.md$/,
    /^docs\/DOCUMENT_LIFECYCLE_MANIFEST\.json$/,
    /^docs\/DOCUMENT_ARCHIVE_INDEX\.md$/
  ];
  const violations = changedPaths.filter((changedPath) => !allowed.some((pattern) => pattern.test(changedPath)));
  assert.deepEqual(violations, [], `changed/untracked files outside allowlist: ${violations.join(", ")}`);
}

function assertRuntimeBoundaryStaticScan() {
  const scanRoots = [
    path.join(repoRoot, "app", "pilots", "rosimushchestvo"),
    path.join(repoRoot, "src", "pilots", "rosimushchestvo")
  ];
  const files = scanRoots.flatMap((root) => walk(root)).filter((file) => /\.(?:ts|tsx|js|jsx|mjs|cjs|css|json)$/.test(file));
  const violations = [];
  for (const file of files) {
    const relative = path.relative(repoRoot, file);
    const source = readFileSync(file, "utf8");
    const withoutAllowedMapboxEnv = source.replaceAll("process.env.NEXT_PUBLIC_MAPBOX_TOKEN", "ALLOWED_MAPBOX_TOKEN");
    const checks = [
      ["Supabase", /\bsupabase\b/i],
      ["API", /\bapi\b/i],
      ["fetch", /\bfetch\s*\(/],
      ["eval", /\beval\s*\(/],
      ["dangerouslySetInnerHTML", /dangerouslySetInnerHTML/],
      ["environment read", /(?:process\.env|import\.meta\.env|Deno\.env|Bun\.env)/],
      ["non-allowlisted public environment key", /NEXT_PUBLIC_[A-Z0-9_]+/]
    ];
    for (const [label, pattern] of checks) {
      if (pattern.test(withoutAllowedMapboxEnv)) violations.push(`${relative}: ${label}`);
    }
  }
  assert.deepEqual(violations, [], `runtime-boundary static scan failed: ${violations.join("; ")}`);
}

function loadCompiledModules() {
  const compiler = path.join(repoRoot, "node_modules", ".bin", "tsc");
  execFileSync(
    compiler,
    [
      path.join(repoRoot, "src/pilots/rosimushchestvo/data/index.ts"),
      path.join(repoRoot, "src/pilots/rosimushchestvo/engine/index.ts"),
      "--outDir",
      buildDirectory,
      "--module",
      "commonjs",
      "--target",
      "ES2020",
      "--moduleResolution",
      "node",
      "--strict",
      "--esModuleInterop",
      "--skipLibCheck",
      "--noEmitOnError"
    ],
    { cwd: repoRoot, stdio: "pipe" }
  );
  const require = createRequire(import.meta.url);
  return {
    data: require(path.join(buildDirectory, "data", "index.js")),
    domain: require(path.join(buildDirectory, "domain", "index.js")),
    engine: require(path.join(buildDirectory, "engine", "index.js"))
  };
}

try {
  assertChangedFilesWithinAllowlist();
  assertRuntimeBoundaryStaticScan();
  const { data, domain, engine } = loadCompiledModules();
  const assets = data.DEMO_ASSETS;
  assert.equal(domain.DATASET_VERSION, "rosim-moscow-demo-v1");
  assert.equal(domain.DATASET_SEED, "RF-MSK-DEMO-2026-07-31-v1");
  assert.equal(domain.GENERATOR_VERSION, "rosim-fixture-v1");
  assert.equal(domain.RULE_VERSION, "rosim-scenario-rules-v1");
  assert.equal(assets.length, 42, "dataset must contain exactly 42 assets");

  const expectedIds = Array.from({ length: 42 }, (_, index) => `DEMO-RF-MSK-${String(index + 1).padStart(3, "0")}`);
  assert.deepEqual(assets.map((asset) => asset.id), expectedIds);
  assert.equal(new Set(assets.map((asset) => asset.id)).size, 42);
  assert.ok(assets.every((asset) => /^DEMO-RF-MSK-\d{3}$/.test(asset.id)));
  assert.ok(assets.every((asset) => asset.cadastralNumber === null));
  assert.ok(assets.every((asset) => /^77:DEMO:\d{3}$/.test(asset.demoRegistryReference)));
  assert.deepEqual(
    [...new Set(assets.map((asset) => asset.archetype))].sort(),
    [
      "administrative_building",
      "built_in_premises",
      "cultural_heritage",
      "industrial_site",
      "land_plot",
      "mixed_property_complex",
      "social_facility",
      "unfinished_construction",
      "warehouse"
    ]
  );
  assert.ok(
    assets.every(
      (asset) =>
        asset.coordinates[0] >= 36.7 &&
        asset.coordinates[0] <= 38 &&
        asset.coordinates[1] >= 55.3 &&
        asset.coordinates[1] <= 56.1
    ),
    "synthetic points must remain inside a coarse Moscow envelope"
  );

  const incompleteOrConflict = assets.filter(
    (asset) => asset.verificationStatus === "incomplete" || asset.verificationStatus === "conflicting"
  );
  assert.ok(incompleteOrConflict.length >= 5, "at least five conflict/incomplete fixtures are required");
  for (const goldenId of ["DEMO-RF-MSK-001", "DEMO-RF-MSK-014", "DEMO-RF-MSK-027"]) {
    assert.ok(data.getAssetById(goldenId), `missing golden object ${goldenId}`);
  }

  const negativeAxes = new Set(["constraintSeverity", "monitoringRisk"]);
  for (const asset of assets) {
    assert.deepEqual(Object.keys(asset.axes).sort(), [...domain.DECISION_AXIS_KEYS].sort());
    const observationIds = new Set(asset.observations.map((observation) => observation.id));
    for (const [key, axis] of Object.entries(asset.axes)) {
      assert.ok(axis.value === null || (Number.isFinite(axis.value) && axis.value >= 0 && axis.value <= 100));
      assert.equal(axis.provenance, "synthetic");
      assert.equal(axis.methodVersion, domain.GENERATOR_VERSION);
      assert.equal(axis.direction, negativeAxes.has(key) ? "higher_is_worse" : "higher_is_better");
      assert.ok(axis.inputRefs.length > 0);
      assert.ok(axis.inputRefs.every((inputRef) => observationIds.has(inputRef)), `${asset.id}/${key} has broken lineage`);
    }
    assert.equal(
      new Set(Object.values(asset.axes).flatMap((axis) => axis.inputRefs)).size,
      7,
      `${asset.id} must use a distinct field-level observation ref for every axis`
    );
    assert.ok(asset.observations.every((observation) => observation.sourceRef.length > 0));
  }

  const insufficient = data.getAssetById("DEMO-RF-MSK-027");
  assert.equal(insufficient.areaSquareMeters, null);
  assert.equal(insufficient.metroWalkMinutes, null);
  assert.equal(insufficient.criticalConstraint, "unknown");
  assert.ok(Object.values(insufficient.axes).every((axis) => axis.value === null));

  const expectedMain = [
    "DEMO-RF-MSK-001",
    "DEMO-RF-MSK-003",
    "DEMO-RF-MSK-006",
    "DEMO-RF-MSK-012",
    "DEMO-RF-MSK-021",
    "DEMO-RF-MSK-009",
    "DEMO-RF-MSK-018",
    "DEMO-RF-MSK-033"
  ];
  const main = engine.evaluateMainQuery();
  assert.deepEqual(main.selectedIds, expectedMain);
  assert.equal(main.groupCounts.start_preliminary_work, 5);
  assert.equal(main.groupCounts.promising_after_check, 3);
  assert.ok(
    main.ordered.every(
      (entry) =>
        entry.receipt.provenance === "derived" &&
        entry.receipt.inputRefs.length > 0 &&
        entry.assessment.provenance === "derived" &&
        entry.assessment.methodVersion.length > 0 &&
        entry.assessment.inputRefs.length > 0
    )
  );
  assert.deepEqual(engine.evaluateMainQuery(), main, "main query must be stable");

  const custom = engine.evaluateCustomQuery(domain.DEFAULT_CUSTOM_QUERY);
  const expectedMatches = [
    "DEMO-RF-MSK-001",
    "DEMO-RF-MSK-006",
    "DEMO-RF-MSK-012",
    "DEMO-RF-MSK-021",
    "DEMO-RF-MSK-033"
  ];
  const expectedConfirmation = ["DEMO-RF-MSK-014", "DEMO-RF-MSK-027"];
  assert.deepEqual(custom.groups.matches.map((entry) => entry.asset.id), expectedMatches);
  assert.deepEqual(custom.groups.requires_confirmation.map((entry) => entry.asset.id), expectedConfirmation);
  assert.equal(custom.groups.does_not_match.length, 35);
  assert.deepEqual(engine.evaluateCustomQuery(domain.DEFAULT_CUSTOM_QUERY), custom, "custom query must be stable");
  assert.ok(engine.validateCustomQuery({ ...domain.DEFAULT_CUSTOM_QUERY, minimumAreaSquareMeters: -1 }).length > 0);
  assert.ok(
    engine.validateCustomQuery({
      ...domain.DEFAULT_CUSTOM_QUERY,
      minimumAreaSquareMeters: 2000,
      maximumAreaSquareMeters: 1000
    }).length > 0
  );

  const criticalAssessment = engine.evaluateScenario(data.getAssetById("DEMO-RF-MSK-035"));
  assert.equal(criticalAssessment.group, "expert_review_only");
  assert.match(criticalAssessment.nextAction, /провер|подтверж/i);
  assert.doesNotMatch(criticalAssessment.nextAction, /начать предварительную проработку/i);
  assert.equal(data.CAPABILITY_SCENARIOS.length, 4);
  assert.equal(new Set(data.CAPABILITY_SCENARIOS.map((scenario) => scenario.id)).size, 4);
  for (const asset of assets) {
    const observationIds = new Set(asset.observations.map((observation) => observation.id));
    for (const scenario of data.CAPABILITY_SCENARIOS) {
      const assessment = engine.evaluateScenario(asset, scenario.id);
      assert.equal(assessment.provenance, "derived");
      assert.ok(assessment.methodVersion.length > 0);
      assert.ok(assessment.inputRefs.length > 0);
      assert.ok(
        assessment.inputRefs.every((inputRef) => observationIds.has(inputRef)),
        `${asset.id}/${scenario.id} has broken derived input refs`
      );
    }
  }
  for (const scenario of data.CAPABILITY_SCENARIOS) {
    const assessment = engine.evaluateScenario(data.getAssetById("DEMO-RF-MSK-001"), scenario.id);
    const observationIds = new Set(data.getAssetById("DEMO-RF-MSK-001").observations.map((observation) => observation.id));
    assert.equal(assessment.ruleVersion, domain.RULE_VERSION);
    assert.equal(assessment.provenance, "derived");
    assert.ok(assessment.methodVersion.length > 0);
    assert.ok(assessment.inputRefs.length > 0);
    assert.ok(assessment.inputRefs.every((inputRef) => observationIds.has(inputRef)));
    assert.ok(assessment.triggeredConditions.length + assessment.failedConditions.length > 0);
    assert.ok(assessment.primaryHypothesis.length > 0);
    assert.ok(assessment.alternativeHypothesis.length > 0);
    assert.ok(assessment.nextAction.length > 0);
    assert.ok(assessment.ownerRole.length > 0);
    assert.ok(assessment.dueInBusinessDays > 0);
  }
  const scenarioAssessments001 = data.CAPABILITY_SCENARIOS.map((scenario) =>
    engine.evaluateScenario(data.getAssetById("DEMO-RF-MSK-001"), scenario.id)
  );
  assert.equal(new Set(scenarioAssessments001.map((assessment) => assessment.methodVersion)).size, 4);
  assert.equal(new Set(scenarioAssessments001.map((assessment) => assessment.actionType)).size, 4);
  assert.equal(new Set(scenarioAssessments001.map((assessment) => assessment.primaryHypothesis)).size, 4);
  assert.equal(
    new Set(
      scenarioAssessments001.map((assessment) =>
        JSON.stringify([assessment.triggeredConditions, assessment.failedConditions])
      )
    ).size,
    4
  );
  assert.ok(new Set(scenarioAssessments001.map((assessment) => assessment.group)).size >= 2);

  const scenarioAssessments014 = data.CAPABILITY_SCENARIOS.map((scenario) =>
    engine.evaluateScenario(data.getAssetById("DEMO-RF-MSK-014"), scenario.id)
  );
  assert.ok(new Set(scenarioAssessments014.map((assessment) => JSON.stringify(assessment.missingInputs))).size >= 2);
  assert.ok(new Set(scenarioAssessments014.map((assessment) => JSON.stringify(assessment.blockers))).size >= 3);
  assert.equal(new Set(scenarioAssessments014.map((assessment) => assessment.nextAction)).size, 4);

  const scenarioAssessments003 = data.CAPABILITY_SCENARIOS.map((scenario) =>
    engine.evaluateScenario(data.getAssetById("DEMO-RF-MSK-003"), scenario.id)
  );
  assert.ok(new Set(scenarioAssessments003.map((assessment) => assessment.confidence)).size >= 2);
  assert.equal(engine.getAssetById("DEMO-RF-MSK-001")?.id, "DEMO-RF-MSK-001");

  const customWithUnknownExcluded = engine.evaluateCustomQuery({
    ...domain.DEFAULT_CUSTOM_QUERY,
    unknownPolicy: "exclude"
  });
  assert.equal(customWithUnknownExcluded.groups.requires_confirmation.length, 0);
  assert.ok(
    customWithUnknownExcluded.groups.does_not_match.some((entry) => entry.asset.id === "DEMO-RF-MSK-027"),
    "unknown policy must exclude unknown; it must never coerce unknown to absence"
  );

  const relaxedQuery = {
    ...domain.DEFAULT_CUSTOM_QUERY,
    useStatus: "any",
    minimumAreaSquareMeters: null,
    maximumAreaSquareMeters: null,
    maximumMetroWalkMinutes: null,
    criticalConstraint: "any",
    minimumDataConfidence: null,
    unknownPolicy: "separate_for_confirmation"
  };
  const engagementCustom = engine.evaluateCustomQuery({ ...relaxedQuery, scenario: "engagement" });
  const registryCustom = engine.evaluateCustomQuery({ ...relaxedQuery, scenario: "registry_quality" });
  const nonUseCustom = engine.evaluateCustomQuery({ ...relaxedQuery, scenario: "non_use" });
  const monitoringCustom = engine.evaluateCustomQuery({ ...relaxedQuery, scenario: "monitoring" });
  assert.equal(engagementCustom.groups.matches.length, 42);
  assert.deepEqual(
    registryCustom.groups.matches.map((entry) => entry.asset.id),
    ["DEMO-RF-MSK-009", "DEMO-RF-MSK-014", "DEMO-RF-MSK-018", "DEMO-RF-MSK-027", "DEMO-RF-MSK-033"]
  );
  assert.ok(nonUseCustom.groups.matches.some((entry) => entry.asset.id === "DEMO-RF-MSK-001"));
  assert.ok(nonUseCustom.groups.requires_confirmation.some((entry) => entry.asset.id === "DEMO-RF-MSK-014"));
  assert.ok(monitoringCustom.groups.matches.some((entry) => entry.asset.id === "DEMO-RF-MSK-018"));
  assert.ok(monitoringCustom.groups.requires_confirmation.some((entry) => entry.asset.id === "DEMO-RF-MSK-027"));
  assert.equal(
    new Set(
      [engagementCustom, registryCustom, nonUseCustom, monitoringCustom].map((result) =>
        JSON.stringify(result.groups.matches.map((entry) => entry.asset.id))
      )
    ).size,
    4,
    "custom scenario selector must materially change evaluation"
  );

  const absentConstraint = engine.evaluateCustomQuery({ ...relaxedQuery, scenario: "any", criticalConstraint: "absent" });
  const presentConstraint = engine.evaluateCustomQuery({ ...relaxedQuery, scenario: "any", criticalConstraint: "present" });
  const unknownConstraint = engine.evaluateCustomQuery({ ...relaxedQuery, scenario: "any", criticalConstraint: "unknown" });
  assert.ok(absentConstraint.groups.matches.some((entry) => entry.asset.id === "DEMO-RF-MSK-001"));
  assert.deepEqual(presentConstraint.groups.matches.map((entry) => entry.asset.id), ["DEMO-RF-MSK-035"]);
  assert.deepEqual(
    unknownConstraint.groups.matches.map((entry) => entry.asset.id),
    ["DEMO-RF-MSK-014", "DEMO-RF-MSK-027"]
  );

  const p0Receipts = {
    fixture: data.SOURCE_CATALOGUE.find((source) => source.integrationStatus === "fixture_only"),
    permission: data.SOURCE_CATALOGUE.find((source) => source.sourceAccessStatus === "permission_required"),
    unavailable: data.SOURCE_CATALOGUE.find((source) => source.sourceAccessStatus === "unavailable")
  };
  assert.ok(p0Receipts.fixture && p0Receipts.permission && p0Receipts.unavailable);

  const sourceText = walk(path.join(repoRoot, "src/pilots/rosimushchestvo"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(sourceText, /overallScore|aggregateScore|totalScore|weightedScore/i, "aggregate score is prohibited");
  assert.doesNotMatch(sourceText, /integrationStatus\s*:\s*["'](?:connected|live|official)["']/i);

  if (phase === "full") {
    assert.equal(data.SOURCE_CATALOGUE.length, 10, "full phase requires exactly ten source rows");
    const sourceIds = new Set(data.SOURCE_CATALOGUE.map((source) => source.id));
    for (const sourceId of ["rfi", "egrn", "nspd"]) assert.ok(sourceIds.has(sourceId));
    assert.equal(sourceIds.size, 10);
    assert.ok(
      data.SOURCE_CATALOGUE.every(
        (source) =>
          source.integrationStatus === "not_connected" || source.integrationStatus === "fixture_only"
      )
    );
    assert.equal(data.ROLE_CONFIGURATIONS.length, 8);
    assert.equal(new Set(data.ROLE_CONFIGURATIONS.map((configuration) => configuration.role)).size, 8);
    assert.equal(
      new Set(
        data.ROLE_CONFIGURATIONS.map((configuration) =>
          JSON.stringify([configuration.firstBlock, configuration.kpiEmphasis, configuration.actionPriority])
        )
      ).size,
      8,
      "all role configurations must be unique"
    );
    assert.deepEqual(
      data.FUTURE_CAPABILITY_SCENARIOS.map((scenario) => scenario.id),
      ["public_social_transfer", "redevelopment", "construction_obligations", "maintenance_capex", "property_lot"]
    );
    assert.ok(
      data.FUTURE_CAPABILITY_SCENARIOS.every(
        (scenario) =>
          scenario.status === "not_modelled_in_prototype_v1" &&
          scenario.statusLabel === "Не моделируется в prototype v1"
      )
    );
  }

  console.log(`rosimushchestvo pilot contract (${phase}): PASS`);
  console.log(`dataset=${domain.DATASET_VERSION} seed=${domain.DATASET_SEED} generator=${domain.GENERATOR_VERSION}`);
  console.log(`objects=${assets.length} archetypes=${new Set(assets.map((asset) => asset.archetype)).size}`);
  console.log(`conflict_or_incomplete=${incompleteOrConflict.map((asset) => asset.id).join(",")}`);
  console.log(`main=${main.selectedIds.join(",")}`);
  console.log(`custom.matches=${expectedMatches.join(",")}`);
  console.log(`custom.confirmation=${expectedConfirmation.join(",")}`);
} catch (error) {
  console.error(`rosimushchestvo pilot contract (${phase}): FAIL`);
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  rmSync(buildDirectory, { recursive: true, force: true });
}
