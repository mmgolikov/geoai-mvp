import { officialConnectorReadiness } from "@/src/lib/validation/official-connector-readiness";
import { buildValidationSummary } from "@/src/lib/validation/validation-summary";
import { validationRequiredCaveat, type ValidationSummary } from "@/src/types/validation";

type ValidationGovernanceAppendixProps = {
  projectName?: string | null;
  summary?: ValidationSummary | null;
  compact?: boolean;
  printMode?: boolean;
};

function claimLevelLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function ValidationGovernanceAppendix({
  projectName,
  summary,
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

      <p className="mt-4 text-xs leading-5 text-muted">{validationRequiredCaveat}</p>
    </div>
  );
}
