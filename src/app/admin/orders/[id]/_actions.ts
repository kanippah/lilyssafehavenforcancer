"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";

export type NoteState = { error?: string; at?: number } | undefined;

async function requireStaff(): Promise<void> {
  const user = await getSessionUser();
  if (!isStaff(user)) throw new Error("UNAUTHORIZED");
}

function refresh(orderId: string): void {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/** Move an order from one of `allowedFrom` to `to`, logging a timeline event. */
async function transitionOrder(
  orderId: string,
  allowedFrom: OrderStatus[],
  to: OrderStatus,
  message: string
): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order || !allowedFrom.includes(order.status)) return; // stale button — page refresh shows current state
  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: to } }),
    db.orderEvent.create({ data: { orderId, message } }),
  ]);
  refresh(orderId);
}

export async function markPaid(orderId: string): Promise<void> {
  await requireStaff();
  await transitionOrder(orderId, ["PENDING"], "PAID", "Payment recorded — order marked paid.");
}

export async function markFulfilled(orderId: string): Promise<void> {
  await requireStaff();
  await transitionOrder(
    orderId,
    ["PAID"],
    "FULFILLED",
    "Order fulfilled — items packed and being prepared for shipment."
  );
}

export async function markShipped(orderId: string, formData: FormData): Promise<void> {
  await requireStaff();
  const carrier = String(formData.get("trackingCarrier") ?? "").trim().slice(0, 60);
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim().slice(0, 80);

  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order || order.status !== "FULFILLED") return;

  const message =
    carrier && trackingNumber
      ? `Order shipped via ${carrier} — tracking ${trackingNumber}.`
      : carrier
        ? `Order shipped via ${carrier}.`
        : trackingNumber
          ? `Order shipped — tracking ${trackingNumber}.`
          : "Order shipped.";

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        trackingCarrier: carrier || null,
        trackingNumber: trackingNumber || null,
      },
    }),
    db.orderEvent.create({ data: { orderId, message } }),
  ]);
  refresh(orderId);
}

export async function markDelivered(orderId: string): Promise<void> {
  await requireStaff();
  await transitionOrder(orderId, ["SHIPPED"], "DELIVERED", "Order delivered.");
}

/** Cancel or refund: set the terminal status and return tracked stock to the shelves. */
async function closeOrder(
  orderId: string,
  to: "CANCELLED" | "REFUNDED",
  allowedFrom: OrderStatus[]
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || !allowedFrom.includes(order.status)) return;

  await db.$transaction(async (tx) => {
    let restocked = 0;
    for (const item of order.items) {
      if (!item.variantId) continue;
      const result = await tx.productVariant.updateMany({
        where: { id: item.variantId, trackStock: true },
        data: { stock: { increment: item.quantity } },
      });
      if (result.count > 0) restocked += item.quantity;
    }
    const verb = to === "CANCELLED" ? "cancelled" : "refunded";
    const message =
      restocked > 0
        ? `Order ${verb} — ${restocked} item${restocked === 1 ? "" : "s"} returned to stock.`
        : `Order ${verb}.`;
    await tx.order.update({ where: { id: orderId }, data: { status: to } });
    await tx.orderEvent.create({ data: { orderId, message } });
  });
  refresh(orderId);
}

export async function cancelOrder(orderId: string): Promise<void> {
  await requireStaff();
  await closeOrder(orderId, "CANCELLED", ["PENDING", "PAID", "FULFILLED", "SHIPPED"]);
}

export async function refundOrder(orderId: string): Promise<void> {
  await requireStaff();
  await closeOrder(orderId, "REFUNDED", ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"]);
}

const noteSchema = z
  .string()
  .trim()
  .min(2, "Write the note first — at least 2 characters.")
  .max(500, "Notes can be at most 500 characters.");

export async function addNote(
  orderId: string,
  _prev: NoteState,
  formData: FormData
): Promise<NoteState> {
  await requireStaff();
  const parsed = noteSchema.safeParse(formData.get("note"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) return { error: "This order no longer exists." };

  await db.orderEvent.create({ data: { orderId, message: `Note: ${parsed.data}` } });
  refresh(orderId);
  return { at: Date.now() };
}
