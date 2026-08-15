import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Subscribers",
};

export default async function AdminSubscribersPage() {
  const subscribers = await db.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Subscribers"
        subtitle="People who asked for Letters from the Haven."
        actions={
          <LinkButton href="/admin/subscribers/export" variant="outline" prefetch={false}>
            Download CSV
          </LinkButton>
        }
      />

      <div className="mb-4 max-w-xs">
        <StatCard
          label="Subscribers"
          value={String(subscribers.length)}
          sub="Signed up through the storefront footer"
        />
      </div>

      {subscribers.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-8 text-center">
          <p className="font-display text-lg text-ink">No subscribers yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            The newsletter form lives in the storefront footer. Signups appear here as they come
            in.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper p-2">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td className="text-ink">{subscriber.email}</td>
                  <td className="tabular text-ink/70">{formatDate(subscriber.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
