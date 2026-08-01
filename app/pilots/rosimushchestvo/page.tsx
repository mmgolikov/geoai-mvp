import type { Metadata } from "next";
import { ImplementationBaselineShell } from "@/src/pilots/rosimushchestvo/ui/implementation-baseline-shell";

export const metadata: Metadata = {
  title: "GeoAI — Федеральное имущество",
  description: "Демонстрационный контур предварительного анализа федерального имущества.",
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
  return <ImplementationBaselineShell />;
}
