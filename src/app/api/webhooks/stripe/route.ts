import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook: marks PENDING orders as PAID when their Checkout Session
 * completes. Configure the endpoint in Stripe to send
 * `checkout.session.completed` events and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhooks aren't configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderNumber = session.metadata?.orderNumber;
    if (orderNumber) {
      try {
        const order = await db.order.findUnique({ where: { number: orderNumber } });
        if (order && order.status === "PENDING") {
          const updated = await db.order.update({
            where: { id: order.id },
            data: {
              status: "PAID",
              paymentRef: session.id,
              events: { create: { message: "Payment confirmed by Stripe." } },
            },
            include: { items: true },
          });
          // Fire and forget so the webhook responds fast.
          void getSettings()
            .then((settings) => sendOrderConfirmation(updated, settings.storeName))
            .catch((err) => console.error("[stripe-webhook] confirmation email failed:", err));
        }
      } catch (err) {
        console.error("[stripe-webhook] handling checkout.session.completed failed:", err);
        return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
