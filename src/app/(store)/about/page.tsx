import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings, getTotalRaisedCents } from "@/lib/settings";
import { impactUnits } from "@/lib/impact";
import { formatMoneyCompact } from "@/lib/money";
import { LinkButton } from "@/components/ui/button";
import { PageBody } from "../_components/page-body";

const PAID_STATUSES = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    db.page.findUnique({ where: { slug: "about" } }),
    getSettings(),
  ]);
  return {
    title: page?.title ?? "Our mission",
    description: settings.missionStatement,
  };
}

export default async function AboutPage() {
  const [page, settings, raisedCents, orderCount] = await Promise.all([
    db.page.findUnique({ where: { slug: "about" } }),
    getSettings(),
    getTotalRaisedCents(),
    db.order.count({ where: { status: { in: [...PAID_STATUSES] } } }),
  ]);
  if (!page) notFound();

  const kitsFunded = impactUnits(raisedCents, settings);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
        <p className="eyebrow rise">Our mission</p>
        <h1 className="rise rise-1 mt-3 max-w-3xl text-4xl sm:text-5xl">{page.title}</h1>
        <p className="rise rise-2 mt-6 max-w-2xl text-xl leading-relaxed text-pine sm:text-2xl">
          {settings.missionStatement}
        </p>
      </section>

      {/* The care ledger so far */}
      <section aria-label="The care ledger so far" className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="eyebrow !text-moss">Raised for care</p>
            <p className="tabular mt-2 text-3xl text-petal">
              {formatMoneyCompact(raisedCents, settings.currency)}
            </p>
          </div>
          <div>
            <p className="eyebrow !text-moss">Care kits funded</p>
            <p className="tabular mt-2 text-3xl">{kitsFunded}</p>
          </div>
          <div>
            <p className="eyebrow !text-moss">Orders placed</p>
            <p className="tabular mt-2 text-3xl">{orderCount}</p>
          </div>
        </div>
      </section>

      {/* The story */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <PageBody body={page.body} className="mx-auto" />
      </section>

      {/* The ledger is open */}
      <section className="border-t border-linen bg-parchment">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl">The ledger is open</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink/70">
            Every dollar here becomes a line in the care ledger. Read what past lines became, or
            add one of your own.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <LinkButton href="/stories" variant="outline">
              Read the stories
            </LinkButton>
            <LinkButton href="/donate" variant="rose">
              Fund care directly
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
