import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const { chromium } = await import(process.env.GEOAI_PLAYWRIGHT_MODULE ?? "playwright");
const baseUrl = process.env.GEOAI_PDF_BASE_URL ?? "http://127.0.0.1:3034";
const outputDir = path.resolve(process.env.GEOAI_PDF_OUTPUT_DIR ?? "artifacts/pr63-report-connector-pdf-evidence");
const testedSha = process.env.GEOAI_TESTED_SHA ?? process.env.GITHUB_SHA ?? "local-working-tree";
const previewUrl = process.env.GEOAI_PREVIEW_URL ?? "not-provided";
const previewDeploymentId = process.env.GEOAI_PREVIEW_DEPLOYMENT_ID ?? "not-provided";
const githubDeploymentId = process.env.GEOAI_GITHUB_DEPLOYMENT_ID ?? "not-provided";
const caveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const conservativeLabel = "manual import path available; no verified snapshot attached";
const oldLabel = "manual snapshot ready";
const verifiedLabel = "verified snapshot attached";
const consoleEntries = [];

await mkdir(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`PDF capture assertion failed: ${message}`);
}

function count(text, phrase) {
  return text.toLowerCase().split(phrase.toLowerCase()).length - 1;
}

async function captureReport(browser, config) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("console", (message) => consoleEntries.push({ scope: config.name, type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => consoleEntries.push({ scope: config.name, type: "pageerror", text: error.stack ?? error.message }));

  const response = await page.goto(`${baseUrl}${config.route}`, { waitUntil: "networkidle", timeout: 60000 });
  assert(response?.status() === 200, `${config.route} returned HTTP ${response?.status() ?? "no response"}`);
  await page.locator(".geoai-print-report").waitFor({ state: "visible", timeout: 15000 });

  const bodyText = await page.locator("body").innerText();
  const withoutConservativeLabel = bodyText.toLowerCase().split(conservativeLabel).join("");
  const wording = {
    oldLabelCount: count(bodyText, oldLabel),
    conservativeLabelCount: count(bodyText, conservativeLabel),
    verifiedLabelCount: count(withoutConservativeLabel, verifiedLabel)
  };
  assert(wording.oldLabelCount === 0, `${config.name} report contains the old connector label`);
  assert(wording.conservativeLabelCount === 2, `${config.name} report must contain the conservative label exactly twice`);
  assert(wording.verifiedLabelCount === 0, `${config.name} report claims a verified snapshot attachment`);
  assert(bodyText.toLowerCase().includes(caveat.toLowerCase()), `${config.name} report is missing the required caveat`);

  for (const value of config.requiredText) {
    assert(bodyText.toLowerCase().includes(value.toLowerCase()), `${config.name} report is missing retained text: ${value}`);
  }

  let mapMetrics;
  if (config.name === "analysis") {
    const map = page.locator('[data-map-snapshot="captured"] img');
    await map.waitFor({ state: "visible", timeout: 15000 });
    mapMetrics = await map.evaluate((image) => {
      const bounds = image.getBoundingClientRect();
      return {
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: bounds.width,
        renderedHeight: bounds.height,
        alt: image.getAttribute("alt") ?? ""
      };
    });
    assert(mapMetrics.naturalWidth === 382 && mapMetrics.naturalHeight === 358, "captured Marina map is not the accepted 382x358 image");
    assert(mapMetrics.renderedWidth > 0 && mapMetrics.renderedHeight > 0, "captured Marina map is not visibly rendered");
  } else {
    const map = page.locator(".geoai-print-map").first();
    await map.waitFor({ state: "visible", timeout: 15000 });
    mapMetrics = await map.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { width: bounds.width, height: bounds.height, display: style.display, visibility: style.visibility };
    });
    assert(mapMetrics.width > 0 && mapMetrics.height > 0, "comparison map has no visible dimensions");
    assert(mapMetrics.display !== "none" && mapMetrics.visibility !== "hidden", "comparison map is hidden");
  }

  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: path.join(outputDir, `${config.name}-report.pdf`),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: "0", right: "0", bottom: "0", left: "0" }
  });
  await writeFile(path.join(outputDir, `${config.name}-report-browser.html`), await page.content());
  await writeFile(path.join(outputDir, `${config.name}-report-visible-text.txt`), `${bodyText}\n`);
  await page.close();

  return { name: config.name, route: config.route, status: response.status(), wording, mapMetrics };
}

const browser = await chromium.launch({ headless: true });
let reports = [];
try {
  reports = [
    await captureReport(browser, {
      name: "analysis",
      route: "/reports/seeded-analysis-dubai-marina-report/print",
      requiredText: [
        "Dubai Marina / JBR Market Signal",
        "Investment site selection",
        "25.082200, 55.143100",
        "92/100",
        "Compare before advancing",
        "Medium",
        "Define screening criteria."
      ]
    }),
    await captureReport(browser, {
      name: "comparison",
      route: "/reports/seeded-comparison-dubai-shortlist-report/print",
      requiredText: [
        "Compared items",
        "Dubai South Growth Node",
        "Dubai Marina / JBR Market Signal",
        "Business Bay Infill Opportunity",
        "Score Comparison",
        "Comparison Map"
      ]
    })
  ];
  const errors = consoleEntries.filter((entry) => entry.type === "error" || entry.type === "pageerror");
  assert(errors.length === 0, `browser console contains ${errors.length} error(s)`);
} finally {
  await browser.close();
  await writeFile(
    path.join(outputDir, "browser-console.log"),
    consoleEntries.map((entry) => `[${entry.scope}] ${entry.type}: ${entry.text}`).join("\n") + "\n"
  );
}

await writeFile(path.join(outputDir, "capture-metadata.json"), `${JSON.stringify({
  testedSha,
  pdfSource: "exact-head local production build",
  previewUrl,
  previewDeploymentId,
  githubDeploymentId,
  generatedAt: new Date().toISOString(),
  reports,
  caveat
}, null, 2)}\n`);
