import { localCreate, localDelete, localGet, localList, localUpdate } from "@/src/lib/repositories/local-json-store";
import {
  validationRequiredCaveat,
  type AllowedClaimLevel,
  type ValidationEvidence,
  type ValidationStatus
} from "@/src/types/validation";

const validationStore = "validation-evidence";

const demoProjectKeys = [
  "dubai-investment-screening-demo",
  "developer-land-pipeline-demo",
  "bank-asset-review-demo"
];

const placeholderTitles = [
  "Sample validation placeholder: ownership/title evidence required",
  "Sample validation placeholder: zoning/planning evidence required",
  "Sample validation placeholder: market comparable evidence required"
];

function nowIso() {
  return new Date().toISOString();
}

function levelForStatus(status: ValidationStatus): AllowedClaimLevel {
  if (status === "official_validated") return "official_validation_recorded";
  if (status === "client_validated" || status === "in_review" || status === "evidence_uploaded") return "client_provided_evidence";
  if (status === "rejected" || status === "expired") return "not_supported";
  return "screening_only";
}

export function createDemoValidationEvidence(projectKey: string): ValidationEvidence[] {
  if (!demoProjectKeys.includes(projectKey)) return [];
  const now = nowIso();
  return placeholderTitles.map((title, index) => ({
    id: `validation-placeholder-${projectKey}-${index + 1}`,
    projectId: null,
    projectKey,
    linkedAoiIds: [],
    linkedAnalysisIds: [],
    linkedReportIds: [],
    linkedDataRoomAssetIds: [],
    linkedEvidenceFileIds: [],
    sourceCategory: index === 2 ? "broker_comparable" : "client_uploaded_document",
    sourceName: "GeoAI sample validation placeholder",
    accessMode: "planned_validation",
    validationStatus: "evidence_requested",
    confidence: "unknown",
    allowedClaimLevel: "screening_only",
    title,
    description: "Placeholder gap only. This is not uploaded, client-validated or official evidence.",
    limitations: ["Placeholder gap only.", "Does not support ownership, zoning, cadastral, planning or valuation claims."],
    allowedClaims: ["Validation evidence is required before decision-grade use."],
    forbiddenClaims: ["ownership verified", "zoning approved", "official parcel boundary", "certified valuation"],
    caveat: validationRequiredCaveat,
    createdAt: now,
    updatedAt: now
  }));
}

export async function listValidationEvidence(filters: { projectId?: string | null; projectKey?: string | null; limit?: number } = {}) {
  const stored = localList<ValidationEvidence>(validationStore, filters);
  const projectKey = filters.projectKey ?? "";
  const seeded = createDemoValidationEvidence(projectKey);
  const storedIds = new Set(stored.data.map((item) => item.id));
  return {
    ...stored,
    data: [...stored.data, ...seeded.filter((item) => !storedIds.has(item.id))].slice(0, filters.limit ?? 50)
  };
}

export async function createValidationEvidence(input: Partial<ValidationEvidence> & Pick<ValidationEvidence, "projectKey" | "title" | "sourceCategory">) {
  const now = nowIso();
  const validationStatus = input.validationStatus ?? "evidence_uploaded";
  return localCreate<ValidationEvidence>(validationStore, {
    id: input.id ?? `validation-${input.projectKey}-${Date.now()}`,
    organizationId: input.organizationId ?? null,
    projectId: input.projectId ?? null,
    projectKey: input.projectKey,
    linkedAoiIds: input.linkedAoiIds ?? [],
    linkedAnalysisIds: input.linkedAnalysisIds ?? [],
    linkedReportIds: input.linkedReportIds ?? [],
    linkedDataRoomAssetIds: input.linkedDataRoomAssetIds ?? [],
    linkedEvidenceFileIds: input.linkedEvidenceFileIds ?? [],
    sourceCategory: input.sourceCategory,
    sourceName: input.sourceName ?? "Validation evidence metadata",
    accessMode: input.accessMode ?? "client_provided",
    validationStatus,
    confidence: input.confidence ?? "unknown",
    allowedClaimLevel: input.allowedClaimLevel ?? levelForStatus(validationStatus),
    title: input.title,
    description: input.description ?? "Validation evidence metadata registered for review.",
    documentDate: input.documentDate ?? null,
    reviewedBy: input.reviewedBy ?? null,
    reviewedAt: input.reviewedAt ?? null,
    expiryDate: input.expiryDate ?? null,
    referenceId: input.referenceId ?? null,
    fileName: input.fileName ?? null,
    fileSizeBytes: input.fileSizeBytes ?? null,
    mimeType: input.mimeType ?? null,
    sourceUrl: input.sourceUrl ?? null,
    limitations: input.limitations ?? ["Evidence must be reviewed before changing claim posture."],
    allowedClaims: input.allowedClaims ?? ["Client-provided evidence may be referenced only with caveats after review."],
    forbiddenClaims: input.forbiddenClaims ?? ["GeoAI certifies ownership", "zoning approval", "certified valuation"],
    caveat: input.caveat ?? validationRequiredCaveat,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
}

export async function getValidationEvidence(id: string) {
  return localGet<ValidationEvidence>(validationStore, id);
}

export async function updateValidationEvidence(id: string, patch: Partial<ValidationEvidence>) {
  const validationStatus = patch.validationStatus;
  return localUpdate<ValidationEvidence>(validationStore, id, {
    ...patch,
    allowedClaimLevel: validationStatus ? levelForStatus(validationStatus) : patch.allowedClaimLevel,
    caveat: patch.caveat ?? validationRequiredCaveat
  });
}

export async function deleteValidationEvidence(id: string) {
  return localDelete(validationStore, id);
}
