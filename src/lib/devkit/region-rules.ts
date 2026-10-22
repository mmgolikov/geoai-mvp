import type { Evidence, JsonObject, JsonValue, Procedure } from "./contracts";
import { DEVKIT_EVIDENCE_CAVEAT, type EvidenceSubject } from "./evidence";

export const DEVKIT_REGIONAL_RULE_VERSION = "DEVKIT_REGIONAL_RULES_V1" as const;
export type RegionalSource = {
  id: string; url: string; verification: string;
  checkedOn: string | null; fetchedAt: string | null;
  publishedOn: string | null; effectiveFrom: string | null; version: string | null;
  /** Website/document access is not a real-world observation or service test. */
  observedAt: null; serviceTested: boolean | null; apiTested: boolean | null;
  original: JsonObject;
};
export type RegionalRule = {
  id: string; jurisdiction: "AE-DU" | "RU-MOW"; label: string; authority: string | null;
  applicability: string | null; sourceIds: string[]; sourceUrls: string[];
  form: JsonObject | null; applicants: string[]; requirements: string[];
  checkedOn: string | null; fetchedAt: string | null; effectiveFrom: string | null; effectiveTo: string | null;
  version: string | null; rights: JsonObject; access: JsonObject;
  publishedFees: JsonObject | null; unknowns: string[]; manualSteps: string[];
  serviceStatus: "documented_not_executed"; confirmation: "review_required";
  original: JsonObject;
};
/** Metadata/links/own checklist only. This does not admit raw forms/data for AI,
 * commercial reuse or redistribution. Retain package and source versions. */
export type RegionalRulePack = {
  version: typeof DEVKIT_REGIONAL_RULE_VERSION; inputSchema: string; packageVersion: string;
  jurisdiction: "AE-DU" | "RU-MOW"; inputStatus: string;
  sources: RegionalSource[]; rules: RegionalRule[];
  sourcePackage: JsonObject; sourceRegistry: JsonObject | null;
  unknowns: string[]; caveat: typeof DEVKIT_EVIDENCE_CAVEAT;
};
export type RegionalRuleResult = { ok: true; value: RegionalRulePack } | { ok: false; code: string; message: string };
const rec = (v: unknown): v is JsonObject => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => typeof v === "string" && v.trim() ? v : null;
const list = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
const obj = (v: unknown): JsonObject => rec(v) ? v : {};
const when = (v: unknown): string | null => typeof v === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v) && Number.isFinite(Date.parse(v)) ? v : null;
const time = (v: unknown): string | null => typeof v === "string" && v.includes("T") ? when(v) : null;
const bool = (v: unknown): boolean | null => typeof v === "boolean" ? v : null;
const publicReference = (v: unknown): v is string => {
  try { const url = new URL(String(v)); return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password; } catch { return false; }
};
function cloneJson(value: unknown): JsonValue | undefined {
  let count = 0;
  function safe(v: unknown, depth: number): boolean {
    if (++count > 50000 || depth > 24) return false;
    if (v === null || typeof v === "string" || typeof v === "boolean") return true;
    if (typeof v === "number") return Number.isFinite(v);
    if (Array.isArray(v)) return v.every(x => safe(x, depth + 1));
    if (!rec(v) || Object.getPrototypeOf(v) !== Object.prototype) return false;
    return Object.entries(v).every(([k, x]) => !["__proto__", "constructor", "prototype"].includes(k) && safe(x, depth + 1));
  }
  if (!safe(value, 0)) return undefined;
  const json = JSON.stringify(value);
  return new TextEncoder().encode(json).byteLength <= 1024 * 1024 ? JSON.parse(json) as JsonValue : undefined;
}
function normalizedSource(raw: JsonObject, ordinal: number): RegionalSource | null {
  if (!publicReference(raw.url)) return null;
  return {
    id: str(raw.source_id) ?? str(raw.id) ?? `source:${ordinal}`,
    url: raw.url, verification: str(raw.verification) ?? "UNKNOWN",
    checkedOn: when(raw.observed_date) ?? when(raw.checked_on) ?? when(raw.retrieved_at)?.slice(0, 10) ?? null,
    fetchedAt: time(raw.retrieved_at) ?? time(raw.fetched_at),
    publishedOn: when(raw.publication_date) ?? when(raw.document_date),
    effectiveFrom: when(raw.effective_date) ?? when(raw.effective_from),
    version: str(raw.source_version) ?? str(raw.edition), observedAt: null,
    serviceTested: bool(raw.service_tested) ?? (raw.service_execution === "NOT_TESTED" ? false : null),
    apiTested: bool(raw.api_tested), original: raw
  };
}

/** Known researcher schemas only; unexpected schema remains a concrete gap.
 * No network request, scrape, form download, login, API activation or submission. */
