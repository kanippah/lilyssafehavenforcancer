"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { Address } from "@prisma/client";
import { saveAddress, deleteAddress, type AddressFormState } from "../_actions";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AddressBook({ addresses }: { addresses: Address[] }) {
  // null = closed, "new" = adding, otherwise the id of the address being edited
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {addresses.length === 0 && open !== "new" && (
        <div className="rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-8 text-center">
          <p className="text-sm text-ink/65">
            No addresses yet. Save one and checkout will already know where comfort should land.
          </p>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-5"
          >
            {open === address.id ? (
              <AddressForm address={address} onDone={() => setOpen(null)} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{address.fullName}</p>
                  {address.isDefault && <Badge tone="green">Default</Badge>}
                  {address.label && <Badge tone="neutral">{address.label}</Badge>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {address.line1}
                  {address.line2 && (
                    <>
                      <br />
                      {address.line2}
                    </>
                  )}
                  <br />
                  {address.city}
                  {address.state ? `, ${address.state}` : ""}{" "}
                  <span className="tabular">{address.postalCode}</span>
                  <br />
                  {address.country}
                </p>
                {address.phone && <p className="tabular mt-1 text-xs text-ink/55">{address.phone}</p>}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setOpen(address.id)}
                    className="text-sm font-medium text-leaf underline underline-offset-2 hover:text-fern"
                  >
                    Edit
                  </button>
                  <DeleteAddressButton addressId={address.id} />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {open === "new" ? (
        <div className="rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-5">
          <h2 className="text-lg">New address</h2>
          <div className="mt-3">
            <AddressForm onDone={() => setOpen(null)} />
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen("new")}>
          Add an address
        </Button>
      )}
    </div>
  );
}

function AddressForm({ address, onDone }: { address?: Address; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<AddressFormState, FormData>(
    saveAddress.bind(null, address?.id ?? null),
    undefined
  );
  const idPrefix = address?.id ?? "new";

  useEffect(() => {
    if (state?.message) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" htmlFor={`${idPrefix}-label`} hint="Optional — e.g. Home, Mom's place.">
          <Input
            id={`${idPrefix}-label`}
            name="label"
            defaultValue={address?.label ?? ""}
            maxLength={40}
          />
        </Field>
        <Field label="Full name" htmlFor={`${idPrefix}-fullName`}>
          <Input
            id={`${idPrefix}-fullName`}
            name="fullName"
            autoComplete="name"
            required
            defaultValue={address?.fullName ?? ""}
          />
        </Field>
      </div>
      <Field label="Address line 1" htmlFor={`${idPrefix}-line1`}>
        <Input
          id={`${idPrefix}-line1`}
          name="line1"
          autoComplete="address-line1"
          required
          defaultValue={address?.line1 ?? ""}
        />
      </Field>
      <Field label="Address line 2" htmlFor={`${idPrefix}-line2`} hint="Optional.">
        <Input
          id={`${idPrefix}-line2`}
          name="line2"
          autoComplete="address-line2"
          defaultValue={address?.line2 ?? ""}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="City" htmlFor={`${idPrefix}-city`}>
          <Input
            id={`${idPrefix}-city`}
            name="city"
            autoComplete="address-level2"
            required
            defaultValue={address?.city ?? ""}
          />
        </Field>
        <Field label="State" htmlFor={`${idPrefix}-state`} hint="Optional.">
          <Input
            id={`${idPrefix}-state`}
            name="state"
            autoComplete="address-level1"
            defaultValue={address?.state ?? ""}
          />
        </Field>
        <Field label="Postal code" htmlFor={`${idPrefix}-postalCode`}>
          <Input
            id={`${idPrefix}-postalCode`}
            name="postalCode"
            autoComplete="postal-code"
            required
            defaultValue={address?.postalCode ?? ""}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Country" htmlFor={`${idPrefix}-country`}>
          <Input
            id={`${idPrefix}-country`}
            name="country"
            autoComplete="country-name"
            required
            defaultValue={address?.country ?? "United States"}
          />
        </Field>
        <Field label="Phone" htmlFor={`${idPrefix}-phone`} hint="Optional — for delivery questions.">
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={address?.phone ?? ""}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={address?.isDefault ?? false}
          className="h-4 w-4 rounded border-linen accent-[var(--color-leaf)]"
        />
        Use as my default address
      </label>
      <div aria-live="polite">
        {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save address"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteAddressButton({ addressId }: { addressId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-ink/50 underline underline-offset-2 hover:text-clay"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
      <span className="text-ink/70">Remove this address?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteAddress(addressId);
            if (!result.ok) {
              setError(result.error);
              setConfirming(false);
            }
          })
        }
        className="font-semibold text-clay underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Removing…" : "Yes, delete"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="font-medium text-ink/60 underline underline-offset-2 hover:text-ink disabled:opacity-50"
      >
        Keep it
      </button>
      {error && <span className="w-full font-medium text-clay">{error}</span>}
    </span>
  );
}
