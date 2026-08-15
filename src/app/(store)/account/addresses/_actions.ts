"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export type AddressFormState = { error?: string; message?: string } | undefined;

const addressSchema = z.object({
  label: z.string().trim().max(40, "Keep the label under 40 characters.").optional(),
  fullName: z.string().trim().min(2, "Add the recipient's full name."),
  line1: z.string().trim().min(3, "Add the street address."),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Add the city."),
  state: z.string().trim().max(60).optional(),
  postalCode: z.string().trim().min(3, "Add the postal code."),
  country: z.string().trim().min(2, "Add the country."),
  phone: z.string().trim().max(30).optional(),
});

/**
 * Create (addressId = null) or update (addressId set) an address.
 * Ownership is enforced; making an address the default clears the flag
 * from every other address in the same transaction.
 */
export async function saveAddress(
  addressId: string | null,
  _prev: AddressFormState,
  formData: FormData
): Promise<AddressFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has ended — sign in again to manage addresses." };

  const parsed = addressSchema.safeParse({
    label: formData.get("label") || undefined,
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const wantsDefault = formData.get("isDefault") === "on";
  const data = {
    label: parsed.data.label ?? null,
    fullName: parsed.data.fullName,
    line1: parsed.data.line1,
    line2: parsed.data.line2 ?? null,
    city: parsed.data.city,
    state: parsed.data.state ?? null,
    postalCode: parsed.data.postalCode,
    country: parsed.data.country,
    phone: parsed.data.phone ?? null,
  };

  if (addressId) {
    const existing = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!existing) return { error: "That address isn't in your book anymore." };
    await db.$transaction(async (tx) => {
      if (wantsDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, NOT: { id: addressId } },
          data: { isDefault: false },
        });
      }
      await tx.address.update({
        where: { id: addressId },
        data: { ...data, isDefault: wantsDefault },
      });
    });
  } else {
    const count = await db.address.count({ where: { userId: user.id } });
    const makeDefault = wantsDefault || count === 0;
    await db.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      await tx.address.create({ data: { userId: user.id, ...data, isDefault: makeDefault } });
    });
  }

  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { message: addressId ? "Address updated." : "Address saved." };
}

export async function deleteAddress(
  addressId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Your session has ended — sign in again." };

  const existing = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!existing) return { ok: false, error: "That address is already gone." };

  await db.address.delete({ where: { id: existing.id } });
  revalidatePath("/account/addresses");
  revalidatePath("/account");
  return { ok: true };
}
