import type { Metadata } from "next";

import { PointToObjectAnalysis } from "@/components/point-to-object/analysis-client";

export const metadata: Metadata = {
  title: "Location analysis · GeoAI",
  description: "A source-bounded GeoAI analysis of a selected mapped location."
};

export default function PointToObjectAnalysisPage() {
  return <PointToObjectAnalysis />;
}
