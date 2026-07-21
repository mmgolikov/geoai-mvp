import fs from "node:fs";
import path from "node:path";

const defaults = [
  "artifacts/lighthouse-mobile.json",
  "artifacts/lighthouse-desktop.json",
  "artifacts/lighthouse-mobile-projects.json",
  "artifacts/lighthouse-desktop-explore.json",
  "artifacts/lighthouse-desktop-login.json",
  "artifacts/lighthouse-desktop-request-access.json",
  "artifacts/lighthouse-desktop-profile.json"
];
const inputs = defaults.map((fallback, index) => process.argv.slice(2)[index] ?? fallback);
const failures = [];
const baseBudgets = { accessibility: 0.95, "best-practices": 0.9, seo: 0.8, cls: 0.1 };

const profiles = [
  { file: inputs[0], name: "mobile-landing", expectedPath: "/", budgets: { ...baseBudgets, performance: 0.7, lcp: 4000, tbt: 350, transferredJs: 900_000, decodedJs: 2_500_000, routeFirstLoadJs: 500_000 } },
  { file: inputs[1], name: "desktop-workspace", expectedPath: "/workspace", budgets: { ...baseBudgets, performance: 0.8, lcp: 2500, tbt: 250, transferredJs: 1_200_000, decodedJs: 3_500_000, routeFirstLoadJs: 2_000_000 } },
  { file: inputs[2], name: "mobile-projects", expectedPath: "/projects", budgets: { ...baseBudgets, performance: 0.6, lcp: 5000, tbt: 500, transferredJs: 1_200_000, decodedJs: 3_500_000, routeFirstLoadJs: 1_000_000 } },
  { file: inputs[3], name: "desktop-explore", expectedPath: "/explore", budgets: { ...baseBudgets, performance: 0.65, lcp: 4000, tbt: 400, transferredJs: 1_300_000, decodedJs: 4_000_000, routeFirstLoadJs: 2_000_000 } },
  { file: inputs[4], name: "desktop-login", expectedPath: "/login", budgets: { ...baseBudgets, performance: 0.75, lcp: 2500, tbt: 600, transferredJs: 3_000_000, decodedJs: 13_000_000, routeFirstLoadJs: 500_000 }, evidenceMode: "ci_auth_dev_server" },
  { file: inputs[5], name: "desktop-request-access", expectedPath: "/request-access", budgets: { ...baseBudgets, performance: 0.75, lcp: 3000, tbt: 400, transferredJs: 900_000, decodedJs: 2_500_000, routeFirstLoadJs: 500_000 } },
  { file: inputs[6], name: "desktop-profile", expectedPath: "/profile", budgets: { ...baseBudgets, accessibility: 0.9, performance: 0.65, lcp: 3500, tbt: 500, transferredJs: 1_000_000, decodedJs: 3_000_000, routeFirstLoadJs: 500_000 }, evidenceMode: "public_demo_built_app" }
];

const appBuildManifestPath = path.resolve(process.cwd(), ".next", "app-build-manifest.json");
const appBuildManifest = fs.existsSync(appBuildManifestPath) ? JSON.parse(fs.readFileSync(appBuildManifestPath, "utf8")) : null;

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

function networkMetrics(report) {
  const requests = report?.audits?.["network-requests"]?.details?.items ?? [];
  const scripts = requests.filter((request) => request.resourceType === "Script" || /javascript/i.test(request.mimeType ?? ""));
  const chunks = scripts.map((request) => ({
    url: request.url,
    transferredBytes: Number(request.transferSize ?? 0),
    decodedBytes: Number(request.resourceSize ?? 0)
  })).sort((left, right) => right.decodedBytes - left.decodedBytes);
  const transferredJsBytes = chunks.reduce((sum, chunk) => sum + chunk.transferredBytes, 0);
  const decodedJsBytes = chunks.reduce((sum, chunk) => sum + chunk.decodedBytes, 0);
  const mapbox = chunks.filter((chunk) => /mapbox|maplibre/i.test(chunk.url));
  return {
    transferredJsBytes,
    decodedJsBytes,
    largestChunks: chunks.slice(0, 8),
    mapboxContribution: {
      transferredBytes: mapbox.reduce((sum, chunk) => sum + chunk.transferredBytes, 0),
      decodedBytes: mapbox.reduce((sum, chunk) => sum + chunk.decodedBytes, 0),
      chunkCount: mapbox.length
    }
  };
}

