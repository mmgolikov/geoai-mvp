export type Sprint10PaidDispatchReservation<T> = {
  receipt: T;
};

export const DUBAI_CREATE_PROGRAMME_SCOPES = [
  "dubai-create-rm-rectangle", "dubai-create-rm-concave",
  "dubai-create-ch-rectangle", "dubai-create-ch-concave",
  "dubai-create-cg-rectangle", "dubai-create-cg-concave"
] as const;
export type DubaiCreateProgrammeScope = typeof DUBAI_CREATE_PROGRAMME_SCOPES[number];

export const SPRINT10_LIVE_PAID_SCOPE_MATRIX = {
  journey: { ai: 1, create: 1 },
  "dubai-analyse": { ai: 1, create: 0 },
  "dubai-find": { ai: 0, create: 0 },
  "dubai-find-analysis": { ai: 3, create: 0 },
  "dubai-find-construction": { ai: 3, create: 0 },
  "singapore-create": { ai: 0, create: 1 },
  "singapore-analyse": { ai: 1, create: 0 },
  "singapore-find": { ai: 0, create: 0 },
  "dubai-create": { ai: 0, create: 1 },
  "dubai-create-rm-rectangle": { ai: 0, create: 1 },
  "dubai-create-rm-concave": { ai: 0, create: 1 },
  "dubai-create-ch-rectangle": { ai: 0, create: 1 },
  "dubai-create-ch-concave": { ai: 0, create: 1 },
  "dubai-create-cg-rectangle": { ai: 0, create: 1 },
  "dubai-create-cg-concave": { ai: 0, create: 1 },
  "dubai-depth-cycle": { ai: 4, create: 0 },
  "dubai-profile-depth-cycle": { ai: 4, create: 0 },
  "dubai-redevelopment-depth-cycle": { ai: 4, create: 0 },
  "dubai-diligence-depth-cycle": { ai: 4, create: 0 },
  "quality20-analyse": { ai: 1, create: 0 },
  "quality20-find": { ai: 0, create: 0 },
  "quality20-acquire": { ai: 0, create: 0 },
  "quality20-create": { ai: 0, create: 1 }
} as const;

export type Sprint10LiveScope = keyof typeof SPRINT10_LIVE_PAID_SCOPE_MATRIX;

// A functional UI matrix: runtime evidence may differ between requests. This is
// deliberately separate from the frozen-source comparative quality benchmark.
export const SPRINT10_GOAL_DEPTH_PRESETS = [
  { goal: "object_profile", label: "Object profile", question: "Build a concise decision-oriented profile of this object. Separate observed map evidence, derived implications and hypotheses, and identify the most material evidence gaps." },
  { goal: "development_screening", label: "Development screening", question: "Screen this object from the selected perspective. Identify what the available evidence implies, the strongest preliminary opportunities and risks, and what must be validated before further commitment." },
  { goal: "redevelopment", label: "Redevelopment", question: "Assess whether redevelopment or repositioning is a useful hypothesis to investigate for this object. Do not assume development rights, condition, demand or financial feasibility." },
  { goal: "due_diligence", label: "Due diligence", question: "Turn the available evidence into a prioritized due-diligence plan. Explain which unknowns could change the decision most and which sources should be checked first." }
] as const;

export const SPRINT10_GOAL_DEPTH_SCOPES = {
  "dubai-profile-depth-cycle": { ...SPRINT10_GOAL_DEPTH_PRESETS[0],
    sourceQuery: "Jumeirah Emirates Towers Hotel", sourceCandidateLabel: /^(?:Jumeirah Emirates Towers(?: Hotel)?|Emirates Towers Hotel)$/i },
  "dubai-redevelopment-depth-cycle": { ...SPRINT10_GOAL_DEPTH_PRESETS[2],
    sourceQuery: "Dubai World Trade Centre", sourceCandidateLabel: /^Dubai World Trade Cent(?:re|er)$/i },
  "dubai-diligence-depth-cycle": { ...SPRINT10_GOAL_DEPTH_PRESETS[3],
    sourceQuery: "Marina Plaza Dubai", sourceCandidateLabel: /^Marina Plaza(?: Dubai)?$/i }
} as const;
export type Sprint10GoalDepthScope = keyof typeof SPRINT10_GOAL_DEPTH_SCOPES;

