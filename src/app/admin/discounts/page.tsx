import type { Metadata } from "next";
import Link from "next/link";
import type { DiscountCode } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoneyCompact } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Discounts" };

function typeLabel(discount: DiscountCode): string {
  if (discount.type === "PERCENT") return `${discount.value}% off`;
  if (discount.type === "FIXED") return `${formatMoneyCompact(discount.value)} off`;
  return "Free shipping";
}

function windowLabel(discount: DiscountCode): string {
  const short = (d: Date) => formatDate(d, { month: "short", day: "numeric", year: "numeric" });
  if (discount.startsAt && discount.endsAt) return `${short(discount.startsAt)} – ${short(discount.endsAt)}`;
  if (discount.startsAt) return `from ${short(discount.startsAt)}`;
  if (discount.endsAt) return `until ${short(discount.endsAt)}`;
  return "always";
}

export default async function DiscountsPage() {
  const discounts = await db.discountCode.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="Discounts"
        subtitle={
          discounts.length === 1 ? "1 code" : `${discounts.length} codes`
        }
        actions={
          <LinkButton href="/admin/discounts/new" size="sm">
            New discount
          </LinkButton>
        }
      />

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min subtotal</th>
              <th>Usage</th>
              <th>Window</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {discounts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-ink/55">
                  No discount codes yet — create one to give shoppers a reason to smile.
                </td>
              </tr>
            )}
            {discounts.map((discount) => (
              <tr key={discount.id}>
                <td>
                  <Link
                    href={`/admin/discounts/${discount.id}`}
                    className="tabular font-medium text-leaf hover:underline"
                  >
                    {discount.code}
                  </Link>
                </td>
                <td>{typeLabel(discount)}</td>
                <td>
                  {discount.minSubtotalCents != null ? (
                    <span className="tabular">{formatMoneyCompact(discount.minSubtotalCents)}</span>
                  ) : (
                    <span className="text-ink/30">—</span>
                  )}
                </td>
                <td>
                  <span className="tabular">
                    {discount.usedCount} / {discount.maxUses ?? "∞"}
                  </span>
                </td>
                <td>
                  <span className="tabular text-xs text-ink/70">{windowLabel(discount)}</span>
                </td>
                <td>
                  {discount.active ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <Badge tone="neutral">Inactive</Badge>
                  )}
                </td>
                <td>
                  <Link
                    href={`/admin/discounts/${discount.id}`}
                    className="text-sm font-medium text-leaf hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
