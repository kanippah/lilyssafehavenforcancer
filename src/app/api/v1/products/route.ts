import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  variants: { orderBy: { position: "asc" as const } },
  reviews: { where: { status: "APPROVED" as const }, select: { rating: true } },
};

type ProductListPayload = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function shapeProductCard(p: ProductListPayload) {
  const prices = p.variants.map((v) => v.priceCents);
  const priceCents = prices.length > 0 ? Math.min(...prices) : 0;
  const cheapest = p.variants.find((v) => v.priceCents === priceCents) ?? null;
  const ratingCount = p.reviews.length;
  const ratingAvg =
    ratingCount > 0
      ? Math.round((p.reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount) * 10) / 10
      : null;
  const image = p.images[0] ?? null;

  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    featured: p.featured,
    tags: p.tags,
    image: image ? { url: image.url, alt: image.alt ?? p.title } : null,
    priceCents,
    compareAtCents: cheapest?.compareAtCents ?? null,
    variants: p.variants.map((v) => ({
      id: v.id,
      title: v.title,
      priceCents: v.priceCents,
      compareAtCents: v.compareAtCents,
      stock: v.stock,
      trackStock: v.trackStock,
    })),
    ratingAvg,
    ratingCount,
    createdAt: p.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const collection = sp.get("collection")?.trim() ?? "";
  const sortParam = sp.get("sort");
  const sort = sortParam === "price-asc" || sortParam === "price-desc" ? sortParam : "new";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(50, Math.max(1, parseInt(sp.get("perPage") ?? "20", 10) || 20));

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }
  if (collection) {
    where.collections = { some: { collection: { slug: collection } } };
  }

  // One query with includes; rating and price sorting computed in JS.
  const products = await db.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: productInclude,
  });

  const shaped = products.map(shapeProductCard);
  if (sort === "price-asc") shaped.sort((a, b) => a.priceCents - b.priceCents);
  else if (sort === "price-desc") shaped.sort((a, b) => b.priceCents - a.priceCents);

  const total = shaped.length;
  const start = (page - 1) * perPage;
  const items = shaped.slice(start, start + perPage);

  return NextResponse.json({ data: { items, page, perPage, total } });
}
