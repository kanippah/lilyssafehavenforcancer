"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { cartSubtotalCents, getCart } from "@/lib/cart";
import { sendOrderConfirmation } from "@/lib/mail";
import {
  OutOfStockError,
  computeTotals,
  createOrderFromCart,
  resolveDiscount,
  type ShippingAddressInput,
} from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import type { DiscountCode } from "@prisma/client";

/** Totals for display in the summary — donation is tracked client-side and added on top. */
export type TotalsPreview = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

export type CheckoutFieldErrors = Partial<
  Record<
    | "email"
    | "phone"
    | "fullName"
    | "line1"
    | "city"
    | "state"
    | "postalCode"
    | "country"
    | "discountCode",
    string
  >
>;

export type CheckoutState =
  | { formError?: string; fieldErrors?: CheckoutFieldErrors; values?: Record<string, string> }
  | undefined;

const MAX_DONATION_CENTS = 500_000;

const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  fullName: z.string().trim().min(2, "Add the full name the parcel should go to."),
  line1: z.string().trim().min(3, "Add the street address."),
  city: z.string().trim().min(2, "Add the city."),
  postalCode: z.string().trim().min(3, "Add the ZIP or postal code."),
  country: z.string().trim().min(2, "Add the country."),
});

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function submittedValues(formData: FormData): Record<string, string> {
  const keys = [
    "email",
    "phone",
    "fullName",
    "line1",
    "line2",
    "city",
    "state",
    "postalCode",
    "country",
    "discountCode",
    "donationCents",
    "paymentMethod",
    "saveAddress",
  ];
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/**
 * Validate a discount code against the current cart and return the resulting
 * totals (without donation) so the summary can show the saving before the
 * order is placed. The place-order action re-validates authoritatively.
 */
export async function previewDiscount(
  code: string
): Promise<{ ok: true; code: string; totals: TotalsPreview } | { ok: false; error: string }> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Type a code first, then apply it." };

  const cart = await getCart();
  if (!cart || cart.items.length === 0) return { ok: false, error: "Your basket is empty." };

  const subtotalCents = cartSubtotalCents(cart);
  const resolved = await resolveDiscount(trimmed, subtotalCents);
  if ("error" in resolved) return { ok: false, error: resolved.error };

  const settings = await getSettings();
  const totals = computeTotals({ subtotalCents, settings, discount: resolved.discount });
  return {
    ok: true,
    code: resolved.discount.code,
    totals: {
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      shippingCents: totals.shippingCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
    },
  };
}

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const values = submittedValues(formData);

  const parsed = checkoutSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
  });
  if (!parsed.success) {
    const fieldErrors: CheckoutFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CheckoutFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }

  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { formError: "Your basket is empty — add something before placing an order.", values };
  }

  const [settings, user] = await Promise.all([getSettings(), getSessionUser()]);
  const subtotalCents = cartSubtotalCents(cart);

  let discount: DiscountCode | null = null;
  const discountCode = text(formData, "discountCode");
  if (discountCode) {
    const resolved = await resolveDiscount(discountCode, subtotalCents);
    if ("error" in resolved) return { fieldErrors: { discountCode: resolved.error }, values };
    discount = resolved.discount;
  }

  const donationCents = settings.donationEnabled
    ? Math.min(MAX_DONATION_CENTS, Math.max(0, Math.round(Number(values.donationCents ?? 0) || 0)))
    : 0;

  const totals = computeTotals({ subtotalCents, settings, discount, donationCents });

  const phone = text(formData, "phone");
  const shippingAddress: ShippingAddressInput = {
    fullName: parsed.data.fullName,
    line1: parsed.data.line1,
    line2: text(formData, "line2"),
    city: parsed.data.city,
    state: text(formData, "state"),
    postalCode: parsed.data.postalCode,
    country: parsed.data.country,
    phone,
  };

  const useStripe = values.paymentMethod === "stripe" && stripeConfigured();

  let destination: string;
  try {
    const order = await createOrderFromCart({
      cart,
      email: parsed.data.email,
      phone,
      userId: user?.id ?? null,
      shippingAddress,
      totals,
      settings,
      discount,
      paymentMethod: useStripe ? "stripe" : "test",
      status: useStripe ? "PENDING" : "PAID",
    });

    if (user && values.saveAddress === "on") {
      try {
        const data = {
          fullName: shippingAddress.fullName,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 ?? null,
          city: shippingAddress.city,
          state: shippingAddress.state ?? null,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: phone ?? null,
          isDefault: true,
        };
        const existing = await db.address.findFirst({
          where: { userId: user.id, isDefault: true },
        });
        if (existing) {
          await db.address.update({ where: { id: existing.id }, data });
        } else {
          await db.address.create({ data: { ...data, userId: user.id } });
        }
      } catch (err) {
        // Saving the address is a courtesy — never fail the order over it.
        console.error("[checkout] saving address failed:", err);
      }
    }

    if (useStripe) {
      const stripe = getStripe();
      if (!stripe) throw new Error("Stripe client unavailable");
      const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: parsed.data.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: settings.currency,
              unit_amount: totals.totalCents,
              product_data: { name: `Order ${order.number} — ${settings.storeName}` },
            },
          },
        ],
        metadata: { orderNumber: order.number },
        success_url: `${base}/checkout/success/${order.number}?paid=1`,
        cancel_url: `${base}/checkout`,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      destination = session.url;
    } else {
      const placed = await db.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      if (placed) {
        void sendOrderConfirmation(placed, settings.storeName).catch((err) =>
          console.error("[checkout] confirmation email failed:", err)
        );
      }
      destination = `/checkout/success/${order.number}`;
    }
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return {
        formError: `${err.message} Adjust the quantity in your basket and try again.`,
        values,
      };
    }
    console.error("[checkout] placing order failed:", err);
    return {
      formError:
        "Something went wrong while placing your order and no payment was taken. Please try again in a moment.",
      values,
    };
  }

  revalidatePath("/", "layout");
  redirect(destination);
}
