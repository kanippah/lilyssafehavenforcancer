import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { truncate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StoryForm } from "../_components/story-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await db.post.findUnique({ where: { id }, select: { title: true } });
  return { title: post ? `Edit · ${truncate(post.title, 50)}` : "Edit story" };
}

export default async function AdminEditStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const post = await db.post.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div>
      <PageHeader
        title="Edit story"
        subtitle={post.publishedAt ? "Changes go live as soon as you save." : "This story is a draft — only staff can see it."}
      />
      <div aria-live="polite">
        {sp.created === "1" && (
          <p className="mb-4 max-w-3xl rounded-[var(--radius-button)] border border-leaf/30 bg-leaf/10 px-4 py-2.5 text-sm font-medium text-pine">
            Story created.
          </p>
        )}
      </div>
      <StoryForm post={post} />
    </div>
  );
}
