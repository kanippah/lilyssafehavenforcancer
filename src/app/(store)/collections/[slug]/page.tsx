import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { truncate } from "@/lib/utils";
import { LinkButton } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await db.collection.findUnique({ where: { slug } });
  if (!collection) return { title: "Collection not found" };
  return {
    title: collection.title,
    description: truncate(collection.description, 160) || undefined,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, collection] = await Promise.all([
    getSettings(),
    db.collection.findUnique({
      where: { slug },
      include: {
        products: {
          include: { product: { include: { images: true, variants: true } } },
        },
      },
    }),
  ]);
  if (!collection) notFound();

  const products = collection.products
    .map((cp) => cp.product)
    .filter((p) => p.status === "ACTIVE")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div>
      <section className="bg-parchment">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_0.8fr] md:py-14">
          <div>
            <Link
              href="/collections"
              className="text-sm font-medium text-leaf underline-offset-4 hover:underline"
            >
              ← All collections
            </Link>
            <h1 className="mt-4 text-4xl sm:text-5xl">{collection.title}</h1>
            {collection.description && (
              <p className="mt-4 max-w-xl leading-relaxed text-ink/75">{collection.description}</p>
            )}
            <p className="tabular mt-4 text-sm text-ink/55">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
          {collection.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.imageUrl}
              alt={collection.title}
              className="aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover"
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        {products.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-parchment px-6 py-16 text-center">
            <h2 className="text-2xl">Nothing here just yet</h2>
            <p className="mx-auto mt-2 max-w-md text-ink/65">
              This collection is still being gathered. The rest of the haven is open.
            </p>
            <LinkButton href="/shop" variant="outline" className="mt-6">
              Browse all products
            </LinkButton>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} settings={settings} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
