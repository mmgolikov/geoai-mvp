import { LoginPanel } from "@/components/auth/login-panel";
import { TopNavigation } from "@/components/top-navigation";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <LoginPanel />
    </main>
  );
}
