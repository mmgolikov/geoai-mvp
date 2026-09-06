import type { Metadata } from "next";

import { PointToObjectPrototype } from "@/components/point-to-object/prototype-client";

export const metadata: Metadata = {
  title: "Location intelligence · GeoAI",
  description: "Select a real mapped object and explore its open-data context with GeoAI."
};

export default function PointToObjectPrototypePage() {
  return <PointToObjectPrototype />;
}
