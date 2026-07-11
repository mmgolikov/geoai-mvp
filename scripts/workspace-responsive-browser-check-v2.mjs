import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sourcePath = path.join(process.cwd(), "scripts", "workspace-responsive-browser-check.mjs");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "geoai-workspace-check-v2-"));
const tempPath = path.join(tempDir, "workspace-responsive-browser-check-v2.mjs");

let source = fs.readFileSync(sourcePath, "utf8");
source = source
  .replace(
    "return { viewport: viewport.id, ...metrics };",
    "return { ...metrics, viewportId: viewport.id };"
  )
  .replace(
    "const byId = Object.fromEntries(results.map((item) => [item.viewport, item]));",
    "const byId = Object.fromEntries(results.map((item) => [item.viewportId, item]));"
  );

if (!source.includes("viewportId: viewport.id") || !source.includes("item.viewportId")) {
  throw new Error("Focused Workspace QA patch points were not found.");
}

fs.writeFileSync(tempPath, source, "utf8");
const result = spawnSync(process.execPath, [tempPath], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});

try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Temporary QA cleanup must not mask the browser result.
}

process.exit(result.status ?? 1);
