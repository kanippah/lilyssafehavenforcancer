import type { Metadata } from "next";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { TrackForm } from "./_components/track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check where your order is with your order number and email.",
};

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Order tracking</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Where is my parcel?</h1>
      <p className="mt-3 text-ink/70">
        Enter your order number and the email you used at checkout. Both are in your confirmation —
        the number looks like <span className="tabular">LSH-1024</span>.
      </p>
      <TrackForm statusLabels={ORDER_STATUS_LABELS} />
    </div>
  );
}
