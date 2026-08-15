import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { DiscountForm } from "../_components/discount-form";
import { createDiscount } from "../_actions";

export const metadata: Metadata = { title: "New discount" };

export default function NewDiscountPage() {
  return (
    <div className="max-w-xl">
      <div className="mb-2">
        <Link href="/admin/discounts" className="text-sm font-medium text-leaf hover:underline">
          ← Back to discounts
        </Link>
      </div>
      <PageHeader
        title="New discount"
        subtitle="Codes are checked against their window, usage limit, and minimum at checkout."
      />
      <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
        <DiscountForm action={createDiscount} />
      </div>
    </div>
  );
}
