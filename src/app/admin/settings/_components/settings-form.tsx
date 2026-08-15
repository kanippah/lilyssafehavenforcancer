"use client";

import { useActionState } from "react";
import type { Setting } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ImageUploader } from "@/components/admin/image-uploader";
import { saveSettings, type SettingsFormState } from "../_actions";

const CURRENCIES = [
  { value: "usd", label: "USD — US dollar" },
  { value: "eur", label: "EUR — Euro" },
  { value: "gbp", label: "GBP — British pound" },
  { value: "cad", label: "CAD — Canadian dollar" },
  { value: "aud", label: "AUD — Australian dollar" },
];

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function SettingsForm({ settings }: { settings: Setting }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    saveSettings,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <Section
        title="Identity"
        description="How the store introduces itself — name, mark, and the bar above the header."
      >
        <Field label="Store name" htmlFor="storeName">
          <Input id="storeName" name="storeName" defaultValue={settings.storeName} required />
        </Field>
        <Field label="Tagline" htmlFor="tagline" hint="One sentence under the store name in the footer.">
          <Input id="tagline" name="tagline" defaultValue={settings.tagline} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-ink">Logo</p>
            <ImageUploader
              name="logoUrl"
              initialUrl={settings.logoUrl}
              label="Upload logo"
              previewClassName="h-20 w-20"
            />
            <p className="text-xs text-ink/55">
              Shown in the header and admin sidebar. Without one, the pressed-lily mark is used.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-ink">Favicon</p>
            <ImageUploader
              name="faviconUrl"
              initialUrl={settings.faviconUrl}
              label="Upload favicon"
              previewClassName="h-20 w-20"
            />
            <p className="text-xs text-ink/55">The small icon in browser tabs. Square images work best.</p>
          </div>
        </div>
        <Field
          label="Announcement bar"
          htmlFor="announcement"
          hint="A short line above the header — free shipping, a campaign, a thank-you. Leave empty to hide it."
        >
          <Input
            id="announcement"
            name="announcement"
            defaultValue={settings.announcement ?? ""}
            placeholder="Free shipping on orders over $75"
          />
        </Field>
      </Section>

      <Section title="Hero" description="The first thing visitors see on the home page.">
        <Field label="Hero heading" htmlFor="heroHeading">
          <Input id="heroHeading" name="heroHeading" defaultValue={settings.heroHeading} required />
        </Field>
        <Field label="Hero subheading" htmlFor="heroSubheading">
          <Textarea
            id="heroSubheading"
            name="heroSubheading"
            rows={2}
            defaultValue={settings.heroSubheading}
          />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-ink">Hero image</p>
          <ImageUploader
            name="heroImageUrl"
            initialUrl={settings.heroImageUrl}
            label="Upload hero image"
            previewClassName="h-24 w-40"
          />
        </div>
      </Section>

      <Section
        title="Company"
        description="Contact details and the mission — used in the footer, contact page, and about page."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" htmlFor="companyName">
            <Input id="companyName" name="companyName" defaultValue={settings.companyName} required />
          </Field>
          <Field label="Support email" htmlFor="supportEmail">
            <Input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={settings.supportEmail}
              required
            />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={settings.phone ?? ""} />
          </Field>
        </div>
        <Field label="Company address" htmlFor="companyAddress">
          <Textarea
            id="companyAddress"
            name="companyAddress"
            rows={2}
            defaultValue={settings.companyAddress ?? ""}
          />
        </Field>
        <Field label="Mission statement" htmlFor="missionStatement">
          <Textarea
            id="missionStatement"
            name="missionStatement"
            rows={4}
            defaultValue={settings.missionStatement}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram" htmlFor="socialInstagram">
            <Input
              id="socialInstagram"
              name="socialInstagram"
              type="url"
              placeholder="https://instagram.com/…"
              defaultValue={settings.socialInstagram ?? ""}
            />
          </Field>
          <Field label="Facebook" htmlFor="socialFacebook">
            <Input
              id="socialFacebook"
              name="socialFacebook"
              type="url"
              placeholder="https://facebook.com/…"
              defaultValue={settings.socialFacebook ?? ""}
            />
          </Field>
          <Field label="TikTok" htmlFor="socialTiktok">
            <Input
              id="socialTiktok"
              name="socialTiktok"
              type="url"
              placeholder="https://tiktok.com/@…"
              defaultValue={settings.socialTiktok ?? ""}
            />
          </Field>
          <Field label="X" htmlFor="socialX">
            <Input
              id="socialX"
              name="socialX"
              type="url"
              placeholder="https://x.com/…"
              defaultValue={settings.socialX ?? ""}
            />
          </Field>
        </div>
      </Section>

      <Section title="Commerce" description="Currency, shipping, and tax applied at checkout.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency" htmlFor="currency">
            <Select id="currency" name="currency" defaultValue={settings.currency}>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Flat shipping ($)" htmlFor="shippingFlat" hint="Charged on every order below the free-shipping threshold.">
            <Input
              id="shippingFlat"
              name="shippingFlat"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={dollars(settings.shippingFlatCents)}
              required
            />
          </Field>
          <Field
            label="Free shipping over ($)"
            htmlFor="freeShippingThreshold"
            hint="Leave empty to never offer free shipping."
          >
            <Input
              id="freeShippingThreshold"
              name="freeShippingThreshold"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={
                settings.freeShippingThresholdCents != null
                  ? dollars(settings.freeShippingThresholdCents)
                  : ""
              }
            />
          </Field>
          <Field label="Tax rate (%)" htmlFor="taxRatePct" hint="Applied to the discounted subtotal. Use 0 for no tax.">
            <Input
              id="taxRatePct"
              name="taxRatePct"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              defaultValue={String(settings.taxRatePct)}
              required
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Impact"
        description="The care ledger. Every 'funds a care kit' line across the store — product cards, cart, checkout, order pages — is computed from this one amount and label."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Cost of one unit of help ($)"
            htmlFor="impactUnit"
            hint="What one unit of help costs the charity to provide."
          >
            <Input
              id="impactUnit"
              name="impactUnit"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              defaultValue={dollars(settings.impactUnitCents)}
              required
            />
          </Field>
          <Field
            label="Unit of help, in words"
            htmlFor="impactUnitLabel"
            hint="Finishes the sentence 'funds 1 …' — keep it singular."
          >
            <Input
              id="impactUnitLabel"
              name="impactUnitLabel"
              defaultValue={settings.impactUnitLabel}
              required
            />
          </Field>
        </div>
        <div className="flex items-start gap-2.5">
          <input
            id="donationEnabled"
            name="donationEnabled"
            type="checkbox"
            defaultChecked={settings.donationEnabled}
            className="mt-1 h-4 w-4 accent-[var(--color-leaf)]"
          />
          <label htmlFor="donationEnabled" className="text-sm text-ink">
            <span className="font-semibold">Offer an optional donation at checkout</span>
            <span className="block text-xs text-ink/55">
              Adds a small &quot;round it up for the haven&quot; step before payment.
            </span>
          </label>
        </div>
      </Section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <div aria-live="polite">
          {state?.message && <p className="text-sm font-medium text-pine">{state.message}</p>}
          {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink/60">{description}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
