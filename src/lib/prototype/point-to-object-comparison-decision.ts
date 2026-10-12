import type { LiveResolvedObjectContext } from "../../../components/point-to-object/live-types";
import type { PointObjectFindCandidate } from "./point-to-object-find-contract";
import { comparisonInsightMatchesSubmission, parsePointObjectComparisonInsight, type PointObjectComparisonInsight } from "./point-to-object-comparison-core";
import { boundPointObjectComparisonInsight } from "./point-to-object-comparison-state";
import { normalizedContextMatchesProfile, parseNormalizedPointObjectContext, type PointObjectNormalizedContext } from "./point-to-object-normalized-context";
import { parsePublicEvidenceReceipt } from "./point-to-object-evidence-receipt";
import { nominatimLocale } from "./point-to-object-markets";

type Intent = { locale: "en" | "ru"; role: string; scenario: string };
type Observation = { count: number; denominator: number; sharePct: number; nearestM: number | null };
export type ComparisonDecision = {
  method: "held_sample_decision_checks_not_ai";
  candidates: Array<{ id: string; label: string; evidencePackHash: string; contextResponseHash: string; acquiredAt: string;
    daily: Observation; transit: Observation; business: Observation; accessCheck: string; businessCheck: string }>;
  countShareContrast: string | null;
  visitCondition: string;
};

function observation(context: PointObjectNormalizedContext, group: "retail_daily_needs" | "transport" | "commercial"): Observation | null {
  const count = context.metrics.find(metric => metric.id === `${group}.count`);
  const share = context.metrics.find(metric => metric.id === `${group}.share`);
  const nearest = context.metrics.find(metric => metric.id === `${group}.nearest`);
  if (!context.sampleSize || !count || count.status !== "derived" || count.value === null || count.unit !== "count" || count.method !== "mapped_feature_count" ||
      !share || share.status !== "derived" || share.value === null || share.unit !== "%" || share.method !== "share_of_returned_features" ||
      !nearest || nearest.unit !== "m" || nearest.method !== "straight_line_to_returned_center") return null;
  return { count: count.value, denominator: context.sampleSize, sharePct: Math.round(count.value / context.sampleSize * 1_000) / 10,
    nearestM: nearest.status === "derived" ? nearest.value : null };
}

/** A local complement to immutable saved AI prose, never a new model result.
 * Reuses existing admission, then requires ordered IDs/hash/label/locale and
 * validated held profile/scope/anchor. Expired reuse leases remain historical
 * evidence; no refresh, current-data promise, score or overall winner. Unknown,
 * capped, unequal-method and unbound samples cannot support this action block. */
