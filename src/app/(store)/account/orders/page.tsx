import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { LinkButton } from "@/components/ui/button";
import { LilyMark } from "@/components/lily-mark";

export const metadata: Metadata = {
  title: "Your orders",
  description: "Every order you've placed with Lily's Safe Haven.",
};

export default async function AccountOrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/orders");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div>
      <header>
        <h1 className="text-3xl">Your orders</h1>
        <p className="mt-2 text-sm text-ink/60">
          Every order is listed here, newest first — select one to see its journey.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-10 text-center">
          <LilyMark className="mx-auto h-10 w-10 text-moss" />
          <p className="mt-4 text-ink/70">
            You haven&apos;t placed an order yet. When you do, its whole story lives here.
          </p>
          <LinkButton href="/shop" className="mt-5">
            Browse the shop
          </LinkButton>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-linen rounded-[var(--radius-card)] border border-linen">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.number}`}
                className="grid grid-cols-2 items-center gap-x-4 gap-y-1.5 px-4 py-4 transition-colors hover:bg-parchment/60 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:gap-6"
              >
                <span className="tabular text-sm font-medium text-ink">{order.number}</span>
                <span className="tabular text-right text-xs text-ink/55 sm:text-left sm:text-sm">
                  {formatDate(order.createdAt, { year: "numeric", month: "short", day: "numeric" })}
                </span>
                <span className="tabular text-xs text-ink/55">
                  {order._count.items} item{order._count.items === 1 ? "" : "s"}
                </span>
                <span className="justify-self-end sm:justify-self-auto">
                  <OrderStatusBadge status={order.status} />
                </span>
                <span className="tabular col-span-2 text-right text-sm text-ink sm:col-span-1">
                  {formatMoney(order.totalCents, order.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
