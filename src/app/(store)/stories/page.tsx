import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { LilyMark } from "@/components/lily-mark";

export const metadata: Metadata = {
  title: "Letters & stories",
  description:
    "Where the ledger becomes people: what your purchases funded, who packed the kits, and who opened them.",
};

export default async function StoriesPage() {
  const posts = await db.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
  });
  const [feature, ...rest] = posts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <p className="eyebrow">Letters from the haven</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Letters & stories</h1>
        <p className="mt-4 text-ink/75">
          Where the ledger becomes people: what your purchases funded, who packed it, and who
          opened the bag.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="mt-14 rounded-[var(--radius-card)] border border-linen bg-parchment px-6 py-16 text-center">
          <LilyMark className="mx-auto h-10 w-10 text-leaf" />
          <p className="mt-4 font-display text-xl text-ink">The first letter is being written</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/65">
            Stories will appear here soon — plain accounts of what your purchases funded and who
            they reached.
          </p>
        </div>
      ) : (
        <>
          {/* Feature */}
          <Link
            href={`/stories/${feature.slug}`}
            className="group mt-12 grid gap-6 md:grid-cols-2 md:items-center"
          >
            <div className="overflow-hidden rounded-[var(--radius-card)] bg-parchment">
              {feature.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={feature.coverUrl}
                  alt={feature.title}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center">
                  <LilyMark className="h-12 w-12 text-linen" />
                </div>
              )}
            </div>
            <div className="md:pl-2">
              <p className="tabular text-xs text-ink/55">
                {formatDate(feature.publishedAt ?? feature.createdAt)}
              </p>
              <h2 className="mt-2 text-3xl group-hover:underline group-hover:decoration-petal group-hover:decoration-2 group-hover:underline-offset-4 sm:text-4xl">
                {feature.title}
              </h2>
              {feature.excerpt && <p className="mt-3 max-w-md text-ink/75">{feature.excerpt}</p>}
              <p className="mt-4 text-sm font-semibold text-leaf">Read the letter →</p>
            </div>
          </Link>

          {/* The rest */}
          {rest.length > 0 && (
            <>
              <hr className="rule mt-14" />
              <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2">
                {rest.map((post) => (
                  <Link key={post.id} href={`/stories/${post.slug}`} className="group block">
                    <div className="overflow-hidden rounded-[var(--radius-card)] bg-parchment">
                      {post.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.coverUrl}
                          alt={post.title}
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
                      {formatDate(post.publishedAt ?? post.createdAt)}
                    </p>
                    <h3 className="mt-1.5 font-display text-xl leading-snug text-ink group-hover:underline group-hover:decoration-petal group-hover:decoration-2 group-hover:underline-offset-4">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 text-sm leading-relaxed text-ink/70">{post.excerpt}</p>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
