import fs from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const route = "/pilots/rosimushchestvo";
const expectedMainIds = [
  "DEMO-RF-MSK-001",
  "DEMO-RF-MSK-003",
  "DEMO-RF-MSK-006",
  "DEMO-RF-MSK-012",
  "DEMO-RF-MSK-021",
  "DEMO-RF-MSK-009",
  "DEMO-RF-MSK-018",
  "DEMO-RF-MSK-033"
];
const expectedCustomMatchIds = [
  "DEMO-RF-MSK-001",
  "DEMO-RF-MSK-006",
  "DEMO-RF-MSK-012",
  "DEMO-RF-MSK-021",
  "DEMO-RF-MSK-033"
];
const expectedCustomConfirmationIds = ["DEMO-RF-MSK-014", "DEMO-RF-MSK-027"];
const queueKey = "geoai:rosimushchestvo-demo:v1:actions";
const evidenceDirectory = path.join(process.cwd(), "artifacts", "rosimushchestvo-pilot", "playwright");

async function ids(page: Page, selector: string, attribute: string) {
  return page.locator(selector).evaluateAll((elements, name) =>
    elements.map((element) => element.getAttribute(name)).filter((value): value is string => Boolean(value)), attribute);
}

async function expectNoSeriousOrCriticalAxe(page: Page, label: string) {
  const analysis = await new AxeBuilder({ page })
    .include('[data-testid="rosim-pilot-root"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const findings = analysis.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(findings, `${label}: serious/critical Axe findings`).toEqual([]);
}

test.describe.configure({ mode: "serial" });

test("@p0 direct load, deterministic main/custom results and runtime boundary", async ({ page }) => {
  const restrictedRequests: string[] = [];
  const inheritedSupabaseRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/supabase\.(?:co|com)$/i.test(url.hostname)) inheritedSupabaseRequests.push(request.url());
    if (
      url.pathname.startsWith("/api/") ||
      /(?:nspd|yandex|geoanalytics|torgi|megafon|mts|beeline|tele2|t2\.ru)/i.test(url.hostname)
    ) restrictedRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(route);
  await expect(page.locator('[data-testid="rosim-pilot-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="persistent-disclaimer"]')).toContainText("Гипотеза предварительного анализа");
  await expect(page.locator('[data-testid="persistent-disclaimer"]')).toContainText("Не является юридическим");
  await page.reload();
  await expect(page.locator('[data-testid="rosim-pilot-root"]')).toBeVisible();

  await page.locator('[data-testid="main-query-button"]').click();
  await expect(page.locator('[data-testid="main-query-results"]')).toBeVisible();
  await expect.poll(() => ids(page, "[data-main-result-id]", "data-main-result-id")).toEqual(expectedMainIds);

  await page.locator('[data-testid="custom-query-submit"]').click();
  await expect.poll(() => ids(page, "[data-custom-match-id]", "data-custom-match-id")).toEqual(expectedCustomMatchIds);
  await expect.poll(() => ids(page, "[data-custom-confirmation-id]", "data-custom-confirmation-id")).toEqual(expectedCustomConfirmationIds);
  await expect(page.locator('[data-testid="custom-query-form"]')).toContainText("Показывать отдельно как требующие проверки");

  expect(restrictedRequests).toEqual([]);
  await fs.mkdir(evidenceDirectory, { recursive: true });
  await fs.writeFile(path.join(evidenceDirectory, "network-boundary.json"), `${JSON.stringify({
    route,
    pilotInitiatedRestrictedOrApiRequests: restrictedRequests,
    inheritedPlatformSupabaseRequests: inheritedSupabaseRequests
  }, null, 2)}\n`);
});

