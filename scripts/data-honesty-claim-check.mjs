import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components", "src"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const OUTPUT_DIR = path.join(process.cwd(), "artifacts");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "data-honesty-claim-scan.json");

const rules = [
  { id: "production_ready", pattern: /production[- ]ready/gi },
  { id: "pilot_ready", pattern: /pilot[- ]ready/gi },
  { id: "official_parcel", pattern: /official parcel/gi },
  { id: "official_zoning", pattern: /official zoning/gi },
  { id: "cadastral_validation", pattern: /cadastral validation/gi },
  { id: "ownership_verification", pattern: /ownership verification/gi },
  { id: "certified_valuation", pattern: /certified valuation/gi },
  { id: "approved_site", pattern: /approved site/gi },
  { id: "guaranteed_best_use", pattern: /guaranteed best use/gi },
  { id: "live_dld_integration", pattern: /live dld integration/gi },
  { id: "live_geodubai_integration", pattern: /live geodubai integration/gi }
];

const safeContextPatterns = [
  /\bnot\b/i,
  /\bno\b/i,
  /\bnever\b/i,
  /\bwithout\b/i,
  /\bmust not\b/i,
  /\bcannot\b/i,
  /\bcan't\b/i,
  /\bdo not\b/i,
  /\bdoes not\b/i,
  /\bblocked\b/i,
  /\bunverified\b/i,
  /\bunsupported\b/i,
  /\bprohibited\b/i,
  /\bvalidation required\b/i,
  /\brequires validation\b/i,
  /\bvalidate\b/i,
  /\bvalidation\b/i,
  /\bconfirm\b/i,
  /\brequest\b/i,
  /\bplanned\b/i,
  /\bplanned validation\b/i,
  /\bnot connected\b/i,
  /\bnot configured\b/i,
  /\bdoesn't imply\b/i,
  /\bdoes not imply\b/i
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function contextFor(source, start, end) {
  const left = Math.max(0, start - 180);
  const right = Math.min(source.length, end + 180);
  return source.slice(left, right).replace(/\s+/g, " ").trim();
}

const findings = [];
const reviewedMatches = [];
const files = ROOTS.flatMap((root) => walk(path.join(process.cwd(), root)));

for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(process.cwd(), filePath);

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of source.matchAll(rule.pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const context = contextFor(source, start, end);
      const safe = safeContextPatterns.some((pattern) => pattern.test(context));
      const record = {
        rule: rule.id,
        file: relativePath,
        line: lineNumberAt(source, start),
        match: match[0],
        context
      };
      if (safe) reviewedMatches.push(record);
      else findings.push(record);
    }
  }
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const result = {
  ok: findings.length === 0,
  scannedRoots: ROOTS,
  scannedFiles: files.length,
  prohibitedRules: rules.map((rule) => rule.id),
  findings,
  reviewedContextMatches: reviewedMatches,
  caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
};
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: result.ok,
  scannedFiles: result.scannedFiles,
  findings: findings.length,
  reviewedContextMatches: reviewedMatches.length,
  output: path.relative(process.cwd(), OUTPUT_FILE)
}, null, 2));

if (findings.length > 0) {
  console.error("Unsupported affirmative data-honesty claims were found.");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.rule}] ${finding.match}`);
  }
  process.exit(1);
}
