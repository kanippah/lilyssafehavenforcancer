import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { impactLine } from "@/lib/impact";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type ShippingAddressInput } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/admin/status-badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${decodeURIComponent(number)}` };
}

const HAPPY_PATH: OrderStatus[] = ["PENDING", "PAID", "FULFILLED", "SHIPPED", "DELIVERED"];

function stepLabel(status: OrderStatus): string {
  return status === "PENDING" ? "Placed" : ORDER_STATUS_LABELS[status];
}

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/orders");

  const { number } = await params;
  const order = await db.order.findUnique({
    where: { number: decodeURIComponent(number) },
    include: {
      items: { orderBy: { id: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order || order.userId !== user.id) notFound();

  const settings = await getSettings();
  const address = order.shippingAddress as unknown as ShippingAddressInput;
  const ended = order.status === "CANCELLED" || order.status === "REFUNDED";
  const currentStep = HAPPY_PATH.indexOf(order.status);

  return (
    <div>
      <Link
        href="/account/orders"
        className="text-sm font-medium text-leaf underline underline-offset-2 hover:text-fern"
      >
        ← Back to orders
      </Link>

      <header className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="tabular text-3xl">Order {order.number}</h1>
        <OrderStatusBadge status={order.status} />
      </header>
      <p className="tabular mt-2 text-sm text-ink/55">
        Placed {formatDate(order.createdAt)}
      </p>

      {/* Status timeline, or a quiet note when the journey ended early */}
      {ended ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-clay/25 bg-clay/5 p-5">
          <p className="text-sm text-ink/75">
            {order.status === "CANCELLED"
              ? "This order was cancelled. If anything about that seems off, write to us and we'll set it right."
              : "This order was refunded. The details of what happened are in the order history below."}
          </p>
        </div>
      ) : (
        <ol className="mt-8 grid grid-cols-5 gap-1" aria-label="Order progress">
          {HAPPY_PATH.map((status, i) => {
            const reached = i <= currentStep;
            const isCurrent = i === currentStep;
            return (
              <li key={status} className="text-center">
                <div className="flex items-center">
                  <div
                    className={cn(
                      "h-px flex-1",
                      i === 0 ? "bg-transparent" : reached ? "bg-leaf" : "bg-linen"
                    )}
                  />
                  <span
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-full border-2",
                      reached ? "border-leaf bg-leaf" : "border-linen bg-paper",
                      isCurrent && "ring-4 ring-leaf/20"
                    )}
                    aria-hidden="true"
                  />
                  <div
                    className={cn(
                      "h-px flex-1",
                      i === HAPPY_PATH.length - 1
                        ? "bg-transparent"
                        : i < currentStep
                          ? "bg-leaf"
                          : "bg-linen"
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "mt-2 text-[0.7rem] leading-tight sm:text-xs",
                    reached ? "font-semibold text-pine" : "text-ink/45"
                  )}
                >
                  {stepLabel(status)}
                  {isCurrent && <span className="sr-only"> (current)</span>}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {order.donationCents > 0 && (
        <div className="mt-8 rounded-[var(--radius-card)] bg-blush p-5">
          <p className="text-sm text-ink/80">
            This order carried a{" "}
            <span className="tabular font-semibold text-rose">
              {formatMoney(order.donationCents, order.currency)}
            </span>{" "}
            donation on top of everything else — thank you twice over.
          </p>
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <section aria-labelledby="order-items-heading" className="min-w-0">
          <h2 id="order-items-heading" className="text-xl">
            What&apos;s inside
          </h2>
          <ul className="mt-4 divide-y divide-linen rounded-[var(--radius-card)] border border-linen">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-16 w-16 shrink-0 rounded-[calc(var(--radius-card)*0.6)] bg-parchment object-cover"
                  />
                ) : (
                  <div
                    className="h-16 w-16 shrink-0 rounded-[calc(var(--radius-card)*0.6)] bg-parchment"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{item.title}</p>
                  {item.variantTitle && (
                    <p className="truncate text-xs text-ink/55">{item.variantTitle}</p>
                  )}
                  <p className="tabular mt-1 text-xs text-ink/55">
                    {formatMoney(item.unitCents, order.currency)} × {item.quantity}
                  </p>
                </div>
                <p className="tabular text-sm text-ink">
                  {formatMoney(item.unitCents * item.quantity, order.currency)}
                </p>
              </li>
            ))}
          </ul>

          {/* Order history */}
          {order.events.length > 0 && (
            <section aria-labelledby="order-history-heading" className="mt-8">
              <h2 id="order-history-heading" className="text-xl">
                Order history
              </h2>
              <ol className="mt-4 space-y-3 border-l-2 border-linen pl-4">
                {order.events.map((event) => (
                  <li key={event.id}>
                    <p className="tabular text-xs text-ink/50">{formatDateTime(event.createdAt)}</p>
                    <p className="mt-0.5 text-sm text-ink/80">{event.message}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </section>

        {/* Totals + shipping */}
        <aside className="space-y-5">
          <section
            aria-labelledby="order-totals-heading"
            className="rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-5"
          >
            <h2 id="order-totals-heading" className="eyebrow">
              Totals
            </h2>
            <dl className="tabular mt-3 space-y-1.5 text-sm text-ink/75">
              <div className="flex justify-between gap-3">
                <dt>Subtotal</dt>
                <dd>{formatMoney(order.subtotalCents, order.currency)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between gap-3 text-rose">
                  <dt>Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
                  <dd>−{formatMoney(order.discountCents, order.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt>Shipping</dt>
                <dd>{order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents, order.currency)}</dd>
              </div>
              {order.taxCents > 0 && (
                <div className="flex justify-between gap-3">
                  <dt>Tax</dt>
                  <dd>{formatMoney(order.taxCents, order.currency)}</dd>
                </div>
              )}
              {order.donationCents > 0 && (
                <div className="flex justify-between gap-3 text-rose">
                  <dt>Donation</dt>
                  <dd>{formatMoney(order.donationCents, order.currency)}</dd>
                </div>
              )}
            </dl>
            <hr className="rule my-3" />
            <p className="tabular flex justify-between text-base font-medium text-ink">
              <span>Total</span>
              <span>{formatMoney(order.totalCents, order.currency)}</span>
            </p>
            <p className="ledger-line mt-2">→ {impactLine(order.totalCents, settings)}</p>
          </section>

          <section
            aria-labelledby="order-shipping-heading"
            className="rounded-[var(--radius-card)] border border-linen p-5"
          >
            <h2 id="order-shipping-heading" className="eyebrow">
              Ships to
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">
              <span className="font-semibold text-ink">{order.shippingName}</span>
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
              {address.state ? `, ${address.state}` : ""}{" "}
              <span className="tabular">{address.postalCode}</span>
              <br />
              {address.country}
            </p>
          </section>

          {order.trackingNumber && (
            <section
              aria-labelledby="order-tracking-heading"
              className="rounded-[var(--radius-card)] border border-linen p-5"
            >
              <h2 id="order-tracking-heading" className="eyebrow">
                Tracking
              </h2>
              <p className="mt-3 text-sm text-ink/75">
                {order.trackingCarrier && (
                  <>
                    {order.trackingCarrier}
                    <br />
                  </>
                )}
                <span className="tabular text-ink">{order.trackingNumber}</span>
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
