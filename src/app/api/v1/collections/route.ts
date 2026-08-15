import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const collections = await db.collection.findMany({
    orderBy: { position: "asc" },
    include: {
      _count: {
        select: { products: { where: { product: { status: "ACTIVE" } } } },
      },
    },
  });

  return NextResponse.json({
    data: {
      collections: collections.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c._count.products,
      })),
    },
  });
}
