"use client";

import { useActionState, useState } from "react";
import { submitDonation, type DonateState } from "../_actions";
import { impactLine } from "@/lib/impact";
import { formatMoneyCompact, parseMoneyToCents } from "@/lib/money";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESET_CENTS = [1000, 2500, 5000, 10000];

export function DonateForm({
  impactUnitCents,
  impactUnitLabel,
  currency,
}: {
  impactUnitCents: number;
  impactUnitLabel: string;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState<DonateState, FormData>(
    submitDonation,
    undefined
  );
  const [amount, setAmount] = useState("25");

  const impactSettings = { impactUnitCents, impactUnitLabel };
  const amountCents = parseMoneyToCents(amount);
  const amountValid = amountCents >= 100 && amountCents <= 1_000_000;

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-card)] border border-linen bg-parchment p-6 shadow-[var(--shadow-lift)] sm:p-7"
    >
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Choose an amount</legend>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {PRESET_CENTS.map((cents) => {
            const selected = amountCents === cents;
            return (
              <button
                key={cents}
                type="button"
                aria-pressed={selected}
                onClick={() => setAmount(String(cents / 100))}
                className={cn(
                  "rounded-[var(--radius-button)] border px-3.5 py-2.5 text-left transition-colors",
                  selected
                    ? "border-leaf bg-leaf/10"
                    : "border-linen bg-white/60 hover:border-leaf/50"
                )}
              >
                <span className="tabular block text-lg text-ink">
                  {formatMoneyCompact(cents, currency)}
                </span>
                <span className="ledger-line block">→ {impactLine(cents, impactSettings)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <Field label="Or enter your own amount" htmlFor="donate-amount">
          <div className="relative">
            <span aria-hidden="true" className="tabular absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50">
              $
            </span>
            <Input
              id="donate-amount"
              name="amount"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tabular pl-7"
            />
          </div>
        </Field>
        <p className="ledger-line mt-1.5 min-h-4" aria-live="polite">
          {amountValid ? `→ ${impactLine(amountCents, impactSettings)}` : ""}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <Field label="Your name" htmlFor="donate-name">
          <Input id="donate-name" name="name" required minLength={2} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="donate-email" hint="For your receipt — nothing else.">
          <Input id="donate-email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field
          label="Add a note"
          htmlFor="donate-note"
          hint="Optional — in honor of someone, or a word for the team."
        >
          <Textarea id="donate-note" name="note" rows={3} maxLength={500} className="min-h-20" />
        </Field>
      </div>

      <Button
        type="submit"
        variant="rose"
        size="lg"
        disabled={pending}
        aria-busy={pending}
        className="mt-6 w-full"
      >
        {pending
          ? "Recording your gift…"
          : amountValid
            ? `Give ${formatMoneyCompact(amountCents, currency)}`
            : "Give"}
      </Button>

      <div aria-live="polite">
        {state?.error && <p className="mt-3 text-sm font-medium text-clay">{state.error}</p>}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink/55">
        Your gift is recorded in the same ledger as every order, and counted in the totals we
        publish each month.
      </p>
    </form>
  );
}
