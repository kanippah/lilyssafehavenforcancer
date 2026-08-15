import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Collections · Admin" };

export default async function AdminCollectionsPage() {
  const collections = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { title: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle="Groups that organize the store — comfort goods, apparel, care kits."
        actions={<LinkButton href="/admin/collections/new" size="sm">Add collection</LinkButton>}
      />

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <span className="sr-only">Image</span>
              </th>
              <th>Title</th>
              <th>Products</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-ink/55">
                  Nothing here yet —{" "}
                  <Link
                    href="/admin/collections/new"
                    className="font-medium text-leaf underline underline-offset-2"
                  >
                    add the first collection
                  </Link>
                  .
                </td>
              </tr>
            )}
            {collections.map((c) => (
              <tr key={c.id}>
                <td className="w-14">
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.imageUrl}
                      alt={c.title}
                      className="h-10 w-10 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-parchment" aria-hidden="true" />
                  )}
                </td>
                <td>
                  <Link
                    href={`/admin/collections/${c.id}`}
                    className="font-semibold text-ink hover:underline"
                  >
                    {c.title}
                  </Link>
                </td>
                <td className="tabular">{c._count.products}</td>
                <td className="tabular">{c.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
