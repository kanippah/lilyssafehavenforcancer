import type { Setting } from "@prisma/client";

/**
 * The "care ledger": translate money into the tangible help it funds,
 * based on the impact unit configured in admin settings
 * (e.g. $25 = one care kit for a patient in treatment).
 */
export function impactLine(cents: number, settings: Pick<Setting, "impactUnitCents" | "impactUnitLabel">): string {
  const unit = Math.max(settings.impactUnitCents, 1);
  const ratio = cents / unit;
  if (ratio >= 1) {
    const units = Math.floor(ratio);
    return units === 1
      ? `funds 1 ${settings.impactUnitLabel}`
      : `funds ${units} ${pluralizeUnitLabel(settings.impactUnitLabel)}`;
  }
  const pct = Math.max(1, Math.round(ratio * 100));
  return `funds ${pct}% of a ${settings.impactUnitLabel}`;
}

function pluralizeUnitLabel(label: string): string {
  // "care kit for a patient…" → pluralize the first word group before a preposition.
  const [head, ...rest] = label.split(/\s(for|of|to)\s/);
  const pluralHead = /s$/.test(head) ? head : `${head}s`;
  if (rest.length === 0) return pluralHead;
  return `${pluralHead} ${rest.join(" ")}`.replace(/\s+/g, " ");
}

export function impactUnits(cents: number, settings: Pick<Setting, "impactUnitCents">): number {
  return Math.floor(cents / Math.max(settings.impactUnitCents, 1));
}
