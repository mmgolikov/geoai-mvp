import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";
import "./workspace-responsive-fixes.css";
import "./workspace-copy-safety.css";

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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
