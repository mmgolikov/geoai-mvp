import type { Metadata } from "next";

import { PointToObjectPrototype } from "@/components/point-to-object/prototype-client";
import { requirePilotPageIdentity } from "@/src/lib/auth/require-pilot-page-identity";

export const metadata: Metadata = {
  title: "Location intelligence · GeoAI",
  description: "Select a real mapped object and explore its open-data context with GeoAI."
};

export default async function PointToObjectPrototypePage({ searchParams }: { searchParams: Promise<{ mode?: string | string[] }> }) {
  const { mode } = await searchParams;
  const initialMode = mode === "find" || mode === "create" ? mode : "analyse";
  const nextPath = initialMode === "analyse"
    ? "/prototype/point-to-object"
    : `/prototype/point-to-object?mode=${initialMode}`;
  await requirePilotPageIdentity(nextPath);
  return <PointToObjectPrototype initialMode={initialMode} />;
}
