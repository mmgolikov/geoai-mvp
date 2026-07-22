from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one occurrence, found {count}: {old!r}")
    write(path, source.replace(old, new, 1))


def replace_all(path: str, old: str, new: str, minimum: int = 1) -> None:
    source = read(path)
    count = source.count(old)
    if count < minimum:
        raise RuntimeError(f"{path}: expected at least {minimum} occurrences, found {count}: {old!r}")
    write(path, source.replace(old, new))


def regex_once(path: str, pattern: str, replacement: str, flags: int = 0) -> None:
    source = read(path)
    updated, count = re.subn(pattern, replacement, source, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{path}: regex expected one match, found {count}: {pattern}")
    write(path, updated)


def insert_before_once(path: str, marker: str, insertion: str) -> None:
    source = read(path)
    if source.count(marker) != 1:
        raise RuntimeError(f"{path}: insertion marker expected once: {marker!r}")
    write(path, source.replace(marker, insertion + marker, 1))


if 'redirect("/workspace")' in read("app/explore/page.tsx"):
    print("CR 10.08 is already applied; no source mutation required.")
    raise SystemExit(0)

# Canonical Product route and compatibility route.
write(
    "app/explore/page.tsx",
    '''import { redirect } from "next/navigation";

export default function ExploreCompatibilityPage() {
  redirect("/workspace");
}
''',
)

write(
    "app/workspace/page.tsx",
    '''import type { Metadata } from "next";
import { AuthenticatedRouteGate } from "@/components/auth/authenticated-route-gate";
import { TopNavigation } from "@/components/top-navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createSpatialSourceRequest } from "@/src/lib/spatial-b2/source-mode";

export const metadata: Metadata = {
  title: "GeoAI Workspace",
  description: "Map-first and criteria-first spatial decision intelligence workspace."
};

type WorkspacePageProps = {
  searchParams?: Promise<{
    spatialMode?: string;
  }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const params = await searchParams;
  const spatialSourceRequest = createSpatialSourceRequest({
    requestedSourceMode: params?.spatialMode,
    vercelEnvironment: process.env.VERCEL_ENV,
    nodeEnvironment: process.env.NODE_ENV
  });

  return (
    <AuthenticatedRouteGate>
      <main className="flex min-h-screen flex-col bg-surface">
        <TopNavigation />
        <WorkspaceShell spatialSourceRequest={spatialSourceRequest} />
      </main>
    </AuthenticatedRouteGate>
  );
}
''',
)

regex_once(
    "components/product-navigation.tsx",
    r"const productRoutes = \[.*?\] as const;",
    '''const productRoutes = [
  { href: "/workspace", label: "Workspace", description: "Screen, search and compare locations" },
  { href: "/projects", label: "Projects", description: "Open saved decision work" }
] as const;''',
    re.S,
)
replace_once("app/page.tsx", "Explore platform", "Open workspace")
replace_once(
    "components/workspace-shell.tsx",
    'workspaceHeading={initialExploreMode ? "Explore candidate locations" : "Workspace location screening"}',
    'workspaceHeading="Workspace location screening"',
)

# Shared-shell evidence now has two canonical Product destinations.
replace_once(
    "tests/e2e/design-foundation-shell.spec.ts",
    'activeLabel?: "Workspace" | "Projects" | "Explore"',
    'activeLabel?: "Workspace" | "Projects"',
)
replace_all(
    "tests/e2e/design-foundation-shell.spec.ts",
    '["Workspace", "Projects", "Explore"]',
    '["Workspace", "Projects"]',
    minimum=2,
)
regex_once(
    "tests/e2e/design-foundation-shell.spec.ts",
    r'\n\s*\{ href: "/explore", label: "Explore" as const \},',
    "",
)
replace_once(
    "tests/e2e/design-foundation-shell.spec.ts",
    "expect(evidence).toHaveLength(21);",
    "expect(evidence).toHaveLength(17);",
)
replace_once(
    "tests/e2e/design-foundation-shell.spec.ts",
    'test("proves the responsive Product System v3.2 shell without migrating route bodies"',
    'test("proves the responsive Product System v3.2 shell with the consolidated Product IA"',
)

# Criteria-first remains inside Workspace on mobile and in keyboard accessibility journeys.
replace_once(
    "tests/e2e/mobile-product-flow.spec.ts",
    'async function signInDemo(page: Page, nextPath: "/projects" | "/explore")',
    'async function signInDemo(page: Page, nextPath: "/projects" | "/workspace")',
)
replace_once(
    "tests/e2e/mobile-product-flow.spec.ts",
    'await captureVisualEvidence(page, "Mobile project hub", "mobile-project-hub.png", { fullPage: true });',
    'await captureVisualEvidence(page, "Mobile project hub", "mobile-project-hub.png", { candidateBaseline: true, fullPage: true });',
)
replace_once(
    "tests/e2e/mobile-product-flow.spec.ts",
    'await signInDemo(page, "/explore");',
    'await signInDemo(page, "/workspace");',
)
replace_once(
    "tests/e2e/mobile-product-flow.spec.ts",
    'await captureVisualEvidence(page, "Mobile explore setup", "mobile-explore-setup.png", { candidateBaseline: true });',
    'await captureVisualEvidence(page, "Mobile Workspace criteria-first setup", "mobile-workspace-criteria-setup.png", { candidateBaseline: true });',
)

replace_once(
    "tests/e2e/accessibility-project-comparison-flow.spec.ts",
    'async function signInDemoWithKeyboard(page: Page, nextPath: "/projects" | "/explore")',
    'async function signInDemoWithKeyboard(page: Page, nextPath: "/projects" | "/workspace")',
)
replace_once(
    "tests/e2e/accessibility-project-comparison-flow.spec.ts",
    'await signInDemoWithKeyboard(page, "/explore");',
    'await signInDemoWithKeyboard(page, "/workspace");',
)
replace_once(
    "tests/e2e/accessibility-project-comparison-flow.spec.ts",
    'await recordAccessibilityResult(page, "Explore setup");',
    'await recordAccessibilityResult(page, "Workspace criteria-first setup");',
)

# Auth journey verifies compatibility redirect rather than a third Product route.
regex_once(
    "tests/e2e/auth-session-flow.spec.ts",
    r'''    for \(const route of \["/projects", "/explore"\]\) \{\n      await page\.goto\(route\);\n      await expect\(page\)\.toHaveURL\(\(url\) => url\.pathname === route\);\n      await expectAuthenticatedProfileControl\(page\);\n    \}\n''',
    '''    await page.goto("/projects");
    await expect(page).toHaveURL((url) => url.pathname === "/projects");
    await expectAuthenticatedProfileControl(page);

    await page.goto("/explore");
    await expect(page).toHaveURL((url) => url.pathname === "/workspace");
    await expectAuthenticatedProfileControl(page);
''',
)

replace_once(
    "tests/e2e/route-body-invariance.spec.ts",
    '    "CR-10.07"\n  ]);',
    '    "CR-10.07",\n    "CR-10.08"\n  ]);',
)

write(
    "tests/e2e/workspace-consolidation.spec.ts",
    '''import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const evidencePath = path.join(process.cwd(), "artifacts", "workspace-consolidation.json");

async function signInDemo(page: Page) {
  await page.goto("/login?next=/workspace&intent=demo");
  const redirected = await page.waitForURL((url) => url.pathname === "/workspace", { timeout: 3000 }).then(() => true, () => false);
  if (!redirected) {
    await page.getByRole("button", { name: "Use demo credentials" }).click();
    await page.getByRole("button", { name: "Open demo" }).click();
  }
  await expect(page).toHaveURL((url) => url.pathname === "/workspace");
}

async function writeEvidence(payload: Record<string, unknown>) {
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  await fs.writeFile(evidencePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test("uses Workspace as the only visible Product destination and preserves criteria-first", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInDemo(page);

  const navigation = page.getByRole("navigation", { name: "Primary product navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Workspace", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("link", { name: "Projects", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Explore", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Workspace location screening" })).toBeVisible();

  const criteriaFirst = page.getByRole("button", { name: "Criteria-first" });
  await criteriaFirst.click();
  await expect(criteriaFirst).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Find redevelopment zones" }).click();
  const compareCandidates = page.getByRole("button", { name: "Compare Candidates" });
  await expect(compareCandidates).toBeEnabled();
  await compareCandidates.click();
  await expect(page.locator("section[data-dashboard-comparison-id]")).toBeVisible();

  await page.goto("/explore");
  await expect(page).toHaveURL((url) => url.pathname === "/workspace");
  await expect(page.getByRole("heading", { level: 1, name: "Workspace location screening" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "Open product navigation" });
  await trigger.click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile product navigation" });
  await expect(mobileNavigation.getByRole("link", { name: /Workspace/ })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: /Projects/ })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: /Explore/ })).toHaveCount(0);

  await writeEvidence({
    schemaVersion: "1.0",
    canonicalProductRoute: "/workspace",
    compatibilityRoute: "/explore",
    compatibilityDestination: "/workspace",
    visibleProductDestinations: ["Workspace", "Projects"],
    criteriaFirstPreserved: true,
    comparisonPreserved: true,
    checkedAt: new Date().toISOString()
  });
});
''',
)

# Focused E2E and Lighthouse commands.
package_path = "package.json"
package = json.loads(read(package_path))
e2e_command = package["scripts"]["test:e2e:auth-session"]
if "tests/e2e/workspace-consolidation.spec.ts" not in e2e_command:
    package["scripts"]["test:e2e:auth-session"] = e2e_command + " tests/e2e/workspace-consolidation.spec.ts"
package["scripts"]["test:lighthouse-budget"] = package["scripts"]["test:lighthouse-budget"].replace(
    "artifacts/lighthouse-desktop-explore.json",
    "artifacts/lighthouse-desktop-workspace-criteria.json",
)
write(package_path, json.dumps(package, indent=2, ensure_ascii=False) + "\n")

# Static browser-wiring contract follows the consolidated IA.
auth_contract_path = "scripts/auth-session-e2e-contract-check.mjs"
auth_contract = read(auth_contract_path)
auth_contract = auth_contract.replace(
    'const systemResilienceSpec = read("tests/e2e/system-resilience-flow.spec.ts");',
    'const systemResilienceSpec = read("tests/e2e/system-resilience-flow.spec.ts");\nconst workspaceConsolidationSpec = read("tests/e2e/workspace-consolidation.spec.ts");',
    1,
)
auth_contract = auth_contract.replace(
    'tests/e2e/route-body-invariance.spec.ts")',
    'tests/e2e/route-body-invariance.spec.ts tests/e2e/workspace-consolidation.spec.ts")',
    1,
)
auth_contract = auth_contract.replace(
    "artifacts/lighthouse-desktop-explore.json",
    "artifacts/lighthouse-desktop-workspace-criteria.json",
)
auth_contract = auth_contract.replace(
    'signInDemoWithKeyboard(page, "/explore")',
    'signInDemoWithKeyboard(page, "/workspace")',
)
auth_contract = auth_contract.replace(
    '"mobile-explore-setup.png"',
    '"mobile-workspace-criteria-setup.png"',
)
auth_contract = auth_contract.replace(
    '  \'href: "/explore"\',\n',
    "",
    1,
)
auth_contract = auth_contract.replace(
    '  \'name: "desktop-explore"\',',
    '  \'name: "desktop-workspace-criteria"\',',
)
workspace_contract_block = '''
for (const marker of [
  'canonicalProductRoute: "/workspace"',
  'compatibilityRoute: "/explore"',
  'name: "Criteria-first"',
  'name: "Compare Candidates"',
  'name: /Explore/'
]) requireText(workspaceConsolidationSpec, marker, `Workspace consolidation flow is missing ${marker}`);
if (!workspaceConsolidationSpec.includes("toHaveCount(0)")) failures.push("Workspace consolidation must assert that Explore is absent from visible navigation");
if (productNavigation.includes('href: "/explore"') || productNavigation.includes('label: "Explore"')) failures.push("Explore must not remain a visible Product navigation destination");

'''
insert_marker = 'for (const marker of [\n  "lighthouse-budget-summary.json",'
if workspace_contract_block not in auth_contract:
    if auth_contract.count(insert_marker) != 1:
        raise RuntimeError("auth-session E2E contract Lighthouse marker not found once")
    auth_contract = auth_contract.replace(insert_marker, workspace_contract_block + insert_marker, 1)
write(auth_contract_path, auth_contract)

# Product System navigation contract now has two canonical destinations.
replace_once(
    "scripts/design-foundation-contract-check.mjs",
    'for (const href of ["/workspace", "/projects", "/explore"]) expect(navigation.includes(`href: "${href}"`), `Missing ${href} navigation.`);',
    'for (const href of ["/workspace", "/projects"]) expect(navigation.includes(`href: "${href}"`), `Missing ${href} navigation.`);\nexpect(!navigation.includes(\'href: "/explore"\') && !navigation.includes(\'label: "Explore"\'), "Explore must not remain a canonical Product navigation destination.");',
)

# Lighthouse attributes the fourth profile to canonical Workspace.
replace_all(
    "scripts/lighthouse-budget-check.mjs",
    "artifacts/lighthouse-desktop-explore.json",
    "artifacts/lighthouse-desktop-workspace-criteria.json",
)
replace_once(
    "scripts/lighthouse-budget-check.mjs",
    '{ file: inputs[3], name: "desktop-explore", expectedPath: "/explore",',
    '{ file: inputs[3], name: "desktop-workspace-criteria", expectedPath: "/workspace",',
)

# Exact build route smoke preserves old links through a real redirect.
workflow_path = ".github/workflows/geoai-quality-gate.yml"
quality_workflow = read(workflow_path)
quality_workflow = quality_workflow.replace(
    "artifacts/lighthouse-desktop-explore.json",
    "artifacts/lighthouse-desktop-workspace-criteria.json",
)
quality_workflow = quality_workflow.replace(
    "npx lighthouse http://127.0.0.1:3000/explore \\",
    "npx lighthouse http://127.0.0.1:3000/workspace \\",
    1,
)
status_marker = '          expected_status["/demo"]="307"\n'
location_marker = '          expected_location["/demo"]="/workspace"\n'
if 'expected_status["/explore"]="307"' not in quality_workflow:
    if quality_workflow.count(status_marker) != 1:
        raise RuntimeError("Quality workflow demo status marker not found once")
    quality_workflow = quality_workflow.replace(
        status_marker,
        status_marker + '          expected_status["/explore"]="307"\n',
        1,
    )
if 'expected_location["/explore"]="/workspace"' not in quality_workflow:
    if quality_workflow.count(location_marker) != 1:
        raise RuntimeError("Quality workflow demo redirect marker not found once")
    quality_workflow = quality_workflow.replace(
        location_marker,
        location_marker + '          expected_location["/explore"]="/workspace"\n',
        1,
    )
write(workflow_path, quality_workflow)

# Documentation reflects the final canonical-route decision.
cr_path = "docs/WORKSPACE_CONSOLIDATION_CR_10_08_2026_07_23.md"
cr = read(cr_path)
cr = cr.replace("`/workspace?mode=explore`", "`/workspace`")
cr = cr.replace(
    "The screen heading remains `Workspace location screening` in both default and criteria-first entry states.",
    "The screen heading remains `Workspace location screening`; Criteria-first is selected inside the same route.",
)
cr = cr.replace(
    "`/workspace` opens Workspace with criteria-first setup available and the heading",
    "Criteria-first can be selected directly inside `/workspace`, with the heading",
)
cr = re.sub(
    r"\| `/workspace` \| Canonical Workspace state \| Criteria-first initial setup inside Workspace \|\n",
    "",
    cr,
)
cr = cr.replace(
    "| `/explore` | Compatibility-only | Forward legacy links to canonical Workspace state |",
    "| `/explore` | Compatibility-only | Forward legacy links to `/workspace` |",
)
write(cr_path, cr)

program_path = "docs/RUNTIME_DESIGN_RECOVERY_PROGRAM_2026_07_22.json"
program = json.loads(read(program_path))
for item in program["changeRequests"]:
    if item["id"] == "CR-10.04":
        item["affectedRoutes"] = ["/workspace", "/explore compatibility entry"]
    if item["id"] == "CR-10.08":
        item["affectedRoutes"] = ["/", "/workspace", "/projects", "/explore compatibility entry"]
        item["acceptance"] = [
            "No visible Explore Product navigation item exists on desktop, tablet or mobile.",
            "Landing contains no Explore platform CTA.",
            "Workspace is the only visible operating surface for map-first and criteria-first workflows.",
            "Criteria-first candidate search, comparison, dashboard and export work from /workspace.",
            "/explore is compatibility-only and forwards users to /workspace.",
            "Workspace heading remains Workspace location screening in all interaction states.",
            "Shared-shell accessibility, target-size, focus and overflow checks remain green."
        ]
write(program_path, json.dumps(program, indent=2, ensure_ascii=False) + "\n")

# Active-runtime assertions before CI verification.
product_navigation = read("components/product-navigation.tsx")
if 'href: "/explore"' in product_navigation or 'label: "Explore"' in product_navigation:
    raise RuntimeError("Explore still exists in ProductNavigation")
if "Explore platform" in read("app/page.tsx"):
    raise RuntimeError("Landing still contains Explore platform")
if "WorkspaceShell" in read("app/explore/page.tsx"):
    raise RuntimeError("/explore still renders duplicate WorkspaceShell")
if 'redirect("/workspace")' not in read("app/explore/page.tsx"):
    raise RuntimeError("/explore compatibility redirect is missing")
if 'workspaceHeading="Workspace location screening"' not in read("components/workspace-shell.tsx"):
    raise RuntimeError("Workspace heading was not normalized")
if "tests/e2e/workspace-consolidation.spec.ts" not in package["scripts"]["test:e2e:auth-session"]:
    raise RuntimeError("Workspace consolidation E2E is not wired into the Quality Gate")

print("CR 10.08 bounded source patch applied successfully.")
