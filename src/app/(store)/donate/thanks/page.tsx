import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoneyCompact } from "@/lib/money";
import { impactLine } from "@/lib/impact";
import { formatDate } from "@/lib/utils";
import { LilyMark } from "@/components/lily-mark";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your gift is in the ledger",
  description: "A receipt of kindness from Lily's Safe Haven.",
};

export default async function DonateThanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const number = typeof sp.n === "string" ? sp.n : undefined;

  const [settings, order] = await Promise.all([
    getSettings(),
    number
      ? db.order.findFirst({ where: { number, donationCents: { gt: 0 } } })
      : Promise.resolve(null),
  ]);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <LilyMark className="mx-auto h-12 w-12 text-leaf" />
        <h1 className="mt-6 text-4xl">Thank you for giving</h1>
        <p className="mx-auto mt-4 max-w-md text-ink/75">
          We couldn’t find that gift’s receipt. If your payment went through, it’s in the ledger —
          write to us and we’ll confirm it for you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href="/contact" variant="outline">
            Contact us
          </LinkButton>
          <LinkButton href="/">Back to the haven</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <LilyMark className="mx-auto h-12 w-12 text-rose" />
      <p className="eyebrow mt-7">Receipt of kindness</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Your gift is in the ledger</h1>

      <p className="tabular mt-9 text-6xl text-rose">
        {formatMoneyCompact(order.donationCents, order.currency)}
      </p>
      <p className="ledger-line mt-3 !text-sm">→ {impactLine(order.donationCents, settings)}</p>

      <hr className="rule mx-auto my-9 max-w-xs" />

      <p className="mx-auto max-w-md text-ink/75">
        A volunteer will pack what your gift funds, and a partner infusion center will hand it to
        someone on one of their hardest days. That’s the whole model — you just made it work.
      </p>
      <p className="tabular mt-5 text-xs text-ink/55">
        Gift {order.number} · recorded {formatDate(order.createdAt)}
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <LinkButton href="/stories" variant="outline">
          Read what gifts become
        </LinkButton>
        <LinkButton href="/">Back to the haven</LinkButton>
      </div>
    </div>
  );
}
