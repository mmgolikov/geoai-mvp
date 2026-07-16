import { RegisterPanel } from "@/components/auth/register-panel";
import { TopNavigation } from "@/components/top-navigation";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <RegisterPanel />
    </main>
  );
}