test("@p0 validates custom ranges and exposes controlled empty state", async ({ page }) => {
  await page.goto(route);
  const minimumArea = page.getByLabel("Минимальная площадь, м²");
  await minimumArea.fill("-1");
  await page.locator('[data-testid="custom-query-submit"]').click();
  await expect(page.getByText(/Площадь не может быть отрицательной/)).toBeVisible();

  await page.goto(`${route}?demoState=zero-results`);
  await expect(page.getByText("По заданным условиям объекты не найдены", { exact: true })).toBeVisible();
  await expect(page.getByText("Тестовое демонстрационное состояние", { exact: true })).toBeVisible();
  await page.goto(`${route}?demoState=unknown-value`);
  await expect(page.getByText("Тестовое демонстрационное состояние", { exact: true })).toHaveCount(0);
});

test("@p0 renders golden, conflict, incomplete, critical, map and unknown-object states", async ({ page }) => {
  await page.goto(`${route}?object=DEMO-RF-MSK-001`);
  await expect(page.locator('[data-testid="asset-passport"]')).toContainText("DEMO-RF-MSK-001");
  await expect(page.locator('[data-testid="asset-passport"]')).toContainText("Синтетическая запись; не является сведением RFI или ЕГРН");
  await expect(page.locator("[data-axis-key]")).toHaveCount(7);
  await expect(page.getByText("100 — максимальная тяжесть или риск", { exact: true })).toHaveCount(2);

  await page.goto(`${route}?object=DEMO-RF-MSK-014`);
  await expect(page.locator('[data-testid="asset-passport"]')).toContainText("Обнаружено противоречие");
  await expect(page.locator('[data-testid="asset-passport"]')).toContainText("Конфликт не разрешён автоматически");

  await page.goto(`${route}?object=DEMO-RF-MSK-027`);
  await expect(page.locator('[data-testid="asset-passport"]')).toContainText("Недостаточно данных для подтверждённого сценария");
  await expect(page.locator('[data-testid="asset-passport"]')).toContainText("Нет подтверждённых данных");

  await page.goto(`${route}?object=DEMO-RF-MSK-035&demoState=critical`);
  await expect(page.locator('[data-testid="asset-passport"]')).toContainText(/критическ/i);
  await expect(page.locator('[data-testid="asset-passport"]')).not.toContainText("безусловная рекомендация");

  await page.goto(`${route}?demoState=map-error`);
  await expect(page.getByText("Не удалось отобразить карту. Список объектов остаётся доступен", { exact: true })).toBeVisible();
  await expect(page.locator('[data-testid="asset-list"]')).toBeVisible();

  await page.goto(`${route}?object=UNKNOWN`);
  await expect(page.getByText("Демонстрационный объект не найден", { exact: true })).toBeVisible();
});

test("@p0 preserves query order across demo roles and persists the local action queue", async ({ page }) => {
  await page.goto(route);
  await page.locator('[data-testid="main-query-button"]').click();
  const before = await ids(page, "[data-main-result-id]", "data-main-result-id");
  await page.locator('[data-testid="role-select"]').selectOption({ label: "Аналитик данных" });
  await expect(page.getByText(/не является механизмом разграничения доступа или RBAC/)).toBeVisible();
  await expect.poll(() => ids(page, "[data-main-result-id]", "data-main-result-id")).toEqual(before);

  await page.goto(`${route}?object=DEMO-RF-MSK-001`);
  await page.getByRole("button", { name: /Добавить.*в очередь/i }).click();
  await expect(page.locator('[data-testid="action-queue"]')).toContainText("DEMO-RF-MSK-001");
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]").length, queueKey)).toBe(1);
  await expect.poll(() => page.evaluate((key) => {
    const [stored] = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<Record<string, unknown>>;
    return Object.keys(stored ?? {}).sort();
  }, queueKey)).toEqual([
    "actionType",
    "demoAction",
    "dueInBusinessDays",
    "objectId",
    "ownerRole",
    "status"
  ]);
  await page.getByRole("button", { name: /Добавить.*в очередь/i }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]").length, queueKey)).toBe(1);
  await page.reload();
  await expect(page.locator('[data-testid="action-queue"]')).toContainText("DEMO-RF-MSK-001");
  await expect(page.locator('[data-testid="action-queue"]')).toContainText("Демонстрационная очередь");
});

