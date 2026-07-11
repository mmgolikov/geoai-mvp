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
  /\bforbiddenClaims\b/i,
  /\bforbiddenOfficialClaims\b/i,
  /\bunsupportedClaims\b/i,
  /\bwhatItCannotSupport\b/i,
  /\bnotIncluded\b/i,
  /\bnotRequiredForDemo\b/i,
  /\bnot included\b/i,
  /\bnot required\b/i,
  /\bcannot support\b/i,
  /\bvalidation required\b/i,
  /\brequires? validation\b/i,
  /\bmust be (?:validated|verified|confirmed)\b/i,
  /\bvalidated\b/i,
  /\bvalidation\b/i,
  /\bconfirm(?:ation|ed|ing)?\b/i,
  /\brequest(?:ed|ing)?\b/i,
  /\bplanned\b/i,
  /\bnot connected\b/i,
  /\bnot configured\b/i,
  /\bdoesn't imply\b/i,
  /\bdoes not imply\b/i,
  /\bclient-approved\b/i,
  /\bcustomer-approved\b/i,
  /\bscreening context only\b/i,
  /\bscreening hypothesis\b/i,
  /\bdeterministic sample\/open\b/i
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

function contextFor(source, start) {
  const currentLineStart = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const previousLineStart = currentLineStart > 0
    ? source.lastIndexOf("\n", Math.max(0, currentLineStart - 2)) + 1
    : currentLineStart;
  const currentLineEnd = source.indexOf("\n", start);
  const nextLineEnd = currentLineEnd === -1
    ? source.length
    : (() => {
        const end = source.indexOf("\n", currentLineEnd + 1);
        return end === -1 ? source.length : end;
      })();
  return source
    .slice(previousLineStart, nextLineEnd)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
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
      const context = contextFor(source, start);
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
