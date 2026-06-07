import Link from "next/link";

export function TopNavigation() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-base font-semibold text-white">
            G
          </div>
          <div>
            <div className="text-lg font-semibold leading-5 text-ink">GeoAI</div>
            <div className="text-xs font-medium text-muted">
              Spatial decision intelligence
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink"
          >
            Home
          </Link>
          <Link
            href="/workspace"
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand"
          >
            Workspace
          </Link>
        </nav>
      </div>
    </header>
  );
}
