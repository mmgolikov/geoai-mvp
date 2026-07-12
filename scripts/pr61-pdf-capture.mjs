import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const { chromium } = await import(process.env.GEOAI_PLAYWRIGHT_MODULE ?? "playwright");
const baseUrl = process.env.GEOAI_PDF_BASE_URL ?? "http://127.0.0.1:3034";
const outputDir = path.resolve(process.env.GEOAI_PDF_OUTPUT_DIR ?? "artifacts/pr61-pdf-evidence");
const testedSha = process.env.GEOAI_TESTED_SHA ?? process.env.GITHUB_SHA ?? "local-working-tree";
const previewUrl = process.env.GEOAI_PREVIEW_URL ?? "not-provided";
const previewDeploymentId = process.env.GEOAI_PREVIEW_DEPLOYMENT_ID ?? "not-provided";
const requiredCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const consoleEntries = [];

await mkdir(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`PDF gate assertion failed: ${message}`);
}

async function captureReport(browser, name, route, requireMap) {
  const response = await fetch(`${baseUrl}${route}`);
  const responseBody = await response.text();
  assert(response.status === 200, `${route} returned HTTP ${response.status}`);
  assert(!responseBody.includes("Define measurable criteria for"), `${route} contains the superseded truncated action`);

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("console", (message) => consoleEntries.push({ scope: name, type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => consoleEntries.push({ scope: name, type: "pageerror", text: error.stack ?? error.message }));
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.locator(".geoai-print-report").waitFor({ state: "visible", timeout: 15000 });

  const bodyText = await page.locator("body").innerText();
  assert(bodyText.includes(requiredCaveat), `${name} report is missing the required caveat`);
  if (name === "analysis") {
    assert(bodyText.includes("Define screening criteria"), "analysis report is missing the corrected action label");
    assert(!bodyText.includes("Define measurable criteria for"), "analysis report still shows the truncated action label");
  }
  if (requireMap) {
    const map = page.locator('[data-map-snapshot="captured"] img');
    await map.waitFor({ state: "visible", timeout: 15000 });
    const mapMetrics = await map.evaluate((image) => ({
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      alt: image.getAttribute("alt") ?? ""
    }));
    assert(mapMetrics.naturalWidth > 0 && mapMetrics.naturalHeight > 0, "captured Marina map did not load before PDF generation");
    await writeFile(path.join(outputDir, "analysis-map-browser-metrics.json"), `${JSON.stringify(mapMetrics, null, 2)}\n`);
  }

  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: path.join(outputDir, `${name}-report.pdf`),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: "0", right: "0", bottom: "0", left: "0" }
  });
  await writeFile(path.join(outputDir, `${name}-report-browser.html`), await page.content());
  await page.close();
  return { name, route, status: response.status, responseBytes: Buffer.byteLength(responseBody) };
}

const browser = await chromium.launch({ headless: true });
try {
  const reports = [
    await captureReport(browser, "analysis", "/reports/seeded-analysis-dubai-marina-report/print", true),
    await captureReport(browser, "comparison", "/reports/seeded-comparison-dubai-shortlist-report/print", false)
  ];
  const errors = consoleEntries.filter((entry) => entry.type === "error" || entry.type === "pageerror");
  assert(errors.length === 0, `browser console contains ${errors.length} error(s)`);
  await writeFile(path.join(outputDir, "browser-console.log"), consoleEntries.map((entry) => `[${entry.scope}] ${entry.type}: ${entry.text}`).join("\n") + "\n");
  await writeFile(path.join(outputDir, "capture-metadata.json"), `${JSON.stringify({
    testedSha,
    previewUrl,
    previewDeploymentId,
    generatedAt: new Date().toISOString(),
    reports,
    caveat: requiredCaveat
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
