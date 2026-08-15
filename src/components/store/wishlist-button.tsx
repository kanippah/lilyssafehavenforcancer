"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toggleWishlist } from "@/lib/actions/store-actions";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  initiallySaved,
  className,
}: {
  productId: string;
  initiallySaved: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleWishlist(productId);
          if (result.requiresAuth) {
            router.push(`/login?next=${encodeURIComponent(pathname)}`);
            return;
          }
          if (result.ok) setSaved(Boolean(result.added));
        })
      }
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-[var(--radius-button)] border border-ink/25 px-4 text-sm font-semibold text-ink transition-colors hover:border-rose hover:text-rose",
        saved && "border-rose bg-blush text-rose",
        className
      )}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path
          d="M10 17s-6.5-4.3-8-8.1C.9 6 2.4 3.5 5 3.5c1.9 0 3.4 1.2 5 3.2 1.6-2 3.1-3.2 5-3.2 2.6 0 4.1 2.5 3 5.4-1.5 3.8-8 8.1-8 8.1z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
