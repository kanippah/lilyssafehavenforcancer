import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoneyCompact } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge } from "@/components/admin/status-badge";
import type { Prisma, ProductStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Products · Admin" };

const PAGE_SIZE = 25;
const STATUSES: ProductStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];

function buildHref(params: { q?: string; status?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/admin/products?${s}` : "/admin/products";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusParam = typeof sp.status === "string" ? sp.status : "";
  const status = (STATUSES as string[]).includes(statusParam)
    ? (statusParam as ProductStatus)
    : undefined;
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { orderBy: { position: "asc" } },
        collections: { include: { collection: { select: { title: true } } } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const chips = [
    { label: "All", value: "" },
    { label: "Active", value: "ACTIVE" },
    { label: "Draft", value: "DRAFT" },
    { label: "Archived", value: "ARCHIVED" },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Everything the store can sell, in one ledger."
        actions={<LinkButton href="/admin/products/new" size="sm">Add product</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const active = (status ?? "") === chip.value;
            return (
              <Link
                key={chip.label}
                href={buildHref({ q, status: chip.value })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-linen bg-paper text-ink/70 hover:border-ink/40 hover:text-ink"
                )}
              >
                {chip.label}
              </Link>
            );
          })}
        </nav>
        <form method="get" action="/admin/products" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="product-search" className="sr-only">
            Search products by title
          </label>
          <Input
            id="product-search"
            name="q"
            defaultValue={q}
            placeholder="Search by title"
            className="h-9 w-56 py-1 text-sm"
          />
          <Button variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <span className="sr-only">Image</span>
              </th>
              <th>Title</th>
              <th>Status</th>
              <th>Collections</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Featured</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-ink/55">
                  {q || status ? (
                    <>No products match this filter — try clearing it.</>
                  ) : (
                    <>
                      Nothing here yet —{" "}
                      <Link
                        href="/admin/products/new"
                        className="font-medium text-leaf underline underline-offset-2"
                      >
                        add the first product
                      </Link>
                      .
                    </>
                  )}
                </td>
              </tr>
            )}
            {products.map((p) => {
              const image = p.images[0];
              const prices = p.variants.map((v) => v.priceCents);
              const min = prices.length > 0 ? Math.min(...prices) : null;
              const max = prices.length > 0 ? Math.max(...prices) : null;
              const tracked = p.variants.filter((v) => v.trackStock);
              const stock = tracked.reduce((sum, v) => sum + v.stock, 0);
              const collectionNames = p.collections.map((c) => c.collection.title).join(", ");
              return (
                <tr key={p.id}>
                  <td className="w-14">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.url}
                        alt={image.alt ?? p.title}
                        className="h-10 w-10 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-parchment" aria-hidden="true" />
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    <ProductStatusBadge status={p.status} />
                  </td>
                  <td>
                    <span className="block max-w-52 truncate text-xs text-ink/60">
                      {collectionNames || "—"}
                    </span>
                  </td>
                  <td className="tabular whitespace-nowrap">
                    {min == null || max == null
                      ? "—"
                      : min === max
                        ? formatMoneyCompact(min)
                        : `${formatMoneyCompact(min)}–${formatMoneyCompact(max)}`}
                  </td>
                  <td className={cn("tabular", tracked.length > 0 && stock === 0 && "text-clay")}>
                    {tracked.length === 0 ? "—" : stock}
                  </td>
                  <td>
                    {p.featured && (
                      <>
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full bg-petal"
                          title="Featured"
                          aria-hidden="true"
                        />
                        <span className="sr-only">Featured</span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="tabular text-xs text-ink/55">
            Showing {from}–{to} of {total}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <LinkButton href={buildHref({ q, status: status ?? "", page: page - 1 })} variant="outline" size="sm">
                Previous
              </LinkButton>
            ) : (
              <span className="text-sm text-ink/35">Previous</span>
            )}
            <span className="tabular text-xs text-ink/55">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <LinkButton href={buildHref({ q, status: status ?? "", page: page + 1 })} variant="outline" size="sm">
                Next
              </LinkButton>
            ) : (
              <span className="text-sm text-ink/35">Next</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
