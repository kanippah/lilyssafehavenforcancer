import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { MediaUploadCard } from "./_components/upload-card";
import { MediaCardActions } from "./_components/media-card-actions";

export const metadata: Metadata = { title: "Media library · Admin" };

export default async function AdminMediaPage() {
  const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="Media library"
        subtitle="Every upload lands here and can be reused for products, the logo, and pages."
      />

      <div className="mb-6 max-w-xl">
        <MediaUploadCard />
      </div>

      {assets.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-linen bg-paper p-8 text-center text-sm text-ink/55">
          Nothing uploaded yet — add the first image above.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="overflow-hidden rounded-[var(--radius-card)] border border-linen bg-paper"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.filename}
                className="aspect-square w-full bg-parchment object-cover"
                loading="lazy"
              />
              <div className="space-y-1.5 p-3">
                <p className="truncate text-sm font-semibold text-ink" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="tabular text-xs text-ink/55">
                  {Math.max(1, Math.round(asset.sizeBytes / 1024))} KB ·{" "}
                  {formatDate(asset.createdAt, { year: "numeric", month: "short", day: "numeric" })}
                </p>
                <MediaCardActions id={asset.id} url={asset.url} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-ink/50">
        Seed artwork (files under /seed) ships with the project and isn&apos;t listed here — this
        library holds admin uploads only.
      </p>
    </div>
  );
}
