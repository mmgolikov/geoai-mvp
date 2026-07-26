// Bounded network and verified-endpoint wrapper for the approved DLD demo
// ingestion worker. The underlying v2 worker remains responsible for streaming,
// checksums, privacy minimization, schema profiling and aggregate generation.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const nativeFetch = globalThis.fetch;
const requestTimeoutMs = Number(process.env.DLD_REQUEST_TIMEOUT_MS ?? 15000);
const catalogPath = "data/external/catalog/dld_dubai_pulse_dataset_catalog.v1.json";
const overridesPath = "data/external/catalog/dld_download_endpoint_overrides.v1.json";
const runtimeCatalogPath = "artifacts/dld_demo_catalog.runtime.json";

if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 120000) {
  throw new Error("DLD_REQUEST_TIMEOUT_MS must be between 1000 and 120000 milliseconds");
}
if (!existsSync(catalogPath) || !existsSync(overridesPath)) {
  throw new Error("DLD source catalogue and verified endpoint overrides are required");
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const endpointAuthority = JSON.parse(readFileSync(overridesPath, "utf8"));
const overrides = endpointAuthority.overrides ?? {};
catalog.datasets = (catalog.datasets ?? []).map((dataset) => ({
  ...dataset,
  ...(overrides[dataset.datasetId] ?? {}),
}));
catalog.endpointOverrideVersion = endpointAuthority.version;
catalog.endpointOverrideObservedAt = endpointAuthority.observedAt;
mkdirSync(dirname(runtimeCatalogPath), { recursive: true });
writeFileSync(runtimeCatalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

if (!process.argv.some((value) => value.startsWith("--catalog="))) {
  process.argv.push(`--catalog=${runtimeCatalogPath}`);
}

globalThis.fetch = (input, init = {}) => nativeFetch(input, {
  ...init,
  signal: init.signal ?? AbortSignal.timeout(requestTimeoutMs),
});

await import("./fetch-dld-demo-snapshots-v2.mjs");
