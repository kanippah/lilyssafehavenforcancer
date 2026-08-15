import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { impactUnits } from "@/lib/impact";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { OrderStatusBadge, ReviewStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user ? user.name : "Customer" };
}

const PAID_STATUSES = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"];
const cardClass = "rounded-[var(--radius-card)] border border-linen bg-paper p-5";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, settings] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: { isDefault: "desc" } },
        orders: { orderBy: { createdAt: "desc" } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { product: { select: { title: true, slug: true } } },
        },
        _count: { select: { wishlist: true, reviews: true } },
      },
    }),
    getSettings(),
  ]);
  if (!customer) notFound();

  const lifetimeCents = customer.orders
    .filter((o) => PAID_STATUSES.includes(o.status))
    .reduce((sum, o) => sum + o.totalCents, 0);
  const kitsFunded = impactUnits(lifetimeCents, settings);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/customers" className="text-sm font-medium text-leaf hover:underline">
          ← Back to customers
        </Link>
      </div>
      <PageHeader
        title={customer.name}
        subtitle={customer.phone ? `${customer.email} · ${customer.phone}` : customer.email}
        actions={
          <a
            href={`mailto:${customer.email}`}
            className="rounded-[var(--radius-button)] border border-ink/25 px-3.5 py-2 text-sm font-semibold text-ink hover:border-ink hover:bg-paper"
          >
            Email customer
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders"
          value={String(customer.orders.length)}
          sub={customer.orders.length === 0 ? "None placed yet" : undefined}
        />
        <StatCard
          label="Lifetime total"
          value={formatMoney(lifetimeCents)}
          sub="Paid orders only"
          accent="green"
        />
        <StatCard
          label="Kits funded"
          value={String(kitsFunded)}
          sub={`Each ${formatMoney(settings.impactUnitCents)} funds one ${settings.impactUnitLabel}`}
          accent="rose"
        />
        <StatCard
          label="Member since"
          value={formatDate(customer.createdAt, { month: "short", day: "numeric", year: "numeric" })}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section
            className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper"
            aria-label="Orders"
          >
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-ink/55">
                      No orders yet.
                    </td>
                  </tr>
                )}
                {customer.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="tabular font-medium text-leaf hover:underline"
                      >
                        {order.number}
                      </Link>
                    </td>
                    <td>
                      <span className="tabular text-xs text-ink/70">
                        {formatDate(order.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td>
                      <span className="tabular">{formatMoney(order.totalCents, order.currency)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="space-y-5">
          <section className={cardClass} aria-labelledby="customer-addresses-heading">
            <h2 id="customer-addresses-heading" className="font-display text-lg text-ink">
              Addresses
            </h2>
            {customer.addresses.length === 0 && (
              <p className="mt-2 text-sm text-ink/55">No saved addresses.</p>
            )}
            <ul className="mt-2 space-y-3">
              {customer.addresses.map((address) => (
                <li key={address.id} className="rounded-lg border border-linen bg-parchment/60 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    {address.label && <span className="font-semibold text-ink">{address.label}</span>}
                    {address.isDefault && <Badge tone="green">Default</Badge>}
                  </div>
                  <address className="not-italic leading-relaxed text-ink/80">
                    <div>{address.fullName}</div>
                    <div>{address.line1}</div>
                    {address.line2 && <div>{address.line2}</div>}
                    <div>
                      {[address.city, address.state].filter(Boolean).join(", ")}{" "}
                      <span className="tabular">{address.postalCode}</span>
                    </div>
                    <div>{address.country}</div>
                    {address.phone && <div className="tabular">{address.phone}</div>}
                  </address>
                </li>
              ))}
            </ul>
          </section>

          <section className={cardClass} aria-labelledby="customer-activity-heading">
            <h2 id="customer-activity-heading" className="font-display text-lg text-ink">
              Activity
            </h2>
            <p className="mt-2 text-sm text-ink/70">
              <span className="tabular">{customer._count.wishlist}</span>{" "}
              {customer._count.wishlist === 1 ? "item" : "items"} on their wishlist ·{" "}
              <span className="tabular">{customer._count.reviews}</span>{" "}
              {customer._count.reviews === 1 ? "review" : "reviews"} written
            </p>
            {customer.reviews.length > 0 && (
              <ul className="mt-3 space-y-3 border-t border-linen pt-3">
                {customer.reviews.map((review) => (
                  <li key={review.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/products/${review.product.slug}`}
                        className="font-semibold text-ink hover:underline"
                      >
                        {review.product.title}
                      </Link>
                      <span
                        className="text-pollen"
                        aria-label={`Rated ${review.rating} out of 5 stars`}
                      >
                        {"★".repeat(review.rating)}
                        <span aria-hidden="true" className="text-ink/20">
                          {"★".repeat(5 - review.rating)}
                        </span>
                      </span>
                      <ReviewStatusBadge status={review.status} />
                    </div>
                    {review.title && <p className="mt-0.5 font-medium text-ink/85">{review.title}</p>}
                    <p className="tabular mt-0.5 text-xs text-ink/50">
                      {formatDate(review.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
