import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const apiRoot = path.resolve(process.cwd(), "app/api");

async function collectRouteFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(absolute);
    return entry.isFile() && entry.name === "route.ts" ? [absolute] : [];
  }));
  return nested.flat();
}

function countMatches(value, expression) {
  return Array.from(value.matchAll(expression)).length;
}

function handlerBlocks(source) {
  const starts = Array.from(source.matchAll(/export\s+(?:(?:async\s+)?function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g));
  return starts.map((match, index) => ({
    method: match[1],
    body: source.slice(match.index, starts[index + 1]?.index ?? source.length)
  }));
}

const failures = [];
let protectedHandlers = 0;
let guardCalls = 0;
const manifest = JSON.parse(await readFile(path.resolve(process.cwd(), "security/api-route-access.json"), "utf8"));
const discovered = new Set();

for (const file of await collectRouteFiles(apiRoot)) {
  const source = await readFile(file, "utf8");
  const relative = path.relative(process.cwd(), file);
  const route = `/${path.relative(path.resolve(process.cwd(), "app"), path.dirname(file)).replaceAll(path.sep, "/")}`;

  for (const handler of handlerBlocks(source)) {
    const key = `${route} ${handler.method}`;
    discovered.add(key);
    const policy = manifest.routes?.[route]?.[handler.method];
    if (!policy) {
      failures.push(`${relative} ${handler.method}: missing explicit route-access classification`);
      continue;
    }
    if (policy.access === "public_demo") continue;
    if (!policy.action || typeof policy.action !== "string" || !policy.action.includes(".")) {
      failures.push(`${relative} ${handler.method}: protected route has no exact resource action`);
      continue;
    }
    if (policy.access === "identity") {
      if (policy.action !== "identity.session" || !/getSafeAuthSessionSummary\s*\(request\)/.test(handler.body)) {
        failures.push(`${relative} ${handler.method}: identity route must use the fail-closed SSR session summary`);
      }
      continue;
    }
    if (policy.access === "operator") {
      const guardIndex = handler.body.indexOf("hasRuntimeSourcePackOperatorAccess(request)");
      const executionIndex = handler.body.indexOf("getRuntimeSourcePack(");
      if (guardIndex < 0 || executionIndex < 0 || guardIndex > executionIndex) {
        failures.push(`${relative} ${handler.method}: operator authorization must precede source-pack execution`);
      }
      continue;
    }
    if (policy.access === "org_admin") {
      failures.push(`${relative} ${handler.method}: org_admin handler verification is not implemented yet`);
      continue;
    }
    if (policy.access !== "project") {
      failures.push(`${relative} ${handler.method}: unsupported access classification ${policy.access}`);
      continue;
    }

    const calls = countMatches(handler.body, /requireProjectAccess\s*\(/g);
    if (calls === 0) {
      if (policy.scope === "static_browser_local") {
        const safeGet = handler.method === "GET" && /repositoryModeFields\("browser_local"\)/.test(handler.body) && /items:\s*\[\]/.test(handler.body);
        const deniedMutation = handler.method !== "GET" && /repositoryModeFields\("browser_local"\)/.test(handler.body) && /status:\s*403/.test(handler.body);
        const parsesRequestBody = /request\.(?:json|formData)\s*\(|readBoundedJson\s*\(/.test(handler.body);
        if (!(safeGet || deniedMutation) || parsesRequestBody) {
          failures.push(`${relative} ${handler.method}: static browser-local containment is incomplete`);
        }
        protectedHandlers += 1;
        continue;
      }
      if (policy.scope === "delegated" && /return\s+(?:GET|POST|PUT|PATCH|DELETE)\s*\(request\)/.test(handler.body)) {
        protectedHandlers += 1;
        continue;
      }
      failures.push(`${relative} ${handler.method}: project route has no access decision`);
      continue;
    }
    if (!source.includes("projectAccessDeniedPayload")) {
      failures.push(`${relative}: missing projectAccessDeniedPayload import/use`);
    }
    if (!handler.body.includes(`action: "${policy.action}"`)) {
      failures.push(`${relative} ${handler.method}: access decision does not use manifest action ${policy.action}`);
    }

    protectedHandlers += 1;
    guardCalls += calls;
    const checks = countMatches(handler.body, /if\s*\(\s*![A-Za-z_$][\w$]*\.allowed\s*\)/g);
    const preAuthChecks = countMatches(handler.body, /if\s*\(\s*isPreAuthServerMutationBlocked\s*\(/g);
    if (checks + preAuthChecks !== calls) {
      failures.push(`${relative} ${handler.method}: ${calls} access decision(s), ${checks + preAuthChecks} blocking check(s)`);
      continue;
    }

    if (policy.preAuthMutation === true && preAuthChecks === 0) {
      failures.push(`${relative} ${handler.method}: manifest requires an early pre-Auth mutation denial`);
      continue;
    }

    if (policy.preAuthIdentityRequired === true) {
      const identityIndex = handler.body.indexOf("hasRequestIdentityKernelEvidence(");
      const sensitiveIndexes = [
        handler.body.indexOf("await context.params"),
        handler.body.search(/await\s+(?:get|create|update|delete|list)[A-Z][A-Za-z0-9_]*\s*\(/),
        handler.body.search(/request\.(?:json|formData)\s*\(|readBoundedJson\s*\(/)
      ].filter((index) => index >= 0);
      const firstSensitive = sensitiveIndexes.length > 0 ? Math.min(...sensitiveIndexes) : -1;
      const identityWindow = identityIndex >= 0 ? handler.body.slice(Math.max(0, identityIndex - 40), identityIndex + 1400) : "";
      const visiblyReturns = /if\s*\(\s*!hasRequestIdentityKernelEvidence\(\)\s*\)\s*\{[\s\S]*?return\s+(?:NextResponse\.|privateNoStoreJson\s*\()/.test(identityWindow);
      if (identityIndex < 0 || (firstSensitive >= 0 && identityIndex > firstSensitive) || !visiblyReturns) {
        failures.push(`${relative} ${handler.method}: verified-identity denial must precede params, body and repository access`);
        continue;
      }
    }

    if (preAuthChecks > 0) {
      const preAuthIndex = handler.body.indexOf("isPreAuthServerMutationBlocked(");
      const sensitiveIndexes = [
        handler.body.indexOf("await context.params"),
        handler.body.indexOf("request.json()"),
        handler.body.indexOf("request.formData()"),
        handler.body.indexOf("readBoundedJson("),
        handler.body.search(/await\s+(?:get|create|update|delete|list)[A-Z][A-Za-z0-9_]*\s*\(/)
      ].filter((index) => index >= 0);
      const firstSensitive = sensitiveIndexes.length > 0 ? Math.min(...sensitiveIndexes) : -1;
      const preAuthWindow = handler.body.slice(Math.max(0, preAuthIndex - 20), preAuthIndex + 800);
      if ((firstSensitive >= 0 && preAuthIndex > firstSensitive) || !/return\s+NextResponse\.json\(projectAccessDeniedPayload\(access\)/.test(preAuthWindow)) {
        failures.push(`${relative} ${handler.method}: pre-Auth denial must return before params, body and repository access`);
      }
      continue;
    }

    const decisionIndex = handler.body.indexOf("requireProjectAccess(");
    const checkIndex = handler.body.indexOf("if (!access.allowed)", decisionIndex);
    if (checkIndex < decisionIndex) {
      failures.push(`${relative} ${handler.method}: blocking check does not follow the access decision`);
      continue;
    }
    const denialWindow = handler.body.slice(checkIndex, checkIndex + 1200);
    if (!/if\s*\(\s*!access\.allowed\s*\)\s*\{[\s\S]*?return\s+(?:NextResponse\.|privateNoStoreJson\s*\()/.test(denialWindow)) {
      failures.push(`${relative} ${handler.method}: denial branch does not visibly return a response`);
      continue;
    }

    const beforeCheck = handler.body.slice(decisionIndex, checkIndex);
    const prematureMutation = beforeCheck.match(/\b(?:await\s+)?(?:create|update|delete|upsert)[A-Z][A-Za-z0-9_]*\s*\(|\brecordAuditEvent\s*\(/);
    if (prematureMutation) {
      failures.push(`${relative} ${handler.method}: mutation ${prematureMutation[0].trim()} occurs before access denial is enforced`);
    }

    if (policy.scope === "resource") {
      const beforeDecision = handler.body.slice(0, decisionIndex);
      if (!/await\s+get[A-Z][A-Za-z0-9_]*\s*\(/.test(beforeDecision)) {
        failures.push(`${relative} ${handler.method}: resource route must resolve stored scope before authorization`);
      }
    }
  }
}

for (const [route, methods] of Object.entries(manifest.routes ?? {})) {
  for (const method of Object.keys(methods)) {
    const key = `${route} ${method}`;
    if (!discovered.has(key)) failures.push(`${key}: manifest entry has no matching route handler`);
  }
}

if (failures.length > 0) {
  console.error("API access-guard contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`API access-guard static wiring passed: ${discovered.size} classified handlers, ${protectedHandlers} protected handlers, ${guardCalls} blocking decision branches. Runtime identity/IDOR evidence is tracked separately.`);