export function parseRegionalRulePack(input: unknown, sourceRegistry?: unknown): RegionalRuleResult {
  const fail = (code: string, message: string): RegionalRuleResult => ({ ok: false, code, message });
  const raw = cloneJson(input), registry = sourceRegistry === undefined ? null : cloneJson(sourceRegistry);
  if (!rec(raw) || sourceRegistry !== undefined && !rec(registry)) return fail("INVALID_JSON", "Regional input must be bounded JSON metadata.");
  const schema = str(raw.schema_version), jurisdiction = str(raw.jurisdiction);
  if (!["geoai.region-procedures/0.1", "geoai.region-procedures/1.0"].includes(schema ?? "") || !["AE-DU", "RU-MOW"].includes(jurisdiction ?? "")) return fail("UNSUPPORTED_SCHEMA", "Unsupported research schema/jurisdiction; no implicit migration.");
  if (raw.caveat !== DEVKIT_EVIDENCE_CAVEAT || !Array.isArray(raw.procedures) || raw.procedures.length > 200 || !raw.procedures.every(rec) || !str(raw.package_version)) return fail("INVALID_PACKAGE", "Package version, caveat and bounded procedures are required.");
  const sourceInput = Array.isArray(raw.sources) ? raw.sources : rec(registry) && Array.isArray(registry.sources) ? registry.sources : [];
  if (sourceInput.length > 500 || !sourceInput.every(rec)) return fail("INVALID_SOURCES", "Source registry is invalid.");
  const sources: RegionalSource[] = [];
  for (let i = 0; i < sourceInput.length; i++) {
    const source = normalizedSource(sourceInput[i] as JsonObject, i);
    if (!source) return fail("INVALID_SOURCE_URL", "Regional sources require credential-free public HTTP(S) references.");
    if (sources.some(s => s.id === source.id)) return fail("DUPLICATE_SOURCE", "Source IDs must be unique.");
    sources.push(source);
  }
  const rules: RegionalRule[] = [];
  for (const value of raw.procedures) {
    const p = value as JsonObject, date = obj(p.date), form = rec(p.form) ? p.form : null;
    const id = str(p.procedure_id) ?? str(p.id), label = str(p.name) ?? str(p.title_ru);
    if (!id || !label || p.jurisdiction !== jurisdiction || rules.some(r => r.id === id)) return fail("INVALID_PROCEDURE", "Each procedure needs one unique ID, label and matching jurisdiction.");
    const references = list(p.source);
    const declaredIds = [...new Set([...list(p.source_ids), ...references.filter(ref => !publicReference(ref))])];
    if (declaredIds.some(sourceId => !sources.some(s => s.id === sourceId))) return fail("MISSING_SOURCE", "A procedure references an absent source ID; supply its published source registry.");
    const sourceUrls = [...new Set([...list(p.source_urls), ...references.filter(publicReference), ...sources.filter(s => declaredIds.includes(s.id)).map(s => s.url)])];
    if (!sourceUrls.length || sourceUrls.some(u => !publicReference(u))) return fail("INVALID_PROCEDURE_SOURCE", "Each procedure needs explicit public HTTP(S) source references or resolvable source IDs.");
    const sourceIds = [...new Set([...declaredIds, ...sources.filter(s => sourceUrls.includes(s.url)).map(s => s.id)])];
    const applicants = Array.isArray(p.applicant) ? list(p.applicant) : str(obj(p.applicant).role) ? [str(obj(p.applicant).role)!] : [];
    const unknowns = list(p.unknown);
    // Preserve restrictive terms/routing conflicts verbatim. Never promote a
    // readable service card to a licensed project dataset or executed service.
    if (!applicants.length) unknowns.push("Applicant role not established.");
    if (!sourceIds.length) unknowns.push("Source URL has no independently verified registry record.");
    if (!when(date.effective_from)) unknowns.push("Effective date/applicability not independently established.");
    const access = obj(p.access), rights = obj(p.rights);
    if (access.api_tested !== true) unknowns.push("API not tested; URL is a documentary reference.");
    unknowns.push("Raw result-data, form redistribution and AI/commercial processing rights require explicit review; public accessibility is insufficient.");
    rules.push({
      id, jurisdiction: jurisdiction as RegionalRule["jurisdiction"], label, authority: str(p.authority),
      applicability: str(p.applicability) ?? str(p.site_applicability), sourceIds, sourceUrls,
      form, applicants, requirements: list(p.requirements),
      checkedOn: when(date.checked_on) ?? when(date.as_of) ?? when(raw.checked_on) ?? when(raw.as_of),
      fetchedAt: time(date.retrieved_at), effectiveFrom: when(date.effective_from), effectiveTo: when(date.effective_to),
      version: str(form?.issue) ?? str(form?.version), rights, access,
      publishedFees: rec(p.published_fees) ? p.published_fees : null,
      unknowns: [...new Set(unknowns)], manualSteps: str(p.manual_step) ? [str(p.manual_step)!] : ["Authorised applicant and qualified local reviewer confirm applicability, current form and source rights before official action."],
      serviceStatus: "documented_not_executed", confirmation: "review_required", original: p
    });
  }
  return { ok: true, value: {
    version: DEVKIT_REGIONAL_RULE_VERSION, inputSchema: schema!, packageVersion: String(raw.package_version),
    jurisdiction: jurisdiction as RegionalRulePack["jurisdiction"], inputStatus: str(raw.status) ?? "UNKNOWN",
    sources, rules, sourcePackage: raw, sourceRegistry: rec(registry) ? registry : null,
    unknowns: ["Research is metadata, primary links and own checklists; no real plot/service/API/application acceptance.", "AOI/community name does not resolve competent authority.", "FetchedAt and document publication/effective dates are distinct; no inferred real-world observation date."],
    caveat: DEVKIT_EVIDENCE_CAVEAT
  } };
}

