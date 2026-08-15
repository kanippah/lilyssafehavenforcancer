import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { formatMoneyCompact } from "@/lib/money";
import { formatDate, truncate } from "@/lib/utils";
import { LilyMark } from "@/components/lily-mark";
import { ProductCard } from "@/components/store/product-card";
import { WishlistButton } from "@/components/store/wishlist-button";
import { Stars } from "../../_components/stars";
import { ProductGallery } from "./_components/product-gallery";
import { VariantPicker } from "./_components/variant-picker";
import { ReviewForm } from "./_components/review-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });
  if (!product || product.status !== "ACTIVE") return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.title,
    description: product.seoDescription ?? (truncate(product.description, 160) || undefined),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, user, product] = await Promise.all([
    getSettings(),
    getSessionUser(),
    db.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" } },
        collections: { include: { collection: true } },
        reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" } },
      },
    }),
  ]);
  if (!product || product.status !== "ACTIVE") notFound();

  const saved = user
    ? Boolean(
        await db.wishlistItem.findUnique({
          where: { userId_productId: { userId: user.id, productId: product.id } },
        })
      )
    : false;

  // "Keeps good company" — prefer shelf-mates from the same collections,
  // topped up with the newest products if the shelf is thin.
  const collectionIds = product.collections.map((cp) => cp.collectionId);
  const related =
    collectionIds.length > 0
      ? await db.product.findMany({
          where: {
            status: "ACTIVE",
            id: { not: product.id },
            collections: { some: { collectionId: { in: collectionIds } } },
          },
          include: { images: true, variants: true },
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : [];
  if (related.length < 4) {
    const fill = await db.product.findMany({
      where: { status: "ACTIVE", id: { notIn: [product.id, ...related.map((r) => r.id)] } },
      include: { images: true, variants: true },
      orderBy: { createdAt: "desc" },
      take: 4 - related.length,
    });
    related.push(...fill);
  }

  const reviews = product.reviews;
  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const pickerVariants = product.variants.map((v) => ({
    id: v.id,
    title: v.title,
    priceCents: v.priceCents,
    compareAtCents: v.compareAtCents,
    stock: v.stock,
    trackStock: v.trackStock,
  }));

  const primaryCollection = product.collections[0]?.collection ?? null;
  const descriptionParagraphs = product.description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const storyParagraphs = product.story
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink/55">
        <Link href="/shop" className="underline-offset-2 hover:text-ink hover:underline">
          Shop
        </Link>
        {primaryCollection && (
          <>
            <span aria-hidden="true"> / </span>
            <Link
              href={`/collections/${primaryCollection.slug}`}
              className="underline-offset-2 hover:text-ink hover:underline"
            >
              {primaryCollection.title}
            </Link>
          </>
        )}
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery
          images={product.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt }))}
          title={product.title}
        />

        <div>
          <h1 className="text-3xl sm:text-4xl">{product.title}</h1>

          {avgRating != null && (
            <a
              href="#reviews"
              className="mt-3 inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink"
            >
              <Stars rating={avgRating} />
              <span className="tabular">
                {avgRating.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </a>
          )}

          <div className="mt-6">
            <VariantPicker
              variants={pickerVariants}
              currency={settings.currency}
              impact={{
                impactUnitCents: settings.impactUnitCents,
                impactUnitLabel: settings.impactUnitLabel,
              }}
              descriptionSlot={
                descriptionParagraphs.length > 0 ? (
                  <div className="prose-haven text-[0.98rem] text-ink/85">
                    {descriptionParagraphs.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                ) : undefined
              }
              wishlistSlot={<WishlistButton productId={product.id} initiallySaved={saved} />}
            />
          </div>

          <div className="mt-8 space-y-1.5 border-t border-linen pt-5 text-sm text-ink/65">
            {settings.freeShippingThresholdCents != null ? (
              <p>
                Free shipping on orders over{" "}
                <span className="tabular">
                  {formatMoneyCompact(settings.freeShippingThresholdCents, settings.currency)}
                </span>{" "}
                — otherwise{" "}
                <span className="tabular">
                  {formatMoneyCompact(settings.shippingFlatCents, settings.currency)}
                </span>{" "}
                flat.
              </p>
            ) : (
              <p>
                Flat{" "}
                <span className="tabular">
                  {formatMoneyCompact(settings.shippingFlatCents, settings.currency)}
                </span>{" "}
                shipping on every order.
              </p>
            )}
            <p>Every order moves the care ledger — proceeds fund real help.</p>
          </div>
        </div>
      </div>

      {storyParagraphs.length > 0 && (
        <section className="mt-14 rounded-[var(--radius-card)] bg-blush p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <LilyMark className="h-10 w-10 shrink-0 text-rose" title="A pressed lily" />
            <div>
              <p className="eyebrow !text-rose">Why this helps</p>
              <div className="prose-haven mt-2 text-ink/85">
                {storyParagraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="reviews" className="mt-16 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Reviews</p>
            <h2 className="mt-2 text-3xl">Kind words</h2>
          </div>
          {avgRating != null && (
            <p className="tabular text-sm text-ink/60">
              {avgRating.toFixed(1)} average · {reviews.length} review
              {reviews.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_minmax(20rem,24rem)]">
          <div>
            {reviews.length === 0 ? (
              <p className="text-ink/60">No reviews yet — yours could be the first.</p>
            ) : (
              <ul className="space-y-8">
                {reviews.map((review) => (
                  <li key={review.id} className="border-b border-linen pb-8 last:border-0 last:pb-0">
                    <Stars rating={review.rating} />
                    {review.title && (
                      <h3 className="mt-2 font-sans text-base font-semibold text-ink">
                        {review.title}
                      </h3>
                    )}
                    <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/80">{review.body}</p>
                    <p className="mt-3 text-sm text-ink/55">
                      <span className="font-medium text-ink/75">{review.name}</span>
                      {" · "}
                      <time className="tabular" dateTime={review.createdAt.toISOString()}>
                        {formatDate(review.createdAt, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ReviewForm productId={product.id} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <p className="eyebrow">More from the haven</p>
          <h2 className="mt-2 text-3xl">Keeps good company</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
