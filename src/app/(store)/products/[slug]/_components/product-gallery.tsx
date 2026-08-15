"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LilyMark } from "@/components/lily-mark";

export type GalleryImage = { id: string; url: string; alt: string | null };

export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0] ?? null;

  if (!current) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-[var(--radius-card)] bg-parchment">
        <LilyMark className="h-16 w-16 text-linen" title={title} />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-parchment">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.alt ?? title} className="aspect-square w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2.5" role="group" aria-label="Product images">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === index}
              className={cn(
                "overflow-hidden rounded-[calc(var(--radius-card)*0.6)] border transition-colors",
                i === index ? "border-ink" : "border-linen hover:border-moss"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
