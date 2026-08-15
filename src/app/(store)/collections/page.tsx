import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { LilyMark } from "@/components/lily-mark";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Browse the haven by need — each collection gathers comfort for a different moment of treatment and recovery.",
};

export default async function CollectionsPage() {
  const collections = await db.collection.findMany({
    orderBy: { position: "asc" },
    include: { products: { include: { product: { select: { status: true } } } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Browse by need</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Collections</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-ink/70">
        Each collection gathers things for a different moment — long infusion days, cold
        waiting rooms, the first week home. Start where the need is.
      </p>

      {collections.length === 0 ? (
        <div className="mt-12 rounded-[var(--radius-card)] bg-parchment px-6 py-16 text-center">
          <LilyMark className="mx-auto h-10 w-10 text-petal" title="A pressed lily" />
          <h2 className="mt-4 text-2xl">Still being arranged</h2>
          <p className="mx-auto mt-2 max-w-md text-ink/65">
            Collections are on their way. In the meantime, everything is in{" "}
            <Link href="/shop" className="underline underline-offset-2 hover:text-rose">
              the shop
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {collections.map((collection) => {
            const count = collection.products.filter((cp) => cp.product.status === "ACTIVE").length;
            return (
              <Link key={collection.id} href={`/collections/${collection.slug}`} className="group block">
                <div className="overflow-hidden rounded-[var(--radius-card)] bg-parchment">
                  {collection.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={collection.imageUrl}
                      alt={collection.title}
                      className="aspect-[3/2] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-[3/2] w-full items-center justify-center">
                      <LilyMark className="h-14 w-14 text-linen" title={collection.title} />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h2 className="text-2xl group-hover:underline group-hover:decoration-petal group-hover:decoration-2 group-hover:underline-offset-4">
                    {collection.title}
                  </h2>
                  <p className="tabular shrink-0 text-sm text-ink/55">
                    {count} {count === 1 ? "product" : "products"}
                  </p>
                </div>
                {collection.description && (
                  <p className="mt-1.5 max-w-lg text-[0.95rem] leading-relaxed text-ink/70">
                    {collection.description}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
