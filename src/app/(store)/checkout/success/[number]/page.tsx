import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { mailConfigured } from "@/lib/mail";
import type { ShippingAddressInput } from "@/lib/orders";
import { LilyMark } from "@/components/lily-mark";
import { LinkButton } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { impactLine } from "@/lib/impact";
import { cn, formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${number}` };
}

const STEPS = ["Paid", "Being prepared", "Shipped"] as const;
const STEP_INDEX: Record<string, number> = {
  PENDING: -1,
  PAID: 0,
  FULFILLED: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

export default async function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const justPaid = sp.paid === "1";

  // Guest access by order number is intended — no ownership check here.
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!order) notFound();

  const settings = await getSettings();
  const address = order.shippingAddress as unknown as Partial<ShippingAddressInput>;
  const stepIndex = STEP_INDEX[order.status] ?? -1;
  const closed = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <LilyMark className="mx-auto h-12 w-12 text-leaf" />
        <p className="eyebrow mt-5">Order received</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Pressed with care</h1>
        <p className="mx-auto mt-3 max-w-md text-ink/70">
          {mailConfigured()
            ? `Your order is in — a confirmation is on its way to ${order.email}.`
            : `Your order is in. Keep this number with ${order.email} — together they track your parcel.`}
        </p>
        <p className="tabular mt-8 text-5xl tracking-tight sm:text-6xl">{order.number}</p>
        <p className="mt-2 text-sm text-ink/60">Placed {formatDate(order.createdAt)}</p>
      </div>

      {order.status === "PENDING" && (
        <div className="mx-auto mt-6 max-w-md rounded-[var(--radius-button)] border border-pollen/50 bg-pollen/10 px-4 py-3 text-center text-sm text-ink">
          {justPaid
            ? "Stripe is confirming your payment — it usually lands within a minute. This order will show as paid once it does."
            : "This order is awaiting payment."}
        </div>
      )}
      {closed && (
        <div className="mx-auto mt-6 max-w-md rounded-[var(--radius-button)] border border-clay/30 bg-clay/10 px-4 py-3 text-center text-sm text-clay">
          This order was {order.status === "CANCELLED" ? "cancelled" : "refunded"}. If that
          doesn&apos;t look right, contact us and we&apos;ll sort it out.
        </div>
      )}

      <div className="mt-10 rounded-[var(--radius-card)] border border-linen bg-parchment p-6 sm:p-8">
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium leading-snug text-ink">{item.title}</p>
                {item.variantTitle && <p className="text-xs text-ink/60">{item.variantTitle}</p>}
                <p className="tabular text-xs text-ink/60">× {item.quantity}</p>
              </div>
              <span className="tabular shrink-0">
                {formatMoney(item.unitCents * item.quantity, order.currency)}
              </span>
            </li>
          ))}
        </ul>
        <hr className="rule my-5" />
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink/70">Subtotal</dt>
            <dd className="tabular font-medium">{formatMoney(order.subtotalCents, order.currency)}</dd>
          </div>
          {order.discountCents > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink/70">
                Discount{order.discountCode ? ` (${order.discountCode})` : ""}
              </dt>
              <dd className="tabular font-medium text-pine">
                −{formatMoney(order.discountCents, order.currency)}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink/70">Shipping</dt>
            <dd className="tabular font-medium">
              {order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents, order.currency)}
            </dd>
          </div>
          {order.taxCents > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink/70">Tax</dt>
              <dd className="tabular font-medium">{formatMoney(order.taxCents, order.currency)}</dd>
            </div>
          )}
          {order.donationCents > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink/70">Donation</dt>
              <dd className="tabular font-medium text-rose">
                {formatMoney(order.donationCents, order.currency)}
              </dd>
            </div>
          )}
        </dl>
        <hr className="rule my-4" />
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold text-ink">Total</span>
          <span className="tabular text-lg font-semibold">
            {formatMoney(order.totalCents, order.currency)}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-lg">Delivering to</h2>
          <address className="mt-3 text-sm not-italic leading-relaxed text-ink/80">
            <span className="font-medium text-ink">{order.shippingName}</span>
            <br />
            {address.line1}
            {address.line2 && (
              <>
                <br />
                {address.line2}
              </>
            )}
            <br />
            {address.city}
            {address.state ? `, ${address.state}` : ""} {address.postalCode}
            <br />
            {address.country}
          </address>
        </div>
        {!closed && (
          <div>
            <h2 className="text-lg">What happens next</h2>
            <ol className="mt-3 space-y-3">
              {STEPS.map((label, i) => {
                const reached = i <= stepIndex;
                const current = i === stepIndex;
                return (
                  <li
                    key={label}
                    className="flex items-center gap-3"
                    aria-current={current ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full border",
                        reached ? "border-leaf bg-leaf" : "border-linen bg-transparent"
                      )}
                      aria-hidden="true"
                    />
                    <span className={cn("text-sm", reached ? "font-semibold text-ink" : "text-ink/50")}>
                      {label}
                    </span>
                    {current && (
                      <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-pine">
                        Now
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs text-ink/55">We&apos;ll email you when it ships.</p>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-[var(--radius-card)] bg-blush p-6 text-center sm:p-8">
        <p className="font-display text-xl text-rose">
          This order {impactLine(order.totalCents, settings)}.
        </p>
        <p className="mt-2 text-sm text-ink/70">That help is real, and it happened because of you.</p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <LinkButton href="/shop" size="lg">
          Keep browsing
        </LinkButton>
        <Link href="/track" className="text-sm font-medium text-leaf underline underline-offset-4">
          Track this order
        </Link>
      </div>
    </div>
  );
}
