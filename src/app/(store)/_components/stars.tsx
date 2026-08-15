import { cn } from "@/lib/utils";

const STAR_PATH =
  "M10 1.8l2.47 5.02 5.54.8-4.01 3.9.95 5.52L10 14.43l-4.95 2.6.95-5.51-4.01-3.9 5.54-.81L10 1.8z";

/**
 * Rating stars in pollen gold. Renders a rounded fill count with the exact
 * rating in the accessible label.
 */
export function Stars({
  rating,
  className,
  starClass = "h-4 w-4",
}: {
  rating: number;
  className?: string;
  starClass?: string;
}) {
  const filled = Math.round(rating);
  const label = Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
  return (
    <span
      role="img"
      aria-label={`Rated ${label} out of 5 stars`}
      className={cn("inline-flex items-center gap-0.5 text-pollen", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={cn(starClass, n > filled && "opacity-40")} aria-hidden="true">
          <path
            d={STAR_PATH}
            fill={n <= filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}
