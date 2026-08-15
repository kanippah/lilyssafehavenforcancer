"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type DiscountType } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";

export type DiscountFormState = { error?: string } | undefined;

async function requireStaff(): Promise<void> {
  const user = await getSessionUser();
  if (!isStaff(user)) throw new Error("UNAUTHORIZED");
}

const baseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Codes need at least 2 characters.")
    .max(40, "Codes can be at most 40 characters.")
    .transform((s) => s.toUpperCase().replace(/\s+/g, "")),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
});

type ParsedDiscount = {
  code: string;
  type: DiscountType;
  value: number;
  minSubtotalCents: number | null;
  maxUses: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

function parseDiscountForm(formData: FormData): { error: string } | { data: ParsedDiscount } {
  const base = baseSchema.safeParse({ code: formData.get("code"), type: formData.get("type") });
  if (!base.success) return { error: base.error.issues[0].message };
  const { code, type } = base.data;

  let value = 0;
  if (type === "PERCENT") {
    const n = Number(formData.get("value"));
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { error: "Percent discounts need a whole number between 1 and 100." };
    }
    value = n;
  } else if (type === "FIXED") {
    value = parseMoneyToCents(String(formData.get("value") ?? ""));
    if (value <= 0) return { error: "Enter the dollar amount this code takes off." };
  }

  const minRaw = String(formData.get("minSubtotal") ?? "").trim();
  let minSubtotalCents: number | null = null;
  if (minRaw) {
    minSubtotalCents = parseMoneyToCents(minRaw);
    if (minSubtotalCents <= 0) {
      return { error: "The minimum subtotal must be a dollar amount above zero, or left empty." };
    }
  }

  const maxRaw = String(formData.get("maxUses") ?? "").trim();
  let maxUses: number | null = null;
  if (maxRaw) {
    const n = Number(maxRaw);
    if (!Number.isInteger(n) || n < 1) {
      return { error: "Max uses must be a whole number of at least 1, or left empty." };
    }
    maxUses = n;
  }

  const startsRaw = String(formData.get("startsAt") ?? "").trim();
  const endsRaw = String(formData.get("endsAt") ?? "").trim();
  const startsAt = startsRaw ? new Date(startsRaw) : null;
  const endsAt = endsRaw ? new Date(endsRaw) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: "The start date doesn't look right." };
  if (endsAt && Number.isNaN(endsAt.getTime())) return { error: "The end date doesn't look right." };
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { error: "The end date must come after the start date." };
  }

  const active = formData.get("active") === "on";

  return { data: { code, type, value, minSubtotalCents, maxUses, startsAt, endsAt, active } };
}

export async function createDiscount(
  _prev: DiscountFormState,
  formData: FormData
): Promise<DiscountFormState> {
  await requireStaff();
  const parsed = parseDiscountForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await db.discountCode.create({ data: parsed.data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: `The code ${parsed.data.code} already exists — pick another.` };
    }
    throw err;
  }
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts");
}

export async function updateDiscount(
  id: string,
  _prev: DiscountFormState,
  formData: FormData
): Promise<DiscountFormState> {
  await requireStaff();
  const parsed = parseDiscountForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await db.discountCode.update({ where: { id }, data: parsed.data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: `The code ${parsed.data.code} already exists — pick another.` };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "This discount no longer exists." };
    }
    throw err;
  }
  revalidatePath("/admin/discounts");
  revalidatePath(`/admin/discounts/${id}`);
  redirect("/admin/discounts");
}

export async function deleteDiscount(id: string): Promise<void> {
  await requireStaff();
  try {
    await db.discountCode.delete({ where: { id } });
  } catch (err) {
    // Already gone — the list is the right place to land either way.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025")) throw err;
  }
  revalidatePath("/admin/discounts");
  redirect("/admin/discounts");
}
