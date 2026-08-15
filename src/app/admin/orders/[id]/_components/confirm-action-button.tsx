"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

/**
 * Two-step destructive action: the first click arms the button, the second
 * click (within 5 seconds) runs the server action.
 */
export function ConfirmActionButton({
  action,
  label,
  confirmLabel,
  hint,
}: {
  action: () => Promise<void>;
  label: string;
  confirmLabel: string;
  hint: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant={confirming ? "danger" : "outline"}
        disabled={pending}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          setConfirming(false);
          startTransition(async () => {
            await action();
          });
        }}
      >
        {pending ? "Working…" : confirming ? confirmLabel : label}
      </Button>
      <p aria-live="polite" className="min-h-4 text-xs text-ink/55">
        {pending ? "Updating the order." : confirming ? hint : ""}
      </p>
    </div>
  );
}
