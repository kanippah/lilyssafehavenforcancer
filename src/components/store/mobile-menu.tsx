"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The small-screen menu: a details-disclosure that actually closes again —
 * after tapping a link, after navigation, and on Escape — and carries the
 * product search that the compact header has no room for.
 */
export function MobileMenu({ items }: { items: Array<{ href: string; label: string }> }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current) ref.current.open = false;
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  return (
    <details ref={ref} className="relative md:hidden">
      <summary
        className="flex cursor-pointer list-none rounded-full p-2 text-ink/75 hover:bg-parchment [&::-webkit-details-marker]:hidden"
        aria-label="Menu"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </summary>
      <nav
        className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-linen bg-paper p-2 shadow-[var(--shadow-lift)]"
        aria-label="Mobile"
      >
        <form action="/shop" className="p-1.5">
          <label htmlFor="mobile-search" className="sr-only">
            Search products
          </label>
          <input
            id="mobile-search"
            type="search"
            name="q"
            placeholder="Search comfort…"
            className="h-9 w-full rounded-full border border-linen bg-white/70 px-3.5 text-sm placeholder:text-ink/40 focus:border-leaf focus:outline-none"
          />
        </form>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-parchment"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/track"
          onClick={close}
          className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-parchment"
        >
          Track an order
        </Link>
      </nav>
    </details>
  );
}
