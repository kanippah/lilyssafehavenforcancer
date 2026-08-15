"use client";

import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/admin/image-uploader";

export function MediaUploadCard() {
  const router = useRouter();

  return (
    <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-4">
      <ImageUploader
        label="Upload image"
        onUploaded={(url) => {
          if (url) router.refresh();
        }}
      />
      <p className="mt-2 text-xs text-ink/55">
        PNG, JPEG, WebP, GIF, SVG, or ICO up to 8 MB. Uploads appear in the grid below.
      </p>
    </div>
  );
}
