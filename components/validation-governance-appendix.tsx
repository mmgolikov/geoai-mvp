import { officialConnectorReadiness } from "@/src/lib/validation/official-connector-readiness";
import { buildValidationSummary } from "@/src/lib/validation/validation-summary";
import { validationRequiredCaveat, type ValidationSummary } from "@/src/types/validation";
import type { EvidenceFileAsset } from "@/src/types/storage";
import type { EvidenceReviewSummary } from "@/src/types/evidence-review";

type ValidationGovernanceAppendixProps = {
  projectName?: string | null;
  summary?: ValidationSummary | null;
  evidenceFiles?: EvidenceFileAsset[];
  reviewSummaries?: EvidenceReviewSummary[];
  compact?: boolean;
  printMode?: boolean;
};

function claimLevelLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function ValidationGovernanceAppendix({
  projectName,
  summary,
  evidenceFiles = [],
  reviewSummaries = [],
  compact = false,
  printMode = false
}: ValidationGovernanceAppendixProps) {
  const validationSummary = summary ?? buildValidationSummary([]);
  const connectors = officialConnectorReadiness.slice(0, compact ? 3 : 5);
  const cardClass = printMode
    ? "rounded-md border border-line p-3"
    : "rounded-md border border-line bg-white p-4";

  return (
    <div className={printMode ? "space-y-3 text-sm" : "rounded-md border border-line bg-surface p-5"}>
      <div className={printMode ? "space-y-1" : "flex flex-wrap items-start justify-between gap-3"}>
        <div>
          <p className="font-semibold text-ink">Validation posture</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {projectName ?? "Current project"} remains a screening workflow until client or official evidence is recorded.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-muted">
          {claimLevelLabel(validationSummary.highestAllowedClaimLevel)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className={cardClass}>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Evidence</span>
          <p className="mt-2 text-xl font-semibold text-ink">{validationSummary.totalEvidence}</p>
        </div>
        <div className={cardClass}>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">In review</span>
          <p className="mt-2 text-xl font-semibold text-ink">{validationSummary.inReviewCount}</p>
        </div>
        <div className={cardClass}>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Client validated</span>
          <p className="mt-2 text-xl font-semibold text-ink">{validationSummary.clientValidatedCount}</p>
        </div>
        <div className={cardClass}>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Official validated</span>
          <p className="mt-2 text-xl font-semibold text-ink">{validationSummary.officialValidatedCount}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className={cardClass}>
          <p className="font-semibold text-ink">Required validation gaps</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
            {(validationSummary.requiredValidationGaps.length > 0
              ? validationSummary.requiredValidationGaps
              : ["No active official validation gaps recorded."]).slice(0, compact ? 3 : 5).map((item, index) => (
              <li key={`validation-gap-${index}`}>{item}</li>
            ))}
          </ul>
        </div>

        <div className={cardClass}>
          <p className="font-semibold text-ink">Official connector readiness</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
            {connectors.map((connector) => (
              <li key={connector.id}>
                <span className="font-semibold text-ink">{connector.name}:</span>{" "}
                {claimLevelLabel(connector.currentStatus)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4">
        <p className="font-semibold text-ink">Evidence review status</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {reviewSummaries.length > 0 ? (
            reviewSummaries.slice(0, compact ? 4 : 8).map((review) => (
              <div key={review.validationEvidenceId} className={cardClass}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold text-ink">{claimLevelLabel(review.latestStatus)}</p>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-semibold text-brand">
                    {claimLevelLabel(review.allowedClaimLevel)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {review.latestReviewer ? `Reviewer: ${review.latestReviewer}. ` : ""}
                  {review.latestReviewedAt ? `Reviewed: ${review.latestReviewedAt.slice(0, 10)}. ` : ""}
                  {review.expiresAt ? `Expires: ${review.expiresAt.slice(0, 10)}.` : "No expiry recorded."}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">{review.requiredNextAction}</p>
              </div>
            ))
          ) : (
            <div className={cardClass}>
              <p className="text-sm leading-6 text-muted">No review decision history is attached to this report yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="font-semibold text-ink">Linked evidence files</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {evidenceFiles.length > 0 ? (
            evidenceFiles.slice(0, compact ? 4 : 8).map((file) => (
              <div key={file.id} className={cardClass}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold text-ink">{file.fileName}</p>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-semibold text-brand">
                    {claimLevelLabel(file.objectStatus)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {file.mimeType} / {claimLevelLabel(file.validationStatus)} / {claimLevelLabel(file.storageProvider)}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Download: {file.storageProvider === "supabase_storage" && file.objectStatus === "available"
                    ? "available via signed URL"
                    : "unavailable in metadata-only fallback"}
                </p>
              </div>
            ))
          ) : (
            <div className={cardClass}>
              <p className="text-sm leading-6 text-muted">No linked evidence file metadata is attached to this report.</p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">{validationRequiredCaveat}</p>
    </div>
  );
}
