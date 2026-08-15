import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Setting } from "@prisma/client";

/**
 * Store settings singleton (row id = 1), created with defaults on first read.
 * Memoized per request.
 */
export const getSettings = cache(async (): Promise<Setting> => {
  const existing = await db.setting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
});

/** Total raised for the cause: paid-or-later order totals. */
export const getTotalRaisedCents = cache(async (): Promise<number> => {
  const paidStatuses = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] as const;
  const agg = await db.order.aggregate({
    _sum: { totalCents: true },
    where: { status: { in: [...paidStatuses] } },
  });
  return agg._sum.totalCents ?? 0;
});
