import fs from "node:fs";
import path from "node:path";

const [mobilePath = "artifacts/lighthouse-mobile.json", desktopPath = "artifacts/lighthouse-desktop.json"] = process.argv.slice(2);
const failures = [];

const profiles = [
  {
    file: mobilePath,
    name: "mobile-landing",
    budgets: { performance: 0.7, accessibility: 0.95, "best-practices": 0.9, seo: 0.85, lcp: 4000, cls: 0.1, tbt: 350 }
  },
  {
    file: desktopPath,
    name: "desktop-login",
    budgets: { performance: 0.8, accessibility: 0.95, "best-practices": 0.9, seo: 0.85, lcp: 2500, cls: 0.1, tbt: 250 }
  }
];

function readReport(file) {
  const absolutePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing Lighthouse report: ${file}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function categoryScore(report, id) {
  const score = report?.categories?.[id]?.score;
  return typeof score === "number" ? score : null;
}

function auditValue(report, id) {
  const value = report?.audits?.[id]?.numericValue;
  return typeof value === "number" ? value : null;
}

const summaries = [];
for (const profile of profiles) {
  const report = readReport(profile.file);
  if (!report) continue;

  const summary = {
    profile: profile.name,
    url: report.finalDisplayedUrl ?? report.finalUrl ?? report.requestedUrl ?? null,
    lighthouseVersion: report.lighthouseVersion ?? null,
    categories: {
      performance: categoryScore(report, "performance"),
      accessibility: categoryScore(report, "accessibility"),
      bestPractices: categoryScore(report, "best-practices"),
      seo: categoryScore(report, "seo")
    },
    metrics: {
      largestContentfulPaintMs: auditValue(report, "largest-contentful-paint"),
      cumulativeLayoutShift: auditValue(report, "cumulative-layout-shift"),
      totalBlockingTimeMs: auditValue(report, "total-blocking-time")
    }
  };
  summaries.push(summary);

  for (const [category, minimum] of Object.entries({
    performance: profile.budgets.performance,
    accessibility: profile.budgets.accessibility,
    "best-practices": profile.budgets["best-practices"],
    seo: profile.budgets.seo
  })) {
    const score = categoryScore(report, category);
    if (score === null || score < minimum) failures.push(`${profile.name} ${category} score ${score ?? "missing"} is below ${minimum}`);
  }

  for (const [audit, maximum] of Object.entries({
    "largest-contentful-paint": profile.budgets.lcp,
    "cumulative-layout-shift": profile.budgets.cls,
    "total-blocking-time": profile.budgets.tbt
  })) {
    const value = auditValue(report, audit);
    if (value === null || value > maximum) failures.push(`${profile.name} ${audit} ${value ?? "missing"} exceeds ${maximum}`);
  }
}

const summaryPath = path.resolve(process.cwd(), "artifacts", "lighthouse-budget-summary.json");
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify({ profiles: summaries, failures }, null, 2)}\n`, "utf8");

for (const summary of summaries) {
  console.log(`[lighthouse] ${summary.profile}: performance=${summary.categories.performance}, accessibility=${summary.categories.accessibility}, best-practices=${summary.categories.bestPractices}, seo=${summary.categories.seo}, LCP=${summary.metrics.largestContentfulPaintMs}ms, CLS=${summary.metrics.cumulativeLayoutShift}, TBT=${summary.metrics.totalBlockingTimeMs}ms`);
}

if (failures.length > 0) {
  console.error("Lighthouse budget check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lighthouse budgets passed for the mobile landing and desktop login entry surfaces.");
