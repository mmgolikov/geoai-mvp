import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { PointObjectLocaleProvider } from "@/components/point-to-object/locale-provider";
import { POINT_OBJECT_LOCALE_COOKIE } from "@/src/lib/prototype/point-to-object-i18n";
import { pointObjectLocale } from "@/src/lib/prototype/point-to-object-markets";
import "./globals.css";
import "./product-system-v3.css";
import "./workspace-responsive-fixes.css";
import "./workspace-copy-safety.css";
import "./runtime-design-recovery.css";
import "./runtime-design-recovery-landing.css";
import "./runtime-decision-recovery.css";
import "./founder-ux-runtime-correction.css";
import "./product-system-v322-correction.css";

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

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = pointObjectLocale(cookieStore.get(POINT_OBJECT_LOCALE_COOKIE)?.value);

  return (
    <html lang={locale}>
      <body className={geist.variable}>
        <AuthProvider>
          <PointObjectLocaleProvider initialLocale={locale}>{children}</PointObjectLocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
