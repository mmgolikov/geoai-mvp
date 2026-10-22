"use client";

import dynamic from "next/dynamic";
import { DevkitWorkspaceClient } from "./workspace-client";
import type { DevkitWorkflowProps } from "./workflow";

const Design = dynamic(() => import("./design-panel").then(module => module.DevkitDesignPanel));
const Finance = dynamic(() => import("./finance-panel").then(module => module.DevkitFinanceProjectPanel));
const Evidence = dynamic(() => import("./evidence-stage").then(module => module.DevkitEvidenceStage));
const Export = dynamic(() => import("./export-panel").then(module => module.DevkitExportPanel));

const slots: DevkitWorkflowProps["slots"] = {
  evidence: context => <Evidence project={context.project} locale={context.locale} onChange={context.onProjectChange} />,
  concepts: context => <Design project={context.project} locale={context.locale} onChange={context.onProjectChange} />,
  finance: context => <Finance project={context.project} locale={context.locale} onChange={context.onProjectChange} />,
  kit: context => context.savedSnapshot
    ? <Export project={context.savedSnapshot} locale={context.locale} />
    : <p role="status">{context.locale === "ru" ? "Сохраните текущую версию перед подготовкой комплекта." : "Save the current version before preparing the kit."}</p>
};

export function DevkitConnectedWorkspace() {
  return <DevkitWorkspaceClient slots={slots} onChooseAoi={() => window.location.assign("/prototype/point-to-object")} />;
}
