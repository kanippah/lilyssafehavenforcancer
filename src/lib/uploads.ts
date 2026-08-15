import "server-only";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { MediaAsset } from "@prisma/client";

// SVG is deliberately excluded: it is an active document (scripts execute when
// opened directly), which would let a lower-privilege staff account plant
// stored XSS on the app origin. Raster formats cover the upload use case.
const ALLOWED_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/x-icon": ".ico",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** What an admin may upload, for `accept` attributes and error copy. */
export const ACCEPTED_UPLOAD_MIME = Object.keys(ALLOWED_MIME).join(",");

/**
 * Store an admin-uploaded image in the database and record it in the media
 * library. Nothing touches the filesystem, so the app needs no persistent
 * volume — images survive redeploys and server rebuilds with the database.
 * The returned asset's `url` is served by /uploads/[...file].
 */
export async function saveUploadedImage(file: File): Promise<MediaAsset> {
  const ext = ALLOWED_MIME[file.type];
  if (!ext) throw new Error("Only PNG, JPEG, WebP, GIF, or ICO images are allowed.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Images must be 8 MB or smaller.");

  const data = Buffer.from(await file.arrayBuffer());
  if (data.byteLength === 0) throw new Error("That file is empty.");
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new Error("Images must be 8 MB or smaller.");

  // Unguessable, collision-free, and immutable — so the served URL can be
  // cached forever.
  const slug = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}${ext}`;

  return db.mediaAsset.create({
    data: {
      url: `/uploads/${slug}`,
      filename: file.name || slug,
      mime: file.type,
      sizeBytes: data.byteLength,
      data,
    },
  });
}

/** Look up a stored image by the path segments of its public URL. */
export async function findUploadByPath(
  parts: string[]
): Promise<{ data: Uint8Array; mime: string } | null> {
  if (parts.length !== 1) return null;
  const asset = await db.mediaAsset.findUnique({
    where: { url: `/uploads/${parts[0]}` },
    select: { data: true, mime: true },
  });
  if (!asset || asset.data.byteLength === 0) return null;
  return { data: asset.data, mime: asset.mime };
}
