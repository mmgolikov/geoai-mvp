import { resolve } from "node:path";
import { validateCurrentReleaseTruth } from "./release-truth-validator.mjs";

const root = process.cwd();
const fixture = (name) => resolve(root, "tests", "fixtures", "release-truth", name);
const options = { activeDocPaths: ["active.txt"], releaseFactDocPaths: ["active.txt"] };

for (const name of ["passing", "future-main", "external-supersedes"]) {
  const result = validateCurrentReleaseTruth({ root: fixture(name), ...options });
  if (result.failures.length > 0) {
    console.error(`${name} release-authority fixture failed:`);
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

const unsafe = validateCurrentReleaseTruth({ root: fixture("unsafe"), ...options });
if (!unsafe.failures.some((failure) => failure.includes("must never be labelled current"))) {
  console.error("A historical snapshot labelled current was not rejected.");
  process.exit(1);
}

const falseLiveClaim = validateCurrentReleaseTruth({ root: fixture("stale"), ...options });
if (!falseLiveClaim.failures.some((failure) => failure.includes("cannot claim that it queried GitHub or Vercel live state")) ||
    !falseLiveClaim.failures.some((failure) => failure.includes("repository CI must explicitly deny live GitHub/Vercel queries"))) {
  console.error("Repository-CI live-state claim fixture was not rejected.");
  process.exit(1);
}

console.log("Release-authority fixtures passed: historical accepted, current-labelled rejected, future main accepted without tuple constants, repository live-query claims rejected, and external receipts may supersede snapshots.");
