import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Stories",
};

export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const deleted = sp.deleted === "1";

  const posts = await db.post.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Stories"
        subtitle="News from the haven — where the money goes, and who it reaches."
        actions={<LinkButton href="/admin/stories/new">New story</LinkButton>}
      />

      <div aria-live="polite">
        {deleted && (
          <p className="mb-4 rounded-[var(--radius-button)] border border-leaf/30 bg-leaf/10 px-4 py-2.5 text-sm font-medium text-pine">
            Story deleted.
          </p>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-8 text-center">
          <p className="font-display text-lg text-ink">No stories yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            Stories tell supporters where their money went. Write the first one — even a short
            update matters.
          </p>
          <LinkButton href="/admin/stories/new" variant="outline" className="mt-4">
            Write the first story
          </LinkButton>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-linen bg-paper p-2">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Date</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <Link
                      href={`/admin/stories/${post.id}`}
                      className="font-medium text-ink hover:text-leaf hover:underline"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="tabular text-ink/70">{post.slug}</td>
                  <td>
                    {post.publishedAt ? (
                      <Badge tone="green">published</Badge>
                    ) : (
                      <Badge tone="gold">draft</Badge>
                    )}
                  </td>
                  <td className="tabular text-ink/70">
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </td>
                  <td>
                    <Link
                      href={`/admin/stories/${post.id}`}
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
