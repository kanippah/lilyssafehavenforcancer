import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Orders" };

const PER_PAGE = 25;
const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

function ordersHref(params: { status?: string; q?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusParam = typeof sp.status === "string" ? sp.status : undefined;
  const status =
    statusParam && statusParam in ORDER_STATUS_LABELS ? (statusParam as OrderStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const pageRaw = Number(typeof sp.page === "string" ? sp.page : "1");
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { items: { select: { quantity: true } } },
    }),
    db.order.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={
          total === 1 ? "1 order in this view" : `${total} orders in this view`
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChip href={ordersHref({ q })} active={!status}>
          All
        </FilterChip>
        {STATUSES.map((s) => (
          <FilterChip key={s} href={ordersHref({ status: s, q })} active={status === s}>
            {ORDER_STATUS_LABELS[s]}
          </FilterChip>
        ))}
      </div>

      <form method="get" action="/admin/orders" className="mb-4 flex max-w-md items-center gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Order number or email"
          aria-label="Search orders by number or email"
        />
        <Button size="sm" variant="outline" className="shrink-0">
          Search
        </Button>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Donation</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-ink/55">
                  {q
                    ? `No orders match “${q}”.`
                    : "No orders in this view yet."}
                </td>
              </tr>
            )}
            {orders.map((order) => {
              const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
              return (
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
                    <p className="font-medium text-ink">{order.shippingName}</p>
                    <p className="text-xs text-ink/55">{order.email}</p>
                  </td>
                  <td>
                    <span className="tabular">{itemCount}</span>
                  </td>
                  <td>
                    <span className="tabular">{formatMoney(order.totalCents, order.currency)}</span>
                  </td>
                  <td>
                    {order.donationCents > 0 ? (
                      <span className="tabular text-rose">
                        {formatMoney(order.donationCents, order.currency)}
                      </span>
                    ) : (
                      <span className="text-ink/30">—</span>
                    )}
                  </td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td>
                    <span className="text-xs text-ink/70">{order.paymentMethod}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageCount={pageCount}
        hrefFor={(p) => ordersHref({ status, q, page: p })}
      />
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-linen bg-paper text-ink/70 hover:border-ink/40 hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}

function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const linkClass =
    "rounded-[var(--radius-button)] border border-ink/25 px-3 py-1.5 text-sm font-semibold text-ink hover:border-ink hover:bg-parchment";
  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-ink/60">
        Page <span className="tabular">{page}</span> of <span className="tabular">{pageCount}</span>
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={linkClass}>
            Previous
          </Link>
        )}
        {page < pageCount && (
          <Link href={hrefFor(page + 1)} className={linkClass}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
