import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { truncate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { savePage } from "../_actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const page = await db.page.findUnique({ where: { id }, select: { title: true } });
  return { title: page ? `Edit · ${truncate(page.title, 50)}` : "Edit page" };
}

export default async function AdminEditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();

  const saved = sp.saved === "1";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Edit — ${page.title}`}
        subtitle="Changes appear on the storefront as soon as you save."
        actions={
          <a
            href={`/${page.slug}`}
            className="text-sm font-medium text-leaf hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            View page ↗
          </a>
        }
      />

      <div aria-live="polite">
        {saved && (
          <p className="mb-4 rounded-[var(--radius-button)] border border-leaf/30 bg-leaf/10 px-4 py-2.5 text-sm font-medium text-pine">
            Page saved.
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-[var(--radius-button)] border border-clay/30 bg-clay/10 px-4 py-2.5 text-sm font-medium text-clay">
            {error}
          </p>
        )}
      </div>

      <form
        action={savePage.bind(null, page.id)}
        className="space-y-4 rounded-[var(--radius-card)] border border-linen bg-paper p-5"
      >
        <Field label="Title" htmlFor="page-title">
          <Input id="page-title" name="title" defaultValue={page.title} required />
        </Field>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-ink">Web address</p>
          <p className="tabular rounded-[var(--radius-button)] border border-linen bg-parchment px-3.5 py-2.5 text-[0.95rem] text-ink/70">
            /{page.slug}
          </p>
          <p className="text-xs text-ink/55">
            The address can&apos;t change — the storefront links to exactly this page.
          </p>
        </div>

        <Field
          label="Body"
          htmlFor="page-body"
          hint="Blank line between paragraphs. ## for headings, - for list items, **bold**, *italic*."
        >
          <Textarea
            id="page-body"
            name="body"
            rows={20}
            defaultValue={page.body}
            className="font-mono text-sm leading-relaxed"
          />
        </Field>

        <Button type="submit">Save page</Button>
      </form>
    </div>
  );
}
