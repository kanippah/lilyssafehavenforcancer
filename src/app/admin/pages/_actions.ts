"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";

const pageSchema = z.object({
  title: z.string().trim().min(1, "The page needs a title."),
  body: z.string(),
});

export async function savePage(pageId: string, formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!isStaff(user)) redirect("/admin/pages");

  const parsed = pageSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    redirect(
      `/admin/pages/${pageId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }

  const page = await db.page.findUnique({ where: { id: pageId } });
  if (!page) redirect("/admin/pages");

  await db.page.update({ where: { id: pageId }, data: parsed.data });

  revalidatePath(`/${page.slug}`);
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${pageId}?saved=1`);
}
