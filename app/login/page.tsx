import { LoginPanel } from "@/components/auth/login-panel";
import { TopNavigation } from "@/components/top-navigation";
import { getSafeAuthRedirectPath } from "@/src/lib/auth/redirect-path";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ intent?: string | string[]; next?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const intent = resolvedSearchParams?.intent;
  if (intent === "request") redirect("/request-access");
  const requestedNext = resolvedSearchParams?.next;
  const destination = getSafeAuthRedirectPath(
    typeof requestedNext === "string" ? requestedNext : undefined,
    "/workspace"
  );

  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <LoginPanel destination={destination} />
    </main>
  );
}
