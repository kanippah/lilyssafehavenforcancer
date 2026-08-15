import type { Metadata } from "next";
import Link from "next/link";
import { LilyMark } from "@/components/lily-mark";
import { LinkButton } from "@/components/ui/button";
import { Price } from "@/components/store/price";
import { QuantityStepper, RemoveCartItemButton } from "@/components/store/quantity-stepper";
import { cartItemCount, cartSubtotalCents, getCart } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { impactLine } from "@/lib/impact";

export const metadata: Metadata = { title: "Your basket" };

export default async function CartPage() {
  const [cart, settings] = await Promise.all([getCart(), getSettings()]);
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
        <LilyMark className="mx-auto h-14 w-14 text-leaf" />
        <h1 className="mt-6 text-3xl sm:text-4xl">Your basket is empty — the haven is full</h1>
        <p className="mx-auto mt-3 max-w-md text-ink/70">
          Everything in the shop funds real care for people in treatment. Come find something kind.
        </p>
        <LinkButton href="/shop" size="lg" className="mt-8">
          Browse the shop
        </LinkButton>
      </div>
    );
  }

  const subtotalCents = cartSubtotalCents(cart);
  const count = cartItemCount(cart);
  const threshold = settings.freeShippingThresholdCents;
  const shippingNote =
    threshold != null
      ? subtotalCents >= threshold
        ? "Free — your basket qualifies"
        : `Free over ${formatMoneyCompact(threshold, settings.currency)}, otherwise ${formatMoneyCompact(settings.shippingFlatCents, settings.currency)}`
      : settings.shippingFlatCents === 0
        ? "Free"
        : `${formatMoneyCompact(settings.shippingFlatCents, settings.currency)} flat rate`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">Your basket</h1>
          <p className="mt-1 text-sm text-ink/60">
            <span className="tabular">{count}</span> {count === 1 ? "item" : "items"}
          </p>
        </div>
        <Link
          href="/shop"
          className="text-sm font-medium text-leaf underline underline-offset-4 hover:text-fern"
        >
          Continue shopping
        </Link>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
        <ul className="divide-y divide-linen border-y border-linen">
          {items.map((item) => {
            const image = [...item.variant.product.images].sort((a, b) => a.position - b.position)[0];
            const variantTitle = item.variant.title === "Default" ? "" : item.variant.title;
            return (
              <li key={item.id} className="flex gap-4 py-5 sm:gap-5">
                <Link href={`/products/${item.variant.product.slug}`} className="shrink-0">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={image.alt ?? item.variant.product.title}
                      className="h-20 w-20 rounded-[var(--radius-card)] bg-parchment object-cover sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div
                      className="h-20 w-20 rounded-[var(--radius-card)] bg-parchment sm:h-24 sm:w-24"
                      aria-hidden="true"
                    />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/products/${item.variant.product.slug}`}
                      className="font-sans font-semibold leading-snug text-ink hover:underline hover:decoration-petal hover:decoration-2 hover:underline-offset-4"
                    >
                      {item.variant.product.title}
                    </Link>
                    <span className="tabular shrink-0 font-medium">
                      {formatMoney(item.variant.priceCents * item.quantity, settings.currency)}
                    </span>
                  </div>
                  {variantTitle && <p className="text-sm text-ink/60">{variantTitle}</p>}
                  <p className="mt-0.5 text-sm text-ink/60">
                    <Price cents={item.variant.priceCents} currency={settings.currency} /> each
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <QuantityStepper itemId={item.id} quantity={item.quantity} />
                    <RemoveCartItemButton itemId={item.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="rounded-[var(--radius-card)] border border-linen bg-parchment p-6">
          <h2 className="text-xl">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink/70">Subtotal</dt>
              <dd className="tabular font-medium">{formatMoney(subtotalCents, settings.currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink/70">Shipping</dt>
              <dd className="text-right text-ink/70">{shippingNote}</dd>
            </div>
          </dl>
          <p className="ledger-line mt-3" aria-label="What this subtotal funds">
            → {impactLine(subtotalCents, settings)}
          </p>
          {settings.donationEnabled && (
            <p className="mt-4 text-xs text-ink/55">You can add a donation at the next step.</p>
          )}
          <hr className="rule my-5" />
          <LinkButton href="/checkout" size="lg" className="w-full">
            Go to checkout
          </LinkButton>
          <p className="mt-3 text-center text-xs text-ink/55">
            Taxes and any discount are worked out at checkout.
          </p>
        </aside>
      </div>
    </div>
  );
}
