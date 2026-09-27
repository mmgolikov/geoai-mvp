import { test, expect, type Page } from "@playwright/test";
import { sprint10Selection, sprint10PublicEvidenceReceipt, sprint10AnalysisResponse } from "./helpers/sprint10-analysis-fixture";
import { installLoopbackBrowserHarness } from "./helpers/local-webkit-csp";
import { parsePointObjectAiResponse, POINT_OBJECT_SESSION_KEYS } from "../../components/point-to-object/live-session";

// All responses and the source lease are local fixtures. No provider, Auth, or
// source request is allowed to leave this browser test.
type Kind = "absent" | "model_validated" | "deterministic_recovery";
const explanation = {
  en: "This answer uses source evidence because the model response could not be verified.",
  ru: "Этот ответ опирается на данные источников, поскольку ответ модели не удалось проверить."
};

async function prepare(page: Page, locale: "en" | "ru", baseURL: string) {
  await page.context().addCookies([{ name: "geoai_locale", value: locale, url: baseURL }]);
  const selection = { ...sprint10Selection, resolvedObject: { ...sprint10Selection.resolvedObject,
    evidenceReceipt: sprint10PublicEvidenceReceipt(sprint10Selection.resolvedObject.sourceFeatureId, locale) } };
  await page.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(value));
  }, { key: POINT_OBJECT_SESSION_KEYS.selection, value: selection });
  let kind: Kind = "absent", posts = 0;
  const unexpected: string[] = [];
  await page.route("**/api/auth/session", route => route.fulfill({ json: { isAuthenticated: false, user: null } }));
  await page.route("**/api/prototype/point-to-object/**", route => {
    unexpected.push(new URL(route.request().url()).pathname);
    return route.abort("blockedbyclient");
  });
  await page.route("**/api/prototype/point-to-object/ai", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { mode: "ready", challenge: "A".repeat(43) } });
    const { role, scenario, depth, goal, perspective, horizon, question, locale: requestLocale, evidenceReceipt } = route.request().postDataJSON();
    expect(requestLocale).toBe(locale);
    const response = sprint10AnalysisResponse({ role, scenario, depth, goal, perspective, horizon, question, locale: requestLocale },
      ++posts, evidenceReceipt.evidencePackHash, kind === "absent" ? "POINT_OBJECT_AI_PROMPT_V12_2026_09_21" : "POINT_OBJECT_AI_PROMPT_V14_2026_09_26");
    const output = question && kind !== "absent" ? { ...response, answerProvenance: kind === "model_validated"
      ? { kind, rejectionCode: null } : { kind, rejectionCode: "focused_answer_novel_number" } } : response;
    expect(parsePointObjectAiResponse(output)).not.toBeNull();
    return route.fulfill({ json: output });
  });
  return { setKind: (value: Kind) => { kind = value; }, posts: () => posts, unexpected };
}

test.beforeEach(async ({ page }, info) => installLoopbackBrowserHarness(page, info.project.use.browserName, info.project.use.baseURL));

const cases = (["en", "ru"] as const).flatMap(locale => [390, 834, 1440].map(width => ({ locale, width })));
for (const { locale, width } of cases) {
  test(`recovery origin is next to both answer locations and survives reopen ${locale} ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await prepare(page, locale, info.project.use.baseURL!);
    await page.goto("/prototype/point-to-object/analysis");
    await expect(page.getByTestId("ai-success")).toBeVisible();
    const note = page.getByTestId("answer-provenance-recovery");
    await expect(note).toHaveCount(0); // Legacy absence is unknown, not model-origin evidence.

    state.setKind("model_validated");
    await page.getByRole("button", { name: locale === "en" ? "Development screening" : "Девелопмент", exact: true }).click();
    await page.getByRole("button", { name: locale === "en" ? "Standard" : "Стандарт", exact: true }).click();
    await page.getByRole("button", { name: locale === "en" ? /^(Run focused analysis|Refresh analysis)$/ : /^(Запустить целевой анализ|Обновить анализ)$/ }).click();
    await expect.poll(state.posts).toBe(2);
    await expect(note).toHaveCount(0);

    state.setKind("deterministic_recovery");
    await page.getByRole("button", { name: locale === "en" ? "Development screening" : "Девелопмент", exact: true }).click();
    await page.getByRole("button", { name: locale === "en" ? /^(Run focused analysis|Refresh analysis)$/ : /^(Запустить целевой анализ|Обновить анализ)$/ }).click();
    await expect.poll(state.posts).toBe(3);
    await expect(note).toHaveCount(1);
    await expect(note).toHaveText(explanation[locale]);
    await expect(page.getByTestId("ai-success")).not.toContainText("focused_answer_novel_number");
    await expect(page.getByTestId("role-decision-cards").getByTestId("answer-provenance-recovery")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await note.scrollIntoViewIfNeeded();
    await expect(note).toBeInViewport();
    await page.getByTestId("ai-success").screenshot({ path: info.outputPath(`answer-provenance-preset-${locale}-${width}.png`) });
    const bytes = await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis);
    await page.reload();
    await expect(note).toHaveText(explanation[locale]);
    expect(await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis)).toBe(bytes);
    expect(state.posts()).toBe(3);

    // A draft change must not relabel or discard the displayed completed answer.
    await page.getByRole("button", { name: locale === "en" ? "Deep" : "Глубоко", exact: true }).click();
    await expect(note).toHaveText(explanation[locale]);
    expect(state.posts()).toBe(3);

    state.setKind("model_validated");
    await page.locator("#analysis-follow-up").fill(locale === "en" ? "Which mapped features matter?" : "Какие объекты на карте важны?");
    await page.getByRole("button", { name: locale === "en" ? /^(Run focused analysis|Refresh analysis)$/ : /^(Запустить целевой анализ|Обновить анализ)$/ }).click();
    await expect.poll(state.posts).toBe(4);
    await expect(page.getByTestId("dashboard-question-result")).toBeVisible();
    await expect(note).toHaveCount(0);

    state.setKind("deterministic_recovery");
    await page.locator("#analysis-follow-up").fill(locale === "en" ? "Which mapped features support the screen?" : "Какие объекты на карте подтверждают предварительный вывод?");
    await page.getByRole("button", { name: locale === "en" ? /^(Run focused analysis|Refresh analysis)$/ : /^(Запустить целевой анализ|Обновить анализ)$/ }).click();
    await expect.poll(state.posts).toBe(5);
    await expect(page.getByTestId("dashboard-question-result").getByTestId("answer-provenance-recovery")).toHaveText(explanation[locale]);
    await expect(note).toHaveCount(1);
    const customBytes = await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis);
    await page.reload();
    await expect(page.getByTestId("dashboard-question-result").getByTestId("answer-provenance-recovery")).toHaveText(explanation[locale]);
    expect(await page.evaluate(key => sessionStorage.getItem(key), POINT_OBJECT_SESSION_KEYS.analysis)).toBe(customBytes);
    expect(state.posts()).toBe(5);
    expect(state.unexpected).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await note.scrollIntoViewIfNeeded();
    await expect(note).toBeInViewport();
    await page.getByTestId("ai-success").screenshot({ path: info.outputPath(`answer-provenance-ui-${locale}-${width}.png`) });
  });
}
