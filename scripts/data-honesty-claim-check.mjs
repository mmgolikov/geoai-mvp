import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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

const structuralSafePattern = /(forbidden|unsupported|prohibited|blocked|outofscope|notincluded|notrequired|whatitcannot|cannotsupport|disallowed)/i;

const semanticSafePatterns = [
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
  /\brequir(?:e|es|ed|ing)\b/i,
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

function scriptKind(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function scannableText(node, sourceFile) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node) || ts.isRegularExpressionLiteral(node) || ts.isJsxText(node)) {
    return node.getText(sourceFile);
  }
  return null;
}

function structuralLabels(node, sourceFile) {
  const labels = [];
  for (let current = node.parent; current && !ts.isSourceFile(current); current = current.parent) {
    if (ts.isVariableDeclaration(current)) labels.push(current.name.getText(sourceFile));
    if (ts.isPropertyAssignment(current) || ts.isPropertyDeclaration(current) || ts.isMethodDeclaration(current)) {
      labels.push(current.name.getText(sourceFile));
    }
    if (ts.isFunctionDeclaration(current) && current.name) labels.push(current.name.getText(sourceFile));
  }
  return labels;
}

function isStructurallySafe(labels) {
  return labels.some((label) => structuralSafePattern.test(label.replace(/[^a-z0-9]/gi, "")));
}

function isSemanticallySafe(text) {
  return semanticSafePatterns.some((pattern) => pattern.test(text));
}

const findings = [];
const reviewedMatches = [];
const files = ROOTS.flatMap((root) => walk(path.join(process.cwd(), root)));

for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(process.cwd(), filePath);
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind(filePath));

  function visit(node) {
    const text = scannableText(node, sourceFile);
    if (text !== null) {
      const labels = structuralLabels(node, sourceFile);
      const structuralSafe = isStructurallySafe(labels);
      const semanticSafe = isSemanticallySafe(text);

      for (const rule of rules) {
        rule.pattern.lastIndex = 0;
        for (const match of text.matchAll(rule.pattern)) {
          const position = node.getStart(sourceFile) + (match.index ?? 0);
          const line = sourceFile.getLineAndCharacterOfPosition(Math.min(position, source.length)).line + 1;
          const record = {
            rule: rule.id,
            file: relativePath,
            line,
            match: match[0],
            structuralLabels: labels,
            context: text.replace(/\s+/g, " ").trim().slice(0, 1200),
            classification: structuralSafe ? "policy_or_blocked_claim_structure" : semanticSafe ? "negated_or_validation_context" : "unsupported_affirmative_claim"
          };
          if (structuralSafe || semanticSafe) reviewedMatches.push(record);
          else findings.push(record);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const result = {
  ok: findings.length === 0,
  method: "typescript_ast_user_facing_literal_scan",
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
  method: result.method,
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
