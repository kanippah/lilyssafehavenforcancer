"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";

export type SettingsFormState = { error?: string; message?: string } | undefined;

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Social links need to start with http:// or https://.",
  });

const settingsSchema = z.object({
  storeName: z.string().trim().min(1, "Give the store a name."),
  tagline: z.string().trim(),
  logoUrl: z.string().trim(),
  faviconUrl: z.string().trim(),
  announcement: z.string().trim(),
  heroHeading: z.string().trim().min(1, "The hero needs a heading."),
  heroSubheading: z.string().trim(),
  heroImageUrl: z.string().trim(),
  companyName: z.string().trim().min(1, "Add the company name."),
  supportEmail: z.string().trim().toLowerCase().email("That support email doesn't look right."),
  phone: z.string().trim(),
  companyAddress: z.string().trim(),
  missionStatement: z.string().trim(),
  socialInstagram: optionalUrl,
  socialFacebook: optionalUrl,
  socialTiktok: optionalUrl,
  socialX: optionalUrl,
  currency: z.enum(["usd", "eur", "gbp", "cad", "aud"]),
  shippingFlat: z.string(),
  freeShippingThreshold: z.string().trim(),
  taxRatePct: z.coerce
    .number()
    .min(0, "Tax rate can't be negative.")
    .max(100, "Tax rate is a percentage — 100 at most."),
  impactUnit: z.string(),
  impactUnitLabel: z.string().trim().min(1, "Describe the unit of help, e.g. 'care kit for a patient in treatment'."),
});

export async function saveSettings(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const user = await getSessionUser();
  if (!isStaff(user)) return { error: "You need staff access to change store settings." };

  const parsed = settingsSchema.safeParse({
    storeName: formData.get("storeName"),
    tagline: formData.get("tagline"),
    logoUrl: formData.get("logoUrl"),
    faviconUrl: formData.get("faviconUrl"),
    announcement: formData.get("announcement"),
    heroHeading: formData.get("heroHeading"),
    heroSubheading: formData.get("heroSubheading"),
    heroImageUrl: formData.get("heroImageUrl"),
    companyName: formData.get("companyName"),
    supportEmail: formData.get("supportEmail"),
    phone: formData.get("phone"),
    companyAddress: formData.get("companyAddress"),
    missionStatement: formData.get("missionStatement"),
    socialInstagram: formData.get("socialInstagram"),
    socialFacebook: formData.get("socialFacebook"),
    socialTiktok: formData.get("socialTiktok"),
    socialX: formData.get("socialX"),
    currency: formData.get("currency"),
    shippingFlat: formData.get("shippingFlat"),
    freeShippingThreshold: formData.get("freeShippingThreshold"),
    taxRatePct: formData.get("taxRatePct"),
    impactUnit: formData.get("impactUnit"),
    impactUnitLabel: formData.get("impactUnitLabel"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const v = parsed.data;

  const impactUnitCents = parseMoneyToCents(v.impactUnit);
  if (impactUnitCents < 1) {
    return { error: "Set the cost of one unit of help — it needs to be more than $0." };
  }

  const data = {
    storeName: v.storeName,
    tagline: v.tagline,
    logoUrl: v.logoUrl || null,
    faviconUrl: v.faviconUrl || null,
    announcement: v.announcement || null,
    heroHeading: v.heroHeading,
    heroSubheading: v.heroSubheading,
    heroImageUrl: v.heroImageUrl || null,
    companyName: v.companyName,
    supportEmail: v.supportEmail,
    phone: v.phone || null,
    companyAddress: v.companyAddress || null,
    missionStatement: v.missionStatement,
    socialInstagram: v.socialInstagram || null,
    socialFacebook: v.socialFacebook || null,
    socialTiktok: v.socialTiktok || null,
    socialX: v.socialX || null,
    currency: v.currency,
    shippingFlatCents: parseMoneyToCents(v.shippingFlat),
    freeShippingThresholdCents:
      v.freeShippingThreshold === "" ? null : parseMoneyToCents(v.freeShippingThreshold),
    taxRatePct: v.taxRatePct,
    impactUnitCents,
    impactUnitLabel: v.impactUnitLabel,
    donationEnabled: formData.get("donationEnabled") != null,
  };

  await db.setting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  revalidatePath("/", "layout");
  return { message: "Settings saved." };
}
