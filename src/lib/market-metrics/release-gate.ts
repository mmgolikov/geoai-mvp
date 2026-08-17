import type { MarketMetricsReleaseGate } from "@/src/lib/market-metrics/types";

export const MARKET_METRICS_SAMPLE_RELEASE_GATE: MarketMetricsReleaseGate = Object.freeze({
  structurallyValid: true,
  screeningContextAvailable: true,
  decisionUse: "blocked",
  blockers: Object.freeze([
    "Source-backed decision scoring is blocked until rights, custody, freshness and validation evidence pass the release gate."
  ])
});

export const MARKET_METRICS_FALLBACK_RELEASE_GATE: MarketMetricsReleaseGate = Object.freeze({
  structurallyValid: false,
  screeningContextAvailable: false,
  decisionUse: "blocked",
  blockers: Object.freeze([
    "No imported market-metrics release is attached to this fallback context."
  ])
});

export function isMarketMetricsDecisionUseAllowed(
  gate: MarketMetricsReleaseGate | null | undefined
) {
  return gate?.structurallyValid === true && gate.decisionUse === "allowed" && gate.blockers.length === 0;
}
