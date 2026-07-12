import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const { chromium } = await import(process.env.GEOAI_PLAYWRIGHT_MODULE ?? "playwright");

const baseUrl = process.env.GEOAI_EVIDENCE_BASE_URL ?? "http://127.0.0.1:3034";
const previewUrl = (process.env.GEOAI_PREVIEW_URL ?? "").replace(/\/$/, "");
const previewDeploymentId = process.env.GEOAI_PREVIEW_DEPLOYMENT_ID ?? "not-provided";
const evidenceDir = path.resolve(process.env.GEOAI_EVIDENCE_DIR ?? "artifacts/pr61-browser-evidence");
const testedSha = process.env.GEOAI_TESTED_SHA ?? process.env.GITHUB_SHA ?? "local-working-tree";
const requiredCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const browserConsole = [];

await mkdir(evidenceDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`P0 assertion failed: ${message}`);
}

async function saveJson(name, value) {
  await writeFile(path.join(evidenceDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function listen(page, scope) {
  page.on("console", (message) => browserConsole.push({ scope, type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => browserConsole.push({ scope, type: "pageerror", text: error.stack ?? error.message }));
}

async function routeStatus(url) {
  const response = await fetch(url, { redirect: "follow" });
  const body = await response.text();
  return { url, status: response.status, bytes: Buffer.byteLength(body), body };
}

function reportField(page, field) {
  return page.locator(`[data-report-field="${field}"]`).first().evaluate((node) => {
    const value = node.querySelector("strong")?.textContent ?? node.textContent ?? "";
    return value.trim();
  });
}

function reportList(page, title) {
  return page.locator(`[data-report-section="${title}"] li`).allTextContents().then((items) => items.map((item) => item.trim()));
}

async function openSeedDashboard(browser, viewport) {
  const page = await browser.newPage({ viewport });
  listen(page, `dashboard-${viewport.width}x${viewport.height}`);
  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
  const seededLink = page.locator('a[href*="openAnalysis=seeded-analysis-dubai-marina"]').first();
  await seededLink.waitFor({ state: "visible", timeout: 15000 });
  await seededLink.click();
  await page.locator('[data-dashboard-analysis-id="seeded-analysis-dubai-marina"]').waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(1500);

  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom };
    };
    const root = document.querySelector('[data-dashboard-analysis-id="seeded-analysis-dubai-marina"]');
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? "";
    const list = (title) => Array.from(document.querySelectorAll(`[data-dashboard-list="${title}"] [data-dashboard-item-detail]`))
      .map((node) => node.textContent?.trim() ?? "");
    const evidence = document.querySelector("[data-dashboard-evidence-row]");
    const evidenceStyle = evidence ? getComputedStyle(evidence) : null;
    const decision = rect('[data-dashboard-card="decision-posture"]');
    const suitability = rect('[data-dashboard-card="suitability"]');
    const rationale = rect('[data-dashboard-control="full-rationale"]');
    const details = rect('[data-dashboard-control="details"]');
    return {
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      evidenceRow: {
        text: evidence?.textContent?.trim() ?? "",
        fullText: evidence?.getAttribute("aria-label") ?? "",
        rect: rect("[data-dashboard-evidence-row]"),
        lineHeight: evidenceStyle ? Number.parseFloat(evidenceStyle.lineHeight) : 0,
        lineCount: evidence && evidenceStyle ? Math.round(evidence.getBoundingClientRect().height / Number.parseFloat(evidenceStyle.lineHeight)) : 0,
        scrollWidth: evidence?.scrollWidth ?? 0,
        clientWidth: evidence?.clientWidth ?? 0
      },
      cards: { decision, suitability },
      controls: { rationale, details },
      unusedVerticalSpace: {
        decisionBottomGap: decision && rationale ? decision.bottom - rationale.bottom : null,
        suitabilityBottomGap: suitability && details ? suitability.bottom - details.bottom : null
      },
      values: {
        target: text('[data-dashboard-value="target"]'),
        scenario: text('[data-dashboard-value="scenario"]'),
        coordinates: `${Number(root?.getAttribute("data-dashboard-latitude")).toFixed(6)}, ${Number(root?.getAttribute("data-dashboard-longitude")).toFixed(6)}`,
        suitability: text('[data-dashboard-value="suitability"]'),
        decisionPosture: text('[data-dashboard-value="decision-posture"]'),
        confidence: text('[data-dashboard-value="confidence"]'),
        validation: text('[data-dashboard-value="validation"]'),
        rationale: text('[data-dashboard-value="rationale"]'),
        drivers: list("Top drivers"),
        risks: list("Top risks"),
        nextAction: text('[data-dashboard-value="next-action"]')
      }
    };
  });

  assert(metrics.horizontalOverflow === 0, `${viewport.width} dashboard has horizontal overflow`);
  assert(metrics.evidenceRow.lineCount === 1, `${viewport.width} dashboard evidence row is not one line`);
  assert(metrics.evidenceRow.fullText.toLowerCase().includes("official validation required"), `${viewport.width} full evidence caveat is unavailable`);
  assert(Math.abs(metrics.cards.decision.width - metrics.cards.suitability.width) <= 1, `${viewport.width} dashboard cards are not equal width`);
  assert(Math.abs(metrics.cards.decision.height - metrics.cards.suitability.height) <= 1, `${viewport.width} dashboard cards are not equal height`);
  assert(Math.abs(metrics.controls.rationale.y - metrics.controls.details.y) <= 1, `${viewport.width} dashboard controls are not aligned`);
  assert(Math.abs(metrics.controls.rationale.height - metrics.controls.details.height) <= 1, `${viewport.width} dashboard controls differ in height`);
  await page.screenshot({ path: path.join(evidenceDir, `dashboard-${viewport.width}x${viewport.height}.png`), fullPage: false });
  await page.close();
  return metrics;
}

async function inspectProjectHub(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  listen(page, "project-hub");
  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Data Readiness / Source Lineage" }).waitFor({ state: "attached", timeout: 15000 });
  const result = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h1,h2,h3")).map((node, index) => ({
      index,
      level: node.tagName,
      text: node.textContent?.trim() ?? ""
    }));
    const readiness = headings.filter((item) => item.text === "Data Readiness / Source Lineage");
    const requiredBefore = [
      "Recent analyses",
      "Saved candidates / AOIs",
      "Comparisons",
      "Reports",
      "Project files / evidence",
      "Project Activity / Recent Analyses",
      "Reports / Memos",
      "Enterprise Report Packages",
      "Comparison Shortlist",
      "Recommended Next Actions"
    ];
    return {
      headingCount: readiness.length,
      readinessIndex: readiness[0]?.index ?? -1,
      lastSubstantiveHeading: headings.at(-1)?.text ?? null,
      headings,
      requiredOrder: requiredBefore.map((text) => {
        const index = headings.find((item) => item.text === text)?.index ?? -1;
        return { text, index, beforeReadiness: index >= 0 && index < (readiness[0]?.index ?? -1) };
      }),
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  assert(result.headingCount === 1, "Project Hub must contain exactly one Data Readiness heading");
  assert(result.lastSubstantiveHeading === "Data Readiness / Source Lineage", "Data Readiness is not the final substantive Project Hub section");
  assert(result.requiredOrder.every((item) => item.beforeReadiness), "Data Readiness precedes one or more project-work sections");
  assert(result.horizontalOverflow === 0, "Project Hub has horizontal overflow");
  await page.screenshot({ path: path.join(evidenceDir, "project-hub-full-page.png"), fullPage: true });
  await page.close();
  return result;
}

