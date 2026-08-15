"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type CollectionFormState = { error?: string } | undefined;

const collectionSchema = z.object({
  title: z.string().trim().min(2, "Give the collection a title (at least 2 characters).").max(140),
  slug: z
    .string()
    .trim()
    .transform((s) => slugify(s))
    .refine((s) => s.length >= 2, "Give the collection a slug — letters, numbers, and dashes."),
  description: z.string().trim().max(5_000),
  imageUrl: z.string().trim().max(600),
  position: z.coerce.number().int("Position must be a whole number.").min(0).max(9_999),
});

async function staffOk(): Promise<boolean> {
  return isStaff(await getSessionUser());
}

function readForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? "").trim() || String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    position: String(formData.get("position") ?? "0") || "0",
  };
}

export async function createCollection(
  _prev: CollectionFormState,
  formData: FormData
): Promise<CollectionFormState> {
  if (!(await staffOk())) return { error: "You don't have permission to do that." };

  const parsed = collectionSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const clash = await db.collection.findUnique({ where: { slug: data.slug } });
  if (clash) return { error: `The slug "${data.slug}" is already used by "${clash.title}" — pick another.` };

  try {
    await db.collection.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl || null,
        position: data.position,
      },
    });
  } catch (err) {
    console.error("[admin] collection create failed:", err);
    return { error: "Couldn't save the collection — nothing was created. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/collections");
}

export async function updateCollection(
  id: string,
  _prev: CollectionFormState,
  formData: FormData
): Promise<CollectionFormState> {
  if (!(await staffOk())) return { error: "You don't have permission to do that." };

  const current = await db.collection.findUnique({ where: { id } });
  if (!current) return { error: "That collection no longer exists — it may have been deleted." };

  const parsed = collectionSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const clash = await db.collection.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) {
    return { error: `The slug "${data.slug}" is already used by "${clash.title}" — pick another.` };
  }

  try {
    await db.collection.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl || null,
        position: data.position,
      },
    });
  } catch (err) {
    console.error("[admin] collection update failed:", err);
    return { error: "Couldn't save those changes — nothing was updated. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/collections");
}

export async function deleteCollection(id: string): Promise<{ error: string } | void> {
  if (!(await staffOk())) return { error: "You don't have permission to do that." };

  try {
    await db.collection.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] collection delete failed:", err);
    return { error: "Couldn't delete this collection — reload the page and try again." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/collections");
}
