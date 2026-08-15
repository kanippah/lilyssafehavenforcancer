"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Price } from "@/components/store/price";
import { impactLine } from "@/lib/impact";
import { cn } from "@/lib/utils";

export type PickerVariant = {
  id: string;
  title: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  trackStock: boolean;
};

function isSoldOut(variant: PickerVariant): boolean {
  return variant.trackStock && variant.stock <= 0;
}

/**
 * Holds the selected variant and renders the price, the care-ledger line,
 * the option pills, and the add-to-cart control for that selection.
 * `descriptionSlot` and `wishlistSlot` let the server page keep its content
 * server-rendered while it flows around the live selection.
 */
export function VariantPicker({
  variants,
  currency,
  impact,
  descriptionSlot,
  wishlistSlot,
}: {
  variants: PickerVariant[];
  currency: string;
  impact: { impactUnitCents: number; impactUnitLabel: string };
  descriptionSlot?: React.ReactNode;
  wishlistSlot?: React.ReactNode;
}) {
  const firstAvailable = variants.find((v) => !isSoldOut(v)) ?? variants[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstAvailable?.id ?? null);
  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const showPills = variants.length > 1 || (variants.length === 1 && variants[0].title !== "Default");
  const unavailable = !selected || isSoldOut(selected);

  return (
    <div>
      {selected && (
        <div>
          <p className="text-2xl">
            <Price
              cents={selected.priceCents}
              compareAtCents={selected.compareAtCents}
              currency={currency}
            />
          </p>
          <p className="ledger-line mt-1" aria-live="polite">
            → {impactLine(selected.priceCents, impact)}
          </p>
        </div>
      )}

      {descriptionSlot && <div className="mt-6">{descriptionSlot}</div>}

      {showPills && (
        <div className="mt-7" role="radiogroup" aria-label="Choose an option">
          <p className="text-sm font-semibold text-ink">Options</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const out = isSoldOut(variant);
              const active = variant.id === selectedId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={out}
                  onClick={() => setSelectedId(variant.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-linen text-ink/80 hover:border-ink",
                    out && "cursor-not-allowed text-ink/40 line-through hover:border-linen"
                  )}
                >
                  {variant.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div aria-live="polite">
        {selected && selected.trackStock && selected.stock > 0 && selected.stock <= 5 && (
          <p className="tabular mt-3 text-xs text-clay">Only {selected.stock} left</p>
        )}
      </div>

      <div className="mt-7 flex flex-wrap items-start gap-3">
        <AddToCartButton
          variantId={selected?.id ?? null}
          disabled={unavailable}
          className="min-w-52 flex-1"
        />
        {wishlistSlot}
      </div>
    </div>
  );
}
