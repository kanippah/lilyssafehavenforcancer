import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CartWithItems } from "@/lib/cart";
import type { DiscountCode, Order, Setting } from "@prisma/client";

export type OrderTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  donationCents: number;
  totalCents: number;
};

/** A discount code that is currently usable for the given subtotal, or a reason it isn't. */
export async function resolveDiscount(
  code: string,
  subtotalCents: number
): Promise<{ discount: DiscountCode } | { error: string }> {
  const discount = await db.discountCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!discount || !discount.active) return { error: "That code isn't valid." };
  const now = new Date();
  if (discount.startsAt && discount.startsAt > now) return { error: "That code isn't active yet." };
  if (discount.endsAt && discount.endsAt < now) return { error: "That code has expired." };
  if (discount.maxUses != null && discount.usedCount >= discount.maxUses)
    return { error: "That code has been fully redeemed." };
  if (discount.minSubtotalCents != null && subtotalCents < discount.minSubtotalCents)
    return { error: "Your order doesn't meet the minimum for that code." };
  return { discount };
}

export function computeTotals(opts: {
  subtotalCents: number;
  settings: Setting;
  discount?: DiscountCode | null;
  donationCents?: number;
}): OrderTotals {
  const { subtotalCents, settings } = opts;
  const donationCents = Math.max(0, Math.round(opts.donationCents ?? 0));

  let discountCents = 0;
  let freeShipping = false;
  const d = opts.discount;
  if (d) {
    if (d.type === "PERCENT") discountCents = Math.round((subtotalCents * d.value) / 100);
    else if (d.type === "FIXED") discountCents = Math.min(d.value, subtotalCents);
    else if (d.type === "FREE_SHIPPING") freeShipping = true;
  }

  const discountedSubtotal = Math.max(0, subtotalCents - discountCents);

  let shippingCents = settings.shippingFlatCents;
  if (subtotalCents === 0) shippingCents = 0;
  if (freeShipping) shippingCents = 0;
  if (
    settings.freeShippingThresholdCents != null &&
    discountedSubtotal >= settings.freeShippingThresholdCents
  ) {
    shippingCents = 0;
  }

  const taxCents = Math.round((discountedSubtotal * settings.taxRatePct) / 100);
  const totalCents = discountedSubtotal + shippingCents + taxCents + donationCents;

  return { subtotalCents, discountCents, shippingCents, taxCents, donationCents, totalCents };
}

export type ShippingAddressInput = {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export class OutOfStockError extends Error {
  constructor(public itemTitle: string) {
    super(`"${itemTitle}" doesn't have enough stock left.`);
  }
}

export class UnavailableItemError extends Error {
  constructor(public itemTitle: string) {
    super(`"${itemTitle}" is no longer available.`);
  }
}

export class DiscountUnavailableError extends Error {
  constructor() {
    super("That discount code has just been fully redeemed.");
  }
}

/**
 * Create an order from a cart inside a transaction: validates + decrements
 * stock, snapshots line items, increments discount usage, logs the first
 * timeline event, and empties the cart.
 */
export async function createOrderFromCart(opts: {
  cart: CartWithItems;
  email: string;
  phone?: string;
  userId?: string | null;
  shippingAddress: ShippingAddressInput;
  totals: OrderTotals;
  settings: Setting;
  discount?: DiscountCode | null;
  paymentMethod: string;
  paymentRef?: string;
  status?: Order["status"];
  note?: string;
  /** Leave the cart intact (Stripe path empties it only once the session exists). */
  keepCart?: boolean;
}): Promise<Order> {
  // Retried because the friendly sequential order number can race under
  // concurrent checkouts; later attempts switch to a collision-free number.
  for (let attempt = 0; ; attempt++) {
    try {
      return await createOrderAttempt(opts, attempt);
    } catch (err) {
      if (attempt < 2 && isOrderNumberCollision(err)) continue;
      throw err;
    }
  }
}

function isOrderNumberCollision(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    String(err.meta?.target ?? "").includes("number")
  );
}

async function createOrderAttempt(
  opts: Parameters<typeof createOrderFromCart>[0],
  attempt: number
): Promise<Order> {
  const { cart, totals, settings } = opts;
  if (cart.items.length === 0) throw new Error("Cart is empty");

  return db.$transaction(async (tx) => {
    for (const item of cart.items) {
      if (item.variant.product.status !== "ACTIVE") {
        throw new UnavailableItemError(item.variant.product.title);
      }
      if (!item.variant.trackStock) continue;
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        throw new OutOfStockError(`${item.variant.product.title} — ${item.variant.title}`);
      }
    }

    if (opts.discount) {
      // Guarded increment so concurrent checkouts can't push usedCount past maxUses.
      const claimed = await tx.$executeRaw`
        UPDATE "DiscountCode" SET "usedCount" = "usedCount" + 1
        WHERE "id" = ${opts.discount.id} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
      if (claimed === 0) throw new DiscountUnavailableError();
    }

    const number = attempt === 0 ? await nextOrderNumber(tx) : fallbackOrderNumber();
    const status = opts.status ?? "PAID";

    const order = await tx.order.create({
      data: {
        number,
        userId: opts.userId ?? null,
        email: opts.email,
        phone: opts.phone,
        status,
        shippingName: opts.shippingAddress.fullName,
        shippingAddress: opts.shippingAddress as unknown as Prisma.InputJsonValue,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        donationCents: totals.donationCents,
        totalCents: totals.totalCents,
        currency: settings.currency,
        paymentMethod: opts.paymentMethod,
        paymentRef: opts.paymentRef,
        discountCode: opts.discount?.code,
        note: opts.note,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            title: item.variant.product.title,
            variantTitle: item.variant.title === "Default" ? "" : item.variant.title,
            imageUrl: item.variant.product.images[0]?.url ?? null,
            unitCents: item.variant.priceCents,
            quantity: item.quantity,
          })),
        },
        events: {
          create: {
            message:
              status === "PAID"
                ? `Order placed and paid via ${opts.paymentMethod}.`
                : "Order placed — awaiting payment.",
          },
        },
      },
    });

    if (!opts.keepCart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    return order;
  });
}

async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.order.count();
  for (let i = 0; i < 5; i++) {
    const candidate = `LSH-${1001 + count + i}`;
    const exists = await tx.order.findUnique({ where: { number: candidate } });
    if (!exists) return candidate;
  }
  return fallbackOrderNumber();
}

function fallbackOrderNumber(): string {
  const rand = Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");
  return `LSH-${Date.now().toString(36).toUpperCase()}${rand}`;
}

/**
 * Return what an order was holding: restock tracked variants and release the
 * discount use. Run inside the same transaction as a guarded (updateMany with
 * a status filter) move to CANCELLED/REFUNDED so it executes exactly once.
 */
export async function releaseOrderReservations(
  tx: Prisma.TransactionClient,
  order: { discountCode: string | null; items: Array<{ variantId: string | null; quantity: number }> }
): Promise<number> {
  let restocked = 0;
  for (const item of order.items) {
    if (!item.variantId) continue;
    const result = await tx.productVariant.updateMany({
      where: { id: item.variantId, trackStock: true },
      data: { stock: { increment: item.quantity } },
    });
    if (result.count > 0) restocked += item.quantity;
  }
  if (order.discountCode) {
    await tx.discountCode.updateMany({
      where: { code: order.discountCode, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }
  return restocked;
}

export const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  FULFILLED: "Being prepared",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};
