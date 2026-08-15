import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = {
  title: "Pages",
};

export default async function AdminPagesPage() {
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Pages"
        subtitle="The store's standing pages — about, FAQ, policies."
      />

      <p className="mb-4 rounded-[var(--radius-button)] border border-sky/30 bg-sky/10 px-4 py-2.5 text-sm text-ink/75">
        These pages are stitched into the storefront — the footer and checkout link straight to
        them — so pages can&apos;t be added or removed here. Their titles and content are yours to
        edit.
      </p>

      {pages.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-8 text-center">
          <p className="font-display text-lg text-ink">No pages found</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            The standing pages (about, FAQ, privacy, terms, shipping &amp; returns) are created by
            the seed script. Run the seed to restore them.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper p-2">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Address</th>
                <th>Updated</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="font-medium text-ink hover:text-leaf hover:underline"
                    >
                      {page.title}
                    </Link>
                  </td>
                  <td className="tabular text-ink/70">/{page.slug}</td>
                  <td className="tabular text-ink/70">{formatDateTime(page.updatedAt)}</td>
                  <td>
                    <Link
                      href={`/admin/pages/${page.id}`}
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
      )}
    </div>
  );
}
