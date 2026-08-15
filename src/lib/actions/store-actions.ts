"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export type StoreActionState = { error?: string; message?: string } | undefined;

export async function subscribeNewsletter(_prev: StoreActionState, formData: FormData): Promise<StoreActionState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "That email doesn't look right." };
  await db.newsletterSubscriber.upsert({
    where: { email: email.data },
    update: {},
    create: { email: email.data },
  });
  return { message: "You're on the list — thank you for standing with us." };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  subject: z.string().trim().max(140).optional(),
  body: z.string().trim().min(10, "Tell us a little more (at least 10 characters)."),
});

export async function submitContactMessage(_prev: StoreActionState, formData: FormData): Promise<StoreActionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.contactMessage.create({ data: parsed.data });
  return { message: "Message received — we read every one, usually within a day." };
}

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10, "Tell us a little more about it (at least 10 characters)."),
  name: z.string().trim().min(2, "Add the name to show with your review."),
});

export async function submitReview(productId: string, _prev: StoreActionState, formData: FormData): Promise<StoreActionState> {
  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    title: formData.get("title") || undefined,
    body: formData.get("body"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "ACTIVE") return { error: "This product can't be reviewed right now." };

  const user = await getSessionUser();
  await db.review.create({
    data: { productId, userId: user?.id, ...parsed.data },
  });
  return { message: "Thank you — your review is in and will appear once it's approved." };
}

export type WishlistResult = { ok: boolean; added?: boolean; requiresAuth?: boolean };

export async function toggleWishlist(productId: string): Promise<WishlistResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, requiresAuth: true };
  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/account/wishlist");
    return { ok: true, added: false };
  }
  await db.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/account/wishlist");
  return { ok: true, added: true };
}