async function inspectReport(browser, id, type) {
  const route = `/reports/${id}/print`;
  const status = await routeStatus(`${baseUrl}${route}`);
  assert(status.status === 200, `${type} report returned ${status.status}`);
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  listen(page, `${type}-report`);
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const pages = page.locator(".geoai-print-page");
  const pageCount = await pages.count();
  assert(pageCount > 0, `${type} report has no print pages`);
  for (let index = 0; index < pageCount; index += 1) {
    await pages.nth(index).screenshot({ path: path.join(evidenceDir, `${type}-report-page-${index + 1}.png`), animations: "disabled" });
  }
  await writeFile(path.join(evidenceDir, `${type}-report.html`), await page.content());
  const bodyText = await page.locator("body").innerText();
  assert(!/(^|\n)Selected site($|\n)/m.test(bodyText), `${type} report contains generic Selected site`);
  assert(!/(^|\n)analysis($|\n)/m.test(bodyText), `${type} report contains generic analysis scenario`);

  if (type === "analysis") {
    const values = {
      target: await reportField(page, "target"),
      scenario: await reportField(page, "scenario"),
      coordinates: await reportField(page, "coordinates"),
      suitability: await reportField(page, "suitability"),
      decisionPosture: await reportField(page, "decision-posture"),
      confidence: await reportField(page, "confidence"),
      validation: await reportField(page, "validation"),
      rationale: await reportField(page, "rationale"),
      drivers: await reportList(page, "Key Findings"),
      risks: await reportList(page, "Risk & Constraints"),
      opportunities: await reportList(page, "Opportunities"),
      nextAction: await reportField(page, "next-action")
    };
    const snapshot = await page.locator('[data-map-snapshot="captured"] img').evaluate((image) => ({
      src: image.getAttribute("src"),
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      renderedWidth: image.getBoundingClientRect().width,
      renderedHeight: image.getBoundingClientRect().height
    }));
    assert(/^\d+\/100$/.test(values.suitability), "analysis suitability is not numeric");
    assert(/^-?\d+\.\d{6}, -?\d+\.\d{6}$/.test(values.coordinates), "analysis coordinates are unavailable");
    assert(values.drivers.length > 0, "analysis findings are empty");
    assert(values.risks.length > 0, "analysis risks are empty");
    assert(values.opportunities.length > 0, "analysis opportunities are empty");
    assert(snapshot.naturalWidth > 0 && snapshot.naturalHeight > 0, "captured analysis map is not rendered");
    assert(!bodyText.includes("Map Context Fallback"), "seeded analysis report uses fallback map context");
    await page.close();
    return { route, status: status.status, bytes: status.bytes, pageCount, values, mapSnapshot: snapshot };
  }

  assert((await reportList(page, "Differentiated Risks")).length > 0, "comparison risks are empty");
  assert((await reportList(page, "Key Trade-offs")).length > 0, "comparison trade-offs are empty");
  await page.close();
  return { route, status: status.status, bytes: status.bytes, pageCount };
}