export function regionalProceduresForProject(pack: RegionalRulePack): Procedure[] {
  return pack.rules.map(rule => {
    const applicant = rule.applicants.length ? rule.applicants.join("; ") : null;
    const sourceUrl = rule.sourceUrls.find(url => url.startsWith("https://")) ?? null;
    return { id: rule.id, label: rule.label, authority: rule.authority, sourceUrl,
      version: rule.version, applicant: applicant && applicant.length <= 240 ? applicant : null,
      status: "review_required", missingInputs: [...rule.unknowns, "Plot-specific jurisdiction, applicant mandate and latest applicable form require review.",
        ...(applicant && applicant.length > 240 ? ["Full applicant conditions are retained in regional provenance; they exceed the compact project field limit."] : []),
        ...(!sourceUrl ? ["Original source transport remains in regional provenance; no HTTPS project link was established."] : [])] };
  });
}

/** Applicability is a conditional checklist, never a build/title/service permission. */
export function assessRegionalRuleApplicability(
  rule: RegionalRule,
  context: { jurisdiction: string | null; authority: string | null; plotIdentityConfirmed: boolean; authorityConflict?: boolean }
) {
  const reasons: string[] = [];
  if (context.jurisdiction !== rule.jurisdiction) reasons.push("jurisdiction_unknown_or_mismatch");
  if (!context.plotIdentityConfirmed) reasons.push("plot_identity_not_confirmed");
  if (!context.authority || context.authority !== rule.authority) reasons.push("authority_unknown_or_mismatch");
  if (context.authorityConflict) reasons.push("unresolved_authority_routing_conflict");
  if (rule.unknowns.length) reasons.push("procedure_has_open_evidence_gaps");
  return { ruleId: rule.id, state: reasons.length ? "hold_dependent_decision" as const : "review_required" as const,
    draftChecklistAvailable: true, serviceExecuted: false, submitted: false, approved: false, reasons,
    caveat: DEVKIT_EVIDENCE_CAVEAT };
}

/** Persist researcher metadata in the existing optional provenance envelope.
 * These references are not site facts or automatically applicable constraints. */
export function regionalRecordsForProject(pack: RegionalRulePack, subject: EvidenceSubject): { evidence: Evidence[]; procedures: Procedure[] } {
  const evidence = pack.rules.map(rule => ({
    id: `regional:${pack.jurisdiction}:${pack.packageVersion}:${rule.id}`, subjectId: subject.id,
    label: `Regional procedure reference: ${rule.label}`, sourceId: `regional-research:${pack.jurisdiction}:${pack.packageVersion}`, sourceUrl: rule.sourceUrls.find(url => url.startsWith("https://")) ?? null,
    excerpt: "Researcher metadata, links and own checklist only; plot applicability and result-data/AI/commercial rights require review.",
    acquiredAt: rule.fetchedAt, validAt: null, responseHash: null, trust: "public_source" as const, status: "partial" as const,
    rights: { licence: null, attribution: "Primary references and researcher-authored metadata; no provider endorsement.", permittedUse: "unknown" as const, redistribution: "unknown" as const },
    provenance: JSON.parse(JSON.stringify({ moduleVersion: DEVKIT_REGIONAL_RULE_VERSION, inputSchema: pack.inputSchema, packageVersion: pack.packageVersion, inputStatus: pack.inputStatus,
      subject, rule, sources: pack.sources.filter(source => rule.sourceIds.includes(source.id)), authorityResolution: pack.sourcePackage.authority_resolution ?? null,
      consumerRules: pack.sourcePackage.consumer_rules ?? null, caveat: pack.caveat })) as JsonObject
  }));
  return { evidence, procedures: regionalProceduresForProject(pack) };
}
