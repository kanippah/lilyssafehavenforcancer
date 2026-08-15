import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { formatMoneyCompact } from "@/lib/money";
import { DonateForm } from "./_components/donate-form";

export const metadata: Metadata = {
  title: "Fund care directly",
  description:
    "Give directly to the care ledger — every dollar becomes practical comfort for someone in treatment.",
};

const KIT_CONTENTS = [
  "Ginger chews for treatment-week nausea",
  "Unscented lip balm and lotion",
  "Grippy socks for cold, polished floors",
  "A soft, seamless sleep cap",
  "Mints for chemo's metallic taste",
  "A handwritten note from a volunteer",
];

export default async function DonatePage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">Direct giving</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Fund care directly</h1>
          <p className="mt-5 max-w-md text-ink/75">
            No merch required. Give any amount and it goes straight into the care ledger — the
            running account of what this shop funds.
          </p>

          <div className="mt-8 max-w-md rounded-[var(--radius-card)] bg-blush p-5">
            <p className="eyebrow !text-rose">How the ledger counts</p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/80">
              <span className="tabular">{formatMoneyCompact(settings.impactUnitCents, settings.currency)}</span>{" "}
              funds one {settings.impactUnitLabel}. Smaller gifts stack together; larger ones fund
              several at once.
            </p>
          </div>

          <h2 className="mt-10 text-2xl">What a kit holds</h2>
          <ul className="mt-4 max-w-md space-y-2 text-[0.95rem] text-ink/80">
            {KIT_CONTENTS.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-0.5 text-leaf">
                  —
                </span>
                {item}
              </li>
            ))}
          </ul>

          <hr className="rule mt-10 max-w-md" />
          <p className="mt-4 max-w-md text-sm text-ink/60">
            Where it goes: kits, packing, and free delivery to partner infusion centers. We publish
            the totals in plain numbers each month in Letters from the Haven.
          </p>
        </div>

        <div>
          <DonateForm
            impactUnitCents={settings.impactUnitCents}
            impactUnitLabel={settings.impactUnitLabel}
            currency={settings.currency}
          />
        </div>
      </div>
    </div>
  );
}
