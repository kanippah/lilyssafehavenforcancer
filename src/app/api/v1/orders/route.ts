import { NextResponse } from "next/server";
import { z } from "zod";
import type { Order, OrderEvent, OrderItem, Setting, User } from "@prisma/client";
import { db } from "@/lib/db";
import { getBearerUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cartSubtotalCents, type CartWithItems } from "@/lib/cart";
import {
  DiscountUnavailableError,
  ORDER_STATUS_LABELS,
  OutOfStockError,
  UnavailableItemError,
  computeTotals,
  createOrderFromCart,
  resolveDiscount,
} from "@/lib/orders";
import { impactLine } from "@/lib/impact";
import { sendOrderConfirmation } from "@/lib/mail";

const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      variant: {
        include: {
          product: { include: { images: { orderBy: { position: "asc" as const } } } },
        },
      },
    },
  },
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function shapeItems(items: OrderItem[]) {
  return items.map((i) => ({
    id: i.id,
    title: i.title,
    variantTitle: i.variantTitle,
    imageUrl: i.imageUrl,
    unitCents: i.unitCents,
    quantity: i.quantity,
  }));
}

function shapeOrderSummary(order: Order & { items: OrderItem[] }) {
  return {
    number: order.number,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    createdAt: order.createdAt,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    donationCents: order.donationCents,
    totalCents: order.totalCents,
    currency: order.currency,
    items: shapeItems(order.items),
  };
}

function shapeOrderDetail(
  order: Order & { items: OrderItem[]; events: OrderEvent[] },
  settings: Setting
) {
  return {
    ...shapeOrderSummary(order),
    email: order.email,
    phone: order.phone,
    shippingName: order.shippingName,
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    discountCode: order.discountCode,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    impactLine: impactLine(order.totalCents, settings),
    events: order.events.map((e) => ({ message: e.message, createdAt: e.createdAt })),
  };
}

export async function GET(req: Request) {
  const user = await getBearerUser(req);
  if (!user) return fail("Sign in to continue.", 401);

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return NextResponse.json({ data: { orders: orders.map(shapeOrderSummary) } });
}

const shippingSchema = z.object({
  fullName: z.string().trim().min(2, "Add the full name for delivery."),
  line1: z.string().trim().min(3, "Add a street address."),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1, "Add a city."),
  state: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().min(2, "Add a postal code."),
  country: z.string().trim().min(2).default("United States"),
  phone: z.string().trim().max(40).optional(),
});

const placeOrderSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email doesn't look right.").optional(),
  phone: z.string().trim().max(40).optional(),
  shippingAddress: shippingSchema,
  discountCode: z.string().trim().optional(),
  donationCents: z.coerce.number().int().min(0).max(10_000_000).default(0),
  paymentMethod: z.literal("test"),
});

/** The caller's cart: bearer user's cart first, else the X-Cart-Token guest cart. */
async function resolveCart(req: Request, user: User | null): Promise<CartWithItems | null> {
  if (user) {
    return db.cart.findUnique({ where: { userId: user.id }, include: cartInclude });
  }
  const token = req.headers.get("x-cart-token");
  if (!token) return null;
  const cart = await db.cart.findUnique({ where: { token }, include: cartInclude });
  return cart && cart.userId ? null : cart;
}

export async function POST(req: Request) {
  const json = await readJson(req);
  if (json === null) return fail("Send a JSON body with the order details.", 400);

  const parsed = placeOrderSchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);
  const body = parsed.data;

  const user = await getBearerUser(req);
  const cart = await resolveCart(req, user);
  if (!cart || cart.items.length === 0) return fail("Your cart is empty.", 400);

  const email = body.email ?? user?.email;
  if (!email) return fail("Add an email for the order confirmation.", 400);

  const settings = await getSettings();
  const subtotalCents = cartSubtotalCents(cart);

  let discount = null;
  if (body.discountCode) {
    const resolved = await resolveDiscount(body.discountCode, subtotalCents);
    if ("error" in resolved) return fail(resolved.error, 400);
    discount = resolved.discount;
  }

  const donationCents = settings.donationEnabled ? body.donationCents : 0;
  const totals = computeTotals({ subtotalCents, settings, discount, donationCents });

  let orderId: string;
  try {
    const order = await createOrderFromCart({
      cart,
      email,
      phone: body.phone,
      userId: user?.id ?? null,
      shippingAddress: body.shippingAddress,
      totals,
      settings,
      discount,
      paymentMethod: "test",
      status: "PAID",
    });
    orderId = order.id;
  } catch (err) {
    if (err instanceof OutOfStockError) return fail(err.message, 409);
    if (err instanceof UnavailableItemError) return fail(err.message, 409);
    if (err instanceof DiscountUnavailableError) return fail(err.message, 409);
    throw err;
  }

  const full = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
  await sendOrderConfirmation(full, settings.storeName);

  return NextResponse.json({ data: { order: shapeOrderDetail(full, settings) } }, { status: 201 });
}
