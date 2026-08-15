import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { LinkButton } from "@/components/ui/button";
import { LilyMark } from "@/components/lily-mark";
import { ProductCard, type ProductForCard } from "@/components/store/product-card";
import { SortSelect } from "./_components/sort-select";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Every product in the haven — comfort goods, kind apparel, and care kits. Each purchase funds real help for people in treatment.",
};

const PER_PAGE = 24;
const SORTS = new Set(["new", "price-asc", "price-desc"]);

function shopHref(params: { q?: string; collection?: string; sort?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.collection) sp.set("collection", params.collection);
  if (params.sort && params.sort !== "new") sp.set("sort", params.sort);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const query = sp.toString();
  return query ? `/shop?${query}` : "/shop";
}

function minPriceCents(product: { variants: { priceCents: number }[] }): number | null {
  if (product.variants.length === 0) return null;
  return Math.min(...product.variants.map((v) => v.priceCents));
}

const chipClass = (active: boolean) =>
  cn(
    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
    active
      ? "border-ink bg-ink text-paper"
      : "border-linen text-ink/75 hover:border-ink hover:text-ink"
  );

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const collectionSlug = typeof sp.collection === "string" ? sp.collection : "";
  const sort = typeof sp.sort === "string" && SORTS.has(sp.sort) ? sp.sort : "new";
  const rawPage = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }
  if (collectionSlug) {
    where.collections = { some: { collection: { slug: collectionSlug } } };
  }

  const [settings, collections, matches] = await Promise.all([
    getSettings(),
    db.collection.findMany({ orderBy: { position: "asc" } }),
    db.product.findMany({
      where,
      include: { images: true, variants: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Price sorts need the cheapest variant, which Prisma can't order by — sort here.
  const sorted: ProductForCard[] = [...matches];
  if (sort === "price-asc") {
    sorted.sort((a, b) => (minPriceCents(a) ?? Infinity) - (minPriceCents(b) ?? Infinity));
  } else if (sort === "price-desc") {
    sorted.sort((a, b) => (minPriceCents(b) ?? -1) - (minPriceCents(a) ?? -1));
  }

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, Number.isFinite(rawPage) ? rawPage : 1), totalPages);
  const pageItems = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const activeCollection = collections.find((c) => c.slug === collectionSlug) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Shop</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">The whole haven</h1>
      <p className="tabular mt-3 text-sm text-ink/60" aria-live="polite">
        {total} {total === 1 ? "product" : "products"}
        {q && <> matching “{q}”</>}
        {activeCollection && <> in {activeCollection.title}</>}
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter by collection" className="flex flex-wrap gap-2">
          <Link
            href={shopHref({ q, sort })}
            className={chipClass(!collectionSlug)}
            aria-current={!collectionSlug ? "page" : undefined}
          >
            All
          </Link>
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={shopHref({ q, sort, collection: collection.slug })}
              className={chipClass(collectionSlug === collection.slug)}
              aria-current={collectionSlug === collection.slug ? "page" : undefined}
            >
              {collection.title}
            </Link>
          ))}
        </nav>
        <SortSelect q={q} collection={collectionSlug} sort={sort} />
      </div>

      {pageItems.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {pageItems.map((product) => (
            <ProductCard key={product.id} product={product} settings={settings} />
          ))}
        </div>
      ) : (
        <div className="mt-14 rounded-[var(--radius-card)] bg-parchment px-6 py-16 text-center">
          <LilyMark className="mx-auto h-10 w-10 text-petal" title="A pressed lily" />
          <h2 className="mt-4 text-2xl">Nothing here matches yet</h2>
          <p className="mx-auto mt-2 max-w-md text-ink/65">
            Try a different word, or browse everything the haven holds.
          </p>
          <LinkButton href="/shop" variant="outline" className="mt-6">
            See all products
          </LinkButton>
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={shopHref({ q, collection: collectionSlug, sort, page: page - 1 })}
              className="text-sm font-semibold text-leaf underline-offset-4 hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span aria-hidden="true" className="text-sm text-ink/30">
              ← Previous
            </span>
          )}
          <span className="tabular text-sm text-ink/60">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={shopHref({ q, collection: collectionSlug, sort, page: page + 1 })}
              className="text-sm font-semibold text-leaf underline-offset-4 hover:underline"
            >
              Next →
            </Link>
          ) : (
            <span aria-hidden="true" className="text-sm text-ink/30">
              Next →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
