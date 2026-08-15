"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export function SortSelect({
  q,
  collection,
  sort,
}: {
  q: string;
  collection: string;
  sort: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-ink/70">
      <span className="font-medium">Sort</span>
      <select
        value={sort}
        disabled={pending}
        aria-busy={pending}
        onChange={(event) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (collection) params.set("collection", collection);
          if (event.target.value !== "new") params.set("sort", event.target.value);
          const query = params.toString();
          startTransition(() => router.push(query ? `/shop?${query}` : "/shop"));
        }}
        className="h-9 rounded-[var(--radius-button)] border border-linen bg-white/70 px-2.5 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/25 disabled:opacity-50"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
