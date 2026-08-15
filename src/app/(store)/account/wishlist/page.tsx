import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ProductCard } from "@/components/store/product-card";
import { LinkButton } from "@/components/ui/button";
import { LilyMark } from "@/components/lily-mark";

export const metadata: Metadata = {
  title: "Your wishlist",
  description: "Products you've saved for later.",
};

export default async function AccountWishlistPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/wishlist");

  const [settings, items] = await Promise.all([
    getSettings(),
    db.wishlistItem.findMany({
      where: { userId: user.id, product: { status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      include: { product: { include: { images: true, variants: true } } },
    }),
  ]);

  return (
    <div>
      <header>
        <h1 className="text-3xl">Your wishlist</h1>
        <p className="mt-2 text-sm text-ink/60">
          Tap the heart on any product and it will wait for you here.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-10 text-center">
          <LilyMark className="mx-auto h-10 w-10 text-moss" />
          <p className="mt-4 text-ink/70">
            Nothing saved yet. When something catches your eye, press its heart and it will be kept
            safe here.
          </p>
          <LinkButton href="/shop" className="mt-5">
            Browse the shop
          </LinkButton>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-3">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} settings={settings} />
          ))}
        </div>
      )}
    </div>
  );
}
