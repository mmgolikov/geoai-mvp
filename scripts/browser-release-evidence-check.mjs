import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const junitPath = process.argv[2] ?? "artifacts/auth-session-e2e-junit.xml";
const expectedTests = Number.parseInt(process.env.GEOAI_EXPECTED_BROWSER_TESTS ?? "38", 10);
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const junit = await readFile(path.join(root, junitPath), "utf8");
const rootTag = junit.match(/<testsuites\b([^>]*)>/)?.[1] ?? "";
const attributes = Object.fromEntries(
  [...rootTag.matchAll(/([A-Za-z][\w:-]*)="([^"]*)"/g)].map((match) => [match[1], match[2]])
);
const counts = Object.fromEntries(
  ["tests", "failures", "skipped", "errors"].map((name) => [name, Number.parseInt(attributes[name] ?? "-1", 10)])
);

const failures = [];
if (!Number.isInteger(expectedTests) || expectedTests <= 0) failures.push("Expected browser test count must be a positive integer.");
if (counts.tests !== expectedTests) failures.push(`Expected ${expectedTests} tests, received ${counts.tests}.`);
for (const name of ["failures", "skipped", "errors"]) {
  if (counts[name] !== 0) failures.push(`Expected ${name}=0, received ${counts[name]}.`);
}
for (const scriptName of ["test:e2e:auth-session", "test:e2e:gcc-release-evidence"]) {
  if (!packageJson.scripts?.[scriptName]?.includes("--retries=0")) {
    failures.push(`${scriptName} must explicitly disable Playwright retries.`);
  }
}

if (failures.length > 0) {
  console.error("Browser release evidence check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  junitPath,
  retries: 0,
  ...counts
}, null, 2));