export function sprint10GoalDepthRecipe(scope: Sprint10GoalDepthScope) {
  const { goal, question } = SPRINT10_GOAL_DEPTH_SCOPES[scope];
  return [
    { goal: "custom", depth: "standard", question: "What evidence supports this screening result, and what must be validated before a redevelopment decision?" },
    ...(["standard", "deep", "quick"] as const).map((depth) => ({ goal, depth, question }))
  ];
}

export type Sprint10GoalDepthSource = { sourceFeatureId: string; longitude: number; latitude: number };

/** The live harness checks the public lease before reserving a paid AI POST. */
export function validateSprint10PublicEvidenceReceipt(value: unknown, expectedSourceFeatureId: string, requireCurrent = true): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Public evidence receipt is missing.");
  const receipt = value as Record<string, unknown>;
  const keys = ["version", "evidencePackHash", "sourceResponseHash", "acquiredAt", "createdAt", "expiresAt",
    "cacheWindow", "sourceLocale", "lookupSourceFeatureId"];
  const iso = (item: unknown) => typeof item === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item) && Number.isFinite(Date.parse(item));
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
      receipt.version !== "PUBLIC_EVIDENCE_LEASE_V1" ||
      typeof receipt.evidencePackHash !== "string" || !/^[a-f0-9]{64}$/.test(receipt.evidencePackHash) ||
      typeof receipt.sourceResponseHash !== "string" || !/^[a-f0-9]{64}$/.test(receipt.sourceResponseHash) ||
      !iso(receipt.acquiredAt) || !iso(receipt.createdAt) || !iso(receipt.expiresAt) ||
      !Number.isSafeInteger(receipt.cacheWindow) || (receipt.cacheWindow as number) < 0 ||
      (receipt.sourceLocale !== "en" && receipt.sourceLocale !== "ru,en") ||
      (receipt.lookupSourceFeatureId !== null && (typeof receipt.lookupSourceFeatureId !== "string" ||
        !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(receipt.lookupSourceFeatureId)))) {
    throw new Error("Public evidence receipt has an unexpected shape.");
  }
  const created = Date.parse(receipt.createdAt as string);
  const expires = Date.parse(receipt.expiresAt as string);
  if (expires - created !== 900_000 || Math.floor(created / 900_000) !== receipt.cacheWindow ||
      Date.parse(receipt.acquiredAt as string) > expires ||
      (receipt.lookupSourceFeatureId !== null && receipt.lookupSourceFeatureId !== expectedSourceFeatureId) ||
      (requireCurrent && !(created <= Date.now() && Date.now() < expires))) {
    throw new Error("Public evidence receipt is stale or bound to another source.");
  }
}

export function validateSprint10FindAnalysisRequest(body: unknown, occurrence: number, sources: readonly Sprint10GoalDepthSource[] | null): void {
  if (!sources || sources.length !== 3 || new Set(sources.map((source) => source.sourceFeatureId)).size !== 3 ||
      !Number.isInteger(occurrence) || occurrence < 1 || occurrence > 3) throw new Error("Find analysis requires three distinct armed live source identities.");
  // Reuse the strict custom Standard source/body shape, retaining Find's
  // actual broker/hotel intent and one-to-three-year horizon below.
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Find analysis request is missing.");
  const value = body as Record<string, unknown>;
  if (value.role !== "consultant_broker" || value.scenario !== "b2b_hotel_development" || value.horizon !== "one_to_three_years") {
    throw new Error("Find analysis lost the exact broker/hotel intent.");
  }
  validateSprint10GoalDepthRequest({ ...value, role: "developer", scenario: "unspecified", horizon: "current" },
    1, sources[occurrence - 1], "dubai-profile-depth-cycle");
}

