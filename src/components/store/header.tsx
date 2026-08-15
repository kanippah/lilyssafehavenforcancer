import Link from "next/link";
import { LilyMark } from "@/components/lily-mark";
import { MobileMenu } from "@/components/store/mobile-menu";
import { getSettings, getTotalRaisedCents } from "@/lib/settings";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getCart, cartItemCount } from "@/lib/cart";
import { formatMoneyCompact } from "@/lib/money";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About" },
  { href: "/donate", label: "Donate" },
];

export async function StoreHeader() {
  const [settings, user, cart, raisedCents] = await Promise.all([
    getSettings(),
    getSessionUser(),
    getCart(),
    getTotalRaisedCents(),
  ]);
  const count = cartItemCount(cart);

  return (
    <header className="border-b border-linen bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 sticky top-0 z-40">
      {(settings.announcement || raisedCents > 0) && (
        <div className="bg-ink text-paper">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-1.5 text-center text-[0.8rem]">
            {settings.announcement && <span>{settings.announcement}</span>}
            {settings.announcement && raisedCents > 0 && (
              <span aria-hidden="true" className="text-moss">
                ·
              </span>
            )}
            {raisedCents > 0 && (
              <span className="tabular text-petal">
                {formatMoneyCompact(raisedCents, settings.currency)} raised for care so far
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${settings.storeName} home`}>
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.storeName} className="h-9 w-auto" />
          ) : (
            <>
              <LilyMark className="h-9 w-9 text-leaf" />
              <span className="font-display text-xl leading-none">
                {settings.storeName}
              </span>
            </>
          )}
        </Link>

        <nav className="ml-2 hidden items-center gap-5 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.92rem] font-medium text-ink/75 transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <form action="/shop" className="hidden md:block">
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="Search comfort…"
              className="h-9 w-44 rounded-full border border-linen bg-white/70 px-3.5 text-sm placeholder:text-ink/40 focus:w-56 focus:border-leaf focus:outline-none transition-all"
            />
          </form>

          {isStaff(user) && (
            <Link
              href="/admin"
              className="hidden rounded-full border border-linen px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-ink sm:block"
            >
              Admin
            </Link>
          )}

          <Link
            href={user ? "/account" : "/login"}
            className="rounded-full p-2 text-ink/75 hover:bg-parchment hover:text-ink"
            aria-label={user ? "Your account" : "Sign in"}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M4.8 19.4c1.4-3.2 4-4.8 7.2-4.8s5.8 1.6 7.2 4.8" strokeLinecap="round" />
            </svg>
          </Link>

          <Link
            href="/cart"
            className="relative rounded-full p-2 text-ink/75 hover:bg-parchment hover:text-ink"
            aria-label={`Basket, ${count} item${count === 1 ? "" : "s"}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4.5 8.5h15l-1.2 10.2a2 2 0 0 1-2 1.8H7.7a2 2 0 0 1-2-1.8L4.5 8.5Z" strokeLinejoin="round" />
              <path d="M8.5 8.2V7a3.5 3.5 0 0 1 7 0v1.2" strokeLinecap="round" />
            </svg>
            {count > 0 && (
              <span className="tabular absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose px-1 text-[0.65rem] font-medium text-paper">
                {count}
              </span>
            )}
          </Link>

          <MobileMenu items={NAV} />
        </div>
      </div>
    </header>
  );
}