function routeBuildMetrics(route) {
  if (!appBuildManifest) return null;
  const pageKey = route === "/" ? "/page" : `${route}/page`;
  const files = [...new Set([...(appBuildManifest.pages?.["/layout"] ?? []), ...(appBuildManifest.pages?.[pageKey] ?? [])])]
    .filter((file) => file.endsWith(".js"))
    .map((file) => {
      const absolutePath = path.resolve(process.cwd(), ".next", file);
      return { file, bytes: fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : null };
    });
  if (files.length === 0 || files.some((file) => file.bytes === null)) return null;
  return {
    routeFirstLoadJsBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    method: "next_app_build_manifest_uncompressed_file_bytes",
    chunks: files.sort((left, right) => right.bytes - left.bytes)
  };
}

const summaries = [];
for (const profile of profiles) {
  const report = readReport(profile.file);
  if (!report) continue;
  const network = networkMetrics(report);
  const routeBuild = routeBuildMetrics(profile.expectedPath);
  const summary = {
    profile: profile.name,
    requestedUrl: report.requestedUrl ?? null,
    finalUrl: report.finalDisplayedUrl ?? report.finalUrl ?? null,
    lighthouseVersion: report.lighthouseVersion ?? null,
    evidenceMode: profile.evidenceMode ?? "public_demo_built_app",
    categories: {
      performance: categoryScore(report, "performance"),
      accessibility: categoryScore(report, "accessibility"),
      bestPractices: categoryScore(report, "best-practices"),
      seo: categoryScore(report, "seo")
    },
    metrics: {
      largestContentfulPaintMs: auditValue(report, "largest-contentful-paint"),
      cumulativeLayoutShift: auditValue(report, "cumulative-layout-shift"),
      totalBlockingTimeMs: auditValue(report, "total-blocking-time"),
      totalTransferredBytes: auditValue(report, "total-byte-weight"),
      ...network,
      routeFirstLoadJsBytes: routeBuild?.routeFirstLoadJsBytes ?? null,
      routeFirstLoadJsMethod: routeBuild?.method ?? null,
      routeBuildChunks: routeBuild?.chunks ?? []
    },
    budgets: profile.budgets
  };
  summaries.push(summary);

  try {
    const finalUrl = new URL(summary.finalUrl);
    if (finalUrl.pathname !== profile.expectedPath) failures.push(`${profile.name} finished on ${finalUrl.pathname}; expected ${profile.expectedPath}`);
  } catch {
    failures.push(`${profile.name} has no valid final URL`);
  }
  for (const [category, minimum] of Object.entries({ performance: profile.budgets.performance, accessibility: profile.budgets.accessibility, "best-practices": profile.budgets["best-practices"], seo: profile.budgets.seo })) {
    const score = categoryScore(report, category);
    if (score === null || score < minimum) failures.push(`${profile.name} ${category} score ${score ?? "missing"} is below ${minimum}`);
  }
  for (const [audit, maximum] of Object.entries({ "largest-contentful-paint": profile.budgets.lcp, "cumulative-layout-shift": profile.budgets.cls, "total-blocking-time": profile.budgets.tbt })) {
    const value = auditValue(report, audit);
    if (value === null || value > maximum) failures.push(`${profile.name} ${audit} ${value ?? "missing"} exceeds ${maximum}`);
  }
  if (network.transferredJsBytes > profile.budgets.transferredJs) failures.push(`${profile.name} transferred JS ${network.transferredJsBytes} exceeds ${profile.budgets.transferredJs}`);
  if (network.decodedJsBytes > profile.budgets.decodedJs) failures.push(`${profile.name} decoded JS ${network.decodedJsBytes} exceeds ${profile.budgets.decodedJs}`);
  if (routeBuild === null) failures.push(`${profile.name} has no deterministic Next.js route First Load JS evidence`);
  else if (routeBuild.routeFirstLoadJsBytes > profile.budgets.routeFirstLoadJs) failures.push(`${profile.name} route First Load JS ${routeBuild.routeFirstLoadJsBytes} exceeds ${profile.budgets.routeFirstLoadJs}`);
}

const summaryPath = path.resolve(process.cwd(), "artifacts", "lighthouse-budget-summary.json");
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify({ schemaVersion: "2.0", profiles: summaries, failures }, null, 2)}\n`, "utf8");
for (const summary of summaries) {
  console.log(`[lighthouse] ${summary.profile}: final=${summary.finalUrl}, performance=${summary.categories.performance}, LCP=${summary.metrics.largestContentfulPaintMs}ms, CLS=${summary.metrics.cumulativeLayoutShift}, TBT=${summary.metrics.totalBlockingTimeMs}ms, transferredJS=${summary.metrics.transferredJsBytes}, decodedJS=${summary.metrics.decodedJsBytes}, routeFirstLoadJS=${summary.metrics.routeFirstLoadJsBytes}, mapboxDecoded=${summary.metrics.mapboxContribution.decodedBytes}`);
}
if (failures.length > 0) {
  console.error("Lighthouse budget check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Lighthouse budgets, final-route attribution, JS/chunk inventory and Mapbox contribution passed for all seven profiles including Request Access and Profile.");