test("@p0 propagates the custom scenario into passport and preserves queued actions", async ({ page }) => {
  await page.goto(route);
  await page.getByLabel("Сценарий").selectOption("non_use");
  await page.locator('[data-testid="custom-query-submit"]').click();
  await expect(page.locator('[data-testid="active-scenario"]')).toContainText("Признаки неиспользования");
  const firstMatch = page.locator("[data-custom-match-id]").first();
  await expect(firstMatch).toBeVisible();
  await firstMatch.click();
  await expect(page.locator('[data-testid="asset-passport"]')).toContainText("Признаки неиспользования");
  await page.getByRole("button", { name: /Добавить.*в очередь/i }).click();
  const queuedActionBefore = await page.locator('[data-testid="action-queue"] article').first().innerText();
  expect(queuedActionBefore).toMatch(/использован/i);

  await page.locator('[data-testid="main-query-button"]').click();
  await expect(page.locator('[data-testid="active-scenario"]')).toContainText("Предварительная проработка вовлечения");
  await expect(page.locator('[data-testid="action-queue"] article').first()).toHaveText(queuedActionBefore);
  await page.reload();
  await expect(page.locator('[data-testid="action-queue"] article').first()).toHaveText(queuedActionBefore);
});

test("@p1 enforces 2–4 comparison contract and keeps selection order", async ({ page }) => {
  await page.goto(route);
  await page.getByLabel("Минимальная площадь, м²").fill("2000");
  await page.locator('[data-testid="role-select"]').selectOption({ label: "Аналитик данных" });
  await page.locator('[data-testid="asset-list"] [data-asset-id="DEMO-RF-MSK-014"]').getByRole("button", { name: /Открыть паспорт/i }).click();
  const compareButton = page.locator('[data-testid="compare-button"]');
  await expect(compareButton).toBeDisabled();
  for (const id of ["DEMO-RF-MSK-001", "DEMO-RF-MSK-006"]) {
    await page.locator(`[data-testid="asset-list"] [data-asset-id="${id}"]`).getByRole("checkbox").check();
  }
  await expect(page.locator('[data-testid="compare-count"]')).toContainText("Выбрано 2 из 4");
  await expect(compareButton).toBeEnabled();
  await compareButton.click();
  await expect(page.locator('[data-testid="comparison-view"]')).toBeVisible();
  await expect.poll(() => ids(page, '[data-testid="comparison-view"] [data-asset-id]', "data-asset-id"))
    .toEqual(["DEMO-RF-MSK-001", "DEMO-RF-MSK-006"]);

  await page.locator('[data-testid="comparison-view"]').getByRole("button", { name: "Удалить DEMO-RF-MSK-001 из сравнения" }).click();
  await expect(page.locator('[data-testid="comparison-view"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="compare-count"]')).toContainText("Выбрано 1 из 4");
  await page.locator('[data-testid="asset-list"] [data-asset-id="DEMO-RF-MSK-001"]').getByRole("checkbox").check();
  await compareButton.click();
  await expect.poll(() => ids(page, '[data-testid="comparison-view"] [data-asset-id]', "data-asset-id"))
    .toEqual(["DEMO-RF-MSK-006", "DEMO-RF-MSK-001"]);

  await page.getByRole("button", { name: /Вернуться в портфель/i }).click();
  for (const id of ["DEMO-RF-MSK-012", "DEMO-RF-MSK-021"]) {
    await page.locator(`[data-testid="asset-list"] [data-asset-id="${id}"]`).getByRole("checkbox").check();
  }
  await expect(page.locator('[data-testid="compare-count"]')).toContainText("Выбрано 4 из 4");
  const fifth = page.locator('[data-testid="asset-list"] [data-asset-id="DEMO-RF-MSK-033"]').getByRole("checkbox");
  await expect(fifth).toBeDisabled();
  await expect(page.getByText("Можно сравнить не более 4 объектов", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Минимальная площадь, м²")).toHaveValue("2000");
  await expect(page.locator('[data-testid="role-select"]')).toHaveValue("Аналитик данных");
  await expect(page.locator('[data-testid="asset-list"] [data-asset-id="DEMO-RF-MSK-014"]')).toHaveAttribute("data-selected", "true");
});

test("@p1 exposes eight role views without resetting query state or canonical order", async ({ page }) => {
  await page.goto(route);
  const roleSelect = page.locator('[data-testid="role-select"]');
  await expect(roleSelect.locator("option")).toHaveCount(8);
  await page.locator('[data-testid="main-query-button"]').click();
  const canonicalOrder = await ids(page, "[data-main-result-id]", "data-main-result-id");
  await page.getByLabel("Минимальная площадь, м²").fill("2000");

  await roleSelect.selectOption({ label: "Территориальное управление" });
  await expect(page.getByLabel("Минимальная площадь, м²")).toHaveValue("2000");
  await expect(page.locator('[data-testid="block-map"]')).toHaveCSS("order", "1");
  await expect.poll(() => ids(page, "[data-main-result-id]", "data-main-result-id")).toEqual(canonicalOrder);

  await roleSelect.selectOption({ label: "Аналитик данных" });
  await expect(page.locator('[data-testid="block-evidence"]')).toHaveCSS("order", "1");
  await expect(page.getByLabel("Минимальная площадь, м²")).toHaveValue("2000");

  await roleSelect.selectOption({ label: "Эксперт по реализации / оценке" });
  await expect(page.locator('[data-testid="block-query"]')).toHaveCSS("order", "1");
  await expect(page.getByLabel("Минимальная площадь, м²")).toHaveValue("2000");
});

test("@p1 distinguishes four modelled and five future capability scenarios", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator('[data-testid="modelled-capabilities"] article')).toHaveCount(4);
  await expect(page.locator('[data-testid="future-capabilities"] article')).toHaveCount(5);
  await expect(page.locator('[data-testid="future-capabilities"] strong')).toHaveText([
    "Не моделируется в prototype v1",
    "Не моделируется в prototype v1",
    "Не моделируется в prototype v1",
    "Не моделируется в prototype v1",
    "Не моделируется в prototype v1"
  ]);
  await page.locator('[data-testid="custom-query-submit"]').click();
  await expect(page.locator('[data-testid="custom-matches"]')).toContainText("Следующий шаг");
});

