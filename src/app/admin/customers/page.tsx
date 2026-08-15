import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Customers" };

const PER_PAGE = 25;
const PAID_STATUSES = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] as const;

function customersHref(params: { q?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/admin/customers?${s}` : "/admin/customers";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const pageRaw = Number(typeof sp.page === "string" ? sp.page : "1");
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { orders: true } } },
    }),
    db.user.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  const lifetimeByUser = new Map<string, number>();
  if (customers.length > 0) {
    const sums = await db.order.groupBy({
      by: ["userId"],
      where: {
        userId: { in: customers.map((c) => c.id) },
        status: { in: [...PAID_STATUSES] },
      },
      _sum: { totalCents: true },
    });
    for (const row of sums) {
      if (row.userId) lifetimeByUser.set(row.userId, row._sum.totalCents ?? 0);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={total === 1 ? "1 customer" : `${total} customers`}
      />

      <form method="get" action="/admin/customers" className="mb-4 flex max-w-md items-center gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Name or email"
          aria-label="Search customers by name or email"
        />
        <Button size="sm" variant="outline" className="shrink-0">
          Search
        </Button>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Orders</th>
              <th>Lifetime total</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-ink/55">
                  {q ? `No customers match “${q}”.` : "No customers yet."}
                </td>
              </tr>
            )}
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="font-medium text-leaf hover:underline"
                  >
                    {customer.name}
                  </Link>
                </td>
                <td>
                  <span className="text-ink/70">{customer.email}</span>
                </td>
                <td>
                  <span className="tabular">{customer._count.orders}</span>
                </td>
                <td>
                  <span className="tabular">
                    {formatMoney(lifetimeByUser.get(customer.id) ?? 0)}
                  </span>
                </td>
                <td>
                  <span className="tabular text-xs text-ink/70">
                    {formatDate(customer.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
          <p className="text-sm text-ink/60">
            Page <span className="tabular">{page}</span> of{" "}
            <span className="tabular">{pageCount}</span>
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={customersHref({ q, page: page - 1 })}
                className="rounded-[var(--radius-button)] border border-ink/25 px-3 py-1.5 text-sm font-semibold text-ink hover:border-ink hover:bg-parchment"
              >
                Previous
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={customersHref({ q, page: page + 1 })}
                className="rounded-[var(--radius-button)] border border-ink/25 px-3 py-1.5 text-sm font-semibold text-ink hover:border-ink hover:bg-parchment"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
