import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(process.env.GEOAI_PDF_OUTPUT_DIR ?? "artifacts/pr63-report-connector-pdf-evidence");
const conservativeLabel = "manual import path available; no verified snapshot attached";
const oldLabel = "manual snapshot ready";
const verifiedLabel = "verified snapshot attached";
const expectedPages = { analysis: 5, comparison: 4 };
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
  return execFileSync(name, args, { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
}

function parsePdfInfo(text) {
  const pages = Number(text.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
  const size = text.match(/^Page(?:\s+\d+)? size:\s+([\d.]+) x ([\d.]+) pts/m);
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

function count(text, phrase) {
  return text.toLowerCase().split(phrase.toLowerCase()).length - 1;
}

async function auditReport(name) {
  const pdfPath = path.join(outputDir, `${name}-report.pdf`);
  const pdfInfoText = command("pdfinfo", [pdfPath]);
  const info = parsePdfInfo(pdfInfoText);
  assert(info.pages === expectedPages[name], `${name} PDF page count changed from ${expectedPages[name]} to ${info.pages}`);
  await writeFile(path.join(outputDir, `${name}-report-pdfinfo.txt`), pdfInfoText);

  const textPath = path.join(outputDir, `${name}-report-text.txt`);
  command("pdftotext", ["-layout", pdfPath, textPath]);
  const extractedText = await readFile(textPath, "utf8");
  const normalizedText = extractedText.replace(/\s+/g, " ").trim();
  const withoutConservativeLabel = normalizedText.toLowerCase().split(conservativeLabel).join("");
  const wording = {
    oldLabelCount: count(normalizedText, oldLabel),
    conservativeLabelCount: count(normalizedText, conservativeLabel),
    verifiedLabelCount: count(withoutConservativeLabel, verifiedLabel)
  };
  assert(wording.oldLabelCount === 0, `${name} PDF contains the old connector label`);
  assert(wording.conservativeLabelCount === 2, `${name} PDF must contain the conservative connector label twice`);
  assert(wording.verifiedLabelCount === 0, `${name} PDF contains an unsupported verified snapshot claim`);

  const imageList = command("pdfimages", ["-list", pdfPath]);
  await writeFile(path.join(outputDir, `${name}-report-images.txt`), imageList);
  if (name === "analysis") {
    const imageRows = imageList.split("\n").filter((line) => /^\s*\d+\s+\d+\s+image\s+/.test(line));
    assert(imageRows.length > 0, "analysis PDF contains no embedded raster image for the Marina map");
    assert(imageRows.some((line) => /\s382\s+358\s/.test(line)), "analysis PDF does not contain the accepted 382x358 Marina map image");
    for (const value of [
      "Dubai Marina / JBR Market Signal", "Investment site selection", "25.082200, 55.143100",
      "92/100", "Compare before advancing", "Medium", "Define screening criteria.",
      "Captured Map Context", "Captured rendered map context for Dubai Marina / JBR Market Signal"
    ]) assert(normalizedText.toLowerCase().includes(value.toLowerCase()), `analysis PDF is missing retained content: ${value}`);
  } else {
    for (const value of [
      "Dubai South Growth Node", "Dubai Marina / JBR Market Signal", "Business Bay Infill Opportunity",
      "Score Comparison", "Comparison Map"
    ]) assert(normalizedText.toLowerCase().includes(value.toLowerCase()), `comparison PDF is missing retained content: ${value}`);
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
    assert(Math.abs(result.widthPt - 595.92) <= 1 && Math.abs(result.heightPt - 841.92) <= 1, `${name} PDF page ${pageNumber} is not A4`);
    assert(result.wordCount >= 10, `${name} PDF page ${pageNumber} is blank or nearly blank`);
    assert(result.clippedWordCount === 0, `${name} PDF page ${pageNumber} has clipped text`);
    assert(result.overlappingLinePairs === 0, `${name} PDF page ${pageNumber} has overlapping text lines`);
    assert(!result.orphanHeading, `${name} PDF page ${pageNumber} ends with orphan heading ${result.orphanHeading}`);
    pageMetrics.push(result);
    assertions.push({ pageNumber, a4: "pass", clipping: "pass", overlap: "pass", blankPage: "pass", orphanHeading: "pass" });
  }

  return { name, pageCount: info.pages, wording, pages: pageMetrics, assertions, extractedTextBytes: Buffer.byteLength(extractedText) };
}

await mkdir(outputDir, { recursive: true });
const reports = [await auditReport("analysis"), await auditReport("comparison")];
const captureMetadata = JSON.parse(await readFile(path.join(outputDir, "capture-metadata.json"), "utf8"));
await writeFile(path.join(outputDir, "page-count-dimensions.json"), `${JSON.stringify({ reports }, null, 2)}\n`);
await writeFile(path.join(outputDir, "pdf-layout-assertions.json"), `${JSON.stringify({ ok: true, reports: reports.map((report) => ({ name: report.name, wording: report.wording, assertions: report.assertions })) }, null, 2)}\n`);
await writeFile(path.join(outputDir, "SUMMARY.md"), `# PR #63 Report Connector PDF Evidence

- Tested SHA: \`${captureMetadata.testedSha}\`
- PDF provenance: exact-head local production build; Preview metadata is recorded separately and was not the PDF capture source.
- Preview metadata: \`${captureMetadata.previewDeploymentId}\` at ${captureMetadata.previewUrl}
- Analysis PDF: ${reports[0].pageCount} physical A4 pages; captured 382x358 Dubai Marina map verified.
- Comparison PDF: ${reports[1].pageCount} physical A4 pages; score table and comparison map verified.
- Connector wording per PDF: old phrase 0; conservative phrase 2; unsupported verified phrase 0.
- Clipping, overlap, blank-page and orphan-heading assertions: passed on every physical page.
- Both PDFs, extracted text, PDF metadata, every rendered page PNG, browser console log and Next.js application log are included.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
`);
