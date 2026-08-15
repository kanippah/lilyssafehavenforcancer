import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { impactLine } from "@/lib/impact";

function fail(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!product || product.status !== "ACTIVE") {
    return fail("We couldn't find that product.", 404);
  }

  const [settings, ratings] = await Promise.all([
    getSettings(),
    db.review.aggregate({
      where: { productId: product.id, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const prices = product.variants.map((v) => v.priceCents);
  const priceCents = prices.length > 0 ? Math.min(...prices) : 0;
  const ratingCount = ratings._count;
  const ratingAvg =
    ratingCount > 0 && ratings._avg.rating != null
      ? Math.round(ratings._avg.rating * 10) / 10
      : null;

  return NextResponse.json({
    data: {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      story: product.story,
      featured: product.featured,
      tags: product.tags,
      images: product.images.map((img) => ({ url: img.url, alt: img.alt ?? product.title })),
      variants: product.variants.map((v) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        priceCents: v.priceCents,
        compareAtCents: v.compareAtCents,
        stock: v.stock,
        trackStock: v.trackStock,
      })),
      reviews: product.reviews.map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
      })),
      ratingAvg,
      ratingCount,
      priceCents,
      currency: settings.currency,
      impactLine: impactLine(priceCents, settings),
    },
  });
}
