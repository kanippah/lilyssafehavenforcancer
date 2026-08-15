"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { parseMoneyToCents } from "@/lib/money";
import { impactLine } from "@/lib/impact";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export type DonateState = { error?: string } | undefined;

const donateSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  note: z.string().trim().max(500, "Notes can be up to 500 characters.").optional(),
});

const MIN_CENTS = 100; // $1
const MAX_CENTS = 1_000_000; // $10,000

/** Donation orders get their own number prefix; the number column is unique. */
function donationOrderNumber(): string {
  return `LSH-D${Date.now().toString(36).toUpperCase()}`;
}

export async function submitDonation(_prev: DonateState, formData: FormData): Promise<DonateState> {
  const parsed = donateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const amountCents = parseMoneyToCents(String(formData.get("amount") ?? ""));
  if (amountCents < MIN_CENTS) {
    return { error: "Donations start at $1 — enter an amount of at least a dollar." };
  }
  if (amountCents > MAX_CENTS) {
    return { error: "For gifts over $10,000, write to us directly so we can thank you properly." };
  }

  const [settings, user] = await Promise.all([getSettings(), getSessionUser()]);
  const { name, email, note } = parsed.data;
  const number = donationOrderNumber();

  const orderBase = {
    number,
    userId: user?.id ?? null,
    email,
    shippingName: name,
    shippingAddress: {} as Prisma.InputJsonValue,
    subtotalCents: 0,
    discountCents: 0,
    shippingCents: 0,
    taxCents: 0,
    donationCents: amountCents,
    totalCents: amountCents,
    currency: settings.currency,
    note: note ?? null,
  };

  if (stripeConfigured()) {
    const stripe = getStripe();
    if (!stripe) return { error: "Payments aren't available right now. Please try again shortly." };

    const order = await db.order.create({
      data: {
        ...orderBase,
        status: "PENDING",
        paymentMethod: "stripe",
        events: { create: { message: "Direct donation started — awaiting payment." } },
      },
    });

    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    let sessionUrl: string;
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: settings.currency,
              unit_amount: amountCents,
              product_data: {
                name: `Direct donation — ${settings.storeName}`,
                description: `Your gift ${impactLine(amountCents, settings)}.`,
              },
            },
          },
        ],
        metadata: { orderNumber: number, kind: "donation" },
        success_url: `${base}/donate/thanks?n=${number}`,
        cancel_url: `${base}/donate`,
      });
      if (!session.url) throw new Error("Stripe session has no URL");
      sessionUrl = session.url;
      await db.order.update({ where: { id: order.id }, data: { paymentRef: session.id } });
    } catch (err) {
      console.error("[donate] stripe session failed:", err);
      return { error: "We couldn't reach the payment provider. Nothing was charged — please try again." };
    }
    redirect(sessionUrl);
  }

  await db.order.create({
    data: {
      ...orderBase,
      status: "PAID",
      paymentMethod: "test",
      events: { create: { message: "Direct donation — thank you." } },
    },
  });

  revalidatePath("/", "layout");
  redirect(`/donate/thanks?n=${number}`);
}
