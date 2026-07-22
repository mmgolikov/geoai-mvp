import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";
import "./product-system-v3.css";
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

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist"
});

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geist.variable}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
