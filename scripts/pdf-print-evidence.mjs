import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const root = process.cwd();
const baseUrl = (process.env.GEOAI_PDF_BASE_URL ?? process.env.GEOAI_TEST_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outputDir = resolve(root, process.env.GEOAI_PDF_EVIDENCE_DIR ?? "artifacts/pdf-print-evidence");
const requiredCaveat = "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const fixedEvidenceTime = "2026-07-21T18:00:00.000Z";
const bundledPoppler = "/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/poppler/bin";

function executable(name) {
  const override = process.env[`GEOAI_${name.toUpperCase()}_BIN`];
  if (override) return override;
  const bundled = join(bundledPoppler, name);
  return existsSync(bundled) ? bundled : name;
}

function run(binary, args, options = {}) {
  return execFileSync(binary, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parsePdfInfo(text) {
  const pageCount = Number(text.match(/^Pages:\s+(\d+)$/m)?.[1]);
  const size = text.match(/^Page(?:\s+\d+)? size:\s+([0-9.]+) x ([0-9.]+) pts/m);
  return {
    pageCount,
    widthPoints: size ? Number(size[1]) : null,
    heightPoints: size ? Number(size[2]) : null
  };
}

function embeddedImageCount(pdfPath) {
  const listing = run(executable("pdfimages"), ["-list", pdfPath]);
  return listing.split(/\r?\n/).filter((line) => /^\s*\d+\s+\d+\s+image\s+/i.test(line)).length;
}

const fixtures = [
  {
    fixture: "seeded-analysis",
    reportId: "seeded-analysis-dubai-marina-report",
    routeReportId: "seeded-analysis-dubai-marina-report",
    reportType: "analysis",
    mutation: "none",
    expectedPageRange: [5, 8],
    attributionRequired: true,
    capturedMapRequired: true
  },
  {
    fixture: "seeded-comparison",
    reportId: "seeded-comparison-dubai-shortlist-report",
    routeReportId: "seeded-comparison-dubai-shortlist-report",
    reportType: "comparison",
    mutation: "none",
    expectedPageRange: [4, 8],
    attributionRequired: false,
    capturedMapRequired: false
  },
  {
    fixture: "long-title-analysis",
    reportId: "qa-long-title-analysis-report",
    routeReportId: "seeded-analysis-dubai-marina-report",
    reportType: "analysis",
    mutation: "long-title",
    expectedPageRange: [5, 9],
    attributionRequired: true,
    capturedMapRequired: true
  },
  {
    fixture: "long-title-comparison",
    reportId: "qa-long-title-comparison-report",
    routeReportId: "seeded-comparison-dubai-shortlist-report",
    reportType: "comparison",
    mutation: "long-title",
    expectedPageRange: [4, 9],
    attributionRequired: false,
    capturedMapRequired: false
  },
  {
    fixture: "long-source-lineage",
    reportId: "qa-long-source-lineage-report",
    routeReportId: "seeded-analysis-dubai-marina-report",
    reportType: "analysis",
    mutation: "long-lineage",
    expectedPageRange: [7, 11],
    attributionRequired: true,
    capturedMapRequired: true
  },
  {
    fixture: "partial-evidence",
    reportId: "qa-partial-evidence-report",
    routeReportId: "seeded-analysis-dubai-marina-report",
    reportType: "analysis",
    mutation: "partial-evidence",
    expectedPageRange: [4, 8],
    attributionRequired: true,
    capturedMapRequired: true
  }
];

const formats = [
  { id: "a4", chromiumFormat: "A4", expectedPoints: [595, 842] },
  { id: "letter", chromiumFormat: "Letter", expectedPoints: [612, 792] }
];

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
const consoleLines = [];
const generationLines = [];
const failures = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, locale: "en-US", timezoneId: "UTC" });
const records = [];

for (const fixture of fixtures) {
  for (const format of formats) {
    const artifactStem = `${fixture.fixture}-${format.id}`;
    const pdfFile = `${artifactStem}.pdf`;
    const pdfPath = join(outputDir, pdfFile);
    const textFile = `${artifactStem}.txt`;
    const textPath = join(outputDir, textFile);
    const page = await context.newPage();
    page.on("console", (message) => consoleLines.push(`${artifactStem}\t${message.type()}\t${message.text()}`));
    page.on("pageerror", (error) => consoleLines.push(`${artifactStem}\tpageerror\t${error.message}`));
    const response = await page.goto(`${baseUrl}/reports/${fixture.routeReportId}/print`, { waitUntil: "networkidle" });
    if (response?.status() !== 200) failures.push(`${artifactStem}: report route returned ${response?.status() ?? "no response"}`);
    await page.emulateMedia({ media: "print" });
    await page.evaluate(async () => document.fonts.ready);
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
    await page.evaluate(({ mutation, reportId, fixtureName, fixedTime, caveat }) => {
      document.querySelector("nextjs-portal")?.remove();
      const style = document.createElement("style");
      style.textContent = `
        *, *::before, *::after { animation: none !important; transition: none !important; }
        .geoai-pdf-evidence-meta { margin-top: 4px; font: 700 8px/1.3 Arial, sans-serif; color: #475467; overflow-wrap: anywhere; }
      `;
      document.head.append(style);
      const header = document.querySelector(".geoai-print-header > div");
      const evidenceMeta = document.createElement("p");
      evidenceMeta.className = "geoai-pdf-evidence-meta";
      evidenceMeta.textContent = `Report ID: ${reportId} | Fixture: ${fixtureName} | Evidence timestamp: ${fixedTime}`;
      header?.append(evidenceMeta);

      if (mutation === "long-title") {
        const title = "GeoAI Screening Report for an Exceptionally Long Multi-Asset Decision Context with URL https://example.invalid/evidence/very-long-segment-without-spaces-0123456789abcdef and Official Validation Required";
        const heading = document.querySelector(".geoai-print-header h1");
        if (heading) heading.textContent = title;
        const firstValue = document.querySelector(".geoai-print-meta-grid .geoai-print-card strong");
        if (firstValue) firstValue.textContent = title;
      }

      if (mutation === "long-lineage") {
        for (const group of document.querySelectorAll(".geoai-print-source-group")) {
          const source = group.querySelector(".geoai-print-source-card");
          if (!source) continue;
          for (let index = 0; index < 5; index += 1) {
            const clone = source.cloneNode(true);
            const name = clone.querySelector("strong");
            const note = clone.querySelector("p");
            if (name) name.textContent = `Evidence source ${index + 1} with a long validation label`;
            if (note) note.textContent = `Long source-lineage evidence note ${index + 1}. ${caveat} Attribution URL https://example.invalid/source/very-long-unbroken-path-abcdefghijklmnopqrstuvwxyz-${index}`;
            group.append(clone);
          }
        }
      }

      if (mutation === "partial-evidence") {
        for (const group of document.querySelectorAll(".geoai-print-source-group")) {
          group.querySelectorAll(".geoai-print-source-card").forEach((node) => node.remove());
          const note = document.createElement("p");
          note.className = "geoai-print-muted";
          note.textContent = "No source evidence is available in this fixture; validation remains required.";
          group.append(note);
        }
      }
    }, { mutation: fixture.mutation, reportId: fixture.reportId, fixtureName: fixture.fixture, fixedTime: fixedEvidenceTime, caveat: requiredCaveat });

    const domChecks = await page.evaluate(() => {
      const article = document.querySelector(".geoai-print-report");
      if (!article) return { articlePresent: false };
      const pageBoxes = [...document.querySelectorAll(".geoai-print-page")].map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      const clippedText = [...article.querySelectorAll("h1,h2,h3,p,li,strong,span,th,td,a")].filter((element) => {
        const style = getComputedStyle(element);
        return (element.scrollWidth > element.clientWidth + 1 && style.overflowX !== "visible") ||
          (element.scrollHeight > element.clientHeight + 1 && style.overflowY !== "visible");
      }).map((element) => element.textContent?.trim().slice(0, 80) ?? element.tagName);
      const outOfBounds = [...article.querySelectorAll(".geoai-print-card,.geoai-print-source-card,.geoai-print-map,.geoai-print-table")].filter((element) => {
        const rect = element.getBoundingClientRect();
        const container = element.closest(".geoai-print-page")?.getBoundingClientRect();
        return !container || rect.left < container.left - 1 || rect.right > container.right + 1;
      }).map((element) => element.className);
      const orphanHeadings = [...article.querySelectorAll("h2")].filter((heading) => !heading.parentElement || heading.parentElement.children.length < 2).map((heading) => heading.textContent ?? "");
      const avoidBreakStyles = [...article.querySelectorAll(".avoid-break")].every((element) => ["avoid", "avoid-page"].includes(getComputedStyle(element).breakInside));
      const map = article.querySelector(".geoai-print-map, [data-map-snapshot='captured']");
      const table = article.querySelector(".geoai-print-table");
      return {
        articlePresent: true,
        pageBoxes,
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        clippedText,
        outOfBounds,
        orphanHeadings,
        avoidBreakStyles,
        capturedMapRendered: Boolean(article.querySelector("[data-map-snapshot='captured'] img")),
        mapWithinPage: map ? !outOfBounds.includes(map.className) : false,
        comparisonTableWithinPage: table ? !outOfBounds.includes(table.className) : true,
        comparisonTableWidth: table?.getBoundingClientRect().width ?? null
      };
    });

    await page.pdf({
      path: pdfPath,
      format: format.chromiumFormat,
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size:8px;width:100%;padding:0 12mm;color:#667085;display:flex;justify-content:space-between"><span>${fixture.reportId}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      margin: { top: "10mm", right: "10mm", bottom: "14mm", left: "10mm" },
      tagged: true
    });
    await page.close();

    const fileSize = statSync(pdfPath).size;
    const info = parsePdfInfo(run(executable("pdfinfo"), [pdfPath]));
    run(executable("pdftotext"), ["-layout", pdfPath, textPath]);
    const extractedText = readFileSync(textPath, "utf8");
    const rasterPrefix = join(outputDir, `${artifactStem}-page`);
    run(executable("pdftoppm"), ["-png", "-r", "120", pdfPath, rasterPrefix]);
    const pageRasterFiles = readdirSync(outputDir)
      .filter((file) => file.startsWith(`${artifactStem}-page-`) && file.endsWith(".png"))
      .sort();
    const pageDimensions = Array.from({ length: info.pageCount }, (_, index) => {
      const pageInfo = parsePdfInfo(run(executable("pdfinfo"), ["-f", String(index + 1), "-l", String(index + 1), pdfPath]));
      return { page: index + 1, widthPoints: pageInfo.widthPoints, heightPoints: pageInfo.heightPoints };
    });
    const pageTextLengths = Array.from({ length: info.pageCount }, (_, index) => run(executable("pdftotext"), ["-f", String(index + 1), "-l", String(index + 1), pdfPath, "-"]).replace(/\s+/g, " ").trim().length);
    const imageCount = embeddedImageCount(pdfPath);
    const requiredTextChecks = {
      reportTitle: /GeoAI (?:Analysis|Comparison|Screening) Report/i.test(extractedText),
      reportId: extractedText.includes(fixture.reportId),
      timestamp: /SAVED REPORT TIMESTAMP/i.test(extractedText) && extractedText.includes(`Evidence timestamp: ${fixedEvidenceTime}`),
      classificationAndCaveat: extractedText.includes("Screening") && extractedText.includes(requiredCaveat),
      sourceLineage: extractedText.includes("Data Used / Source Lineage"),
      attribution: !fixture.attributionRequired || extractedText.includes("Map/data sources:"),
      pageNumbering: /Page\s+1\s+of\s+\d+/i.test(extractedText)
    };
    const recordFailures = [];
    if (fileSize < 10_000) recordFailures.push("PDF is missing or unexpectedly small");
    if (info.pageCount < fixture.expectedPageRange[0] || info.pageCount > fixture.expectedPageRange[1]) recordFailures.push(`page count ${info.pageCount} outside ${fixture.expectedPageRange.join("-")}`);
    if (pageRasterFiles.length !== info.pageCount) recordFailures.push("page raster count does not match PDF page count");
    if (pageDimensions.some((pageSize) => Math.abs((pageSize.widthPoints ?? 0) - format.expectedPoints[0]) > 2 || Math.abs((pageSize.heightPoints ?? 0) - format.expectedPoints[1]) > 2)) recordFailures.push("physical page dimensions do not match the requested format");
    if (pageTextLengths.some((length) => length < 20)) recordFailures.push("blank or near-blank physical page detected");
    if (!domChecks.articlePresent || domChecks.horizontalOverflowPx !== 0 || domChecks.clippedText?.length || domChecks.outOfBounds?.length) recordFailures.push("DOM clipping or overflow check failed");
    if (domChecks.orphanHeadings?.length) recordFailures.push("orphan heading detected");
    if (!domChecks.avoidBreakStyles) recordFailures.push("avoid-break print contract missing");
    if (!domChecks.mapWithinPage || !domChecks.comparisonTableWithinPage) recordFailures.push("map or comparison table exceeds page bounds");
    if (fixture.reportType === "comparison" && (domChecks.comparisonTableWidth ?? 0) < 400) recordFailures.push("comparison table is not readable at print width");
    if (fixture.capturedMapRequired && (!domChecks.capturedMapRendered || imageCount < 1)) recordFailures.push("captured Marina map is not embedded in the physical PDF");
    if (Object.values(requiredTextChecks).some((passed) => !passed)) recordFailures.push("one or more required text checks failed");
    if (/Printable deliverable|Print \/ Save as PDF|\bBack\b/.test(extractedText)) recordFailures.push("screen-only navigation leaked into PDF body");

    const record = {
      reportId: fixture.reportId,
      sourceRoute: `/reports/${fixture.routeReportId}/print`,
      fixture: fixture.fixture,
      reportType: fixture.reportType,
      format: format.id,
      pdfFile,
      pageCount: info.pageCount,
      expectedPageCountRange: fixture.expectedPageRange,
      pageDimensions,
      expectedPageDimensionsPoints: format.expectedPoints,
      fileSize,
      sha256: sha256(pdfPath),
      extractedTextFile: textFile,
      pageRasterFiles,
      embeddedImageCount: imageCount,
      blankPageCheck: { passed: pageTextLengths.every((length) => length >= 20), pageTextLengths, trailingPageBlank: pageTextLengths.at(-1) < 20 },
      clippingCheck: { passed: recordFailures.every((failure) => !failure.includes("clipping")), clippedText: domChecks.clippedText ?? [], outOfBounds: domChecks.outOfBounds ?? [] },
      overflowCheck: { passed: domChecks.horizontalOverflowPx === 0, horizontalOverflowPx: domChecks.horizontalOverflowPx ?? null },
      orphanHeadingCheck: { passed: (domChecks.orphanHeadings ?? []).length === 0, headings: domChecks.orphanHeadings ?? [] },
      unexpectedCardSplitCheck: { passed: domChecks.avoidBreakStyles === true, cssBreakInsideAvoid: domChecks.avoidBreakStyles ?? false },
      mapAndTableBoundsCheck: { passed: domChecks.mapWithinPage === true && domChecks.comparisonTableWithinPage === true, mapWithinPage: domChecks.mapWithinPage ?? false, comparisonTableWithinPage: domChecks.comparisonTableWithinPage ?? false },
      longWordAndUrlWrapCheck: { passed: (domChecks.clippedText ?? []).length === 0 },
      comparisonTableReadabilityCheck: { passed: fixture.reportType !== "comparison" || (domChecks.comparisonTableWidth ?? 0) >= 400, widthPx: domChecks.comparisonTableWidth ?? null },
      capturedMapCheck: { required: fixture.capturedMapRequired, passed: !fixture.capturedMapRequired || (domChecks.capturedMapRendered === true && imageCount >= 1) },
      requiredTextChecks,
      limitations: [
        "Fixtures mutate only the already-rendered seeded report DOM inside the isolated Chromium evidence process; no public fixture API or live backend write is used.",
        "Raster and DOM bounds checks provide deterministic print evidence but do not replace human review on every printer/PDF viewer."
      ],
      passed: recordFailures.length === 0,
      failures: recordFailures
    };
    records.push(record);
    failures.push(...recordFailures.map((failure) => `${artifactStem}: ${failure}`));
    generationLines.push(`${artifactStem}\tpages=${info.pageCount}\tbytes=${fileSize}\tsha256=${record.sha256}\tpassed=${record.passed}`);
  }
}

await browser.close();
writeFileSync(join(outputDir, "browser-console.log"), `${consoleLines.join("\n")}\n`);
writeFileSync(join(outputDir, "pdf-generation.log"), `${generationLines.join("\n")}\n`);
const testedCommitSha = run("git", ["rev-parse", "HEAD"]).trim();
const manifest = {
  schemaVersion: "1.0",
  evidenceType: "physical_chromium_pdf",
  generatedAt: new Date().toISOString(),
  testedCommitSha,
  baseUrl,
  browser: "Google Chrome via Playwright chromium.launch({ channel: 'chrome' })",
  formats: formats.map((format) => format.id),
  fixtureCount: fixtures.length,
  pdfCount: records.length,
  requiredCaveat,
  reports: records,
  summary: {
    passed: failures.length === 0,
    passedReports: records.filter((record) => record.passed).length,
    failedReports: records.filter((record) => !record.passed).length,
    physicalPdfFiles: records.map((record) => record.pdfFile),
    pageRasterCount: records.reduce((sum, record) => sum + record.pageRasterFiles.length, 0),
    failures
  }
};
writeFileSync(join(outputDir, "pdf-print-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const summary = [
  "# GeoAI Physical PDF Evidence",
  "",
  `Tested commit: \`${testedCommitSha}\``,
  `Base URL: \`${baseUrl}\``,
  `Result: ${failures.length === 0 ? "PASS" : "FAIL"}`,
  "",
  "| Fixture | Format | Pages | Bytes | Captured map | Result |",
  "| --- | --- | ---: | ---: | --- | --- |",
  ...records.map((record) => `| ${record.fixture} | ${record.format} | ${record.pageCount} | ${record.fileSize} | ${record.capturedMapCheck.required ? record.capturedMapCheck.passed : "n/a"} | ${record.passed ? "PASS" : "FAIL"} |`),
  "",
  requiredCaveat,
  ""
].join("\n");
writeFileSync(join(outputDir, "pdf-print-summary.md"), summary);

if (failures.length > 0) {
  console.error("Physical PDF evidence failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Physical PDF evidence passed: ${records.length} PDFs, ${manifest.summary.pageRasterCount} page rasters, manifest ${basename(join(outputDir, "pdf-print-manifest.json"))}.`);
