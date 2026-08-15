import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { impactLine, impactUnits } from "@/lib/impact";
import { formatDate } from "@/lib/utils";
import { StatCard } from "@/components/admin/stat-card";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { ProductCard } from "@/components/store/product-card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your orders, wishlist, and ledger of kindness.",
};

const PAID_ISH: OrderStatus[] = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"];

export default async function AccountOverviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const settings = await getSettings();

  const [orderCount, givenAgg, recentOrders, defaultAddress, wishlistItems] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.order.aggregate({
      _sum: { totalCents: true },
      where: { userId: user.id, status: { in: PAID_ISH } },
    }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.address.findFirst({
      where: { userId: user.id },
      orderBy: { isDefault: "desc" },
    }),
    db.wishlistItem.findMany({
      where: { userId: user.id, product: { status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { product: { include: { images: true, variants: true } } },
    }),
  ]);

  const givenCents = givenAgg._sum.totalCents ?? 0;
  const kitsFunded = impactUnits(givenCents, settings);
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl">Hello, {firstName}</h1>
        <p className="mt-2 text-sm text-ink/60">
          This is your corner of the haven — your orders, your saved things, and the good
          they&apos;ve done.
        </p>
      </header>

      <section aria-label="Your ledger of kindness">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Orders placed" value={String(orderCount)} />
          <StatCard
            label="Total given"
            value={formatMoney(givenCents, settings.currency)}
            accent="rose"
            sub={givenCents > 0 ? `→ ${impactLine(givenCents, settings)}` : undefined}
          />
          <StatCard
            label="Care funded"
            value={String(kitsFunded)}
            accent="green"
            sub="your ledger of kindness"
          />
        </div>
      </section>

      <section aria-labelledby="recent-orders-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recent-orders-heading" className="text-xl">
            Recent orders
          </h2>
          {orderCount > 0 && (
            <Link
              href="/account/orders"
              className="text-sm font-medium text-leaf underline underline-offset-2 hover:text-fern"
            >
              View all orders
            </Link>
          )}
        </div>
        {recentOrders.length === 0 ? (
          <div className="mt-4 rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-6 text-center">
            <p className="text-sm text-ink/65">
              No orders yet — the shop is full of comfort waiting to travel.
            </p>
            <LinkButton href="/shop" variant="outline" size="sm" className="mt-3">
              Browse the shop
            </LinkButton>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-linen rounded-[var(--radius-card)] border border-linen">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.number}`}
                  className="grid grid-cols-2 items-center gap-2 px-4 py-3.5 transition-colors hover:bg-parchment/60 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-5"
                >
                  <span className="tabular text-sm font-medium text-ink">{order.number}</span>
                  <span className="tabular text-right text-xs text-ink/55 sm:text-left">
                    {formatDate(order.createdAt, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  <span className="justify-self-start sm:justify-self-auto">
                    <OrderStatusBadge status={order.status} />
                  </span>
                  <span className="tabular text-right text-sm text-ink">
                    {formatMoney(order.totalCents, order.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="default-address-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="default-address-heading" className="text-xl">
            Default address
          </h2>
          <Link
            href="/account/addresses"
            className="text-sm font-medium text-leaf underline underline-offset-2 hover:text-fern"
          >
            Manage addresses
          </Link>
        </div>
        {defaultAddress ? (
          <div className="mt-4 max-w-sm rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-5">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-ink">{defaultAddress.fullName}</p>
              {defaultAddress.isDefault && <Badge tone="green">Default</Badge>}
              {defaultAddress.label && <Badge tone="neutral">{defaultAddress.label}</Badge>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              {defaultAddress.line1}
              {defaultAddress.line2 && (
                <>
                  <br />
                  {defaultAddress.line2}
                </>
              )}
              <br />
              {defaultAddress.city}
              {defaultAddress.state ? `, ${defaultAddress.state}` : ""}{" "}
              <span className="tabular">{defaultAddress.postalCode}</span>
              <br />
              {defaultAddress.country}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-6 text-center">
            <p className="text-sm text-ink/65">
              No address saved yet — add one to make checkout quicker.
            </p>
            <LinkButton href="/account/addresses" variant="outline" size="sm" className="mt-3">
              Add an address
            </LinkButton>
          </div>
        )}
      </section>

      {wishlistItems.length > 0 && (
        <section aria-labelledby="wishlist-teaser-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="wishlist-teaser-heading" className="text-xl">
              From your wishlist
            </h2>
            <Link
              href="/account/wishlist"
              className="text-sm font-medium text-leaf underline underline-offset-2 hover:text-fern"
            >
              View wishlist
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {wishlistItems.map((item) => (
              <ProductCard key={item.id} product={item.product} settings={settings} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
