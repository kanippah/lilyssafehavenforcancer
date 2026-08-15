"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { mailConfigured, sendPasswordReset } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

export type AuthState = { error?: string; message?: string } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name (at least 2 characters)."),
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists — try signing in." };

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await createSession(user);
  await mergeGuestCartIntoUser(user.id);
  redirect(nextPath(formData) ?? "/account");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password doesn't match our records." };
  }
  await createSession(user);
  await mergeGuestCartIntoUser(user.id);
  const dest = nextPath(formData);
  if (dest) redirect(dest);
  redirect(user.role === "ADMIN" || user.role === "STAFF" ? "/admin" : "/account");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "That email doesn't look right." };
  if (!mailConfigured()) {
    return {
      error:
        "Email delivery isn't configured on this store yet — please contact support to reset your password.",
    };
  }
  const user = await db.user.findUnique({ where: { email: email.data } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const settings = await getSettings();
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    await sendPasswordReset(user.email, `${base}/reset-password?token=${token}`, settings.storeName);
  }
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Passwords need at least 8 characters." };

  const record = await db.passwordResetToken.findUnique({ where: { token }, include: { user: true } });
  if (!record || record.expiresAt < new Date()) {
    return { error: "That reset link has expired — request a new one." };
  }
  await db.user.update({
    where: { id: record.userId },
    data: { passwordHash: await hashPassword(password) },
  });
  await db.passwordResetToken.deleteMany({ where: { userId: record.userId } });
  await createSession(record.user);
  redirect("/account");
}

export async function getCurrentUserAction() {
  return getSessionUser();
}

function nextPath(formData: FormData): string | null {
  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) return next;
  return null;
}
