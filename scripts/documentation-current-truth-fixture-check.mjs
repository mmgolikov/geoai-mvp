import { resolve } from "node:path";
import { validateCurrentReleaseTruth } from "./release-truth-validator.mjs";

const root = process.cwd();
const fixture = (name) => resolve(root, "tests", "fixtures", "release-truth", name);
const options = {
  activeDocPaths: ["active.txt"],
  releaseFactDocPaths: ["active.txt"]
};

const passing = validateCurrentReleaseTruth({ root: fixture("passing"), ...options });
if (passing.failures.length > 0) {
  console.error("Passing release-truth fixture failed:");
  for (const failure of passing.failures) console.error(`- ${failure}`);
  process.exit(1);
}

const stale = validateCurrentReleaseTruth({ root: fixture("stale"), ...options });
for (const marker of ["obsolete main SHA", "rollback deployment", "Draft or unreleased", "missing canonical released main SHA"]) {
  if (!stale.failures.some((failure) => failure.includes(marker))) {
    console.error(`Stale release-truth fixture did not produce the expected failure: ${marker}`);
    process.exit(1);
  }
}

const unsafe = validateCurrentReleaseTruth({ root: fixture("unsafe"), ...options });
if (!unsafe.failures.some((failure) => failure.includes("must not claim Production or pilot readiness"))) {
  console.error("Unsafe release receipt did not fail its maturity claim.");
  process.exit(1);
}

console.log(`Release-truth fixtures passed: canonical=0 failures, stale=${stale.failures.length} expected failures, unsafe=${unsafe.failures.length} expected failures.`);
