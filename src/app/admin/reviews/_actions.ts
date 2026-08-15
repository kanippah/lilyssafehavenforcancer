"use server";

import { revalidatePath } from "next/cache";
import type { ReviewStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";

async function requireStaff(): Promise<void> {
  const user = await getSessionUser();
  if (!isStaff(user)) throw new Error("UNAUTHORIZED");
}

async function setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
  const review = await db.review.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!review || review.status === status) return;
  await db.review.update({ where: { id }, data: { status } });
  revalidatePath("/admin/reviews");
  // Approved reviews appear on (and rejected ones leave) the storefront page.
  revalidatePath(`/products/${review.product.slug}`);
}

export async function approveReview(id: string): Promise<void> {
  await requireStaff();
  await setReviewStatus(id, "APPROVED");
}

export async function rejectReview(id: string): Promise<void> {
  await requireStaff();
  await setReviewStatus(id, "REJECTED");
}
