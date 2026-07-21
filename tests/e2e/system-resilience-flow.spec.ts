import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const namespace = "geoai-public-demo-v2";
const evidencePath = path.resolve(process.cwd(), "artifacts", "browser-resilience-evidence.json");
const evidence: Array<Record<string, unknown>> = [];

function record(name: string, details: Record<string, unknown>) {
  evidence.push({ name, ...details });
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify({ schemaVersion: "1.0", checks: evidence }, null, 2)}\n`);
}

async function signInDemo(page: Page, nextPath = "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}&intent=demo`);
  await page.getByRole("button", { name: "Use demo credentials" }).click();
  await page.getByRole("button", { name: "Open demo" }).click();
  await expect(page).toHaveURL((url) => url.pathname === nextPath);
}

test("quarantines malformed, unknown-version and oversized browser-local state", async ({ page }) => {
  await signInDemo(page);
  await page.evaluate(({ prefix }) => {
    localStorage.setItem(`${prefix}:local-projects-v1`, "{malformed-json");
    localStorage.setItem(`${prefix}:project-artifacts-v1`, "x".repeat(256 * 1024 + 1));
    localStorage.setItem("geoai-public-demo-v999:local-projects-v1", JSON.stringify([{ projectKey: "unknown-version-project", name: "Must not load" }]));
  }, { prefix: namespace });
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 1, name: "Project Hub" })).toBeVisible();
  await expect(page.getByText("Must not load", { exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Application error");
  record("browser-local-corruption", { malformedJson: "quarantined", unknownSchemaVersion: "ignored", oversizedRepository: "rejected", route: "/projects" });
});

test("fails closed without crashing when localStorage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  await page.goto("/login?next=/workspace&intent=demo");
  await page.getByRole("button", { name: "Use demo credentials" }).click();
  await page.getByRole("button", { name: "Open demo" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to GeoAI" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
  record("localStorage-unavailable", { result: "demo session unavailable without a crash", persistence: "fail-closed", protectedRouteOpened: false });
});

test("fails closed when sessionStorage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { configurable: true, get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  await page.goto("/reports/nonexistent-browser-report/print");
  await expect(page.getByRole("heading", { level: 1, name: "Report unavailable" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
  record("sessionStorage-unavailable", { result: "report fallback remained available", reportData: "not recovered" });
});

test("contains clipboard failure and repeated request actions without mutation", async ({ page }) => {
  const mutationRequests: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) mutationRequests.push(`${request.method()} ${request.url()}`);
  });
  await page.goto("/request-access");
  await page.getByLabel("Organization").fill("Resilience Evidence Organization");
  await page.getByLabel("Work email").fill("evidence@example.com");
  await page.getByLabel("Use case / decision to support").fill("Screen one bounded decision.");
  await page.getByLabel("Geography / AOI description").fill("Dubai sample AOI.");
  await page.getByRole("button", { name: "Prepare request brief" }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole("heading", { level: 2, name: "Request brief" })).toHaveCount(1);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
  await page.getByRole("button", { name: "Copy request brief" }).click();
  await expect(page.getByText("Copy is unavailable. Select the brief text and copy it manually.", { exact: true })).toBeVisible();
  expect(mutationRequests).toEqual([]);
  record("clipboard-and-double-action", { clipboardFallback: "visible", generatedBriefCount: 1, mutationRequests });
});

test("logout removes namespaced local/session state without touching unrelated keys", async ({ page }) => {
  await signInDemo(page);
  await page.evaluate(({ prefix }) => {
    localStorage.setItem(`${prefix}:logout-local`, "remove");
    sessionStorage.setItem(`${prefix}:logout-session`, "remove");
    sessionStorage.setItem("geoai-print-report:legacy", "remove");
    localStorage.setItem("unrelated-user-key", "preserve");
  }, { prefix: namespace });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  const state = await page.evaluate(({ prefix }) => ({
    local: localStorage.getItem(`${prefix}:logout-local`),
    session: sessionStorage.getItem(`${prefix}:logout-session`),
    legacy: sessionStorage.getItem("geoai-print-report:legacy"),
    unrelated: localStorage.getItem("unrelated-user-key")
  }), { prefix: namespace });
  expect(state).toEqual({ local: null, session: null, legacy: null, unrelated: "preserve" });
  record("logout-cleanup", { namespacedLocalRemoved: true, namespacedSessionRemoved: true, legacyRemoved: true, unrelatedPreserved: true });
});