async function inspectWorkspacePreservation(browser) {
  const results = [];
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 }
  ]) {
    const page = await browser.newPage({ viewport });
    listen(page, `workspace-${viewport.width}x${viewport.height}`);
    await page.goto(`${baseUrl}/workspace?guidedDemo=dubai-marina-investment`, { waitUntil: "domcontentloaded" });
    await page.locator("textarea").waitFor({ state: "visible", timeout: 10000 });
    const result = await page.evaluate(() => {
      const query = document.querySelector("textarea");
      const setup = Array.from(document.querySelectorAll("details")).find((node) => node.textContent?.includes("Scenario setup"));
      return {
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        customQueryVisible: Boolean(query && query.getBoundingClientRect().width > 0 && query.getBoundingClientRect().height > 0),
        setupInternalScroll: Boolean(setup && setup.scrollHeight > setup.clientHeight + 1),
        activeWorkflowCount: (document.body.innerText.match(/Active workflow/g) ?? []).length
      };
    });
    assert(result.horizontalOverflow === 0, `${viewport.width} workspace has horizontal overflow`);
    assert(result.customQueryVisible, `${viewport.width} Custom Query is not visible`);
    assert(!result.setupInternalScroll, `${viewport.width} Scenario setup has internal scroll`);
    assert(result.activeWorkflowCount === 0, `${viewport.width} Active workflow regression detected`);
    results.push({ viewport, ...result });
    await page.close();
  }
  return results;
}

