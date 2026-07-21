import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const inventoryPath = resolve(root, "security/api-route-inventory.json");
const accessPath = resolve(root, "security/api-route-access.json");
const writeMode = process.argv.includes("--write");
const runtimeBaseUrl = process.env.GEOAI_TEST_BASE_URL?.replace(/\/$/, "") ?? null;
const methodsWithBody = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = join(directory, entry);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}

function routeFromFile(file) {
  const directory = relative(resolve(root, "app/api"), file.replace(/[/\\]route\.ts$/, ""));
  return `/api/${directory.split(sep).join("/")}`;
}

function routeClassification(accesses) {
  if (accesses.includes("operator")) return "operator_only";
  if (accesses.includes("org_admin")) return "organization_admin";
  if (accesses.includes("identity_mutation")) return "identity_mutation";
  if (accesses.includes("identity")) return "identity_session";
  if (accesses.includes("project")) return "project_scoped";
  return "public_sanitized";
}

function requiredCachePolicy(classification, method) {
  if (method !== "GET") return "no_store_required";
  if (classification === "public_sanitized") return "public_sanitized_explicit_or_runtime_verified";
  return "private_no_store_required";
}

function diagnosticExposure(classification) {
  if (classification === "public_sanitized") return "compact_sanitized_public_contract";
  if (classification === "operator_only") return "operator_authenticated_minimum_necessary";
  return "authenticated_minimum_necessary_no_secret_or_inventory_leak";
}

function negativeStatuses(classification, method, requestSizeLimitBytes) {
  const statuses = new Set([405]);
  if (classification !== "public_sanitized") {
    statuses.add(401);
    statuses.add(403);
  }
  if (classification === "project_scoped" || classification === "organization_admin") statuses.add(404);
  if (methodsWithBody.has(method)) statuses.add(400);
  if (requestSizeLimitBytes !== null) statuses.add(413);
  if (classification === "operator_only" || classification === "identity_mutation" || classification === "project_scoped") statuses.add(503);
  return [...statuses].sort((a, b) => a - b);
}

function explicitBodyLimit(source) {
  const match = source.match(/readBoundedJson\(request,\s*([0-9_]+)(?:\s*\*\s*([0-9_]+))?\s*\)/);
  if (!match) return null;
  return Number(match[1].replaceAll("_", "")) * Number((match[2] ?? "1").replaceAll("_", ""));
}

function declaredCacheDirectives(source) {
  return [...new Set([...source.matchAll(/Cache-Control["']?\s*[:,]\s*["']([^"']+)["']/gi)].map((match) => match[1]))];
}

function buildInventory() {
  const access = JSON.parse(readFileSync(accessPath, "utf8"));
  const routeFiles = walk(resolve(root, "app/api"))
    .filter((file) => file.endsWith(`${sep}route.ts`))
    .sort();
  const routes = {};

  for (const file of routeFiles) {
    const route = routeFromFile(file);
    const source = readFileSync(file, "utf8");
    const exportedMethods = [...new Set([...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)].map((match) => match[1]))].sort();
    const accessMethods = Object.keys(access.routes[route] ?? {}).sort();
    if (JSON.stringify(exportedMethods) !== JSON.stringify(accessMethods)) {
      throw new Error(`${route}: exported methods ${exportedMethods.join(",")} do not match security/api-route-access.json ${accessMethods.join(",")}`);
    }
    const accesses = exportedMethods.map((method) => access.routes[route][method].access);
    const classification = routeClassification(accesses);
    const bodyLimit = explicitBodyLimit(source);
    const cacheDirectives = declaredCacheDirectives(source);
    routes[route] = {
      route,
      sourcePath: relative(root, file).split(sep).join("/"),
      classification,
      methods: Object.fromEntries(exportedMethods.map((method) => {
        const hasBody = methodsWithBody.has(method);
        const requestSizeLimitBytes = hasBody ? bodyLimit : 0;
        return [method, {
          access: access.routes[route][method].access,
          cachePolicy: {
            required: requiredCachePolicy(classification, method),
            declaredDirectives: cacheDirectives,
            verification: "permanent_static_and_runtime_contract"
          },
          requestSizeLimitBytes,
          requestSizeLimitStatus: !hasBody ? "not_applicable" : requestSizeLimitBytes === null ? "unbounded_or_framework_default_review_required" : "explicit_read_bounded_json",
          positiveResponse: { expectedStatuses: method === "POST" ? [200, 201] : [200], contract: "scripts/api-contract-check.mjs" },
          negativeStatusMatrix: negativeStatuses(classification, method, requestSizeLimitBytes),
          diagnosticExposure: diagnosticExposure(classification)
        }];
      }))
    };
  }

  const accessRoutes = Object.keys(access.routes).sort();
  if (JSON.stringify(Object.keys(routes).sort()) !== JSON.stringify(accessRoutes)) {
    throw new Error("API route files and security/api-route-access.json do not have the same complete route set");
  }

  return {
    schemaVersion: "1.0",
    generatedFrom: ["app/api/**/route.ts", "security/api-route-access.json"],
    routeCount: Object.keys(routes).length,
    fieldContract: ["route", "classification", "methods", "cachePolicy", "requestSizeLimitBytes", "positiveResponse", "negativeStatusMatrix", "diagnosticExposure"],
    limitations: [
      "A null requestSizeLimitBytes value is an explicit finding: the route uses request.json() or equivalent without the shared bounded reader.",
      "Positive and negative matrices are contract expectations; scripts/api-contract-check.mjs and this check provide bounded runtime coverage, not every authenticated persona."
    ],
    routes
  };
}

async function assertRuntimeMatrix(inventory) {
  if (!runtimeBaseUrl) return { executed: false, checks: [] };
  const checks = [];
  async function check(label, route, init, expected) {
    const response = await fetch(`${runtimeBaseUrl}${route}`, init);
    checks.push({ label, route, status: response.status, expected });
    if (!expected.includes(response.status)) throw new Error(`${label}: ${route} returned ${response.status}; expected ${expected.join("/")}`);
  }

  await check("positive public health", "/api/health", { method: "GET" }, inventory.routes["/api/health"].methods.GET.positiveResponse.expectedStatuses);
  await check("unsupported method", "/api/health", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" }, [405]);
  for (const route of ["/api/context/climate", "/api/context/market"]) {
    const limit = inventory.routes[route].methods.POST.requestSizeLimitBytes;
    await check("malformed JSON", route, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }, [400]);
    await check("oversized JSON", route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: "x".repeat(limit + 1024) }) }, [413]);
  }
  return { executed: true, checks };
}

const generated = buildInventory();
if (writeMode) {
  writeFileSync(inventoryPath, `${JSON.stringify(generated, null, 2)}\n`);
  console.log(`Wrote ${generated.routeCount}-route API inventory to security/api-route-inventory.json.`);
  process.exit(0);
}

if (!existsSync(inventoryPath)) throw new Error("security/api-route-inventory.json is missing; run npm run api:inventory:write");
const committed = JSON.parse(readFileSync(inventoryPath, "utf8"));
if (JSON.stringify(committed) !== JSON.stringify(generated)) throw new Error("security/api-route-inventory.json is stale; run npm run api:inventory:write");
const runtime = await assertRuntimeMatrix(committed);
console.log(`API route inventory passed: ${committed.routeCount} routes, complete static method/schema coverage, runtime matrix ${runtime.executed ? `${runtime.checks.length} checks` : "not requested"}.`);
