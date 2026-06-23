import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoAI",
  description: "AI decision intelligence for spatial assets.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
