import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { DiscountForm } from "../_components/discount-form";
import { deleteDiscount, updateDiscount } from "../_actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const discount = await db.discountCode.findUnique({ where: { id }, select: { code: true } });
  return { title: discount ? `Discount ${discount.code}` : "Discount" };
}

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const discount = await db.discountCode.findUnique({ where: { id } });
  if (!discount) notFound();

  return (
    <div className="max-w-xl">
      <div className="mb-2">
        <Link href="/admin/discounts" className="text-sm font-medium text-leaf hover:underline">
          ← Back to discounts
        </Link>
      </div>
      <PageHeader
        title={discount.code}
        subtitle={
          discount.usedCount === 1
            ? "Redeemed 1 time so far"
            : `Redeemed ${discount.usedCount} times so far`
        }
      />
      <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
        <DiscountForm
          action={updateDiscount.bind(null, discount.id)}
          deleteAction={deleteDiscount.bind(null, discount.id)}
          initial={{
            code: discount.code,
            type: discount.type,
            value: discount.value,
            minSubtotalCents: discount.minSubtotalCents,
            maxUses: discount.maxUses,
            startsAt: discount.startsAt,
            endsAt: discount.endsAt,
            active: discount.active,
          }}
        />
      </div>
    </div>
  );
}
