import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "project-dashboard", "project-dashboard.tsx");
let source = fs.readFileSync(filePath, "utf8");

function replaceOnce(label, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

replaceOnce(
  "activation heading fallback",
  '{formatDataRoomLabel(pilotBackendStatus?.status ?? platformStatus?.activationStatus ?? "local_fallback_only")}',
  '{pilotBackendStatus?.status || platformStatus?.activationStatus\n                        ? formatDataRoomLabel(pilotBackendStatus?.status ?? platformStatus?.activationStatus ?? "")\n                        : "Checking runtime status"}'
);

replaceOnce(
  "activation note fallback",
  '{pilotBackendStatus?.blockers?.[0]?.description ?? platformStatus?.blockers?.[0] ?? dbHealth?.message ?? "Advanced activation status is reported by API health checks."}',
  '{pilotBackendStatus?.blockers?.[0]?.description ?? platformStatus?.blockers?.[0] ?? dbHealth?.message ?? "Loading current runtime and security gate evidence."}'
);

replaceOnce(
  "activation next action fallback",
  '{pilotBackendStatus?.nextActions?.[0] ?? platformStatus?.nextActions?.[0] ?? "Run the migration, seed and verification scripts from a trusted environment before claiming durable storage."}',
  '{pilotBackendStatus?.nextActions?.[0] ?? platformStatus?.nextActions?.[0] ?? "Runtime status will update when the current environment checks complete."}'
);

fs.writeFileSync(filePath, source, "utf8");
console.log(JSON.stringify({ ok: true, file: path.relative(process.cwd(), filePath) }, null, 2));
