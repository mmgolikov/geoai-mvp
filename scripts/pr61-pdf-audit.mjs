import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(process.env.GEOAI_PDF_OUTPUT_DIR ?? "artifacts/pr61-pdf-evidence");
const requiredAction = "Define screening criteria";
const supersededAction = "Define measurable criteria for";
const headingNames = new Set([
  "Captured Map Context", "Executive Memo", "Decision Question", "Validation Next Action",
  "Score Overview", "Market / Spatial Context", "Key Findings", "Risk & Constraints", "Opportunities",
  "Screening Signals / Source Basis", "Data Used / Source Lineage", "Validation Checklist",
  "Recommended Next Actions", "Validation Governance Appendix", "Data Honesty Disclaimer",
  "Comparison Map", "Winner / Recommendation", "Summary Cards", "Score Comparison",
  "Differentiated Risks", "Market / Access / Climate Trade-offs", "Key Trade-offs"
]);

function assert(condition, message) {
  if (!condition) throw new Error(`PDF audit assertion failed: ${message}`);
}

function command(name, args) {
  return execFileSync(name, args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function parsePdfInfo(text) {
  const pages = Number(text.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
  const size = text.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);
  return { pages, widthPt: Number(size?.[1] ?? 0), heightPt: Number(size?.[2] ?? 0) };
}

function pngDimensions(buffer) {
  assert(buffer.subarray(1, 4).toString("ascii") === "PNG", "rendered page is not a PNG");
  return { widthPx: buffer.readUInt32BE(16), heightPx: buffer.readUInt32BE(20) };
}

function parseBbox(xml) {
  const page = xml.match(/<page\s+width="([\d.]+)"\s+height="([\d.]+)"/);
  const width = Number(page?.[1] ?? 0);
  const height = Number(page?.[2] ?? 0);
  const words = [...xml.matchAll(/<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)"[^>]*>([\s\S]*?)<\/word>/g)]
    .map((match) => ({ xMin: Number(match[1]), yMin: Number(match[2]), xMax: Number(match[3]), yMax: Number(match[4]), text: match[5].replace(/<[^>]+>/g, "").trim() }));
  const lines = [...xml.matchAll(/<line\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)"/g)]
    .map((match) => ({ xMin: Number(match[1]), yMin: Number(match[2]), xMax: Number(match[3]), yMax: Number(match[4]) }));
  return { width, height, words, lines };
}

function overlapArea(a, b) {
  const width = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
  const height = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
  return width > 0 && height > 0 ? width * height : 0;
}

async function auditReport(name) {
  const pdfPath = path.join(outputDir, `${name}-report.pdf`);
  const info = parsePdfInfo(command("pdfinfo", [pdfPath]));
  assert(info.pages > 0, `${name} PDF has no physical pages`);
  const textPath = path.join(outputDir, `${name}-report-text.txt`);
  command("pdftotext", ["-layout", pdfPath, textPath]);
  const extractedText = await readFile(textPath, "utf8");
  const normalizedText = extractedText.replace(/\s+/g, " ").trim();
  assert(extractedText.trim().length > 100, `${name} PDF extracted text is unexpectedly empty`);
  assert(!normalizedText.includes(supersededAction), `${name} PDF contains the superseded action`);
  if (name === "analysis") assert(normalizedText.includes(requiredAction), "analysis PDF is missing the corrected action");

  const imageList = command("pdfimages", ["-list", pdfPath]);
  await writeFile(path.join(outputDir, `${name}-report-images.txt`), imageList);
  if (name === "analysis") {
    const imageRows = imageList.split("\n").filter((line) => /^\s*\d+\s+\d+\s+image\s+/.test(line));
    assert(imageRows.length > 0, "analysis PDF contains no embedded raster image for the Marina map");
    assert(normalizedText.includes("Captured Map Context"), "analysis PDF is missing the captured map heading");
    assert(normalizedText.includes("Captured rendered map context for Dubai Marina / JBR Market Signal"), "analysis PDF is missing the Marina map caption");
  }

  const renderPrefix = path.join(outputDir, `${name}-report-page`);
  command("pdftoppm", ["-png", "-r", "144", pdfPath, renderPrefix]);
  const pageMetrics = [];
  const assertions = [];
  for (let pageNumber = 1; pageNumber <= info.pages; pageNumber += 1) {
    const pageInfo = parsePdfInfo(command("pdfinfo", ["-f", String(pageNumber), "-l", String(pageNumber), pdfPath]));
    const bboxPath = path.join(outputDir, `${name}-report-page-${pageNumber}-bbox.html`);
    command("pdftotext", ["-f", String(pageNumber), "-l", String(pageNumber), "-bbox-layout", pdfPath, bboxPath]);
    const bbox = parseBbox(await readFile(bboxPath, "utf8"));
    const pngCandidates = (await readdir(outputDir)).filter((file) => file.startsWith(`${name}-report-page-`) && file.endsWith(".png"));
    const pngName = pngCandidates.find((file) => Number(file.match(/-(\d+)\.png$/)?.[1]) === pageNumber);
    assert(Boolean(pngName), `${name} PDF page ${pageNumber} was not rendered to PNG`);
    const png = pngDimensions(await readFile(path.join(outputDir, pngName)));
    const clippedWords = bbox.words.filter((word) => word.xMin < -0.5 || word.yMin < -0.5 || word.xMax > bbox.width + 0.5 || word.yMax > bbox.height + 0.5);
    const overlaps = [];
    for (let left = 0; left < bbox.lines.length; left += 1) {
      for (let right = left + 1; right < bbox.lines.length; right += 1) {
        if (overlapArea(bbox.lines[left], bbox.lines[right]) > 2) overlaps.push([left, right]);
      }
    }
    const pageText = command("pdftotext", ["-f", String(pageNumber), "-l", String(pageNumber), "-layout", pdfPath, "-"]);
    const lines = pageText.split("\n").map((line) => line.trim()).filter(Boolean);
    const orphanHeading = headingNames.has(lines.at(-1) ?? "") ? lines.at(-1) : null;
    const result = {
      pageNumber,
      widthPt: pageInfo.widthPt,
      heightPt: pageInfo.heightPt,
      ...png,
      wordCount: bbox.words.length,
      lineCount: bbox.lines.length,
      clippedWordCount: clippedWords.length,
      overlappingLinePairs: overlaps.length,
      orphanHeading
    };
    assert(result.wordCount >= 10, `${name} PDF page ${pageNumber} is blank or nearly blank`);
    assert(result.clippedWordCount === 0, `${name} PDF page ${pageNumber} has clipped text`);
    assert(result.overlappingLinePairs === 0, `${name} PDF page ${pageNumber} has overlapping text lines`);
    assert(!result.orphanHeading, `${name} PDF page ${pageNumber} ends with orphan heading ${result.orphanHeading}`);
    pageMetrics.push(result);
    assertions.push({ pageNumber, clipping: "pass", overlap: "pass", blankPage: "pass", orphanHeading: "pass" });
  }
  return { name, pageCount: info.pages, pages: pageMetrics, assertions, extractedTextBytes: Buffer.byteLength(extractedText) };
}

await mkdir(outputDir, { recursive: true });
const reports = [await auditReport("analysis"), await auditReport("comparison")];
await writeFile(path.join(outputDir, "page-count-dimensions.json"), `${JSON.stringify({ reports }, null, 2)}\n`);
await writeFile(path.join(outputDir, "pdf-layout-assertions.json"), `${JSON.stringify({ ok: true, reports: reports.map((report) => ({ name: report.name, assertions: report.assertions })) }, null, 2)}\n`);
await writeFile(path.join(outputDir, "SUMMARY.md"), `# PR #61 PDF Evidence\n\n- Tested SHA: \`${process.env.GEOAI_TESTED_SHA ?? "local-working-tree"}\`\n- Analysis PDF: ${reports[0].pageCount} physical pages; captured Marina map image and caption verified.\n- Comparison PDF: ${reports[1].pageCount} physical pages.\n- Corrected shared action: \`${requiredAction}\`.\n- Clipping, overlap, blank-page and orphan-heading assertions: passed on every physical page.\n- Extracted text and PNG rendering are included for every report/page.\n`);
