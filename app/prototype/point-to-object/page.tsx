import type { Metadata } from "next";

import { PointToObjectPrototype } from "@/components/point-to-object/prototype-client";

export const metadata: Metadata = {
  title: "Location intelligence · GeoAI",
  description: "Select a real mapped object and explore its open-data context with GeoAI."
};

export default async function PointToObjectPrototypePage({ searchParams }: { searchParams: Promise<{ mode?: string | string[] }> }) {
  const { mode } = await searchParams;
  const initialMode = mode === "find" || mode === "create" ? mode : "analyse";
  return <PointToObjectPrototype initialMode={initialMode} />;
}
