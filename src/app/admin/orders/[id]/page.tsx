import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { impactLine } from "@/lib/impact";
import { formatDateTime } from "@/lib/utils";
import type { ShippingAddressInput } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ConfirmActionButton } from "./_components/confirm-action-button";
import { NoteForm } from "./_components/note-form";
import {
  addNote,
  cancelOrder,
  markDelivered,
  markFulfilled,
  markPaid,
  markShipped,
  refundOrder,
} from "./_actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, select: { number: true } });
  return { title: order ? `Order ${order.number}` : "Order" };
}

const cardClass = "rounded-[var(--radius-card)] border border-linen bg-paper p-5";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        items: { orderBy: { id: "asc" } },
        events: { orderBy: { createdAt: "desc" } },
      },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  const address = (order.shippingAddress ?? {}) as Partial<ShippingAddressInput>;
  const canCancel = ["PENDING", "PAID", "FULFILLED", "SHIPPED"].includes(order.status);
  const canRefund = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"].includes(order.status);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/orders" className="text-sm font-medium text-leaf hover:underline">
          ← Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="tabular text-2xl text-ink">{order.number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-ink/60">
          Placed <span className="tabular">{formatDateTime(order.createdAt)}</span>
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Items */}
          <section className={cardClass} aria-labelledby="order-items-heading">
            <h2 id="order-items-heading" className="font-display text-lg text-ink">
              Items
            </h2>
            <ul className="mt-2 divide-y divide-linen">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-14 w-14 rounded-xl border border-linen bg-parchment object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl border border-linen bg-parchment" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    {item.variantTitle && <p className="text-xs text-ink/55">{item.variantTitle}</p>}
                    <p className="tabular text-xs text-ink/55">
                      {formatMoney(item.unitCents, order.currency)} × {item.quantity}
                    </p>
                  </div>
                  <p className="tabular text-sm text-ink">
                    {formatMoney(item.unitCents * item.quantity, order.currency)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-linen pt-4 text-sm">
              <TotalRow label="Subtotal" value={formatMoney(order.subtotalCents, order.currency)} />
              {order.discountCents > 0 && (
                <TotalRow
                  label={order.discountCode ? `Discount (${order.discountCode})` : "Discount"}
                  value={`−${formatMoney(order.discountCents, order.currency)}`}
                />
              )}
              <TotalRow
                label="Shipping"
                value={
                  order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents, order.currency)
                }
              />
              {order.taxCents > 0 && (
                <TotalRow label="Tax" value={formatMoney(order.taxCents, order.currency)} />
              )}
              {order.donationCents > 0 && (
                <TotalRow
                  label="Donation"
                  value={formatMoney(order.donationCents, order.currency)}
                  rose
                />
              )}
              <div className="flex items-baseline justify-between border-t border-linen pt-2">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="tabular font-semibold text-ink">
                  {formatMoney(order.totalCents, order.currency)}
                </dd>
              </div>
            </dl>
            <p className="ledger-line mt-2" aria-label="What this order funds">
              → {impactLine(order.totalCents, settings)}
            </p>
            {order.note && (
              <p className="mt-3 rounded-lg bg-parchment px-3 py-2 text-sm text-ink/80">
                <span className="font-semibold text-ink">Customer note:</span> {order.note}
              </p>
            )}
          </section>

          {/* Timeline */}
          <section className={cardClass} aria-labelledby="order-timeline-heading">
            <h2 id="order-timeline-heading" className="font-display text-lg text-ink">
              Timeline
            </h2>
            <ol className="mt-3 space-y-3">
              {order.events.length === 0 && (
                <li className="text-sm text-ink/55">Nothing logged yet.</li>
              )}
              {order.events.map((event) => (
                <li key={event.id} className="border-l-2 border-linen pl-3">
                  <p className="tabular text-xs text-ink/50">{formatDateTime(event.createdAt)}</p>
                  <p className="text-sm text-ink/85">{event.message}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4 border-t border-linen pt-4">
              <NoteForm action={addNote.bind(null, order.id)} />
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {/* Fulfillment */}
          <section className={cardClass} aria-labelledby="order-fulfillment-heading">
            <h2 id="order-fulfillment-heading" className="font-display text-lg text-ink">
              Fulfillment
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Payment via {order.paymentMethod}
              {order.paymentRef && (
                <>
                  {" · ref "}
                  <span className="tabular">{order.paymentRef}</span>
                </>
              )}
            </p>
            {(order.trackingCarrier || order.trackingNumber) && (
              <p className="mt-2 text-sm text-ink/80">
                Tracking: {order.trackingCarrier}{" "}
                <span className="tabular">{order.trackingNumber}</span>
              </p>
            )}

            <div className="mt-4 space-y-3">
              {order.status === "PENDING" && (
                <form action={markPaid.bind(null, order.id)}>
                  <Button size="sm">Mark paid</Button>
                </form>
              )}
              {order.status === "PAID" && (
                <form action={markFulfilled.bind(null, order.id)}>
                  <Button size="sm">Mark fulfilled</Button>
                </form>
              )}
              {order.status === "FULFILLED" && (
                <form action={markShipped.bind(null, order.id)} className="space-y-3">
                  <Field label="Carrier" htmlFor="trackingCarrier" hint="Optional — USPS, UPS, FedEx…">
                    <Input
                      id="trackingCarrier"
                      name="trackingCarrier"
                      defaultValue={order.trackingCarrier ?? ""}
                      maxLength={60}
                    />
                  </Field>
                  <Field label="Tracking number" htmlFor="trackingNumber">
                    <Input
                      id="trackingNumber"
                      name="trackingNumber"
                      defaultValue={order.trackingNumber ?? ""}
                      maxLength={80}
                      className="tabular"
                    />
                  </Field>
                  <Button size="sm">Mark shipped</Button>
                </form>
              )}
              {order.status === "SHIPPED" && (
                <form action={markDelivered.bind(null, order.id)}>
                  <Button size="sm">Mark delivered</Button>
                </form>
              )}
              {(order.status === "DELIVERED" ||
                order.status === "CANCELLED" ||
                order.status === "REFUNDED") &&
                !canRefund && (
                  <p className="text-sm text-ink/55">No further fulfillment steps.</p>
                )}
            </div>

            {(canCancel || canRefund) && (
              <div className="mt-4 space-y-2 border-t border-linen pt-4">
                {canCancel && (
                  <ConfirmActionButton
                    action={cancelOrder.bind(null, order.id)}
                    label="Cancel order"
                    confirmLabel="Yes, cancel this order"
                    hint="Cancelling returns tracked items to stock. Click again to confirm."
                  />
                )}
                {canRefund && (
                  <ConfirmActionButton
                    action={refundOrder.bind(null, order.id)}
                    label="Refund order"
                    confirmLabel="Yes, refund this order"
                    hint="Refunding returns tracked items to stock. Click again to confirm."
                  />
                )}
              </div>
            )}
          </section>

          {/* Customer */}
          <section className={cardClass} aria-labelledby="order-customer-heading">
            <h2 id="order-customer-heading" className="font-display text-lg text-ink">
              Customer
            </h2>
            <div className="mt-2 space-y-1 text-sm">
              <p className="font-semibold text-ink">{order.shippingName}</p>
              <p>
                <a href={`mailto:${order.email}`} className="text-leaf hover:underline">
                  {order.email}
                </a>
              </p>
              {order.phone && <p className="tabular text-ink/70">{order.phone}</p>}
            </div>
            <address className="mt-3 border-t border-linen pt-3 text-sm not-italic leading-relaxed text-ink/80">
              {address.fullName && <div>{address.fullName}</div>}
              {address.line1 && <div>{address.line1}</div>}
              {address.line2 && <div>{address.line2}</div>}
              <div>
                {[address.city, address.state].filter(Boolean).join(", ")}{" "}
                {address.postalCode && <span className="tabular">{address.postalCode}</span>}
              </div>
              {address.country && <div>{address.country}</div>}
            </address>
            {order.userId && (
              <p className="mt-3 border-t border-linen pt-3 text-sm">
                <Link
                  href={`/admin/customers/${order.userId}`}
                  className="font-medium text-leaf hover:underline"
                >
                  View customer profile →
                </Link>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, rose }: { label: string; value: string; rose?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={rose ? "text-rose" : "text-ink/70"}>{label}</dt>
      <dd className={`tabular ${rose ? "text-rose" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
