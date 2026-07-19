"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const productRoutes = [
  { href: "/workspace", label: "Workspace", description: "Screen locations and assets" },
  { href: "/projects", label: "Projects", description: "Open saved decision work" },
  { href: "/explore", label: "Explore", description: "Find and compare candidates" }
] as const;

function isCurrentRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProductNavigation() {
  const pathname = usePathname();
  const { isAuthenticated, isSessionResolved } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <nav aria-label="Primary product navigation" className="hidden items-center gap-1 sm:flex">
        {productRoutes.map((route) => {
          const isCurrent = isCurrentRoute(pathname, route.href);
          return (
            <Link
              key={route.href}
              href={route.href}
              aria-current={isCurrent ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                isCurrent
                  ? "bg-surface text-ink"
                  : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {route.label}
            </Link>
          );
        })}
      </nav>

      {isSessionResolved && isAuthenticated ? (
        <div ref={containerRef} className="relative sm:hidden" data-mobile-product-navigation>
          <button
            ref={triggerRef}
            type="button"
            aria-label={isOpen ? "Close product navigation" : "Open product navigation"}
            aria-expanded={isOpen}
            aria-controls="mobile-product-navigation-menu"
            onClick={() => setIsOpen((current) => !current)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              isOpen
                ? "border-brand bg-[#e8f3f2] text-brand"
                : "border-line bg-white text-muted hover:border-brand hover:text-brand"
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
              {isOpen ? (
                <>
                  <path d="m7 7 10 10" strokeLinecap="round" />
                  <path d="m17 7-10 10" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M5 7h14" strokeLinecap="round" />
                  <path d="M5 12h14" strokeLinecap="round" />
                  <path d="M5 17h14" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>

          {isOpen ? (
            <nav
              id="mobile-product-navigation-menu"
              aria-label="Mobile product navigation"
              className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-white p-2 shadow-[0_18px_48px_rgba(18,50,65,0.18)]"
            >
              {productRoutes.map((route) => {
                const isCurrent = isCurrentRoute(pathname, route.href);
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`flex min-h-12 items-center justify-between gap-4 rounded-lg px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isCurrent
                        ? "bg-[#e8f3f2] text-brand"
                        : "text-ink hover:bg-surface"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{route.label}</span>
                      <span className="block truncate text-xs font-medium text-muted">{route.description}</span>
                    </span>
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-none stroke-current" strokeWidth="1.8">
                      <path d="m7 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
