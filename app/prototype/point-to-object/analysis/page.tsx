import type { Metadata } from "next";

import { PointToObjectAnalysis } from "@/components/point-to-object/analysis-client";
import { requirePilotPageIdentity } from "@/src/lib/auth/require-pilot-page-identity";

export const metadata: Metadata = {
  title: "Location analysis · GeoAI",
  description: "A source-bounded GeoAI analysis of a selected mapped location."
};

export default async function PointToObjectAnalysisPage() {
  await requirePilotPageIdentity("/prototype/point-to-object/analysis");
  return <PointToObjectAnalysis />;
}
