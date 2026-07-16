import { MfaPanel } from "@/components/auth/mfa-panel";
import { TopNavigation } from "@/components/top-navigation";

export default function MfaPage() {
  return (
    <main className="min-h-screen bg-surface">
      <TopNavigation />
      <MfaPanel />
    </main>
  );
}
