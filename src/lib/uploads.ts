import "server-only";
import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";
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

export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

/**
 * Persist an admin-uploaded image to the uploads volume and record it in the
 * media library. Returns the created asset (its `url` is served by
 * /uploads/[...file]).
 */
export async function saveUploadedImage(file: File): Promise<MediaAsset> {
  const ext = ALLOWED_MIME[file.type];
  if (!ext) throw new Error("Only PNG, JPEG, WebP, GIF, or ICO images are allowed.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Images must be 8 MB or smaller.");

  const name = `${Date.now()}-${randomBytes(5).toString("hex")}${ext}`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);

  return db.mediaAsset.create({
    data: {
      url: `/uploads/${name}`,
      filename: file.name || name,
      mime: file.type,
      sizeBytes: file.size,
    },
  });
}

/** Resolve a filename inside the uploads dir, refusing path traversal. */
export function resolveUploadPath(parts: string[]): string | null {
  const dir = uploadDir();
  const resolved = path.resolve(dir, ...parts);
  if (!resolved.startsWith(dir + path.sep) && resolved !== dir) return null;
  return resolved;
}

export function mimeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const entry = Object.entries(ALLOWED_MIME).find(([, e]) => e === (ext === ".jpeg" ? ".jpg" : ext));
  return entry?.[0] ?? "application/octet-stream";
}
