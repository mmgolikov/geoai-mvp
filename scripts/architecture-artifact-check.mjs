import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";

const root = process.cwd();
const metadataPath = resolve(root, "docs/artifacts/architecture-artifact-manifest.json");
const renderManifestPath = resolve(root, "docs/artifacts/rendered/render-manifest.json");
const requiredIds = [
  "C4-001", "C4-002", "C4-003", "BPMN-001", "STATE-001", "SEQ-001",
  "ERD-001", "DATA-LINEAGE-001", "ACT-001", "DEP-001", "API-001"
];
const requiredMappingDocs = [
  "docs/artifacts/ARCHITECTURE_IMPLEMENTATION_MAPPING_V1.md",
  "docs/artifacts/ARCHITECTURE_TRACE_MATRIX_V1.md",
  "docs/artifacts/ARCHITECTURE_REVIEW_PACKET_V1.md",
  "docs/artifacts/ARCHITECTURE_PRE_REVIEW_FINDINGS_V1.md"
];
const failures = [];
const checks = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function check(condition, label) {
  checks.push({ label, passed: Boolean(condition) });
  if (!condition) failures.push(label);
}

function safeRepoPath(path) {
  const absolute = resolve(root, path);
  check(relative(root, absolute) !== "" && !relative(root, absolute).startsWith(".."), `repo-contained path: ${path}`);
  return absolute;
}

check(existsSync(metadataPath), "metadata manifest exists");
check(existsSync(renderManifestPath), "render manifest exists");

const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
const renderManifest = JSON.parse(readFileSync(renderManifestPath, "utf8"));
const ids = metadata.artifacts.map((artifact) => artifact.id);
check(new Set(ids).size === ids.length, "artifact IDs are unique");
for (const id of requiredIds) check(ids.includes(id), `required artifact registered: ${id}`);
check(metadata.publicationGate === "not_passed", "publication gate remains not passed");
check(metadata.artifacts.every((artifact) => artifact.approved === false), "no artifact self-approves publication");

for (const artifact of metadata.artifacts) {
  const sourcePath = safeRepoPath(artifact.source);
  const renderedPath = safeRepoPath(artifact.rendered);
  check(existsSync(sourcePath), `${artifact.id} source exists`);
  check(existsSync(renderedPath), `${artifact.id} SVG exists`);
  if (!existsSync(sourcePath) || !existsSync(renderedPath)) continue;

  const source = readFileSync(sourcePath, "utf8");
  const rendered = readFileSync(renderedPath);
  check(source.includes("@startuml") && source.includes("@enduml"), `${artifact.id} source is a complete PlantUML document`);
  check(source.includes(artifact.id), `${artifact.id} source carries artifact identity`);
  check(source.includes(`v${artifact.version}`), `${artifact.id} source carries controlled artifact version`);
  check(rendered.toString("utf8", 0, Math.min(rendered.length, 4096)).includes("<svg"), `${artifact.id} render is SVG`);

  const renderEntry = renderManifest.entries.find((entry) => entry.id === artifact.id);
  check(Boolean(renderEntry), `${artifact.id} render metadata exists`);
  if (renderEntry) {
    check(renderEntry.source === artifact.source && renderEntry.rendered === artifact.rendered, `${artifact.id} render paths match metadata`);
    check(renderEntry.sourceSha256 === sha256(Buffer.from(source)), `${artifact.id} source hash is current`);
    check(renderEntry.renderedSha256 === sha256(rendered), `${artifact.id} SVG hash is current`);
  }

  check(Array.isArray(artifact.implementationReferences) && artifact.implementationReferences.length > 0, `${artifact.id} has implementation references`);
  for (const reference of artifact.implementationReferences ?? []) {
    const referencePath = safeRepoPath(reference.path);
    check(existsSync(referencePath), `${artifact.id} code reference exists: ${reference.path}`);
    if (!existsSync(referencePath)) continue;
    const content = readFileSync(referencePath, "utf8");
    for (const symbol of reference.symbols ?? []) {
      check(content.includes(symbol), `${artifact.id} symbol mapped: ${reference.path}#${symbol}`);
    }
  }
}

check(renderManifest.entries.length === metadata.artifacts.length, "render manifest has one entry per artifact");
for (const documentPath of requiredMappingDocs) {
  const absolute = safeRepoPath(documentPath);
  check(existsSync(absolute), `mapping document exists: ${documentPath}`);
  if (existsSync(absolute)) {
    const content = readFileSync(absolute, "utf8");
    for (const id of requiredIds) check(content.includes(id), `${documentPath} references ${id}`);
    check(content.includes(metadata.requiredCaveat), `${documentPath} includes required caveat`);
  }
}

const report = {
  packageId: metadata.packageId,
  packageVersion: metadata.packageVersion,
  artifactCount: metadata.artifacts.length,
  assertionCount: checks.length,
  passedCount: checks.filter((item) => item.passed).length,
  failedCount: failures.length,
  publicationGate: metadata.publicationGate,
  renderer: renderManifest.renderer,
  checks
};

const evidenceDir = process.env.ARCHITECTURE_EVIDENCE_DIR;
if (evidenceDir) {
  const outputPath = resolve(root, evidenceDir, "architecture-artifact-check.json");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (failures.length > 0) {
  console.error(`Architecture artifact gate failed (${failures.length}/${checks.length}).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Architecture artifact gate passed: ${report.passedCount}/${report.assertionCount} assertions across ${report.artifactCount} artifacts.`);
