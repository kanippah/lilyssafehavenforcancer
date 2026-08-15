import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth-actions";
import { AccountNav } from "./_components/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid items-start gap-8 md:grid-cols-[220px_1fr] md:gap-12">
        <aside className="md:sticky md:top-24">
          <p className="eyebrow">Your haven</p>
          <p className="mt-1 truncate font-display text-lg text-ink" title={user.name}>
            {user.name}
          </p>
          <div className="mt-4">
            <AccountNav />
          </div>
          <form action={logout} className="mt-3 border-t border-linen pt-3">
            <button
              type="submit"
              className="w-full rounded-[var(--radius-button)] px-3 py-2 text-left text-sm font-medium text-ink/55 transition-colors hover:bg-parchment hover:text-clay"
            >
              Sign out
            </button>
          </form>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
