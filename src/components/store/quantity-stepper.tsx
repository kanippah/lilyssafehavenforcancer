"use client";

import { useState, useTransition } from "react";
import { updateCartItemQuantity, removeCartItem } from "@/lib/actions/cart-actions";

export function QuantityStepper({ itemId, quantity }: { itemId: string; quantity: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (qty: number) =>
    startTransition(async () => {
      const result = await updateCartItemQuantity(itemId, qty);
      setError(result.ok ? null : result.error);
    });

  return (
    <div>
      <div
        className="tabular inline-flex items-center rounded-full border border-linen bg-white/60 text-sm"
        style={{ opacity: pending ? 0.5 : 1 }}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => set(quantity - 1)}
          disabled={pending}
          className="h-8 w-8 rounded-l-full hover:bg-parchment"
        >
          −
        </button>
        <span className="w-7 text-center" aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => set(quantity + 1)}
          disabled={pending}
          className="h-8 w-8 rounded-r-full hover:bg-parchment"
        >
          +
        </button>
      </div>
      <p role="alert" className="mt-1 min-h-4 text-xs font-medium text-clay">
        {error ?? ""}
      </p>
    </div>
  );
}

export function RemoveCartItemButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            const result = await removeCartItem(itemId);
            setError(result.ok ? null : result.error);
          })
        }
        disabled={pending}
        className="text-xs font-medium text-ink/50 underline underline-offset-2 hover:text-clay"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && (
        <span role="alert" className="ml-2 text-xs font-medium text-clay">
          {error}
        </span>
      )}
    </span>
  );
}