test("@p1 exposes exactly ten honest source receipts", async ({ page }) => {
  await page.goto(`${route}?object=DEMO-RF-MSK-001`);
  await expect(page.locator('[data-testid="evidence-catalogue"] [data-source-id]')).toHaveCount(10);
  await expect(page.locator('[data-testid="evidence-catalogue"]')).toContainText("НСПД");
  await expect(page.locator('[data-testid="evidence-catalogue"]')).toContainText("Доступ к источнику требует подтверждения");
  await expect(page.locator('[data-testid="evidence-catalogue"]')).toContainText("Источник недоступен в этой версии прототипа");
  await expect(page.locator('[data-testid="evidence-catalogue"]')).toContainText("Возможный источник будущего подключения; в prototype v1 не подключён");
});

test("@p0 has no serious/critical Axe findings or horizontal overflow at required viewports", async ({ browser }) => {
  await fs.mkdir(evidenceDirectory, { recursive: true });
  for (const viewport of [
    { name: "desktop-1440", width: 1440, height: 900 },
    { name: "desktop-1280", width: 1280, height: 720 },
    { name: "tablet-1024", width: 1024, height: 768 },
    { name: "mobile-390", width: 390, height: 844 }
  ]) {
    const context = await browser.newContext({ viewport, colorScheme: "light", reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${route}?object=DEMO-RF-MSK-001`);
    await expect(page.locator('[data-testid="rosim-pilot-root"]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await expectNoSeriousOrCriticalAxe(page, viewport.name);
    if (viewport.width >= 1024) {
      await page.screenshot({
        path: path.join(evidenceDirectory, `${viewport.name}.png`),
        fullPage: true,
        animations: "disabled"
      });
    }
    await context.close();
  }
});
