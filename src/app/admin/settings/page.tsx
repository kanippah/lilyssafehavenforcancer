import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "./_components/settings-form";

export const metadata: Metadata = {
  title: "Store settings",
};

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Store settings"
        subtitle="Identity, storefront copy, commerce rules, and the care ledger — all in one place."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
