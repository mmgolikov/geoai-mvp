import type { Metadata } from "next";

import { GeoAILandingPage } from "@/components/landing/geoai-landing-page";

export const metadata: Metadata = {
  title: "GeoAI · Spatial decisions from the map",
  description:
    "Analyse a mapped place, find and compare candidates, create bounded spatial concepts, and keep assumptions visible."
};

export default function HomePage() {
  return <GeoAILandingPage />;
}
