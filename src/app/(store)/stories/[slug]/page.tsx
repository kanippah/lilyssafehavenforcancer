import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { LilyMark } from "@/components/lily-mark";
import { LinkButton } from "@/components/ui/button";
import { PageBody } from "../../_components/page-body";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  if (!post || !post.publishedAt) return { title: "Story not found" };
  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

export default async function StoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  if (!post || !post.publishedAt) notFound();

  const more = await db.post.findMany({
    where: { publishedAt: { not: null }, slug: { not: slug } },
    orderBy: { publishedAt: "desc" },
    take: 2,
  });

  return (
    <div>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <header className="mx-auto max-w-2xl">
          <p className="eyebrow">
            <span className="tabular normal-case tracking-normal">
              {formatDate(post.publishedAt)}
            </span>
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-lg text-ink/70">{post.excerpt}</p>}
        </header>

        {post.coverUrl && (
          <div className="mt-10 overflow-hidden rounded-[var(--radius-card)] bg-parchment">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverUrl} alt={post.title} className="aspect-[2/1] w-full object-cover" />
          </div>
        )}

        <PageBody body={post.body} className="mx-auto mt-10" />
      </article>

      {/* More from the haven */}
      {more.length > 0 && (
        <section aria-label="More from the haven" className="border-t border-linen">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl">More from the haven</h2>
            <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {more.map((other) => (
                <Link key={other.id} href={`/stories/${other.slug}`} className="group block">
                  <div className="overflow-hidden rounded-[var(--radius-card)] bg-parchment">
                    {other.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={other.coverUrl}
                        alt={other.title}
                        className="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-[16/10] w-full items-center justify-center">
                        <LilyMark className="h-10 w-10 text-linen" />
                      </div>
                    )}
                  </div>
                  <p className="tabular mt-4 text-xs text-ink/55">
                    {formatDate(other.publishedAt ?? other.createdAt)}
                  </p>
                  <h3 className="mt-1.5 font-display text-xl leading-snug text-ink group-hover:underline group-hover:decoration-petal group-hover:decoration-2 group-hover:underline-offset-4">
                    {other.title}
                  </h3>
                  {other.excerpt && (
                    <p className="mt-2 text-sm leading-relaxed text-ink/70">{other.excerpt}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-linen bg-parchment">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-3xl">Add a line to the next letter</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink/70">
            Every purchase in the shop becomes a care kit line in a story like this one.
          </p>
          <LinkButton href="/shop" className="mt-6">
            Shop the haven
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
