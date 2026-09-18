import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const LOOPBACK_HEALTH_URL = "http://127.0.0.1:3000/api/health";
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DEFAULTS = Object.freeze({
  clients: 10,
  iterations: 20,
  timeoutMs: 5_000,
  totalTimeoutMs: 60_000
});

class ProbeFailure extends Error {
  constructor(kind) {
    super(kind);
    this.name = "ProbeFailure";
    this.kind = kind;
  }
}

const parseBoundedInteger = (value, name, maximum) => {
  if (!/^[1-9][0-9]*$/.test(value ?? "")) {
    throw new Error(`${name} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new Error(`${name} must be at most ${maximum}`);
  }
  return parsed;
};

export function parsePortableReadinessLoadArgs(argv) {
  const accepted = new Set([
    "--expected-sha",
    "--clients",
    "--iterations",
    "--timeout-ms",
    "--total-timeout-ms"
  ]);
  const values = new Map();

  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!accepted.has(name) || value === undefined || value.startsWith("--")) {
      throw new Error("invalid command-line arguments");
    }
    if (values.has(name)) throw new Error(`${name} must not be repeated`);
    values.set(name, value);
  }

  const expectedSha = values.get("--expected-sha")?.trim() ?? "";
  if (!SHA_PATTERN.test(expectedSha)) {
    throw new Error("--expected-sha must be an exact 40-character lowercase Git SHA");
  }

  return Object.freeze({
    expectedSha,
    clients: values.has("--clients")
      ? parseBoundedInteger(values.get("--clients"), "--clients", 10)
      : DEFAULTS.clients,
    iterations: values.has("--iterations")
      ? parseBoundedInteger(values.get("--iterations"), "--iterations", 20)
      : DEFAULTS.iterations,
    timeoutMs: values.has("--timeout-ms")
      ? parseBoundedInteger(values.get("--timeout-ms"), "--timeout-ms", 5_000)
      : DEFAULTS.timeoutMs,
    totalTimeoutMs: values.has("--total-timeout-ms")
      ? parseBoundedInteger(values.get("--total-timeout-ms"), "--total-timeout-ms", 60_000)
      : DEFAULTS.totalTimeoutMs
  });
}

const percentile = (durations, fraction) => {
  if (durations.length === 0) return 0;
  const ordered = [...durations].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(ordered.length * fraction) - 1);
  return ordered[index];
};

const roundMilliseconds = (value) => Math.round(Math.max(0, value) * 10) / 10;

const assertLoadConfiguration = (config) => {
  if (!config || typeof config !== "object" || !SHA_PATTERN.test(config.expectedSha ?? "")) {
    throw new Error("invalid expected SHA");
  }
  parseBoundedInteger(String(config.clients), "clients", 10);
  parseBoundedInteger(String(config.iterations), "iterations", 20);
  parseBoundedInteger(String(config.timeoutMs), "timeoutMs", 5_000);
  parseBoundedInteger(String(config.totalTimeoutMs), "totalTimeoutMs", 60_000);
};

const validateHealthPayload = (payload, expectedSha) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ProbeFailure("invalid_payload");
  }
  if (payload.status !== "ok") throw new ProbeFailure("unhealthy_status");
  if (payload.environment !== "self_hosted_candidate") throw new ProbeFailure("wrong_runtime");
  if (payload.releaseCommit !== expectedSha) throw new ProbeFailure("wrong_release");
};

const requestHealth = async ({ expectedSha, timeoutMs }, dependencies, globalSignal) => {
  const requestController = new AbortController();
  const abortFromGlobal = () => requestController.abort(globalSignal.reason);
  globalSignal.addEventListener("abort", abortFromGlobal, { once: true });
  const requestTimer = dependencies.setTimeoutImpl(
    () => requestController.abort(new ProbeFailure("request_timeout")),
    timeoutMs
  );
  const startedAt = dependencies.now();

  try {
    const response = await dependencies.fetchImpl(LOOPBACK_HEALTH_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
      cache: "no-store",
      signal: requestController.signal
    });
    if (response.redirected || response.status !== 200) {
      throw new ProbeFailure(response.status >= 300 && response.status < 400 ? "redirect" : "http_status");
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      if (requestController.signal.aborted) {
        const reason = requestController.signal.reason;
        if (reason instanceof ProbeFailure) throw reason;
        throw new ProbeFailure(globalSignal.aborted ? "total_timeout_or_abort" : "request_timeout");
      }
      throw new ProbeFailure("invalid_json");
    }
    validateHealthPayload(payload, expectedSha);
    return roundMilliseconds(dependencies.now() - startedAt);
  } catch (error) {
    if (error instanceof ProbeFailure) throw error;
    if (requestController.signal.aborted) {
      const reason = requestController.signal.reason;
      if (reason instanceof ProbeFailure) throw reason;
      throw new ProbeFailure(globalSignal.aborted ? "total_timeout_or_abort" : "request_timeout");
    }
    throw new ProbeFailure("request_failed");
  } finally {
    dependencies.clearTimeoutImpl(requestTimer);
    globalSignal.removeEventListener("abort", abortFromGlobal);
  }
};

export async function runPortableReadinessLoad(config, injected = {}) {
  assertLoadConfiguration(config);
  const dependencies = {
    fetchImpl: injected.fetchImpl ?? globalThis.fetch,
    now: injected.now ?? (() => performance.now()),
    setTimeoutImpl: injected.setTimeoutImpl ?? globalThis.setTimeout,
    clearTimeoutImpl: injected.clearTimeoutImpl ?? globalThis.clearTimeout
  };
  if (typeof dependencies.fetchImpl !== "function") throw new Error("fetch implementation is required");

  const expectedRequests = config.clients * config.iterations;
  const totalController = new AbortController();
  const startedAt = dependencies.now();
  const totalTimer = dependencies.setTimeoutImpl(
    () => totalController.abort(new ProbeFailure("total_timeout")),
    config.totalTimeoutMs
  );
  const durations = [];
  let attempted = 0;
  let succeeded = 0;
  let errors = 0;
  let firstFailure = null;
  let nextRequestIndex = 1;

  const recordFailure = (error) => {
    errors += 1;
    if (firstFailure === null) {
      firstFailure = error instanceof ProbeFailure ? error.kind : "request_failed";
    }
    if (!totalController.signal.aborted) totalController.abort(error);
  };

  try {
    attempted = 1;
    try {
      durations.push(await requestHealth(config, dependencies, totalController.signal));
      succeeded = 1;
    } catch (error) {
      recordFailure(error);
    }

    if (firstFailure === null) {
      const worker = async () => {
        while (!totalController.signal.aborted) {
          const requestIndex = nextRequestIndex;
          nextRequestIndex += 1;
          if (requestIndex >= expectedRequests) return;
          attempted += 1;
          try {
            durations.push(await requestHealth(config, dependencies, totalController.signal));
            succeeded += 1;
          } catch (error) {
            recordFailure(error);
            return;
          }
        }
      };
      await Promise.all(Array.from({ length: config.clients }, () => worker()));
    }
  } finally {
    dependencies.clearTimeoutImpl(totalTimer);
  }

  const durationMs = roundMilliseconds(dependencies.now() - startedAt);
  const summary = Object.freeze({
    expectedRequests,
    attempted,
    succeeded,
    p50Ms: roundMilliseconds(percentile(durations, 0.5)),
    p95Ms: roundMilliseconds(percentile(durations, 0.95)),
    maxMs: roundMilliseconds(durations.length === 0 ? 0 : Math.max(...durations)),
    errors,
    durationMs
  });
  return Object.freeze({
    ok: firstFailure === null && succeeded === expectedRequests && errors === 0,
    failureKind: firstFailure,
    summary
  });
}

export async function main(argv = process.argv.slice(2)) {
  let config;
  try {
    config = parsePortableReadinessLoadArgs(argv);
  } catch {
    console.error("Invalid portable readiness load configuration.");
    process.exitCode = 64;
    return;
  }

  const result = await runPortableReadinessLoad(config);
  console.log(JSON.stringify(result.summary));
  if (!result.ok) {
    console.error("Portable readiness load probe failed.");
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;
if (isDirectRun) await main();
