import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { StoryForm } from "../_components/story-form";

export const metadata: Metadata = {
  title: "New story",
};

export default function AdminNewStoryPage() {
  return (
    <div>
      <PageHeader
        title="New story"
        subtitle="Saved as a draft until you tick publish."
      />
      <StoryForm />
    </div>
  );
}
