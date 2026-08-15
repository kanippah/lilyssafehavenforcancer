"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@prisma/client";
import { trackOrder } from "../_actions";

const FLOW: OrderStatus[] = ["PENDING", "PAID", "FULFILLED", "SHIPPED", "DELIVERED"];

function badgeTone(status: OrderStatus): "green" | "sky" | "gold" | "clay" {
  if (status === "PAID" || status === "DELIVERED") return "green";
  if (status === "SHIPPED" || status === "FULFILLED") return "sky";
  if (status === "PENDING") return "gold";
  return "clay";
}

export function TrackForm({ statusLabels }: { statusLabels: Record<OrderStatus, string> }) {
  const [state, formAction, pending] = useActionState(trackOrder, undefined);
  const order = state?.order;
  const closed = order ? order.status === "CANCELLED" || order.status === "REFUNDED" : false;
  const currentIndex = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div className="mt-8">
      <form action={formAction} className="rounded-[var(--radius-card)] border border-linen bg-parchment p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Order number" htmlFor="track-number">
            <Input
              id="track-number"
              name="number"
              required
              placeholder="LSH-1024"
              autoComplete="off"
              className="tabular"
            />
          </Field>
          <Field label="Email used at checkout" htmlFor="track-email">
            <Input id="track-email" name="email" type="email" required autoComplete="email" />
          </Field>
        </div>
        <div className="mt-5">
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Looking…" : "Find my order"}
          </Button>
        </div>
        <p
          aria-live="polite"
          role={state?.error ? "alert" : undefined}
          className={cn("mt-3 text-sm font-medium text-clay", !state?.error && "sr-only")}
        >
          {state?.error ?? ""}
        </p>
      </form>

      <div aria-live="polite">
        {order && (
          <section
            className="mt-8 rounded-[var(--radius-card)] border border-linen bg-paper p-6 sm:p-8"
            aria-label={`Status of order ${order.number}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl">
                <span className="tabular">{order.number}</span>
              </h2>
              <Badge tone={badgeTone(order.status)}>{statusLabels[order.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink/60">Placed {formatDate(order.placedAt)}</p>

            {closed ? (
              <div className="mt-6 rounded-[var(--radius-button)] border border-clay/30 bg-clay/10 px-4 py-3 text-sm">
                <p className="font-semibold text-clay">{statusLabels[order.status]}</p>
                <p className="mt-1 text-ink/70">
                  {order.status === "CANCELLED"
                    ? "This order was cancelled and won't be shipped."
                    : "This order was refunded."}{" "}
                  If that doesn&apos;t look right, contact us and we&apos;ll sort it out.
                </p>
              </div>
            ) : (
              <ol className="mt-6">
                {FLOW.map((status, i) => {
                  const reached = i <= currentIndex;
                  const current = i === currentIndex;
                  const last = i === FLOW.length - 1;
                  return (
                    <li
                      key={status}
                      className={cn("relative flex gap-3", !last && "pb-5")}
                      aria-current={current ? "step" : undefined}
                    >
                      {!last && (
                        <span
                          className={cn(
                            "absolute left-[5px] top-4 h-full w-px",
                            i < currentIndex ? "bg-leaf" : "bg-linen"
                          )}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          "relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2",
                          reached ? "border-leaf bg-leaf" : "border-linen bg-paper"
                        )}
                        aria-hidden="true"
                      />
                      <p
                        className={cn(
                          "text-sm leading-tight",
                          current ? "font-semibold text-ink" : reached ? "text-ink/80" : "text-ink/45"
                        )}
                      >
                        {statusLabels[status]}
                        {current && (
                          <span className="ml-2 rounded-full bg-leaf/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-pine">
                            Current
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}

            {!closed && (order.trackingCarrier || order.trackingNumber) && (
              <div className="mt-5 rounded-[var(--radius-button)] bg-parchment px-4 py-3 text-sm">
                On its way{order.trackingCarrier ? ` with ${order.trackingCarrier}` : ""}
                {order.trackingNumber && (
                  <>
                    {" "}
                    — tracking number <span className="tabular font-medium">{order.trackingNumber}</span>
                  </>
                )}
              </div>
            )}

            <hr className="rule my-6" />
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-start gap-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg bg-parchment object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-lg bg-parchment" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium leading-snug text-ink">{item.title}</p>
                      {item.variantTitle && <p className="text-xs text-ink/60">{item.variantTitle}</p>}
                      <p className="tabular text-xs text-ink/60">× {item.quantity}</p>
                    </div>
                  </div>
                  <span className="tabular shrink-0">
                    {formatMoney(item.unitCents * item.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-linen pt-3 text-sm">
              <span className="font-semibold text-ink">Total</span>
              <span className="tabular font-semibold">
                {formatMoney(order.totalCents, order.currency)}
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
