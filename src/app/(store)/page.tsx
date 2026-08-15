import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, getTotalRaisedCents } from "@/lib/settings";
import { impactUnits } from "@/lib/impact";
import { formatMoneyCompact } from "@/lib/money";
import { cn, formatDate, truncate } from "@/lib/utils";
import { LinkButton } from "@/components/ui/button";
import { LilyMark } from "@/components/lily-mark";
import { ProductCard } from "@/components/store/product-card";
import { Stars } from "./_components/stars";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: { absolute: `${settings.storeName} — a shop that shelters` },
    description: settings.tagline,
  };
}

const PAID_ISH = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] as const;

export default async function HomePage() {
  const settings = await getSettings();
  const [raisedCents, ordersPlaced, featuredRaw, collections, reviews, latestPost] =
    await Promise.all([
      getTotalRaisedCents(),
      db.order.count({ where: { status: { in: [...PAID_ISH] } } }),
      db.product.findMany({
        where: { status: "ACTIVE", featured: true },
        include: { images: true, variants: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.collection.findMany({ orderBy: { position: "asc" }, take: 4 }),
      db.review.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { product: { select: { title: true, slug: true } } },
      }),
      db.post.findFirst({
        where: { publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: "desc" },
      }),
    ]);

  // Never let the shop window sit empty: fall back to the newest products.
  const featured =
    featuredRaw.length > 0
      ? featuredRaw
      : await db.product.findMany({
          where: { status: "ACTIVE" },
          include: { images: true, variants: true },
          orderBy: { createdAt: "desc" },
          take: 6,
        });

  const kitsFunded = impactUnits(raisedCents, settings);

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="eyebrow rise">A shop that shelters</p>
            <h1 className="rise rise-1 mt-4 max-w-xl text-5xl sm:text-6xl">
              {settings.heroHeading}
            </h1>
            <p className="rise rise-2 mt-5 max-w-xl text-lg leading-relaxed text-ink/75">
              {settings.heroSubheading}
            </p>
            <div className="rise rise-2 mt-8 flex flex-wrap gap-3">
              <LinkButton href="/shop" size="lg">
                Shop the haven
              </LinkButton>
              <LinkButton href="/donate" variant="outline" size="lg">
                Fund a care kit
              </LinkButton>
            </div>
            <p className="rise rise-3 tabular mt-7 inline-flex items-center rounded-full bg-blush px-4 py-1.5 text-[0.8rem] text-rose">
              {formatMoneyCompact(settings.impactUnitCents, settings.currency)} → 1{" "}
              {settings.impactUnitLabel}
            </p>
          </div>

          <div className="rise rise-2">
            {settings.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.heroImageUrl}
                alt={settings.tagline}
                className="aspect-[4/5] w-full rounded-[var(--radius-card)] object-cover"
              />
            ) : (
              <div className="relative mx-auto aspect-square w-full max-w-md">
                <div className="absolute inset-0 rounded-full bg-parchment" />
                <div className="absolute inset-5 rounded-full border border-linen" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <LilyMark className="h-3/5 w-3/5 text-petal" title="A pressed lily" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Impact band: the care ledger, live ---------- */}
      <section className="bg-ink text-paper" aria-label="What the haven has funded so far">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="tabular text-3xl text-petal sm:text-4xl">
                {formatMoneyCompact(raisedCents, settings.currency)}
              </p>
              <p className="mt-1.5 text-sm text-moss">raised for care so far</p>
            </div>
            <div>
              <p className="tabular text-3xl text-petal sm:text-4xl">
                {kitsFunded.toLocaleString("en-US")}
              </p>
              <p className="mt-1.5 text-sm text-moss">care kits funded</p>
            </div>
            <div>
              <p className="tabular text-3xl text-petal sm:text-4xl">
                {ordersPlaced.toLocaleString("en-US")}
              </p>
              <p className="mt-1.5 text-sm text-moss">orders placed by kind strangers</p>
            </div>
          </div>
          <p className="tabular mt-8 text-xs text-moss">
            A live ledger — these numbers move with every order.
          </p>
        </div>
      </section>

      {/* ---------- Featured products ---------- */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">Made for treatment days</h2>
            </div>
            <Link
              href="/shop"
              className="hidden shrink-0 text-sm font-semibold text-leaf underline-offset-4 hover:underline sm:block"
            >
              See everything
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3 lg:gap-x-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} settings={settings} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Collections band ---------- */}
      {collections.length > 0 && (
        <section className="border-y border-linen bg-parchment/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Browse by need</p>
                <h2 className="mt-2 text-3xl sm:text-4xl">Collections</h2>
              </div>
              <Link
                href="/collections"
                className="hidden shrink-0 text-sm font-semibold text-leaf underline-offset-4 hover:underline sm:block"
              >
                All collections
              </Link>
            </div>
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {collections.map((collection) => (
                <Link key={collection.id} href={`/collections/${collection.slug}`} className="group block">
                  <div className="overflow-hidden rounded-[var(--radius-card)] bg-parchment">
                    {collection.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={collection.imageUrl}
                        alt={collection.title}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center">
                        <LilyMark className="h-12 w-12 text-linen" title={collection.title} />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-xl text-ink group-hover:underline group-hover:decoration-petal group-hover:decoration-2 group-hover:underline-offset-4">
                    {collection.title}
                  </h3>
                  {collection.description && (
                    <p className="mt-1 text-sm leading-relaxed text-ink/65">
                      {truncate(collection.description, 90)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Kind words ---------- */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow">Kind words</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">Notes from the haven</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {reviews.map((review, i) => (
              <figure
                key={review.id}
                className={cn(
                  "rounded-[var(--radius-card)] bg-parchment p-6",
                  i % 2 === 0 ? "md:-rotate-1" : "md:rotate-1"
                )}
              >
                <Stars rating={review.rating} />
                <blockquote className="mt-3 text-[0.95rem] leading-relaxed text-ink/85">
                  “{truncate(review.body, 180)}”
                </blockquote>
                <figcaption className="mt-4 text-sm text-ink/55">
                  <span className="font-semibold text-ink/80">{review.name}</span>
                  {" on "}
                  <Link
                    href={`/products/${review.product.slug}`}
                    className="underline underline-offset-2 hover:text-rose"
                  >
                    {review.product.title}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Latest story ---------- */}
      {latestPost && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="grid overflow-hidden rounded-[var(--radius-card)] border border-linen bg-parchment md:grid-cols-2">
            {latestPost.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latestPost.coverUrl}
                alt={latestPost.title}
                className="max-h-72 w-full object-cover md:max-h-none md:h-full"
                loading="lazy"
              />
            ) : (
              <div className="flex min-h-48 items-center justify-center bg-blush">
                <LilyMark className="h-14 w-14 text-petal" title="A pressed lily" />
              </div>
            )}
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <p className="eyebrow">The latest story</p>
              <h2 className="mt-3 text-2xl sm:text-3xl">{latestPost.title}</h2>
              {latestPost.excerpt && (
                <p className="mt-3 leading-relaxed text-ink/70">{truncate(latestPost.excerpt, 200)}</p>
              )}
              {latestPost.publishedAt && (
                <p className="tabular mt-3 text-xs text-ink/50">{formatDate(latestPost.publishedAt)}</p>
              )}
              <Link
                href={`/stories/${latestPost.slug}`}
                className="mt-5 text-sm font-semibold text-leaf underline-offset-4 hover:underline"
              >
                Read the story →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Donate CTA ---------- */}
      <section className="bg-blush">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <LilyMark className="mx-auto h-10 w-10 text-rose" title="A pressed lily" />
          <h2 className="mt-4 text-3xl sm:text-4xl">Care, even without a cart</h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink/75">{settings.tagline}</p>
          <LinkButton href="/donate" variant="rose" size="lg" className="mt-7">
            Fund a care kit
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
