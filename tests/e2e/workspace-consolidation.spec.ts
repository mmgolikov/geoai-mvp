import fs from "node:fs/promises";
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
  await fs.writeFile(evidencePath, `${JSON.stringify(payload, null, 2)}
`, "utf8");
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
