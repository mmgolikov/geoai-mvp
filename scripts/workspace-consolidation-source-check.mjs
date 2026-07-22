import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const artifactPath = path.join(root, "artifacts", "workspace-consolidation-source-check.json");

async function read(relativePath) {
  return fs.readFile(path.join(root, relativePath), "utf8");
}

async function collectSourceFiles(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(relativePath));
      continue;
    }
    if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) files.push(relativePath);
  }

  return files;
}

const [landing, navigation, workspace, analysisPanel, exploreCompatibility] = await Promise.all([
  read("app/page.tsx"),
  read("components/product-navigation.tsx"),
  read("components/workspace-shell.tsx"),
  read("components/analysis-panel.tsx"),
  read("app/explore/page.tsx")
]);

const failures = [];
const findings = [];

function requireCondition(condition, message) {
  findings.push({ message, passed: Boolean(condition) });
  if (!condition) failures.push(message);
}

requireCondition(
  navigation.includes('{ href: "/workspace", label: "Workspace"') &&
    navigation.includes('{ href: "/projects", label: "Projects"'),
  "Product navigation must expose Workspace and Projects."
);
requireCondition(
  !navigation.includes('href: "/explore"') && !navigation.includes('label: "Explore"'),
  "Explore must not exist as a canonical Product navigation destination."
);
requireCondition(
  landing.includes("Open workspace") && !landing.includes("Explore platform"),
  "Landing must use the canonical Open workspace CTA and must not advertise Explore as a separate Product."
);
requireCondition(
  exploreCompatibility.includes('redirect("/workspace")'),
  "The legacy /explore entry must forward to canonical Workspace."
);
requireCondition(
  !exploreCompatibility.includes("WorkspaceShell") &&
    !exploreCompatibility.includes("AuthenticatedRouteGate") &&
    !exploreCompatibility.includes("ProductNavigation"),
  "The legacy /explore entry must not render a duplicate Product or authentication shell."
);
requireCondition(
  workspace.includes('workspaceHeading="Workspace location screening"'),
  "Workspace must use one canonical public heading in every interaction state."
);
requireCondition(
  analysisPanel.includes('const canonicalInteractionModeOrder: InteractionMode[] = ["criteria_first", "map_first"];') &&
    analysisPanel.includes("getExploreModeLabel") &&
    analysisPanel.includes("onExploreInteractionModeChange"),
  "Map-first and Criteria-first must remain registered and selectable inside the Workspace command panel."
);
requireCondition(
  workspace.includes("Compare Candidates") && workspace.includes("Find redevelopment zones"),
  "Candidate search and comparison must remain inside Workspace."
);

const activeSourceFiles = [
  ...await collectSourceFiles("app"),
  ...await collectSourceFiles("components")
].filter((relativePath) => relativePath !== "app/explore/page.tsx");

const forbiddenRoutePatterns = [
  /href\s*=\s*["']\/explore(?:[?"'])/,
  /href\s*:\s*["']\/explore(?:[?"'])/,
  /(?:router\.(?:push|replace)|window\.location\.(?:assign|replace))\s*\(\s*["']\/explore(?:[?"'])/,
  /<Link[^>]+href=["']\/explore(?:[?"'])/
];
const forbiddenPublicLabels = [
  "Explore platform",
  "Explore candidate locations"
];
const activeViolations = [];

for (const relativePath of activeSourceFiles) {
  const source = await read(relativePath);
  for (const pattern of forbiddenRoutePatterns) {
    if (pattern.test(source)) activeViolations.push({ path: relativePath, violation: String(pattern) });
  }
  for (const label of forbiddenPublicLabels) {
    if (source.includes(label)) activeViolations.push({ path: relativePath, violation: label });
  }
}

requireCondition(
  activeViolations.length === 0,
  "No active application or component source may link to /explore or expose Explore as a separate Product label."
);

const evidence = {
  schemaVersion: "1.0",
  status: failures.length === 0 ? "pass" : "fail",
  canonicalProductRoute: "/workspace",
  canonicalProductDestinations: ["Workspace", "Projects"],
  compatibilityRoute: "/explore",
  compatibilityDestination: "/workspace",
  criteriaFirstPreserved: true,
  checkedFiles: activeSourceFiles.length + 5,
  findings,
  activeViolations,
  checkedAt: new Date().toISOString()
};

await fs.mkdir(path.dirname(artifactPath), { recursive: true });
await fs.writeFile(artifactPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error("Workspace consolidation source guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  for (const violation of activeViolations) console.error(`- ${violation.path}: ${violation.violation}`);
  process.exit(1);
}

console.log(`Workspace consolidation source guard passed across ${evidence.checkedFiles} source files.`);
