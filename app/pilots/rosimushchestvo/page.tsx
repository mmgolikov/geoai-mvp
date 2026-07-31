import type { Metadata } from "next";
import { RosimushchestvoPilotShell } from "@/src/pilots/rosimushchestvo/ui/pilot-shell";

export const metadata: Metadata = {
  title: "GeoAI · Росимущество: Москва · Prototype v1",
  description: "Изолированный демонстрационный контур предварительного анализа синтетического портфеля объектов Москвы.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};

export default function RosimushchestvoPilotPage() {
  return <RosimushchestvoPilotShell />;
}
