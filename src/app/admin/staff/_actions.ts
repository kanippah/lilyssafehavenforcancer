"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, hashPassword, isAdmin } from "@/lib/auth";

function done(kind: "message" | "error", text: string): never {
  revalidatePath("/admin/staff");
  redirect(`/admin/staff?${kind}=${encodeURIComponent(text)}`);
}

async function requireAdmin(): Promise<void> {
  const user = await getSessionUser();
  if (!isAdmin(user)) done("error", "Only the admin can manage staff.");
}

const roleSchema = z.enum(["CUSTOMER", "STAFF", "ADMIN"]);

export async function changeUserRole(userId: string, formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedRole = roleSchema.safeParse(formData.get("role"));
  if (!parsedRole.success) done("error", "Pick a role from the list.");
  const role = parsedRole.data;

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) done("error", "That account no longer exists.");

  if (target.role === role) {
    done("message", `${target.name} is already ${role.toLowerCase()} — nothing to change.`);
  }

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      done("error", "That would leave the store with no admin — promote someone else to admin first.");
    }
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  done("message", `${target.name} is now ${role.toLowerCase()}.`);
}

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Add the new staff member's name (at least 2 characters)."),
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  password: z.string().min(8, "Temporary passwords need at least 8 characters."),
});

export async function inviteStaff(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) done("error", parsed.error.issues[0].message);

  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    done(
      "error",
      "An account with that email already exists — search for it below and promote it instead."
    );
  }

  await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role: "STAFF" },
  });
  done("message", `${name} joined the staff. Share their credentials securely and ask them to change the password after first sign-in.`);
}

export async function promoteToStaff(userId: string): Promise<void> {
  await requireAdmin();

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) done("error", "That account no longer exists.");
  if (target.role !== "CUSTOMER") {
    done("message", `${target.name} already has staff access.`);
  }

  await db.user.update({ where: { id: userId }, data: { role: "STAFF" } });
  done("message", `${target.name} is now staff.`);
}
