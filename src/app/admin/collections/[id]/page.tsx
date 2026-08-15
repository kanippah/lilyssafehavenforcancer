import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { CollectionForm } from "../_components/collection-form";
import { deleteCollection, updateCollection } from "../_actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const collection = await db.collection.findUnique({ where: { id }, select: { title: true } });
  return { title: collection ? `${collection.title} · Admin` : "Collection · Admin" };
}

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const collection = await db.collection.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!collection) notFound();

  const count = collection._count.products;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Edit collection"
        subtitle={`${collection.title} — ${count} ${count === 1 ? "product" : "products"}`}
        actions={
          <LinkButton href={`/collections/${collection.slug}`} variant="outline" size="sm">
            View in store
          </LinkButton>
        }
      />
      <CollectionForm
        action={updateCollection.bind(null, collection.id)}
        deleteAction={deleteCollection.bind(null, collection.id)}
        initial={{
          id: collection.id,
          title: collection.title,
          slug: collection.slug,
          description: collection.description,
          imageUrl: collection.imageUrl,
          position: collection.position,
        }}
      />
    </div>
  );
}
