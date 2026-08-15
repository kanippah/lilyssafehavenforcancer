"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { impactLine } from "@/lib/impact";
import { cn } from "@/lib/utils";
import { placeOrder, previewDiscount, type TotalsPreview } from "../_actions";
import { DonationPicker } from "./donation-picker";

export type CheckoutItem = {
  id: string;
  title: string;
  variantTitle: string;
  quantity: number;
  unitCents: number;
  imageUrl: string | null;
};

export type CheckoutPrefill = {
  email: string;
  phone: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export function CheckoutClient({
  items,
  initialTotals,
  currency,
  donationEnabled,
  impactUnitCents,
  impactUnitLabel,
  stripeEnabled,
  signedIn,
  prefill,
}: {
  items: CheckoutItem[];
  initialTotals: TotalsPreview;
  currency: string;
  donationEnabled: boolean;
  impactUnitCents: number;
  impactUnitLabel: string;
  stripeEnabled: boolean;
  signedIn: boolean;
  prefill: CheckoutPrefill;
}) {
  const [state, formAction, pending] = useActionState(placeOrder, undefined);
  const [donationCents, setDonationCents] = useState(0);
  const [totals, setTotals] = useState<TotalsPreview>(initialTotals);
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [applying, startApplying] = useTransition();

  const v = (name: string, fallback: string): string => state?.values?.[name] ?? fallback;
  const totalCents = totals.totalCents + donationCents;
  const discountFieldError = state?.fieldErrors?.discountCode ?? discountError ?? undefined;
  const paymentDefault = state?.values?.paymentMethod ?? (stripeEnabled ? "stripe" : "test");
  const saveAddressDefault = state?.values ? state.values.saveAddress === "on" : true;

  const appliedMessage = appliedCode
    ? totals.discountCents > 0
      ? `${appliedCode} applied — ${formatMoney(totals.discountCents, currency)} off.`
      : totals.shippingCents < initialTotals.shippingCents
        ? `${appliedCode} applied — shipping is free.`
        : `${appliedCode} applied.`
    : "";

  const applyCode = () => {
    startApplying(async () => {
      const result = await previewDiscount(code);
      if (result.ok) {
        setTotals(result.totals);
        setAppliedCode(result.code);
        setCode(result.code);
        setDiscountError(null);
      } else {
        setTotals(initialTotals);
        setAppliedCode(null);
        setDiscountError(result.error);
      }
    });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <form action={formAction} className="space-y-10">
        <section className="space-y-4" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-xl">
            Contact
          </h2>
          <Field label="Email" htmlFor="checkout-email" error={state?.fieldErrors?.email}>
            <Input
              id="checkout-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={v("email", prefill.email)}
            />
          </Field>
          <Field
            label="Phone (optional)"
            htmlFor="checkout-phone"
            hint="Only used if the carrier needs to reach you."
            error={state?.fieldErrors?.phone}
          >
            <Input
              id="checkout-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={v("phone", prefill.phone)}
            />
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby="shipping-heading">
          <h2 id="shipping-heading" className="text-xl">
            Delivery address
          </h2>
          <Field label="Full name" htmlFor="checkout-fullName" error={state?.fieldErrors?.fullName}>
            <Input
              id="checkout-fullName"
              name="fullName"
              autoComplete="name"
              required
              defaultValue={v("fullName", prefill.fullName)}
            />
          </Field>
          <Field label="Address" htmlFor="checkout-line1" error={state?.fieldErrors?.line1}>
            <Input
              id="checkout-line1"
              name="line1"
              autoComplete="address-line1"
              required
              placeholder="Street and number"
              defaultValue={v("line1", prefill.line1)}
            />
          </Field>
          <Field label="Apartment, suite, etc. (optional)" htmlFor="checkout-line2">
            <Input
              id="checkout-line2"
              name="line2"
              autoComplete="address-line2"
              defaultValue={v("line2", prefill.line2)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" htmlFor="checkout-city" error={state?.fieldErrors?.city}>
              <Input
                id="checkout-city"
                name="city"
                autoComplete="address-level2"
                required
                defaultValue={v("city", prefill.city)}
              />
            </Field>
            <Field label="State (optional)" htmlFor="checkout-state" error={state?.fieldErrors?.state}>
              <Input
                id="checkout-state"
                name="state"
                autoComplete="address-level1"
                defaultValue={v("state", prefill.state)}
              />
            </Field>
            <Field
              label="ZIP or postal code"
              htmlFor="checkout-postalCode"
              error={state?.fieldErrors?.postalCode}
            >
              <Input
                id="checkout-postalCode"
                name="postalCode"
                autoComplete="postal-code"
                required
                defaultValue={v("postalCode", prefill.postalCode)}
              />
            </Field>
          </div>
          <Field label="Country" htmlFor="checkout-country" error={state?.fieldErrors?.country}>
            <Input
              id="checkout-country"
              name="country"
              autoComplete="country-name"
              required
              defaultValue={v("country", prefill.country || "United States")}
            />
          </Field>
          {signedIn && (
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                name="saveAddress"
                defaultChecked={saveAddressDefault}
                className="h-4 w-4 accent-[var(--color-leaf)]"
              />
              Save this address to my account
            </label>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="discount-heading">
          <h2 id="discount-heading" className="text-xl">
            Discount code
          </h2>
          <Field label="Code" htmlFor="checkout-discount" error={discountFieldError}>
            <div className="flex gap-2">
              <Input
                id="checkout-discount"
                name="discountCode"
                autoComplete="off"
                className="max-w-56 uppercase"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyCode();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyCode}
                disabled={applying}
                aria-busy={applying}
              >
                {applying ? "Checking…" : "Apply"}
              </Button>
            </div>
          </Field>
          <p
            aria-live="polite"
            className={cn("text-sm font-medium text-pine", !appliedMessage && "sr-only")}
          >
            {appliedMessage}
          </p>
        </section>

        {donationEnabled && (
          <section className="space-y-3" aria-labelledby="donation-heading">
            <h2 id="donation-heading" className="text-xl">
              Add a donation
            </h2>
            <p className="text-sm text-ink/70">
              Every dollar goes straight to care — on top of what your order already funds.
            </p>
            <DonationPicker valueCents={donationCents} onChange={setDonationCents} currency={currency} />
          </section>
        )}

        <section className="space-y-3" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="text-xl">
            Payment
          </h2>
          <fieldset className="space-y-2.5">
            <legend className="sr-only">Payment method</legend>
            {stripeEnabled && (
              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-button)] border border-linen bg-white/60 p-4 has-[:checked]:border-leaf has-[:checked]:bg-parchment">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  defaultChecked={paymentDefault === "stripe"}
                  className="mt-1 accent-[var(--color-leaf)]"
                />
                <span>
                  <span className="block font-semibold text-ink">Card (Stripe)</span>
                  <span className="block text-sm text-ink/60">
                    Secure card payment on Stripe&apos;s checkout page.
                  </span>
                </span>
              </label>
            )}
            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-button)] border border-linen bg-white/60 p-4 has-[:checked]:border-leaf has-[:checked]:bg-parchment">
              <input
                type="radio"
                name="paymentMethod"
                value="test"
                defaultChecked={paymentDefault !== "stripe"}
                className="mt-1 accent-[var(--color-leaf)]"
              />
              <span>
                <span className="block font-semibold text-ink">Test payment — no real charge</span>
                <span className="block text-sm text-ink/60">
                  Places the order right away without a card. Nothing is charged — use this to try
                  the shop out.
                </span>
              </span>
            </label>
          </fieldset>
          {!stripeEnabled && (
            <p className="text-xs text-ink/55">
              Card payments aren&apos;t set up on this store yet, so test payment is the only option.
            </p>
          )}
        </section>

        {state?.formError && (
          <div
            role="alert"
            className="rounded-[var(--radius-button)] border border-clay/40 bg-clay/10 px-4 py-3 text-sm font-medium text-clay"
          >
            {state.formError}
          </div>
        )}

        <div className="space-y-3">
          <Button type="submit" size="lg" disabled={pending} aria-busy={pending} className="w-full">
            {pending ? "Placing your order…" : "Place order"}
          </Button>
          <p className="text-center text-sm">
            <Link href="/cart" className="font-medium text-leaf underline underline-offset-4">
              Back to basket
            </Link>
          </p>
        </div>
      </form>

      <aside className="rounded-[var(--radius-card)] border border-linen bg-parchment p-6 lg:sticky lg:top-24">
        <h2 className="text-xl">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-start gap-3">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg bg-white/60 object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-white/60" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className="font-medium leading-snug text-ink">{item.title}</p>
                  {item.variantTitle && <p className="text-xs text-ink/60">{item.variantTitle}</p>}
                  <p className="tabular text-xs text-ink/60">× {item.quantity}</p>
                </div>
              </div>
              <span className="tabular shrink-0">
                {formatMoney(item.unitCents * item.quantity, currency)}
              </span>
            </li>
          ))}
        </ul>
        <hr className="rule my-5" />
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink/70">Subtotal</dt>
            <dd className="tabular font-medium">{formatMoney(totals.subtotalCents, currency)}</dd>
          </div>
          {totals.discountCents > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink/70">Discount{appliedCode ? ` (${appliedCode})` : ""}</dt>
              <dd className="tabular font-medium text-pine">
                −{formatMoney(totals.discountCents, currency)}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink/70">Shipping</dt>
            <dd className="tabular font-medium">
              {totals.shippingCents === 0 ? "Free" : formatMoney(totals.shippingCents, currency)}
            </dd>
          </div>
          {totals.taxCents > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink/70">Tax</dt>
              <dd className="tabular font-medium">{formatMoney(totals.taxCents, currency)}</dd>
            </div>
          )}
          {donationCents > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink/70">Donation</dt>
              <dd className="tabular font-medium text-rose">{formatMoney(donationCents, currency)}</dd>
            </div>
          )}
        </dl>
        <hr className="rule my-4" />
        <div className="flex items-baseline justify-between gap-3" aria-live="polite">
          <span className="font-semibold text-ink">Total</span>
          <span className="tabular text-lg font-semibold">{formatMoney(totalCents, currency)}</span>
        </div>
        <p className="ledger-line mt-2" aria-live="polite">
          → {impactLine(totalCents, { impactUnitCents, impactUnitLabel })}
        </p>
      </aside>
    </div>
  );
}
