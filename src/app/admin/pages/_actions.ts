"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";

const pageSchema = z.object({
  title: z.string().trim(),
  body: z.string(),
});

export async function savePage(pageId: string, formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!isStaff(user)) redirect("/admin/pages");

  const parsed = pageSchema.parse({
    title: formData.get("title"),
    body: formData.get("body"),
  });

  const page = await db.page.findUnique({ where: { id: pageId } });
  if (!page) redirect("/admin/pages");

  // Never bounce with an error here — a redirect would discard the typed body.
  // A blank title just keeps the existing one; the body always saves.
  await db.page.update({
    where: { id: pageId },
    data: { title: parsed.title || page.title, body: parsed.body },
  });

  revalidatePath(`/${page.slug}`);
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${pageId}?saved=1`);
}
