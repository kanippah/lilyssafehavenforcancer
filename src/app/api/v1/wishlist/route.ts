import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getBearerUser } from "@/lib/auth";

const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  variants: { orderBy: { position: "asc" as const } },
  reviews: { where: { status: "APPROVED" as const }, select: { rating: true } },
};

type ProductPayload = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function fail(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function shapeProductCard(p: ProductPayload) {
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
    ratingAvg,
    ratingCount,
  };
}

export async function GET(req: Request) {
  const user = await getBearerUser(req);
  if (!user) return fail("Sign in to continue.", 401);

  const items = await db.wishlistItem.findMany({
    where: { userId: user.id, product: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    include: { product: { include: productInclude } },
  });

  return NextResponse.json({
    data: {
      items: items.map((i) => ({
        id: i.id,
        addedAt: i.createdAt,
        product: shapeProductCard(i.product),
      })),
    },
  });
}

const postSchema = z.object({
  productId: z.string().min(1, "productId is required."),
});

export async function POST(req: Request) {
  const user = await getBearerUser(req);
  if (!user) return fail("Sign in to continue.", 401);

  const json = await readJson(req);
  if (json === null) return fail("Send a JSON body with productId.", 400);

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);
  const { productId } = parsed.data;

  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ data: { saved: false } });
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "ACTIVE") {
    return fail("This product isn't available right now.", 404);
  }

  await db.wishlistItem.create({ data: { userId: user.id, productId } });
  return NextResponse.json({ data: { saved: true } });
}