export function buildComparisonDecision(insight: PointObjectComparisonInsight | null, intent: Intent, candidates: PointObjectFindCandidate[], contexts: Record<string, LiveResolvedObjectContext>, stale = false): ComparisonDecision | null {
  if (stale || !parsePointObjectComparisonInsight(insight) || !boundPointObjectComparisonInsight(insight, intent, candidates, contexts)) return null;
  const held = candidates.map(candidate => contexts[candidate.sourceFeatureId]);
  if (!comparisonInsightMatchesSubmission(insight, intent, held.map(context => ({ sourceFeatureId: context.sourceFeatureId, evidencePackHash: context.evidenceReceipt?.evidencePackHash ?? "", label: context.name })))) return null;
  const normalized: PointObjectNormalizedContext[] = [];
  for (let index = 0; index < held.length; index++) {
    const context = held[index], candidate = candidates[index], receipt = parsePublicEvidenceReceipt(context.evidenceReceipt);
    const sample = parseNormalizedPointObjectContext(context.normalizedContext);
    if (!receipt || receipt.lookupSourceFeatureId !== candidate.sourceFeatureId || receipt.sourceLocale !== nominatimLocale(intent.locale) ||
        !sample || sample.subjectId !== candidate.sourceFeatureId || sample.scope.kind !== "point_radius" || sample.scope.radiusM !== 400 || !sample.scope.anchor ||
        sample.scope.anchor[0] !== Number(candidate.longitude.toFixed(6)) || sample.scope.anchor[1] !== Number(candidate.latitude.toFixed(6)) ||
        sample.coverage !== "available" || sample.capReached || !sample.sampleSize || !sample.source.responseHash || !sample.source.acquiredAt ||
        !normalizedContextMatchesProfile(sample, context.geoContext) || sample.sampleSize !== context.geoContext.sampleSize ||
        Date.parse(sample.source.acquiredAt) > Date.parse(insight.generatedAt) ||
        sample.source.observedAt !== null && Date.parse(sample.source.observedAt) > Date.parse(sample.source.acquiredAt)) return null;
    normalized.push(sample);
  }
  const times = normalized.map(context => Date.parse(context.source.acquiredAt!));
  const updates = normalized.flatMap(context => context.source.observedAt === null ? [] : [Date.parse(context.source.observedAt)]);
  if (Math.max(...times) - Math.min(...times) > 15 * 60_000 || updates.length > 1 && Math.max(...updates) - Math.min(...updates) > 15 * 60_000) return null;
  const ru = intent.locale === "ru";
  const items: ComparisonDecision["candidates"] = [];
  for (let index = 0; index < normalized.length; index++) {
    const context = normalized[index], daily = observation(context, "retail_daily_needs"), transit = observation(context, "transport"), business = observation(context, "commercial");
    if (!daily || !transit || !business) return null;
    const distancesKnown = daily.nearestM !== null && transit.nearestM !== null;
    items.push({ id: candidates[index].sourceFeatureId, label: held[index].name ?? candidates[index].label, evidencePackHash: held[index].evidenceReceipt!.evidencePackHash,
      contextResponseHash: context.source.responseHash!, acquiredAt: context.source.acquiredAt!, daily, transit, business,
      accessCheck: distancesKnown ? (ru
        ? `Проверьте реальные входы и проходимые связи с сервисом (${daily.nearestM} м до центра записи) и транспортом (${transit.nearestM} м); подтвердите, что функции действуют.`
        : `Check actual entrances and usable connections to the service (${daily.nearestM} m to its record centre) and transit (${transit.nearestM} m); confirm both functions operate.`)
        : (ru ? "Близость сервиса или транспорта неизвестна. Сначала установите действующие функции, входы и связи; очередность выезда по расстояниям не определена." : "Service or transit proximity is unknown. Establish operating functions, entrances and connections first; distance-based visit order is not assessed."),
      businessCheck: ru ? `Уточните фактические офисные/деловые функции ${business.count} записей деловой группы OSM; группа шире офисов и не измеряет спрос.` : `Verify actual office/business uses behind ${business.count} OSM business-group records; this group is broader than offices and does not measure demand.` });
  }
  let countShareContrast: string | null = null;
  if (items.length === 2) {
    const [a, b] = items;
    const countDirection = Math.sign(a.daily.count - b.daily.count), shareDirection = Math.sign(a.daily.count / a.daily.denominator - b.daily.count / b.daily.denominator);
    if (countDirection !== 0 && shareDirection !== 0 && countDirection !== shareDirection) {
      const more = countDirection > 0 ? a : b, largerShare = shareDirection > 0 ? a : b;
      countShareContrast = ru ? `${more.label}: больше записей сервисов (${more.daily.count}); ${largerShare.label}: выше доля своей выборки (${largerShare.daily.sharePct}%). Количество и доля здесь направлены противоположно.` : `${more.label} has more service records (${more.daily.count}); ${largerShare.label} has a larger share of its own sample (${largerShare.daily.sharePct}%). Count and share point in opposite directions here.`;
    }
  }
  const probe = items.find(item => item.daily.nearestM !== null && item.transit.nearestM !== null && items.every(other => other === item || other.daily.nearestM !== null && other.transit.nearestM !== null && item.daily.nearestM! < other.daily.nearestM && item.transit.nearestM! < other.transit.nearestM));
  const visitCondition = probe ? (ru
    ? `Если следующий фильтр — связи с сервисами и транспортом, начните проверку с «${probe.label}»: центры записей ближе. Сохраните приоритет выезда только если действующие функции и реальные маршруты от входа подтверждают преимущество над другими кандидатами; закрытый сервис или барьер меняет очередность.`
    : `If service and transit connections are your next filter, start verification at ${probe.label}: record centres are nearer. Keep that visit first only if operating functions and actual entrance routes confirm the advantage over the other candidates; an inactive service or barrier changes the order.`)
    : (ru ? "Если следующий фильтр — связи с сервисами и транспортом, подтвердите действующие функции и реальные маршруты от входов. Приоритет выезда меняется только по проверенным связям; эти расстояния не определяют его однозначно." : "If service and transit connections are your next filter, verify operating functions and actual entrance routes. Change visit priority only on verified connections; these distances do not determine it unambiguously.");
  return { method: "held_sample_decision_checks_not_ai", candidates: items, countShareContrast, visitCondition };
}
