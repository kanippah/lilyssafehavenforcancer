import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { cartSubtotalCents, getCart } from "@/lib/cart";
import { computeTotals } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { stripeConfigured } from "@/lib/stripe";
import { CheckoutClient } from "./_components/checkout-client";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [cart, settings, user] = await Promise.all([getCart(), getSettings(), getSessionUser()]);
  if (!cart || cart.items.length === 0) redirect("/cart");

  const address = user
    ? await db.address.findFirst({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }],
      })
    : null;

  const subtotalCents = cartSubtotalCents(cart);
  const totals = computeTotals({ subtotalCents, settings });

  const items = cart.items.map((item) => ({
    id: item.id,
    title: item.variant.product.title,
    variantTitle: item.variant.title === "Default" ? "" : item.variant.title,
    quantity: item.quantity,
    unitCents: item.variant.priceCents,
    imageUrl:
      [...item.variant.product.images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Nearly there</h1>
      </div>
      <CheckoutClient
        items={items}
        initialTotals={{
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          shippingCents: totals.shippingCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
        }}
        currency={settings.currency}
        donationEnabled={settings.donationEnabled}
        impactUnitCents={settings.impactUnitCents}
        impactUnitLabel={settings.impactUnitLabel}
        stripeEnabled={stripeConfigured()}
        signedIn={Boolean(user)}
        prefill={{
          email: user?.email ?? "",
          phone: user?.phone ?? address?.phone ?? "",
          fullName: address?.fullName ?? user?.name ?? "",
          line1: address?.line1 ?? "",
          line2: address?.line2 ?? "",
          city: address?.city ?? "",
          state: address?.state ?? "",
          postalCode: address?.postalCode ?? "",
          country: address?.country ?? "United States",
        }}
      />
    </div>
  );
}
