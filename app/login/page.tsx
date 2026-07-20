import { LoginPanel } from "@/components/auth/login-panel";
import { TopNavigation } from "@/components/top-navigation";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ intent?: string | string[] }>;
}) {
  const intent = (await searchParams)?.intent;
  if (intent === "request") redirect("/request-access");

  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <LoginPanel />
    </main>
  );
}
