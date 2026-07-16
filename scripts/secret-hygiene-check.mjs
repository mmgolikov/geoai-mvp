import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

function git(args) {
  return spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

const failures = [];
const ignoreCheck = git(["check-ignore", "--no-index", "--quiet", ".env.operator"]);
if (ignoreCheck.status !== 0) failures.push(".env.operator is not gitignored");

const trackedResult = git(["ls-files", "-z"]);
if (trackedResult.status !== 0) {
  failures.push("Unable to enumerate tracked files for secret hygiene");
}

const tracked = trackedResult.stdout.split("\0").filter(Boolean);
for (const path of tracked) {
  if (/^\.env\./.test(path) && ![".env.example", ".env.operator.example"].includes(path)) {
    failures.push(`${path}: tracked environment payload file`);
  }
  if (!/\.(?:[cm]?js|ts|tsx|json|ya?ml|md|txt|sql|toml|example)$/.test(path) && !path.startsWith(".env")) {
    continue;
  }
  let value;
  try {
    value = await readFile(path, "utf8");
  } catch {
    continue;
  }
  const patterns = [
    [/sb_secret_[A-Za-z0-9_-]{16,}/, "Supabase secret-key-shaped value"],
    [/sb_publishable_[A-Za-z0-9_-]{16,}/, "embedded publishable-key-shaped value"],
    [/(?:postgres|postgresql):\/\/[^\s:@]+:[^\s@]+@[^\s]+/i, "credential-bearing PostgreSQL URL"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key material"]
  ];
  for (const [pattern, label] of patterns) {
    if (pattern.test(value)) failures.push(`${path}: ${label}`);
  }
}

for (const examplePath of [".env.example", ".env.operator.example"]) {
  const value = await readFile(examplePath, "utf8");
  for (const line of value.split(/\r?\n/)) {
    if (/^[A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|DB_URL)=(?!\s*$).+/.test(line)) {
      failures.push(`${examplePath}: secret-bearing example assignment must be blank`);
    }
  }
}

if (failures.length > 0) {
  console.error("Secret hygiene contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Secret hygiene contract passed: ${tracked.length} tracked paths scanned; operator env is ignored and examples contain no secret values.`);
