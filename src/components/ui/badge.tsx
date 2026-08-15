import { cn } from "@/lib/utils";

type Tone = "green" | "rose" | "gold" | "neutral" | "clay" | "sky";

const tones: Record<Tone, string> = {
  green: "bg-leaf/15 text-pine",
  rose: "bg-petal/40 text-rose",
  gold: "bg-pollen/20 text-[#8a6620]",
  neutral: "bg-ink/8 text-ink/70",
  clay: "bg-clay/12 text-clay",
  sky: "bg-sky/15 text-[#41677c]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
