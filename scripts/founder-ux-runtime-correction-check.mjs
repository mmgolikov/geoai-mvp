import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const evidencePath = path.join(root, "artifacts", "founder-ux-runtime-correction-check.json");

async function read(relativePath) {
  return fs.readFile(path.join(root, relativePath), "utf8");
}

const [landing, panel, css, correctionCss, layout, packageJson] = await Promise.all([
  read("app/page.tsx"),
  read("components/analysis-panel.tsx"),
  read("app/runtime-design-recovery.css"),
  read("app/founder-ux-runtime-correction.css"),
  read("app/layout.tsx"),
  read("package.json").then(JSON.parse)
]);

const failures = [];
const findings = [];

function requireCondition(condition, message) {
  findings.push({ message, passed: Boolean(condition) });
  if (!condition) failures.push(message);
}

requireCondition(
  landing.includes('import { IdentitySymbol } from "@/components/design-system/identity-symbol";') &&
    !landing.includes("function BrandMark") &&
    !landing.includes("LandingHeroMap"),
  "Landing must use IdentitySymbol and must not use the approximate BrandMark or LandingHeroMap."
);

for (const asset of [
  "public/design/landing-geoai-cockpit-desktop-v18.png",
  "public/design/landing-geoai-cockpit-tablet-v18.png",
  "public/design/landing-geoai-cockpit-mobile-v18.png"
]) {
  const stat = await fs.stat(path.join(root, asset));
  requireCondition(stat.size > 150000, `${asset} must be a repository-owned Figma cockpit export.`);
}

requireCondition(
  landing.includes('data-figma-node="1495:53"') &&
    landing.includes("/design/landing-geoai-cockpit-desktop-v18.png") &&
    landing.includes("/design/landing-geoai-cockpit-tablet-v18.png") &&
    landing.includes("/design/landing-geoai-cockpit-mobile-v18.png"),
  "Landing cockpit must trace to Figma node 1495:53 and use responsive approved exports."
);
requireCondition(
  !landing.includes("Validation gap · official confirmation required"),
  "The commercial decision-flow card must not contain the rejected amber validation overlay."
);
requireCondition(
  panel.includes("data-workspace-screening-setup") &&
    panel.includes("data-scenario-primary-copy") &&
    panel.includes("data-scenario-summary-copy"),
  "Workspace must expose stable scenario-readability acceptance markers."
);
requireCondition(
  !panel.includes("Validation caveat") &&
    !panel.includes("exploreRequiredCaveat"),
  "Primary Workspace scenario context must not contain the caveat disclosure."
);
requireCondition(
  panel.includes('className="grid grid-cols-1 gap-2"') &&
    panel.includes("px-3 pr-10 text-[13px]"),
  "Role and Scenario must render as full-width, readable controls."
);
requireCondition(
  css.includes("--geoai-workspace-primary: #087f8c") &&
    css.includes("button.bg-brand:not(:disabled)") &&
    css.includes('[data-interaction-mode][aria-pressed="true"]'),
  "Workspace selected audience, active interaction mode and primary CTA must share one spatial-teal family."
);
requireCondition(
  layout.includes('import "./founder-ux-runtime-correction.css";') &&
    correctionCss.includes("button.bg-brand:not(:disabled)") &&
    correctionCss.includes('[data-interaction-mode][aria-pressed="true"]') &&
    correctionCss.includes("transition-property: opacity, box-shadow, transform !important;"),
  "Workspace selected primary controls must resolve immediately to exact spatial teal without transient blue/grey color interpolation."
);
requireCondition(
  packageJson.dependencies?.next === "15.5.21",
  "Next.js must resolve to patched Maintenance LTS version 15.5.21."
);

const evidence = {
  schemaVersion: "1.1",
  status: failures.length === 0 ? "pass" : "fail",
  figmaAuthorities: {
    landing: "1495:23",
    desktopCockpit: "1495:53",
    tabletCockpit: "1495:725",
    mobileCockpit: "1495:1144",
    criteriaDesktop: "1540:499",
    criteriaMobile: "1540:964"
  },
  findings,
  checkedAt: new Date().toISOString()
};

await fs.mkdir(path.dirname(evidencePath), { recursive: true });
await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error("Founder UX runtime correction source contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Founder UX runtime correction source contract passed.");
