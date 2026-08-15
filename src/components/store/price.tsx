import { formatMoneyCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  cents,
  compareAtCents,
  currency = "usd",
  className,
}: {
  cents: number;
  compareAtCents?: number | null;
  currency?: string;
  className?: string;
}) {
  const onSale = compareAtCents != null && compareAtCents > cents;
  return (
    <span className={cn("tabular inline-flex items-baseline gap-2", className)}>
      <span className={onSale ? "text-rose" : undefined}>{formatMoneyCompact(cents, currency)}</span>
      {onSale && (
        <s className="text-ink/45 text-[0.85em]">{formatMoneyCompact(compareAtCents, currency)}</s>
      )}
    </span>
  );
}
