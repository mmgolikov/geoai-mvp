import Link from "next/link";
import { AccessStatusBadge } from "@/components/auth/access-status-badge";
import { IdentitySymbol } from "@/components/design-system/identity-symbol";
import { ProductNavigation } from "@/components/product-navigation";

export function TopNavigation() {
  return (
    <header
      data-product-shell
      data-design-system-version="3.2"
      data-figma-node="219:425"
      data-figma-variants="219:356 219:368 219:380 1733:186 1755:472 1755:497 1755:522 1755:547 219:392 219:403 219:414 1733:199"
      className="geoai-v32 sticky top-0 z-20 h-product-header shrink-0 border-b border-line bg-white"
    >
      <div className="flex h-full min-w-0 items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <Link
            href="/"
            aria-label="GeoAI home"
            className="flex min-h-10 min-w-0 items-center gap-2.5 rounded-control focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <IdentitySymbol />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-bold leading-[22px] text-ink">GeoAI</span>
              <span className="block whitespace-nowrap text-[10px] font-normal leading-4 text-muted sm:text-[11px]">
                Spatial decision intelligence
              </span>
            </span>
          </Link>
        </div>
        <div data-product-shell-actions className="flex shrink-0 items-center gap-2">
          <ProductNavigation />
          <AccessStatusBadge />
        </div>
      </div>
    </header>
  );
}
