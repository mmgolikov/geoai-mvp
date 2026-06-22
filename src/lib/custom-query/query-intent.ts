export type CustomQueryIntentName =
  | "what_to_build"
  | "site_suitability"
  | "investment_decision"
  | "risk_review"
  | "comparison_preference"
  | "due_diligence"
  | "construction_monitoring"
  | "climate_risk"
  | "custom";

export type CustomQueryIntent = {
  intent: CustomQueryIntentName;
  language: "en" | "ru" | "mixed" | "unknown";
  normalizedQuestion: string;
  decisionQuestion: string;
  requestedOutput: "recommendation" | "ranking" | "risk_list" | "validation_checklist" | "memo" | "custom";
  confidence: "high" | "medium" | "low";
};

export function normalizeCustomQueryText(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function detectLanguage(normalized: string): CustomQueryIntent["language"] {
  const hasCyrillic = /[а-яё]/i.test(normalized);
  const hasLatin = /[a-z]/i.test(normalized);

  if (hasCyrillic && hasLatin) return "mixed";
  if (hasCyrillic) return "ru";
  if (hasLatin) return "en";
  return normalized ? "unknown" : "unknown";
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function getIntentLabel(intent: CustomQueryIntentName, language: CustomQueryIntent["language"]) {
  if (language === "ru") {
    const labels: Record<CustomQueryIntentName, string> = {
      what_to_build: "Что лучше строить на выбранном участке?",
      site_suitability: "Насколько выбранный участок подходит под задачу?",
      investment_decision: "Стоит ли рассматривать выбранный участок для инвестиций?",
      risk_review: "Какие ключевые риски нужно проверить?",
      comparison_preference: "Какой вариант выглядит сильнее и почему?",
      due_diligence: "Что нужно проверить до решения?",
      construction_monitoring: "Как организовать мониторинг строительства?",
      climate_risk: "Какие климатические и физические риски нужно учесть?",
      custom: "Как ответить на пользовательский вопрос по выбранной локации?"
    };

    return labels[intent];
  }

  const labels: Record<CustomQueryIntentName, string> = {
    what_to_build: "What should be built or prioritized here?",
    site_suitability: "How suitable is the selected site for the intended use?",
    investment_decision: "Should this site be considered for investment?",
    risk_review: "What are the key risks to review?",
    comparison_preference: "Which option is stronger and why?",
    due_diligence: "What should be validated before a decision?",
    construction_monitoring: "How should this site be monitored during construction?",
    climate_risk: "What climate and physical risks need attention?",
    custom: "How should the user-specific spatial question be answered?"
  };

  return labels[intent];
}

export function detectCustomQueryIntent(query: string): CustomQueryIntent {
  const normalizedQuestion = normalizeCustomQueryText(query);
  const normalized = normalizedQuestion.toLowerCase();
  const language = detectLanguage(normalizedQuestion);

  if (!normalizedQuestion) {
    return {
      intent: "custom",
      language,
      normalizedQuestion,
      decisionQuestion: "No custom query provided.",
      requestedOutput: "custom",
      confidence: "low"
    };
  }

  let intent: CustomQueryIntentName = "custom";
  let requestedOutput: CustomQueryIntent["requestedOutput"] = "custom";
  let confidence: CustomQueryIntent["confidence"] = "medium";

  if (
    includesAny(normalized, [
      "что лучше тут строить",
      "что построить",
      "что лучше строить",
      "какой объект лучше",
      "what should we build",
      "what to build",
      "best use",
      "build here",
      "develop here"
    ])
  ) {
    intent = "what_to_build";
    requestedOutput = "recommendation";
    confidence = "high";
  } else if (
    includesAny(normalized, [
      "какой вариант лучше",
      "сравни",
      "сравнить",
      "лучший вариант",
      "which site is better",
      "which option is better",
      "compare",
      "better option"
    ])
  ) {
    intent = "comparison_preference";
    requestedOutput = "ranking";
    confidence = "high";
  } else if (
    includesAny(normalized, [
      "стоит ли инвестировать",
      "покупать или нет",
      "инвестировать",
      "покупать",
      "should we invest",
      "investment decision",
      "buy or not",
      "underwriting",
      "finance this"
    ])
  ) {
    intent = "investment_decision";
    requestedOutput = "recommendation";
    confidence = "high";
  } else if (
    includesAny(normalized, [
      "что проверить",
      "проверить перед",
      "due diligence",
      "validate before",
      "what should we validate",
      "what should a bank validate",
      "bank validate",
      "lender"
    ])
  ) {
    intent = "due_diligence";
    requestedOutput = "validation_checklist";
    confidence = "high";
  } else if (
    includesAny(normalized, [
      "какие риски",
      "ключевые риски",
      "риск",
      "risks",
      "risk review",
      "key risks",
      "constraints"
    ])
  ) {
    intent = "risk_review";
    requestedOutput = "risk_list";
    confidence = "high";
  } else if (
    includesAny(normalized, [
      "климат",
      "жара",
      "наводнение",
      "затопление",
      "coastal",
      "flood",
      "heat",
      "climate",
      "insurance"
    ])
  ) {
    intent = "climate_risk";
    requestedOutput = "risk_list";
    confidence = "high";
  } else if (
    includesAny(normalized, [
      "строй",
      "строительство",
      "мониторинг",
      "construction",
      "progress",
      "monitoring",
      "satellite",
      "drone"
    ])
  ) {
    intent = "construction_monitoring";
    requestedOutput = "memo";
    confidence = "medium";
  } else if (
    includesAny(normalized, [
      "подходит",
      "suitable",
      "suitability",
      "fit",
      "location quality"
    ])
  ) {
    intent = "site_suitability";
    requestedOutput = "recommendation";
    confidence = "medium";
  }

  return {
    intent,
    language,
    normalizedQuestion,
    decisionQuestion: getIntentLabel(intent, language),
    requestedOutput,
    confidence
  };
}
