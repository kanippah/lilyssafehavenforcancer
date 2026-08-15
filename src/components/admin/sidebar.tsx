"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LilyMark } from "@/components/lily-mark";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; adminOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/collections", label: "Collections" },
      { href: "/admin/media", label: "Media library" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/discounts", label: "Discounts" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/stories", label: "Stories" },
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/messages", label: "Messages" },
      { href: "/admin/subscribers", label: "Subscribers" },
    ],
  },
  {
    title: "Store",
    items: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/staff", label: "Staff", adminOnly: true },
    ],
  },
];

export function AdminSidebar({
  storeName,
  logoUrl,
  isAdmin,
}: {
  storeName: string;
  logoUrl: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto bg-ink text-paper md:flex">
      <Link href="/admin" className="flex items-center gap-2.5 px-5 py-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={storeName} className="h-8 w-auto" />
        ) : (
          <LilyMark className="h-8 w-8 text-petal" />
        )}
        <span className="font-display text-[1.05rem] leading-tight">{storeName}</span>
      </Link>

      <nav className="flex-1 space-y-5 px-3 pb-6" aria-label="Admin">
        {SECTIONS.map((section) => {
          const items = section.items.filter((i) => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="tabular px-2 pb-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-moss">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-pine font-semibold text-petal"
                            : "text-paper/80 hover:bg-pine/60 hover:text-paper"
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
