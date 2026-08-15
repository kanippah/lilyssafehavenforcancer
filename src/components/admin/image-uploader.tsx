"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Uploads an image to /api/admin/upload and either reports the URL via
 * onUploaded, or (when `name` is set) stores it in a hidden form input so
 * plain server-action forms can use it.
 */
export function ImageUploader({
  name,
  initialUrl,
  label = "Upload image",
  onUploaded,
  className,
  previewClassName = "h-28 w-28",
}: {
  name?: string;
  initialUrl?: string | null;
  label?: string;
  onUploaded?: (url: string) => void;
  className?: string;
  previewClassName?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
      setUrl(data.url);
      onUploaded?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {name && <input type="hidden" name={name} value={url} />}
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className={cn("rounded-xl border border-linen bg-white object-cover", previewClassName)}
          />
        ) : (
          <div
            className={cn(
              "flex items-center justify-center rounded-xl border border-dashed border-linen bg-white/50 text-xs text-ink/40",
              previewClassName
            )}
          >
            No image
          </div>
        )}
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-[var(--radius-button)] border border-ink/25 px-3.5 py-2 text-sm font-semibold text-ink hover:border-ink hover:bg-parchment disabled:opacity-50"
          >
            {busy ? "Uploading…" : label}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                onUploaded?.("");
              }}
              className="block text-xs text-ink/50 underline underline-offset-2 hover:text-clay"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {error && <p className="text-xs font-medium text-clay">{error}</p>}
    </div>
  );
}