async function inspectPreview(browser) {
  if (!previewUrl) return { skipped: true, reason: "Preview URL was not provided." };
  const routes = ["/", "/workspace", "/projects", "/api/health", "/reports/seeded-analysis-dubai-marina-report/print", "/reports/seeded-comparison-dubai-shortlist-report/print"];
  const results = [];
  for (const route of routes) {
    const result = await routeStatus(`${previewUrl}${route}`);
    results.push({ route, status: result.status, bytes: result.bytes });
    assert(result.status === 200, `Preview ${route} returned ${result.status}`);
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  listen(page, "vercel-preview");
  await page.goto(`${previewUrl}/reports/seeded-analysis-dubai-marina-report/print`, { waitUntil: "networkidle" });
  await page.locator('[data-map-snapshot="captured"] img').waitFor({ state: "visible", timeout: 15000 });
  await page.close();
  return { skipped: false, deploymentId: previewDeploymentId, url: previewUrl, routes: results };
}

const browser = await chromium.launch({ headless: true });
try {
  const dashboard1366 = await openSeedDashboard(browser, { width: 1366, height: 768 });
  const dashboard1440 = await openSeedDashboard(browser, { width: 1440, height: 900 });
  const projectHub = await inspectProjectHub(browser);
  const analysisReport = await inspectReport(browser, "seeded-analysis-dubai-marina-report", "analysis");
  const comparisonReport = await inspectReport(browser, "seeded-comparison-dubai-shortlist-report", "comparison");
  const workspace = await inspectWorkspacePreservation(browser);
  const preview = await inspectPreview(browser);

  const comparison = {
    dashboard: dashboard1440.values,
    report: analysisReport.values,
    matches: {
      target: dashboard1440.values.target === analysisReport.values.target,
      scenario: dashboard1440.values.scenario === analysisReport.values.scenario,
      coordinates: dashboard1440.values.coordinates === analysisReport.values.coordinates,
      suitability: `${dashboard1440.values.suitability}/100` === analysisReport.values.suitability,
      decisionPosture: dashboard1440.values.decisionPosture === analysisReport.values.decisionPosture,
      confidence: dashboard1440.values.confidence === analysisReport.values.confidence,
      validation: dashboard1440.values.validation === analysisReport.values.validation,
      rationale: dashboard1440.values.rationale === analysisReport.values.rationale,
      drivers: JSON.stringify(dashboard1440.values.drivers) === JSON.stringify(analysisReport.values.drivers),
      risks: JSON.stringify(dashboard1440.values.risks) === JSON.stringify(analysisReport.values.risks),
      nextAction: dashboard1440.values.nextAction === analysisReport.values.nextAction
    }
  };
  await saveJson("dashboard-report-exact-comparison.json", comparison);
  assert(Object.values(comparison.matches).every(Boolean), "seeded dashboard/report values do not match exactly");

  const errors = browserConsole.filter((item) => item.type === "error" || item.type === "pageerror");
  assert(errors.length === 0, `browser console contains ${errors.length} error(s)`);
  await saveJson("dashboard-1366x768-metrics.json", dashboard1366);
  await saveJson("dashboard-1440x900-metrics.json", dashboard1440);
  await saveJson("project-hub-dom-order.json", projectHub);
  await saveJson("analysis-report-result.json", analysisReport);
  await saveJson("comparison-report-result.json", comparisonReport);
  await saveJson("workspace-preservation.json", workspace);
  await saveJson("vercel-preview-smoke.json", preview);
  await saveJson("evidence-metadata.json", { testedSha, previewUrl, previewDeploymentId, generatedAt: new Date().toISOString(), caveat: requiredCaveat });
  await writeFile(path.join(evidenceDir, "browser-console.log"), browserConsole.map((item) => `[${item.scope}] ${item.type}: ${item.text}`).join("\n") + "\n");
  await writeFile(path.join(evidenceDir, "vercel-preview-error-fatal.log"), errors.length === 0
    ? `No browser error/fatal events observed during deployment-scoped Preview route smoke for ${previewDeploymentId} (${previewUrl}).\n`
    : `${JSON.stringify(errors, null, 2)}\n`);
  await writeFile(path.join(evidenceDir, "SUMMARY.md"), `# PR #61 Browser Evidence\n\n- Tested commit: \`${testedSha}\`\n- Preview deployment: \`${previewDeploymentId}\`\n- Preview URL: ${previewUrl || "not provided"}\n- Dashboard: 1366x768 and 1440x900 passed one-line header, equal-card and aligned-control assertions.\n- Project Hub: one Data Readiness heading; canonical section is last and follows all required project-work sections.\n- Analysis report: HTTP ${analysisReport.status}; ${analysisReport.pageCount} print pages; captured map ${analysisReport.mapSnapshot.naturalWidth}x${analysisReport.mapSnapshot.naturalHeight}; exact dashboard/report contract passed.\n- Comparison report: HTTP ${comparisonReport.status}; ${comparisonReport.pageCount} print pages.\n- Workspace responsive correction: preserved at five controlled viewports.\n- Browser console P0 errors: 0.\n\n${requiredCaveat}\n`);
} finally {
  await browser.close();
}
