import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const targetFiles = [
  "components/map-workspace-client.tsx",
  "components/report-map-preview.tsx"
];

function findFunctionBody(source, functionName) {
  const declaration = `function ${functionName}`;
  const declarationIndex = source.indexOf(declaration);
  if (declarationIndex === -1) return null;

  const openingBraceIndex = source.indexOf("{", declarationIndex);
  if (openingBraceIndex === -1) return null;

  let depth = 0;
  for (let index = openingBraceIndex; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openingBraceIndex + 1, index);
  }

  return null;
}

const failures = [];

for (const relativePath of targetFiles) {
  const absolutePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const schedulerBody = findFunctionBody(source, "createMapResizeScheduler");

  if (!schedulerBody) {
    failures.push(`${relativePath}: protected resize scheduler is missing`);
    continue;
  }

  const sourceWithoutScheduler = source.replace(schedulerBody, "");
  if (/\.resize\s*\(/u.test(sourceWithoutScheduler)) {
    failures.push(`${relativePath}: direct map.resize() exists outside the protected scheduler`);
  }

  const requiredSchedulerEvidence = [
    ["disposed lifecycle guard", /disposed\s*\|\|\s*getCurrentMap\(\)\s*!==\s*expectedMap/u],
    ["animation-frame cancellation", /cancelAnimationFrame/u],
    ["timeout cancellation", /clearTimeout/u],
    ["map identity-bound resize", /expectedMap\.resize\(\)/u]
  ];

  for (const [label, pattern] of requiredSchedulerEvidence) {
    if (!pattern.test(schedulerBody)) {
      failures.push(`${relativePath}: ${label} is missing from the protected scheduler`);
    }
  }

  if (!/resizeScheduler\?*\.dispose\(\)/u.test(source)) {
    failures.push(`${relativePath}: scheduler disposal is not wired into component cleanup`);
  }
}

if (failures.length > 0) {
  console.error("Map lifecycle regression check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Map lifecycle regression check passed for ${targetFiles.length} components.`);
