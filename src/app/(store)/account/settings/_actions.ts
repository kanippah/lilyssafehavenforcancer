"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";

export type SettingsFormState = { error?: string; message?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name (at least 2 characters)."),
  phone: z.string().trim().max(30, "Keep the phone number under 30 characters.").optional(),
});

export async function updateProfile(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has ended — sign in again to update your profile." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone ?? null },
  });
  revalidatePath("/account", "layout");
  return { message: "Profile saved." };
}

export async function changePassword(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has ended — sign in again to change your password." };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current) return { error: "Enter your current password." };
  if (next.length < 8) return { error: "New passwords need at least 8 characters." };
  if (next !== confirm) return { error: "The new passwords don't match — check both fields." };

  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: "Your current password doesn't match our records." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  return { message: "Password updated — use it next time you sign in." };
}
