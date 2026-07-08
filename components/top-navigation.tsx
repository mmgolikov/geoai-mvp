import Link from "next/link";

export function TopNavigation() {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white shadow-sm">
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
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/workspace" className="rounded-md bg-ice-soft px-2 py-2 text-xs font-semibold text-ink transition hover:text-brand sm:px-3 sm:text-sm">
            Workspace
          </Link>
          <Link href="/projects" className="rounded-md px-2 py-2 text-xs font-semibold text-muted transition hover:bg-surface hover:text-ink sm:px-3 sm:text-sm">
            Projects
          </Link>
        </nav>
      </div>
    </header>
  );
}
