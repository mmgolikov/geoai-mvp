import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  comparison: "src/lib/mock-comparison.ts",
  printable: "components/printable-report.tsx",
  preview: "components/report-preview.tsx",
  ingestion: "src/lib/ingestion/ingestion-report.ts"
};

const source = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, file]) => [key, await readFile(file, "utf8")])
  )
);

const blockedTruth = "metrics matched and are available as screening context, but the source release gate excludes them from scoring";

assert.match(source.comparison, /hasMatchedMarketScreeningContext/);
assert.match(source.comparison, /hasMarketMetricsDecisionUse/);
assert.match(
  source.comparison,
  /Market metrics matched \$\{[^}]+\} and are available as screening context, but the source release gate excludes them from scoring/
);
assert.doesNotMatch(source.comparison, /filter\(\(item\) => item\.marketMetricsMatch\?\.importedMetricsUsed\)/);

assert.match(source.printable.toLowerCase(), new RegExp(blockedTruth));
assert.match(source.printable, /Decision-scoring use/);
assert.match(source.printable, /Evidence \/ Source References/);
assert.doesNotMatch(source.printable, /conservative matched scoring/);

assert.match(source.preview, /recordedLineage\.externalSources/);
assert.match(source.preview, /Runtime-observed external context/);
assert.match(source.preview, /Recorded screening \/ reference sources/);
assert.match(source.preview.toLowerCase(), new RegExp(blockedTruth));
assert.doesNotMatch(source.preview, /External Data Used In This Memo/);
assert.doesNotMatch(source.preview, /const usedRows =/);
assert.doesNotMatch(source.preview, /support conservative scoring when matched/);

assert.match(source.ingestion, /available as screening context and remain excluded from decision scoring until the source release gate permits use/);
assert.doesNotMatch(source.ingestion, /conservative matched scoring/);

console.log("Source-use truth check passed: matched screening context is separated from release-gated scoring use and runtime-observed lineage.");

await import("./comparison-restore-adversarial-check.mjs");
