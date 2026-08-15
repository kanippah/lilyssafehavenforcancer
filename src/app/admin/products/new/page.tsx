import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "../_components/product-form";
import { createProduct } from "../_actions";

export const metadata: Metadata = { title: "Add product · Admin" };

export default async function NewProductPage() {
  const collections = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { title: "asc" }],
    select: { id: true, title: true },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Add product"
        subtitle="Save as a draft first if it isn't ready for the store."
      />
      <ProductForm action={createProduct} collections={collections} />
    </div>
  );
}
