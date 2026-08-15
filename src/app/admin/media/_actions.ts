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

  // Refuse to delete an image the storefront still shows.
  const [productRefs, collectionRefs, postRefs, orderRefs, setting] = await Promise.all([
    db.productImage.count({ where: { url: asset.url } }),
    db.collection.count({ where: { imageUrl: asset.url } }),
    db.post.count({ where: { coverUrl: asset.url } }),
    db.orderItem.count({ where: { imageUrl: asset.url } }),
    db.setting.findUnique({ where: { id: 1 } }),
  ]);
  const settingRefs = setting
    ? [setting.logoUrl, setting.faviconUrl, setting.heroImageUrl].filter((u) => u === asset.url).length
    : 0;

  if (productRefs + collectionRefs + postRefs + settingRefs > 0) {
    const uses = [
      productRefs > 0 && `${productRefs} product image${productRefs === 1 ? "" : "s"}`,
      collectionRefs > 0 && `${collectionRefs} collection${collectionRefs === 1 ? "" : "s"}`,
      postRefs > 0 && `${postRefs} stor${postRefs === 1 ? "y" : "ies"}`,
      settingRefs > 0 && "the store identity (logo, favicon, or hero)",
    ]
      .filter(Boolean)
      .join(", ");
    return { error: `This image is still used by ${uses} — detach it there first.` };
  }

  try {
    await db.mediaAsset.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] media delete failed:", err);
    return { error: "Couldn't delete that file — please try again." };
  }

  // Remove the file from disk too — unless past-order snapshots still point at
  // it, in which case keep the file so order history keeps rendering.
  if (orderRefs === 0 && asset.url.startsWith("/uploads/")) {
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
