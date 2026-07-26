// Bounded network wrapper for the approved DLD demo ingestion worker.
// The underlying v2 worker remains responsible for streaming, checksums,
// privacy minimization, schema profiling and aggregate generation.

const nativeFetch = globalThis.fetch;
const requestTimeoutMs = Number(process.env.DLD_REQUEST_TIMEOUT_MS ?? 15000);

if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 120000) {
  throw new Error("DLD_REQUEST_TIMEOUT_MS must be between 1000 and 120000 milliseconds");
}

globalThis.fetch = (input, init = {}) => nativeFetch(input, {
  ...init,
  signal: init.signal ?? AbortSignal.timeout(requestTimeoutMs),
});

await import("./fetch-dld-demo-snapshots-v2.mjs");
