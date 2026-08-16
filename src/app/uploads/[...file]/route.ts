import { findUploadByPath } from "@/lib/uploads";

/**
 * Serves admin-uploaded images straight from the database. URLs contain a
 * random, never-reused slug, so responses are safe to cache indefinitely.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string[] }> }) {
  const { file } = await ctx.params;
  const asset = await findUploadByPath(file);
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mime,
      "Content-Length": String(asset.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Uploads are user-supplied content: never let them run as documents.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
