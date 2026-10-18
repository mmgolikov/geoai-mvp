"use client";

import type { PointObjectAnalysisGoal } from "./live-types";
import type { PointObjectAnalysisScenario } from "@/src/lib/prototype/point-to-object-ai-provenance";
import type { PointObjectNormalizedContext } from "@/src/lib/prototype/point-to-object-normalized-context";
import { buildD2ScenarioScreening } from "@/src/lib/prototype/d2-scenario-screening";
import { D2SourceLinks } from "./d2-source-evidence";

export function D2ScenarioScreening({ context, subjectName, goal, scenario, locale }: { context: PointObjectNormalizedContext; subjectName: string; goal: PointObjectAnalysisGoal; scenario: PointObjectAnalysisScenario; locale: "en" | "ru" }) {
  const ru = locale === "ru";
  const cards = buildD2ScenarioScreening(context, subjectName, goal, scenario, locale);
  if (!cards.length) return null;
  return <section className="min-w-0 rounded-[20px] border border-line bg-white p-5 sm:p-7" data-testid="d2-scenario-screening" data-analysis-goal={goal} data-analysis-scenario={scenario}>
    <h2 className="text-lg font-bold text-[#243447]">{ru ? "Проверки вариантов по сохранённым данным" : "Option checks from retained evidence"}</h2>
    <p className="mt-1 text-xs leading-5 text-[#52657a]">{ru ? "Производный скрининг · последовательность проверок по данным источников. Полезность вариантов, спрос, права и допустимый объём ещё не установлены." : "Derived screening · an evidence-based sequence of checks. Option feasibility, demand, rights and permitted volume remain unestablished."}</p>
    <ol className="mt-4 grid min-w-0 gap-3 xl:grid-cols-2">{cards.map((card, index) => <li key={card.id} className="min-w-0 rounded-xl border border-[#dce6e3] p-4" data-testid={`d2-screening-${card.id}`}>
      <h3 className="text-sm font-bold leading-6 text-[#243447]"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e7f3f1] text-xs text-[#087f8c]" aria-hidden="true">{index + 1}</span>{card.title}</h3>
      <p className="mt-3 break-words text-xs leading-5 text-[#52657a]" dir="auto">{card.fact}</p>
      <p className="mt-3 text-sm leading-6 text-[#344054]">{card.consequence}</p>
      <p className="mt-3 text-xs leading-5 text-[#344054]"><span className="font-bold text-[#087f8c]">{ru ? "Следующая проверка: " : "Next check: "}</span>{card.nextCheck}</p>
      <D2SourceLinks references={card.evidenceRefs} />
    </li>)}</ol>
  </section>;
}
