import Link from "next/link";
import { AccessStatusBadge } from "@/components/auth/access-status-badge";
import { ProductNavigation } from "@/components/product-navigation";

export function TopNavigation() {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-line bg-white/90 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center justify-between">
          <Link href="/" className="flex min-h-10 min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
              G
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold leading-5 text-ink">GeoAI</div>
              <div className="truncate text-xs font-medium text-muted">
                Spatial decision intelligence
              </div>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ProductNavigation />
          <AccessStatusBadge />
        </div>
      </div>
    </header>
  );
}
