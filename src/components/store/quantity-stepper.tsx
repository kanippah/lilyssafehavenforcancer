"use client";

import { useTransition } from "react";
import { updateCartItemQuantity, removeCartItem } from "@/lib/actions/cart-actions";

export function QuantityStepper({ itemId, quantity }: { itemId: string; quantity: number }) {
  const [pending, startTransition] = useTransition();

  const set = (qty: number) => startTransition(async () => void (await updateCartItemQuantity(itemId, qty)));

  return (
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
  );
}

export function RemoveCartItemButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(async () => void (await removeCartItem(itemId)))}
      disabled={pending}
      className="text-xs font-medium text-ink/50 underline underline-offset-2 hover:text-clay"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
