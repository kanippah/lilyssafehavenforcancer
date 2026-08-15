import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "rose" | "green" | "gold";
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-4">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "tabular mt-2 text-2xl text-ink",
          accent === "rose" && "text-rose",
          accent === "green" && "text-pine",
          accent === "gold" && "text-[#8a6620]"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink/55">{sub}</p>}
    </div>
  );
}