/** Reject a changed recipe/source before a request can reserve or dispatch. */
export function validateSprint10GoalDepthRequest(body: unknown, occurrence: number, source: Sprint10GoalDepthSource | null, scope: Sprint10GoalDepthScope): void {
  const expected = sprint10GoalDepthRecipe(scope)[occurrence - 1];
  if (!source || !expected || !Number.isInteger(occurrence) || !body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Goal/depth matrix request is unarmed or outside its exact four-request recipe.");
  }
  const value = body as Record<string, unknown>;
  const keys = ["caseKey", "longitude", "latitude", "locale", "role", "scenario", "question", "depth", "goal",
    "perspective", "horizon", "expectedSourceFeatureId", "consent", "challenge", "evidenceReceipt"];
  if (Object.keys(value).sort().join("|") !== keys.sort().join("|") ||
      !/^(?:node|way|relation)\/[1-9]\d{0,19}$/.test(source.sourceFeatureId) ||
      !Number.isFinite(source.longitude) || !Number.isFinite(source.latitude) ||
      value.goal !== expected.goal || value.depth !== expected.depth || value.question !== expected.question ||
      value.caseKey !== "dubai" || value.longitude !== source.longitude || value.latitude !== source.latitude ||
      value.expectedSourceFeatureId !== source.sourceFeatureId || value.role !== "developer" || value.scenario !== "unspecified" ||
      value.perspective !== "developer" || value.horizon !== "current" || value.locale !== "en" || value.consent !== true ||
      typeof value.challenge !== "string" || value.challenge.length === 0) {
    throw new Error("Goal/depth matrix request changed its exact goal, depth, public question, settings or source identity.");
  }
  validateSprint10PublicEvidenceReceipt(value.evidenceReceipt, source.sourceFeatureId);
}

export function sprint10PaidPostDecision(
  scope: Sprint10LiveScope,
  route: "ai" | "create",
  occurrence: number
): { ok: true } | { ok: false; reason: "route_disallowed" | "occurrence_exceeded" } {
  const expected = SPRINT10_LIVE_PAID_SCOPE_MATRIX[scope][route];
  if (expected === 0) return { ok: false, reason: "route_disallowed" };
  if (!Number.isInteger(occurrence) || occurrence < 1 || occurrence > expected) {
    return { ok: false, reason: "occurrence_exceeded" };
  }
  return { ok: true };
}

export type Sprint10PaidDispatchResult<T> =
  | { ok: true; receipt: T }
  | { ok: false; reason: string };

type Sprint10PaidDispatchActions<T> = {
  reserve: () => Sprint10PaidDispatchReservation<T>;
  dispatch: () => Promise<void>;
  markUnknown: (receipt: T) => void;
};

/**
 * The only ordering accepted for a paid browser transport: reserve first,
 * dispatch once, and make a failed dispatch terminally unknown.
 */
export async function dispatchSprint10PaidRequest<T>(
  actions: Sprint10PaidDispatchActions<T>
): Promise<Sprint10PaidDispatchResult<T>> {
  let reservation: Sprint10PaidDispatchReservation<T>;
  try {
    reservation = actions.reserve();
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "The paid request reservation was rejected."
    };
  }

  try {
    await actions.dispatch();
    return { ok: true, receipt: reservation.receipt };
  } catch {
    actions.markUnknown(reservation.receipt);
    throw new Error("The paid request failed after reservation; its charge is unknown and later paid requests are blocked.");
  }
}

export function sprint10LiveRequestKey(
  scope: string,
  route: "ai" | "create",
  occurrence: number,
  commit: string
): string {
  const normalizedScope = scope.toUpperCase().replace(/[^A-Z0-9._:-]+/g, "-").slice(0, 36);
  const normalizedCommit = commit.toUpperCase().slice(0, 12);
  const key = `S4:${normalizedScope}:${route.toUpperCase()}:${occurrence}:${normalizedCommit}`;
  if (!/^[A-Z0-9][A-Z0-9._:-]{2,95}$/.test(key)) {
    throw new Error("The paid request identity could not be bounded safely.");
  }
  return key;
}
