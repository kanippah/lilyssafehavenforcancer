"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type StoryFormState = { error?: string; message?: string } | undefined;

const storySchema = z.object({
  title: z.string().trim().min(1, "Give the story a title."),
  slug: z.string().trim(),
  excerpt: z.string().trim(),
  coverUrl: z.string().trim(),
  body: z.string(),
});

export async function saveStory(
  postId: string | null,
  _prev: StoryFormState,
  formData: FormData
): Promise<StoryFormState> {
  const user = await getSessionUser();
  if (!isStaff(user)) return { error: "You need staff access to edit stories." };

  const parsed = storySchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    coverUrl: formData.get("coverUrl"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { title, excerpt, coverUrl, body } = parsed.data;
  const slug = slugify(parsed.data.slug || title);
  if (!slug) {
    return { error: "The web address came out empty — add a few letters or numbers to the slug." };
  }

  const clash = await db.post.findFirst({
    where: postId ? { slug, NOT: { id: postId } } : { slug },
    select: { id: true },
  });
  if (clash) {
    return { error: "Another story already uses that web address — pick a different slug." };
  }

  const data = {
    title,
    slug,
    excerpt,
    coverUrl: coverUrl || null,
    body,
  };

  if (postId) {
    const existing = await db.post.findUnique({ where: { id: postId } });
    if (!existing) return { error: "That story no longer exists — it may have been deleted." };

    let publishedAt = existing.publishedAt;
    if (existing.publishedAt && formData.get("unpublish") != null) {
      publishedAt = null;
    } else if (!existing.publishedAt && formData.get("publishNow") != null) {
      publishedAt = new Date();
    }

    await db.post.update({ where: { id: postId }, data: { ...data, publishedAt } });
    revalidatePath("/", "layout");
    return { message: "Story saved." };
  }

  const post = await db.post.create({
    data: {
      ...data,
      publishedAt: formData.get("publishNow") != null ? new Date() : null,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/stories/${post.id}?created=1`);
}

export async function deleteStory(postId: string): Promise<void> {
  const user = await getSessionUser();
  if (!isStaff(user)) redirect("/admin/stories");

  await db.post.delete({ where: { id: postId } });
  revalidatePath("/", "layout");
  redirect("/admin/stories?deleted=1");
}
