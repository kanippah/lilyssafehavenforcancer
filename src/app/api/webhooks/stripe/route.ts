import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/mail";
import { releaseOrderReservations } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook. Configure the endpoint to send `checkout.session.completed`
 * and `checkout.session.expired`, and set STRIPE_WEBHOOK_SECRET.
 *
 * - completed + order still PENDING → mark PAID (guarded update, so a racing
 *   admin cancel can't be overwritten) and email the confirmation.
 * - completed + order no longer PENDING → a late payment landed on a
 *   cancelled/refunded order: refund it automatically and log the event.
 * - expired → the customer abandoned checkout: cancel the PENDING order and
 *   release its stock + discount use.
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

  try {
    if (event.type === "checkout.session.completed") {
      await handleCompleted(stripe, event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "checkout.session.expired") {
      await handleExpired(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    console.error(`[stripe-webhook] handling ${event.type} failed:`, err);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCompleted(stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
  const orderNumber = session.metadata?.orderNumber;
  if (!orderNumber) return;

  // Guarded transition: only a still-PENDING order becomes PAID.
  const updated = await db.order.updateMany({
    where: { number: orderNumber, status: "PENDING" },
    data: { status: "PAID", paymentRef: session.id },
  });

  if (updated.count === 1) {
    const order = await db.order.findUnique({
      where: { number: orderNumber },
      include: { items: true },
    });
    if (!order) return;
    await db.orderEvent.create({
      data: { orderId: order.id, message: "Payment confirmed by Stripe." },
    });
    void getSettings()
      .then((settings) => sendOrderConfirmation(order, settings.storeName))
      .catch((err) => console.error("[stripe-webhook] confirmation email failed:", err));
    return;
  }

  const order = await db.order.findUnique({ where: { number: orderNumber } });
  if (!order) return;
  if (order.status === "PAID" && order.paymentRef === session.id) return; // duplicate delivery

  // Late payment on an order that was cancelled/refunded in the meantime.
  let message: string;
  try {
    await stripe.refunds.create({ payment_intent: session.payment_intent as string });
    message = `Late Stripe payment received after the order was ${order.status.toLowerCase()} — refunded automatically (session ${session.id}).`;
  } catch (refundErr) {
    console.error("[stripe-webhook] automatic refund failed:", refundErr);
    message = `ALERT: late Stripe payment received after the order was ${order.status.toLowerCase()} and the automatic refund FAILED — refund manually in the Stripe dashboard (session ${session.id}).`;
  }
  await db.orderEvent.create({ data: { orderId: order.id, message } });
}

async function handleExpired(session: Stripe.Checkout.Session): Promise<void> {
  const orderNumber = session.metadata?.orderNumber;
  if (!orderNumber) return;
  const order = await db.order.findUnique({
    where: { number: orderNumber },
    include: { items: true },
  });
  if (!order || order.status !== "PENDING") return;

  await db.$transaction(async (tx) => {
    const closed = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (closed.count === 1) {
      await releaseOrderReservations(tx, order);
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          message: "Checkout expired unpaid — stock and discount use released.",
        },
      });
    }
  });
}
