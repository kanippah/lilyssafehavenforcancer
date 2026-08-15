import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, getTotalRaisedCents } from "@/lib/settings";
import { impactLine, impactUnits } from "@/lib/impact";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { OrderStatusBadge } from "@/components/admin/status-badge";

export const metadata: Metadata = {
  title: "Dashboard",
};

const PAID_STATUSES = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] as const;

export default async function AdminDashboardPage() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const chartStart = new Date(now);
  chartStart.setHours(0, 0, 0, 0);
  chartStart.setDate(chartStart.getDate() - 13);

  const [
    settings,
    totalRaisedCents,
    revenue30,
    orders30,
    donations30,
    chartOrders,
    recentOrders,
    lowStock,
    pendingReviews,
    unreadMessages,
    pendingOrders,
  ] = await Promise.all([
    getSettings(),
    getTotalRaisedCents(),
    db.order.aggregate({
      _sum: { totalCents: true },
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: since30 } },
    }),
    db.order.count({ where: { createdAt: { gte: since30 } } }),
    db.order.aggregate({
      _sum: { donationCents: true },
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: since30 } },
    }),
    db.order.findMany({
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: chartStart } },
      select: { createdAt: true, totalCents: true },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        number: true,
        shippingName: true,
        totalCents: true,
        status: true,
        createdAt: true,
      },
    }),
    db.productVariant.findMany({
      where: { trackStock: true, stock: { lte: 5 }, product: { status: "ACTIVE" } },
      orderBy: { stock: "asc" },
      take: 8,
      include: { product: { select: { id: true, title: true } } },
    }),
    db.review.count({ where: { status: "PENDING" } }),
    db.contactMessage.count({ where: { read: false } }),
    db.order.count({ where: { status: "PENDING" } }),
  ]);

  const currency = settings.currency;
  const revenue30Cents = revenue30._sum.totalCents ?? 0;
  const donations30Cents = donations30._sum.donationCents ?? 0;
  const kitsFunded = impactUnits(totalRaisedCents, settings);

  // Bucket the last 14 days of paid revenue by local day.
  const days: { date: Date; cents: number; orders: number }[] = [];
  const dayIndex = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const date = new Date(chartStart);
    date.setDate(chartStart.getDate() + i);
    dayIndex.set(date.toDateString(), i);
    days.push({ date, cents: 0, orders: 0 });
  }
  for (const order of chartOrders) {
    const idx = dayIndex.get(order.createdAt.toDateString());
    if (idx != null) {
      days[idx].cents += order.totalCents;
      days[idx].orders += 1;
    }
  }

  const fortnightTotal = days.reduce((sum, d) => sum + d.cents, 0);
  const fortnightOrders = days.reduce((sum, d) => sum + d.orders, 0);
  const bestDay = days.reduce((best, d) => (d.cents > best.cents ? d : best), days[0]);
  const chartSummary =
    fortnightTotal > 0
      ? `${formatMoney(fortnightTotal, currency)} across ${fortnightOrders} paid ${
          fortnightOrders === 1 ? "order" : "orders"
        } in the last 14 days — the kindest day was ${formatDate(bestDay.date, {
          month: "long",
          day: "numeric",
        })} at ${formatMoney(bestDay.cents, currency)}.`
      : "No paid orders in the last 14 days yet — the chart will bloom as orders arrive.";

  const attentionCount =
    lowStock.length + (pendingReviews > 0 ? 1 : 0) + (unreadMessages > 0 ? 1 : 0) + (pendingOrders > 0 ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={formatDate(now, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Revenue, 30 days"
          value={formatMoney(revenue30Cents, currency)}
          sub={revenue30Cents > 0 ? `→ ${impactLine(revenue30Cents, settings)}` : "No paid orders yet"}
        />
        <StatCard
          label="Orders, 30 days"
          value={String(orders30)}
          sub="Placed in the last 30 days"
        />
        <StatCard
          label="Donations, 30 days"
          value={formatMoney(donations30Cents, currency)}
          sub="Given on top of purchases"
          accent="rose"
        />
        <StatCard
          label="Care kits funded"
          value={String(kitsFunded)}
          sub={`${formatMoney(totalRaisedCents, currency)} raised all-time`}
          accent="green"
        />
      </div>

      <section className="mt-4 rounded-[var(--radius-card)] border border-linen bg-paper p-5">
        <h2 className="font-display text-lg text-ink">The fortnight, in kindness</h2>
        <p className="mt-1 text-sm text-ink/60">{chartSummary}</p>
        <RevenueChart days={days} currency={currency} />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-leaf hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">
              No orders yet. When the first one arrives, it will appear here.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Name</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="tabular font-medium text-leaf hover:underline"
                        >
                          {order.number}
                        </Link>
                      </td>
                      <td>{order.shippingName}</td>
                      <td className="tabular">{formatMoney(order.totalCents, currency)}</td>
                      <td>
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
          <h2 className="font-display text-lg text-ink">Needs attention</h2>
          {attentionCount === 0 ? (
            <p className="mt-4 text-sm text-ink/60">
              All caught up — nothing needs attention right now.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {lowStock.length > 0 && (
                <div>
                  <p className="eyebrow">Low stock</p>
                  <ul className="mt-1.5 divide-y divide-linen">
                    {lowStock.map((variant) => (
                      <li key={variant.id} className="flex items-center justify-between gap-3 py-2">
                        <Link
                          href={`/admin/products/${variant.product.id}`}
                          className="min-w-0 truncate text-sm text-ink hover:text-leaf hover:underline"
                        >
                          {variant.product.title}
                          {variant.title !== "Default" ? ` — ${variant.title}` : ""}
                        </Link>
                        <span className="tabular shrink-0 text-sm font-medium text-clay">
                          {variant.stock} left
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="divide-y divide-linen">
                {pendingOrders > 0 && (
                  <AttentionRow
                    href="/admin/orders?status=PENDING"
                    label="Orders awaiting payment"
                    count={pendingOrders}
                  />
                )}
                {pendingReviews > 0 && (
                  <AttentionRow
                    href="/admin/reviews"
                    label="Reviews waiting for approval"
                    count={pendingReviews}
                  />
                )}
                {unreadMessages > 0 && (
                  <AttentionRow href="/admin/messages" label="Unread messages" count={unreadMessages} />
                )}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AttentionRow({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <li>
      <Link href={href} className="group flex items-center justify-between gap-3 py-2">
        <span className="text-sm text-ink group-hover:text-leaf group-hover:underline">{label}</span>
        <span className="tabular rounded-full bg-parchment px-2.5 py-0.5 text-sm font-medium text-ink">
          {count}
        </span>
      </Link>
    </li>
  );
}

/** Last-14-days revenue as a hand-drawn inline SVG — no chart libraries. */
function RevenueChart({
  days,
  currency,
}: {
  days: { date: Date; cents: number }[];
  currency: string;
}) {
  const width = 720;
  const height = 220;
  const pad = { top: 22, right: 14, bottom: 28, left: 14 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...days.map((d) => d.cents));

  const points = days.map((d, i) => ({
    x: pad.left + (i * innerW) / (days.length - 1),
    y: pad.top + innerH * (1 - d.cents / max),
  }));

  const clampY = (y: number) => Math.min(Math.max(y, pad.top), pad.top + innerH);

  // Smooth the polyline with Catmull-Rom-derived cubic segments.
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clampY(p2.y - (p3.y - p1.y) / 6);
    path += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const maxY = pad.top + innerH * (1 - max / max);
  const baselineY = pad.top + innerH;

  return (
    <div className="mt-3 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[520px]"
        aria-hidden="true"
        focusable="false"
      >
        {/* baseline */}
        <line x1={pad.left} y1={baselineY} x2={width - pad.right} y2={baselineY} stroke="var(--color-linen)" />
        {/* high-water mark */}
        <line
          x1={pad.left}
          y1={maxY}
          x2={width - pad.right}
          y2={maxY}
          stroke="var(--color-linen)"
          strokeDasharray="3 5"
        />
        <text x={pad.left} y={maxY - 6} fontSize="10" className="tabular" fill="var(--color-moss)">
          {formatMoneyCompact(max, currency)}
        </text>
        {/* revenue line */}
        <path d={path} fill="none" stroke="var(--color-leaf)" strokeWidth="2.5" strokeLinecap="round" />
        {/* petal dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4.5 : 3.5}
            fill={i === points.length - 1 ? "var(--color-rose)" : "var(--color-petal)"}
            stroke="var(--color-leaf)"
            strokeWidth="1.4"
          />
        ))}
        {/* day labels, mono, every other day */}
        {days.map((d, i) =>
          i % 2 === 0 ? (
            <text
              key={i}
              x={points[i].x}
              y={height - 8}
              fontSize="10"
              textAnchor="middle"
              className="tabular"
              fill="var(--color-moss)"
            >
              {d.date.getMonth() + 1}/{d.date.getDate()}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
