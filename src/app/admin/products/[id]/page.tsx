import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "../_components/product-form";
import { deleteProduct, updateProduct } from "../_actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { title: true } });
  return { title: product ? `${product.title} · Admin` : "Product · Admin" };
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, collections] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" } },
        collections: { select: { collectionId: true } },
      },
    }),
    db.collection.findMany({
      orderBy: [{ position: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Edit product"
        subtitle={product.title}
        actions={
          <LinkButton href={`/products/${product.slug}`} variant="outline" size="sm">
            View in store
          </LinkButton>
        }
      />
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        deleteAction={deleteProduct.bind(null, product.id)}
        collections={collections}
        initial={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          story: product.story,
          status: product.status,
          featured: product.featured,
          tags: product.tags,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
          variants: product.variants.map((v) => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            priceCents: v.priceCents,
            compareAtCents: v.compareAtCents,
            stock: v.stock,
            trackStock: v.trackStock,
          })),
          collectionIds: product.collections.map((c) => c.collectionId),
        }}
      />
    </div>
  );
}
