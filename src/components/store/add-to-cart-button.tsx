"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addToCart } from "@/lib/actions/cart-actions";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  variantId,
  disabled,
  quantity = 1,
  label = "Add to basket",
  size = "lg",
  className,
}: {
  variantId: string | null;
  disabled?: boolean;
  quantity?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ added?: boolean; error?: string }>({});

  return (
    <div className={className}>
      <Button
        size={size}
        disabled={disabled || !variantId || pending}
        aria-busy={pending}
        onClick={() => {
          if (!variantId) return;
          startTransition(async () => {
            const result = await addToCart(variantId, quantity);
            setState(result.ok ? { added: true } : { error: result.error });
          });
        }}
        className="w-full"
      >
        {pending ? "Adding…" : disabled ? "Sold out" : label}
      </Button>
      <div aria-live="polite">
        {state.added && (
          <p className="mt-2 text-sm text-pine">
            In your basket —{" "}
            <Link href="/cart" className="font-semibold underline underline-offset-2">
              view basket
            </Link>
          </p>
        )}
        {state.error && <p className="mt-2 text-sm font-medium text-clay">{state.error}</p>}
      </div>
    </div>
  );
}
