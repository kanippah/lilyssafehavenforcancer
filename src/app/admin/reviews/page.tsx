import type { Metadata } from "next";
import Link from "next/link";
import type { ReviewStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { ReviewStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { approveReview, rejectReview } from "./_actions";

export const metadata: Metadata = { title: "Reviews" };

type Filter = { key: string; label: string; status?: ReviewStatus };

const FILTERS: Filter[] = [
  { key: "pending", label: "Pending", status: "PENDING" },
  { key: "approved", label: "Approved", status: "APPROVED" },
  { key: "rejected", label: "Rejected", status: "REJECTED" },
  { key: "all", label: "All" },
];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusParam = typeof sp.status === "string" ? sp.status : "pending";
  const filter = FILTERS.find((f) => f.key === statusParam) ?? FILTERS[0];

  const [reviews, pendingCount] = await Promise.all([
    db.review.findMany({
      where: filter.status ? { status: filter.status } : {},
      orderBy: { createdAt: "desc" },
      include: { product: { select: { title: true, slug: true } } },
    }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Reviews"
        subtitle={
          pendingCount === 0
            ? "Nothing awaiting moderation — all caught up."
            : pendingCount === 1
              ? "1 review awaiting moderation"
              : `${pendingCount} reviews awaiting moderation`
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "pending" ? "/admin/reviews" : `/admin/reviews?status=${f.key}`}
            aria-current={filter.key === f.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              filter.key === f.key
                ? "border-ink bg-ink text-paper"
                : "border-linen bg-paper text-ink/70 hover:border-ink/40 hover:text-ink"
            )}
          >
            {f.label}
            {f.key === "pending" && pendingCount > 0 && (
              <span className="tabular ml-1.5 text-xs">({pendingCount})</span>
            )}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-10 text-center text-sm text-ink/55">
          {filter.status === "PENDING"
            ? "No reviews waiting for a decision."
            : "No reviews in this view."}
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-[var(--radius-card)] border border-linen bg-paper p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/products/${review.product.slug}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      {review.product.title}
                    </Link>
                    <span
                      className="text-sm text-pollen"
                      aria-label={`Rated ${review.rating} out of 5 stars`}
                    >
                      {"★".repeat(review.rating)}
                      <span aria-hidden="true" className="text-ink/20">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </span>
                    <ReviewStatusBadge status={review.status} />
                  </div>
                  {review.title && (
                    <p className="mt-1.5 text-sm font-semibold text-ink">{review.title}</p>
                  )}
                  <p className="mt-1 text-sm leading-relaxed text-ink/80">{review.body}</p>
                  <p className="mt-2 text-xs text-ink/55">
                    {review.name} ·{" "}
                    <span className="tabular">
                      {formatDate(review.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {review.status !== "APPROVED" && (
                    <form action={approveReview.bind(null, review.id)}>
                      <Button size="sm" variant="outline">
                        Approve
                      </Button>
                    </form>
                  )}
                  {review.status !== "REJECTED" && (
                    <form action={rejectReview.bind(null, review.id)}>
                      <Button size="sm" variant="ghost" className="text-clay">
                        Reject
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
