import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { CollectionForm } from "../_components/collection-form";
import { createCollection } from "../_actions";

export const metadata: Metadata = { title: "Add collection · Admin" };

export default function NewCollectionPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Add collection"
        subtitle="Assign products to it from each product's Organization section."
      />
      <CollectionForm action={createCollection} />
    </div>
  );
}
