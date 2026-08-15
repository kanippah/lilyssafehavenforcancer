import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageBody } from "../_components/page-body";

const SLUG = "faq";

export async function generateMetadata(): Promise<Metadata> {
  const page = await db.page.findUnique({ where: { slug: SLUG } });
  return {
    title: page?.title ?? "FAQ",
    description: "Plain answers about orders, returns, and where the money goes.",
  };
}

export default async function FaqPage() {
  const page = await db.page.findUnique({ where: { slug: SLUG } });
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl">{page.title}</h1>
      <PageBody body={page.body} className="mt-8" />
      <hr className="rule mt-12" />
      <p className="tabular mt-4 text-xs text-ink/55">Updated {formatDate(page.updatedAt)}</p>
    </div>
  );
}
