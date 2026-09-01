import type { Metadata } from "next";

import { PointToObjectPrototype } from "@/components/point-to-object/prototype-client";

export const metadata: Metadata = {
  title: "Point to object · GeoAI Candidate",
  description: "A bounded source-backed point-to-object selection prototype."
};

export default function PointToObjectPrototypePage() {
  return <PointToObjectPrototype />;
}
