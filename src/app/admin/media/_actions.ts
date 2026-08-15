"use server";

import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { uploadDir } from "@/lib/uploads";

export type MediaActionResult = { ok: true } | { error: string };

export async function deleteMediaAsset(id: string): Promise<MediaActionResult> {
  if (!isStaff(await getSessionUser())) return { error: "You don't have permission to do that." };

  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return { error: "That file is already gone — refresh to update the list." };

  try {
    await db.mediaAsset.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] media delete failed:", err);
    return { error: "Couldn't delete that file — please try again." };
  }

  // Remove the file from disk too; tolerate it already being missing.
  if (asset.url.startsWith("/uploads/")) {
    const name = path.basename(asset.url);
    try {
      await unlink(path.join(uploadDir(), name));
    } catch {
      // File was already removed — the database row is what matters.
    }
  }

  revalidatePath("/admin/media");
  return { ok: true };
}
