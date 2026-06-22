import type { CustomQueryIntent, CustomQueryIntentName } from "@/src/lib/custom-query/query-intent";
import { detectCustomQueryIntent } from "@/src/lib/custom-query/query-intent";
import type {
  AnalysisScenarioId,
  ComparisonResult,
  ExpressAnalysis,
  SelectedDemoObject,
  SelectedPoint
} from "@/src/types/geo";

export type CustomQueryAnswer = {
  question: string;
  intent: CustomQueryIntentName;
  shortAnswer: string;
  recommendation: string;
  reasoning: string[];
  keyRisks: string[];
  validationNeeded: string[];
  nextActions: string[];
  sourceBasis: string[];
  confidenceNote: string;
};

function formatCoordinate(point: SelectedPoint) {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

function targetName(point: SelectedPoint, selectedObject?: SelectedDemoObject | null) {
  return selectedObject?.name ?? `selected coordinate ${formatCoordinate(point)}`;
}

function scenarioLabel(scenarioId: AnalysisScenarioId) {
  const labels: Record<AnalysisScenarioId, string> = {
    realEstateDevelopment: "Real Estate Development",
    investmentSiteSelection: "Investment Site Selection",
    constructionMonitoring: "Construction Monitoring",
    infrastructureUrbanPlanning: "Infrastructure / Urban Planning",
    climateRisk: "Climate & Risk",
    customQuery: "Custom Query"
  };

  return labels[scenarioId];
}

function isRussian(intent: CustomQueryIntent) {
  return intent.language === "ru" || intent.language === "mixed";
}

function inferLocationProfile(point: SelectedPoint, selectedObject?: SelectedDemoObject | null) {
  const objectName = selectedObject?.name.toLowerCase() ?? "";
  const layerId = selectedObject?.layerId;

  if (objectName.includes("marina") || objectName.includes("palm") || layerId === "premiumRealEstateAreas") {
    return "premium_coastal";
  }

  if (objectName.includes("business bay")) {
    return "business_core";
  }

  if (objectName.includes("south") || point.latitude < 25.05 || layerId === "developmentZones") {
    return "growth_corridor";
  }

  if (layerId === "infrastructureNodes" || layerId === "transportCorridors") {
    return "access_led";
  }

  if (layerId === "constructionSites") {
    return "construction_pipeline";
  }

  if (layerId === "coastalFloodRiskZones" || layerId === "heatRiskZones") {
    return "risk_sensitive";
  }

  return "balanced_screening";
}

function developmentConcept(profile: ReturnType<typeof inferLocationProfile>) {
  switch (profile) {
    case "premium_coastal":
      return {
        concept: "serviced apartments / hospitality / premium residential",
        rationale: "premium coastal positioning and liquidity proxies make a residential-led or serviced-apartment hypothesis more credible than logistics or heavy operational use."
      };
    case "business_core":
      return {
        concept: "office / mixed-use / serviced apartment concept",
        rationale: "central business context supports office, mixed-use and serviced-apartment screening, while traffic, parking and market saturation need validation."
      };
    case "growth_corridor":
      return {
        concept: "residential-led mixed-use or logistics-adjacent development pipeline",
        rationale: "growth-corridor context can support phased residential, mixed-use or logistics-adjacent concepts depending on infrastructure timing and permitted use."
      };
    case "access_led":
      return {
        concept: "access-led commercial, logistics support or transit-oriented mixed-use",
        rationale: "transport and node proximity make access-driven uses more plausible at screening level."
      };
    case "construction_pipeline":
      return {
        concept: "hold / monitor / validate delivery before repositioning",
        rationale: "construction context means progress evidence, schedule risk and delivery status should be validated before a new use concept is chosen."
      };
    case "risk_sensitive":
      return {
        concept: "hold / validate before build",
        rationale: "risk-sensitive context requires climate, drainage, heat and insurance validation before committing to a development concept."
      };
    default:
      return {
        concept: "residential-led mixed-use screening hypothesis",
        rationale: "balanced Dubai access and market signals support a mixed-use hypothesis, subject to official land-use and market validation."
      };
  }
}

function sourceBasisFor(target: string, scenarioId: AnalysisScenarioId) {
  return [
    `Selected target: ${target}.`,
    `Scenario lens: ${scenarioLabel(scenarioId)}.`,
    "Basis: deterministic demo scores, selected geometry, source-lineage cards, market seed/import context where available, and open/sample spatial context.",
    "Not included: official parcel, title, ownership, zoning, FAR, cadastral, valuation or live approval evidence."
  ];
}

function isPremiumPositioningQuery(question: string) {
  const normalized = question.toLowerCase();

  return [
    "elite",
    "premium",
    "luxury",
    "branded residence",
    "branded residences",
    "waterfront",
    "элит",
    "премиум",
    "люкс",
    "люксов",
    "брендирован"
  ].some((keyword) => normalized.includes(keyword));
}

function buildFallbackAnswer(
  intent: CustomQueryIntent,
  point: SelectedPoint,
  scenarioId: AnalysisScenarioId,
  selectedObject?: SelectedDemoObject | null
): CustomQueryAnswer {
  const target = targetName(point, selectedObject);
  const profile = inferLocationProfile(point, selectedObject);
  const concept = developmentConcept(profile);
  const ru = isRussian(intent);
  const basis = sourceBasisFor(target, scenarioId);
  const validationNeeded = ru
    ? [
        "Подтвердить official land-use, FAR / density и planning constraints.",
        "Проверить market comps, demand depth и exit liquidity по утвержденным источникам.",
        "Проверить доступ, инфраструктуру, utility capacity и climate / flood / heat exposure.",
        "Подтвердить ownership, title, encumbrances и legal constraints вне GeoAI."
      ]
    : [
        "Validate official land-use, FAR / density and planning constraints.",
        "Check market comps, demand depth and exit liquidity through approved sources.",
        "Validate access, infrastructure, utility capacity and climate / flood / heat exposure.",
        "Confirm ownership, title, encumbrances and legal constraints outside GeoAI."
      ];
  const confidenceNote = ru
    ? "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    : "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

  if (isPremiumPositioningQuery(intent.normalizedQuestion)) {
    return {
      question: intent.normalizedQuestion,
      intent: intent.intent,
      shortAnswer: ru
        ? `На уровне screening-гипотезы ${target} можно рассматривать через premium / elite positioning lens: premium residential, serviced apartments, branded residence or hospitality-led concept, но только после проверки официальных planning, market comps, buyer profile and ownership constraints.`
        : `At screening level, ${target} can be viewed through a premium / elite positioning lens: premium residential, serviced apartments, branded residence or hospitality-led concept, subject to official planning, market-comps, buyer-profile and ownership validation.`,
      recommendation: ru
        ? "Рекомендация: проверить premium positioning как гипотезу, а не как финальное best-use решение."
        : "Recommendation: test premium positioning as a hypothesis, not as a final best-use decision.",
      reasoning: ru
        ? [
            "Premium/elite query shifts the analysis toward buyer profile, price depth, brand fit, waterfront/lifestyle positioning and liquidity validation.",
            "Selected spatial/market signals can support screening, but do not prove premium demand or permitted use.",
            "A premium concept should be benchmarked against alternative elite locations before commitment."
          ]
        : [
            "The premium/elite query shifts the analysis toward buyer profile, price depth, brand fit, waterfront/lifestyle positioning and liquidity validation.",
            "Selected spatial/market signals can support screening, but do not prove premium demand or permitted use.",
            "A premium concept should be benchmarked against alternative elite locations before commitment."
          ],
      keyRisks: [
        "Premium pricing, demand depth, absorption and exit liquidity require validated market comps.",
        "Permitted use, FAR, density, ownership and brand/operator fit are not validated.",
        "Elite positioning may fail if access, views, amenity quality or competing supply are weaker than assumed."
      ],
      validationNeeded: ru
        ? [
            "Проверить premium transaction/rental comps through DLD / Dubai Pulse or customer-approved sources.",
            "Подтвердить official land-use, FAR, ownership and planning constraints.",
            "Проверить target buyer profile, brand/operator fit, views/access and competing elite locations."
          ]
        : [
            "Validate premium transaction/rental comps through DLD / Dubai Pulse or customer-approved sources.",
            "Confirm official land-use, FAR, ownership and planning constraints.",
            "Test target buyer profile, brand/operator fit, views/access and competing elite locations."
          ],
      nextActions: ru
        ? [
            "Build a premium comps and buyer-profile validation checklist.",
            "Compare against 2-3 alternative elite/waterfront locations.",
            "Prepare a premium-positioning memo with validation gaps and no approval claims."
          ]
        : [
            "Build a premium comps and buyer-profile validation checklist.",
            "Compare against 2-3 alternative elite/waterfront locations.",
            "Prepare a premium-positioning memo with validation gaps and no approval claims."
          ],
      sourceBasis: basis,
      confidenceNote
    };
  }

  if (intent.intent === "what_to_build") {
    return {
      question: intent.normalizedQuestion,
      intent: intent.intent,
      shortAnswer: ru
        ? `На уровне screening-гипотезы для ${target} наиболее логичен ${concept.concept}, но решение должно быть подтверждено официальными land-use, FAR, access, market comps and planning constraints.`
        : `At screening level, ${target} is best framed as a ${concept.concept} hypothesis, subject to official land-use, FAR, access, market-comps and planning validation.`,
      recommendation: ru
        ? `Рекомендация: рассматривать ${concept.concept} как первичную гипотезу, а не как финальное разрешенное использование.`
        : `Recommendation: treat ${concept.concept} as the primary screening direction, not as a final permitted-use conclusion.`,
      reasoning: ru
        ? [
            concept.rationale,
            "Custom Query смещает анализ от общей оценки участка к выбору use concept и validation checklist.",
            "Market/access/risk signals помогают сформировать гипотезу, но не подтверждают разрешенное использование или economics."
          ]
        : [
            concept.rationale,
            "The custom query shifts the analysis from generic site screening to a use-concept recommendation and validation checklist.",
            "Market, access and risk signals can shape the hypothesis but do not validate permitted use or economics."
          ],
      keyRisks: ru
        ? [
            "Permitted use, FAR, density and setbacks are not validated.",
            "Market absorption and pricing may not support the concept without current comps.",
            "Infrastructure, access or climate mitigation cost may change feasibility."
          ]
        : [
            "Permitted use, FAR, density and setbacks are not validated.",
            "Market absorption and pricing may not support the concept without current comps.",
            "Infrastructure, access or climate mitigation cost may change feasibility."
          ],
      validationNeeded,
      nextActions: ru
        ? [
            "Сформировать 2-3 use scenarios и сравнить их по planning, market, access and risk criteria.",
            "Запросить official planning / land-use evidence before concept commitment.",
            "Подготовить short development memo with assumptions, gaps and validation owners."
          ]
        : [
            "Create 2-3 use scenarios and compare them by planning, market, access and risk criteria.",
            "Request official planning / land-use evidence before concept commitment.",
            "Prepare a short development memo with assumptions, gaps and validation owners."
          ],
      sourceBasis: basis,
      confidenceNote
    };
  }

  if (intent.intent === "comparison_preference") {
    return {
      question: intent.normalizedQuestion,
      intent: intent.intent,
      shortAnswer: ru
        ? `${target} можно оценивать как один из вариантов, но выбор лучшего участка требует сравнения ranking, risk, use fit и validation gaps.`
        : `${target} can be screened as a candidate, but choosing the best option requires ranking risk, use fit and validation gaps against alternatives.`,
      recommendation: ru
        ? "Рекомендация: сравнить 2-3 альтернативы до решения, особенно если вопрос касается выбора лучшего варианта."
        : "Recommendation: compare 2-3 alternatives before deciding, especially when the question is about the stronger option.",
      reasoning: [
        "Comparison quality depends on consistent scoring criteria across each site.",
        "The strongest option may change after official planning, market, title and infrastructure validation.",
        "A site can win on liquidity while another wins on development upside or risk control."
      ],
      keyRisks: ["Single-site analysis can overstate confidence without alternatives.", "Official validation may change the ranking."],
      validationNeeded,
      nextActions: ["Add at least two sites to Comparison Set.", "Run comparison with the same scenario and custom query.", "Review winner rationale and alternative trade-offs."],
      sourceBasis: basis,
      confidenceNote
    };
  }

  if (intent.intent === "risk_review" || intent.intent === "climate_risk") {
    return {
      question: intent.normalizedQuestion,
      intent: intent.intent,
      shortAnswer: ru
        ? `Главный ответ: сначала проверить planning/title, infrastructure/access и heat/coastal/flood exposure; без этого ${target} остается screening candidate, а не подтвержденным решением.`
        : `The answer is to validate planning/title, infrastructure/access and heat/coastal/flood exposure first; without that, ${target} remains a screening candidate, not a confirmed decision.`,
      recommendation: ru ? "Рекомендация: перейти в risk validation checklist before investment or design commitment." : "Recommendation: move into a risk validation checklist before investment or design commitment.",
      reasoning: [
        "Risk queries require evidence depth rather than higher-confidence narrative.",
        "Climate, access, title and planning risks can materially change feasibility.",
        "Demo/source-lineage context can prioritize checks but cannot certify exposure."
      ],
      keyRisks: [
        "Official planning, cadastral, title and ownership evidence is not connected.",
        "Heat, flood, drainage and insurance implications are screening-level only.",
        "Market and infrastructure assumptions may change after validation."
      ],
      validationNeeded,
      nextActions: ["Create a risk register for the selected target.", "Assign official/source validation owner for each risk.", "Re-run analysis after validation evidence is loaded."],
      sourceBasis: basis,
      confidenceNote
    };
  }

  if (intent.intent === "investment_decision") {
    return {
      question: intent.normalizedQuestion,
      intent: intent.intent,
      shortAnswer: ru
        ? `${target} можно рассматривать только как preliminary investment candidate; решение покупать/финансировать нельзя делать без title, pricing, liquidity, market comps and planning validation.`
        : `${target} can only be treated as a preliminary investment candidate; buy/finance decisions require title, pricing, liquidity, market-comps and planning validation.`,
      recommendation: ru ? "Рекомендация: proceed to diligence, not commitment." : "Recommendation: proceed to diligence, not commitment.",
      reasoning: [
        "Investment attractiveness depends on price, liquidity, exit depth and permitted use.",
        "Deterministic scores are useful for screening but not an underwriting model.",
        "Alternative sites may offer better risk-adjusted value after official validation."
      ],
      keyRisks: ["Pricing, ownership and encumbrances are not validated.", "Exit liquidity and demand depth require current evidence.", "Planning constraints may alter the investment thesis."],
      validationNeeded,
      nextActions: ["Request title and ownership evidence.", "Benchmark pricing and rent comps.", "Compare conservative/base/upside cases against alternatives."],
      sourceBasis: basis,
      confidenceNote
    };
  }

  return {
    question: intent.normalizedQuestion,
    intent: intent.intent,
    shortAnswer: ru
      ? `Ответ на вопрос формируется как screening hypothesis для ${target}; для решения нужны official/customer-approved validation sources.`
      : `The query is answered as a screening hypothesis for ${target}; official/customer-approved validation sources are required before decisions.`,
    recommendation: ru ? "Рекомендация: использовать ответ как memo layer and validation checklist." : "Recommendation: use the answer as a memo layer and validation checklist.",
    reasoning: ["The custom query reframes the scenario around the user's decision question.", "Current evidence can prioritize next checks but not certify legal, zoning, title or valuation conclusions."],
    keyRisks: ["The user question may require evidence not connected in this MVP.", "Demo/sample/open context should not be treated as official validation."],
    validationNeeded,
    nextActions: ["Define measurable criteria for the query.", "Collect official/customer-approved evidence.", "Re-run the analysis when validation evidence is available."],
    sourceBasis: basis,
    confidenceNote
  };
}

export function createCustomQueryAnswer(args: {
  query: string;
  point: SelectedPoint;
  scenarioId: AnalysisScenarioId;
  selectedObject?: SelectedDemoObject | null;
}) {
  const intent = detectCustomQueryIntent(args.query);
  if (!intent.normalizedQuestion) return null;
  return buildFallbackAnswer(intent, args.point, args.scenarioId, args.selectedObject);
}

export function createComparisonCustomQueryAnswer(args: {
  query: string;
  comparison: ComparisonResult;
}): CustomQueryAnswer | null {
  const intent = detectCustomQueryIntent(args.query);
  if (!intent.normalizedQuestion) return null;

  const winner = args.comparison.winner;
  const runnerUp = args.comparison.items.find((item) => item.item.id !== winner.item.id);
  const ru = isRussian(intent);
  const targetList = args.comparison.items.map((item) => item.item.name).join(", ");
  const basis = [
    `Compared targets: ${targetList}.`,
    "Basis: deterministic comparison scorecards, source-lineage cards, selected geometry and market seed/import context where available.",
    "Not included: official parcel, title, ownership, zoning, FAR, cadastral, valuation or live approval evidence."
  ];

  if (intent.intent === "what_to_build") {
    return {
      question: intent.normalizedQuestion,
      intent: intent.intent,
      shortAnswer: ru
        ? `${winner.item.name} выглядит сильнее как первичная screening option, но development concept должен отличаться по участкам: premium/liquidity sites лучше для residential or serviced apartments, growth-corridor sites лучше для phased mixed-use or logistics-adjacent pipeline.`
        : `${winner.item.name} screens strongest overall, but the build concept should vary by site: premium/liquidity sites suit residential or serviced apartments, while growth-corridor sites suit phased mixed-use or logistics-adjacent pipeline hypotheses.`,
      recommendation: ru
        ? `Рекомендация: выбрать ${winner.item.name} как ведущую опцию для memo, но сравнить use concept per site before commitment.`
        : `Recommendation: carry ${winner.item.name} as the lead memo option, but compare use concepts per site before commitment.`,
      reasoning: [
        `${winner.item.name} wins the current deterministic ranking with ${winner.overallScore}/100 overall score.`,
        runnerUp ? `${runnerUp.item.name} may still be better if its use concept, validation path or delivery timing fits the client priority better.` : "Alternative options may become stronger after official validation.",
        "The query asks for development direction, so the recommendation is framed as a use-concept screen rather than a final planning conclusion."
      ],
      keyRisks: args.comparison.differentiatedRisks.slice(0, 3),
      validationNeeded: [
        "Validate official land-use, FAR, title and planning constraints for each option.",
        "Validate market comps and absorption by proposed use concept.",
        "Confirm access, infrastructure readiness and climate/risk exposure before ranking is final."
      ],
      nextActions: ["Create a concept matrix by site.", "Request official planning validation for the top two options.", "Prepare a decision memo showing liquidity versus development-upside trade-offs."],
      sourceBasis: basis,
      confidenceNote: "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    };
  }

  return {
    question: intent.normalizedQuestion,
    intent: intent.intent,
    shortAnswer: ru
      ? `${winner.item.name} является текущей лучшей screening option, потому что имеет самый сильный risk-adjusted score, но выбор зависит от validation results and client priority.`
      : `${winner.item.name} is the current best screening option because it has the strongest risk-adjusted score, but the final choice depends on validation results and client priority.`,
    recommendation: ru
      ? `Рекомендация: использовать ${winner.item.name} as lead option and keep ${runnerUp?.item.name ?? "the runner-up"} as alternative until validation closes.`
      : `Recommendation: use ${winner.item.name} as the lead option and keep ${runnerUp?.item.name ?? "the runner-up"} as the alternative until validation closes.`,
    reasoning: [
      `${winner.item.name} has the highest overall demo comparison score (${winner.overallScore}/100).`,
      runnerUp ? `${runnerUp.item.name} may be preferable if the decision priority shifts toward ${runnerUp.recommendedUse.toLowerCase()}.` : "Another option may be better if validation changes the assumptions.",
      "The custom query is treated as a decision layer on top of the existing winner/recommendation rather than a replacement for it."
    ],
    keyRisks: args.comparison.differentiatedRisks.slice(0, 4),
    validationNeeded: [
      "Confirm land-use and planning status for each selected option.",
      "Validate market and liquidity assumptions through approved data.",
      "Validate access, infrastructure, climate and legal constraints before final ranking."
    ],
    nextActions: ["Prepare a short comparison memo.", "Assign validation owners by option.", "Re-rank after official/customer-approved evidence is added."],
    sourceBasis: basis,
    confidenceNote: "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  };
}
