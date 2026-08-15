"use client";

import { useId, useState } from "react";
import { Field, Input } from "@/components/ui/input";
import { formatMoneyCompact, parseMoneyToCents } from "@/lib/money";
import { cn } from "@/lib/utils";

const PRESETS = [0, 200, 500, 1000] as const;

/**
 * Preset donation chips plus a custom dollar amount. The chosen amount is
 * written into a hidden `donationCents` input so the surrounding checkout
 * form submits it with everything else.
 */
export function DonationPicker({
  valueCents,
  onChange,
  currency = "usd",
}: {
  valueCents: number;
  onChange: (cents: number) => void;
  currency?: string;
}) {
  const [custom, setCustom] = useState("");
  const customId = useId();
  const customActive = custom.trim() !== "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Donation amount">
        {PRESETS.map((preset) => {
          const selected = !customActive && valueCents === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCustom("");
                onChange(preset);
              }}
              className={cn(
                "tabular h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                selected
                  ? "border-rose bg-blush text-rose"
                  : "border-linen bg-white/60 text-ink hover:border-rose/50"
              )}
            >
              {preset === 0 ? "None" : formatMoneyCompact(preset, currency)}
            </button>
          );
        })}
      </div>
      <Field label="Custom amount (dollars)" htmlFor={customId} className="max-w-44">
        <Input
          id={customId}
          type="number"
          min={0}
          step={1}
          inputMode="decimal"
          placeholder="15"
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            onChange(parseMoneyToCents(event.target.value));
          }}
        />
      </Field>
      <input type="hidden" name="donationCents" value={valueCents} />
    </div>
  );
}
