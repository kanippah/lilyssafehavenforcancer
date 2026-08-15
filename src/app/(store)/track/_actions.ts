"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";

export type TrackedOrderItem = {
  id: string;
  title: string;
  variantTitle: string;
  quantity: number;
  unitCents: number;
  imageUrl: string | null;
};

export type TrackedOrder = {
  number: string;
  status: OrderStatus;
  placedAt: string;
  totalCents: number;
  currency: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  items: TrackedOrderItem[];
};

export type TrackState = { error?: string; order?: TrackedOrder } | undefined;

const trackSchema = z.object({
  number: z.string().trim().min(4, "Enter your order number (it looks like LSH-1024)."),
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
});

export async function trackOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const parsed = trackSchema.safeParse({
    number: formData.get("number"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const order = await db.order.findFirst({
    where: {
      number: { equals: parsed.data.number, mode: "insensitive" },
      email: { equals: parsed.data.email, mode: "insensitive" },
    },
    include: { items: true },
  });

  if (!order) {
    return {
      error:
        "We couldn't find an order matching that number and email. Check both against your confirmation and try again.",
    };
  }

  return {
    order: {
      number: order.number,
      status: order.status,
      placedAt: order.createdAt.toISOString(),
      totalCents: order.totalCents,
      currency: order.currency,
      trackingCarrier: order.trackingCarrier,
      trackingNumber: order.trackingNumber,
      items: order.items.map((item) => ({
        id: item.id,
        title: item.title,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        unitCents: item.unitCents,
        imageUrl: item.imageUrl,
      })),
    },
  };
}
