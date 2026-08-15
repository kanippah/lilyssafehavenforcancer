import { NextResponse, type NextRequest } from "next/server";
import type { Order, OrderEvent, OrderItem, Setting } from "@prisma/client";
import { db } from "@/lib/db";
import { getBearerUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { impactLine } from "@/lib/impact";

function fail(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function shapeOrderDetail(
  order: Order & { items: OrderItem[]; events: OrderEvent[] },
  settings: Setting
) {
  return {
    number: order.number,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    createdAt: order.createdAt,
    email: order.email,
    phone: order.phone,
    shippingName: order.shippingName,
    shippingAddress: order.shippingAddress,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    donationCents: order.donationCents,
    totalCents: order.totalCents,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    discountCode: order.discountCode,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    impactLine: impactLine(order.totalCents, settings),
    items: order.items.map((i) => ({
      id: i.id,
      title: i.title,
      variantTitle: i.variantTitle,
      imageUrl: i.imageUrl,
      unitCents: i.unitCents,
      quantity: i.quantity,
    })),
    events: order.events.map((e) => ({ message: e.message, createdAt: e.createdAt })),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;

  const order = await db.order.findUnique({
    where: { number },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return fail("We couldn't find that order.", 404);

  const user = await getBearerUser(req);
  const emailParam = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!user && !emailParam) {
    return fail("Sign in, or add ?email= with the email used on the order.", 401);
  }

  const allowed = user
    ? order.userId === user.id || order.email.toLowerCase() === user.email.toLowerCase()
    : order.email.toLowerCase() === emailParam;
  if (!allowed) return fail("You don't have access to this order.", 403);

  const settings = await getSettings();
  return NextResponse.json({ data: { order: shapeOrderDetail(order, settings) } });
}
