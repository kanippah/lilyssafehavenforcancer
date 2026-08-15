"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { DiscountType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { DiscountFormState } from "../_actions";

export type DiscountFormInitial = {
  code: string;
  type: DiscountType;
  value: number;
  minSubtotalCents: number | null;
  maxUses: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function DiscountForm({
  action,
  deleteAction,
  initial,
}: {
  action: (prev: DiscountFormState, formData: FormData) => Promise<DiscountFormState>;
  deleteAction?: () => Promise<void>;
  initial?: DiscountFormInitial;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState<DiscountType>(initial?.type ?? "PERCENT");

  const initialPercent = initial && initial.type === "PERCENT" ? String(initial.value) : "";
  const initialFixed = initial && initial.type === "FIXED" ? (initial.value / 100).toFixed(2) : "";

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Code" htmlFor="discount-code" hint="Customers type this at checkout. Saved in capitals, without spaces.">
        <Input
          id="discount-code"
          name="code"
          required
          maxLength={40}
          defaultValue={initial?.code ?? ""}
          placeholder="WELCOME10"
          className="tabular uppercase"
          autoComplete="off"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="discount-type">
          <Select
            id="discount-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as DiscountType)}
          >
            <option value="PERCENT">Percent off</option>
            <option value="FIXED">Dollars off</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </Select>
        </Field>

        {type === "PERCENT" && (
          <Field label="Percent off" htmlFor="discount-value" hint="Whole number, 1–100.">
            <div className="relative">
              <Input
                id="discount-value"
                name="value"
                type="number"
                min={1}
                max={100}
                step={1}
                required
                defaultValue={initialPercent}
                className="tabular pr-8"
              />
              <span aria-hidden="true" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/50">
                %
              </span>
            </div>
          </Field>
        )}
        {type === "FIXED" && (
          <Field label="Amount off" htmlFor="discount-value" hint="Dollar amount taken off the subtotal.">
            <div className="relative">
              <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/50">
                $
              </span>
              <Input
                id="discount-value"
                name="value"
                inputMode="decimal"
                required
                defaultValue={initialFixed}
                placeholder="5.00"
                className="tabular pl-7"
              />
            </div>
          </Field>
        )}
        {type === "FREE_SHIPPING" && (
          <>
            <input type="hidden" name="value" value="0" />
            <p className="self-end pb-2.5 text-sm text-ink/60">
              Shipping is free when this code applies.
            </p>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum subtotal" htmlFor="discount-min" hint="Optional — order subtotal needed before the code works.">
          <div className="relative">
            <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/50">
              $
            </span>
            <Input
              id="discount-min"
              name="minSubtotal"
              inputMode="decimal"
              defaultValue={
                initial?.minSubtotalCents != null ? (initial.minSubtotalCents / 100).toFixed(2) : ""
              }
              placeholder="No minimum"
              className="tabular pl-7"
            />
          </div>
        </Field>
        <Field label="Max uses" htmlFor="discount-max-uses" hint="Optional — leave empty for unlimited.">
          <Input
            id="discount-max-uses"
            name="maxUses"
            type="number"
            min={1}
            step={1}
            defaultValue={initial?.maxUses != null ? String(initial.maxUses) : ""}
            placeholder="Unlimited"
            className="tabular"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" htmlFor="discount-starts" hint="Optional — active immediately when empty.">
          <Input
            id="discount-starts"
            name="startsAt"
            type="datetime-local"
            defaultValue={toLocalInput(initial?.startsAt ?? null)}
            className="tabular"
          />
        </Field>
        <Field label="Ends" htmlFor="discount-ends" hint="Optional — never expires when empty.">
          <Input
            id="discount-ends"
            name="endsAt"
            type="datetime-local"
            defaultValue={toLocalInput(initial?.endsAt ?? null)}
            className="tabular"
          />
        </Field>
      </div>

      <label htmlFor="discount-active" className="flex items-center gap-2.5 text-sm font-semibold text-ink">
        <input
          id="discount-active"
          name="active"
          type="checkbox"
          defaultChecked={initial?.active ?? true}
          className="h-4 w-4 accent-[var(--color-leaf)]"
        />
        Active
      </label>

      <div aria-live="polite">
        {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-linen pt-4">
        <Button disabled={pending}>
          {pending ? "Saving…" : initial ? "Save discount" : "Create discount"}
        </Button>
        {deleteAction && <DeleteDiscountButton action={deleteAction} />}
      </div>
    </form>
  );
}

function DeleteDiscountButton({ action }: { action: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <div className="text-right">
      <Button
        type="button"
        size="sm"
        variant={confirming ? "danger" : "ghost"}
        className={confirming ? undefined : "text-clay"}
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
        {pending ? "Deleting…" : confirming ? "Yes, delete this code" : "Delete discount"}
      </Button>
      <p aria-live="polite" className="min-h-4 text-xs text-ink/55">
        {confirming ? "Deleting can't be undone. Click again to confirm." : ""}
      </p>
    </div>
  );
}
