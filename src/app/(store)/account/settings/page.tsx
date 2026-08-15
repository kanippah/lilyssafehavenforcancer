import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ProfileForm, PasswordForm } from "./_components/settings-forms";

export const metadata: Metadata = {
  title: "Account settings",
  description: "Your profile and password.",
};

export default async function AccountSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/settings");
  const settings = await getSettings();

  return (
    <div>
      <header>
        <h1 className="text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-ink/60">Your details, kept simple and yours to change.</p>
      </header>

      <section
        aria-labelledby="profile-heading"
        className="mt-8 max-w-lg rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-6"
      >
        <h2 id="profile-heading" className="text-xl">
          Profile
        </h2>
        <div className="mt-4">
          <ProfileForm
            defaultName={user.name}
            defaultPhone={user.phone ?? ""}
            email={user.email}
            supportEmail={settings.supportEmail}
          />
        </div>
      </section>

      <section
        aria-labelledby="password-heading"
        className="mt-6 max-w-lg rounded-[var(--radius-card)] border border-linen bg-parchment/60 p-6"
      >
        <h2 id="password-heading" className="text-xl">
          Change password
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          You&apos;ll stay signed in here after the change.
        </p>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
