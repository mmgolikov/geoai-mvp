import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const metadataPath = resolve(root, "docs/artifacts/architecture-artifact-manifest.json");
const renderManifestPath = resolve(root, "docs/artifacts/rendered/render-manifest.json");
const jarPath = resolve(process.env.PLANTUML_JAR ?? "/tmp/plantuml-1.2025.4.jar");
const rendererVersion = "PlantUML 1.2025.4";
const expectedJarSha256 = "26518e14a3a04100cd76c0d96cab2d1171f36152215edd9790a28d20268200c1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

if (!existsSync(jarPath)) {
  throw new Error(`PlantUML jar not found at ${jarPath}. Set PLANTUML_JAR to the pinned ${rendererVersion} jar.`);
}

const jarSha256 = sha256(readFileSync(jarPath));
if (jarSha256 !== expectedJarSha256) {
  throw new Error(`PlantUML jar digest mismatch: expected ${expectedJarSha256}, received ${jarSha256}.`);
}

const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
const entries = [];

for (const artifact of metadata.artifacts) {
  const sourcePath = resolve(root, artifact.source);
  const renderedPath = resolve(root, artifact.rendered);
  const source = readFileSync(sourcePath, "utf8");
  const result = spawnSync(
    "java",
    ["-Djava.awt.headless=true", "-jar", jarPath, "-charset", "UTF-8", "-tsvg", "-pipe"],
    { input: source, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );

  if (result.status !== 0 || !result.stdout.includes("<svg")) {
    throw new Error(`Rendering ${artifact.id} failed. ${result.stderr || result.stdout}`);
  }

  mkdirSync(dirname(renderedPath), { recursive: true });
  writeFileSync(renderedPath, result.stdout);
  entries.push({
    id: artifact.id,
    source: artifact.source,
    rendered: artifact.rendered,
    sourceSha256: sha256(Buffer.from(source)),
    renderedSha256: sha256(Buffer.from(result.stdout))
  });
}

const renderManifest = {
  schemaVersion: "1.0",
  packageId: metadata.packageId,
  renderer: rendererVersion,
  rendererJarSha256: jarSha256,
  entries
};

writeFileSync(renderManifestPath, `${JSON.stringify(renderManifest, null, 2)}\n`);
console.log(`Rendered ${entries.length} architecture artifacts with ${rendererVersion}.`);
